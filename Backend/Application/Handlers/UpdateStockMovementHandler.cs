using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Application.Commands;
using Application.Dtos;
using Application.Events;
using AutoMapper;
using Domain.Commands;
using Domain.Models;
using Domain.Queries;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Handlers
{
    /// <summary>Handles UpdateStockMovementCommand: reverses old stock impact, applies updated values, publishes StockChangedEvent.</summary>
    public class UpdateStockMovementHandler : IRequestHandler<UpdateStockMovementCommand, UpdateStockMovementResult>
    {
        private readonly IMediator _mediator;
        private readonly IMapper _mapper;

        public UpdateStockMovementHandler(IMediator mediator, IMapper mapper)
        {
            _mediator = mediator;
            _mapper = mapper;
        }

        public async Task<UpdateStockMovementResult> Handle(UpdateStockMovementCommand request, CancellationToken cancellationToken)
        {
            var dto = request.Dto;
            if (dto == null)
                return UpdateStockMovementResult.Fail("Le mouvement de stock est obligatoire.");

            if (dto.id_sm == Guid.Empty)
                return UpdateStockMovementResult.Fail("L'identifiant du mouvement est obligatoire.");

            // Fetch existing movement
            var existing = await _mediator.Send(
                new GetGenericQuery<StockMovement>(
                    condition: x => x.id_sm == dto.id_sm,
                    includes: null),
                cancellationToken);

            if (existing == null)
                return UpdateStockMovementResult.NotFoundResult();

            // Fetch associated stock
            var stock = await _mediator.Send(
                new GetGenericQuery<Stock>(
                    condition: x => x.id_s == existing.Id_s,
                    includes: i => i.Include(x => x.Produit).Include(x => x.Site)),
                cancellationToken);

            if (stock == null)
                return UpdateStockMovementResult.Fail("Stock introuvable.");

            // Parse and validate new type
            var oldExit = IsExitType(existing.Type);
            var oldQuantite = existing.Quantite;
            var newType = dto.Type?.Trim() ?? existing.Type;
            var newExit = newType.Equals("exit", StringComparison.OrdinalIgnoreCase)
                || newType.Equals("sortie", StringComparison.OrdinalIgnoreCase);
            var newEntry = newType.Equals("entry", StringComparison.OrdinalIgnoreCase)
                || newType.Equals("entrée", StringComparison.OrdinalIgnoreCase)
                || newType.Equals("entree", StringComparison.OrdinalIgnoreCase);

            if (!newExit && !newEntry)
                return UpdateStockMovementResult.Fail("Le type doit être 'entry' ou 'exit' (ou 'entrée'/'sortie').");

            // Compute projected stock/site deltas before writing any updates.
            var oldDelta = oldExit ? -oldQuantite : oldQuantite;
            var newDelta = newExit ? -dto.Quantite : dto.Quantite;
            var stockDelta = newDelta - oldDelta;
            var projectedStockQuantity = stock.QuantiteDisponible + stockDelta;

            if (projectedStockQuantity < 0)
                return UpdateStockMovementResult.Fail("Impossible de mettre à jour le mouvement : la quantité demandée dépasse le stock disponible.");

            if (newEntry && stock.SeuilMaximum > 0 && projectedStockQuantity > stock.SeuilMaximum)
            {
                await _mediator.Publish(new StockChangedEvent
                {
                    StockId = stock.id_s,
                    MovementId = Guid.Empty,
                    MovementType = "update",
                    DeltaQuantity = 0,
                    NewQuantity = stock.QuantiteDisponible,
                    OccurredAt = DateTime.UtcNow
                }, cancellationToken);

                return UpdateStockMovementResult.Fail($"L'entrée dépasse le seuil maximum. Capacité restante : {Math.Max(0, stock.SeuilMaximum - stock.QuantiteDisponible)}.");
            }

            if (stockDelta > 0)
            {
                var site = await _mediator.Send(
                    new GetGenericQuery<Site>(
                        condition: s => s.Id_site == stock.Id_site),
                    cancellationToken);

                if (site?.Capacite.HasValue == true && site.Capacite.Value > 0)
                {
                    var siteStocks = await _mediator.Send(
                        new GetListGenericQuery<Stock>(
                            condition: s => s.Id_site == stock.Id_site),
                        cancellationToken);

                    var currentSiteLoad = siteStocks.Sum(s => s.QuantiteDisponible);
                    if (currentSiteLoad + stockDelta > site.Capacite.Value)
                    {
                        var remainingCapacity = Math.Max(0, site.Capacite.Value - currentSiteLoad);
                        return UpdateStockMovementResult.Fail($"Le mouvement dépasse la capacité du site '{site.Nom}'. Capacité restante : {remainingCapacity}.");
                    }
                }
            }

            // Update existing tracked entity with DTO values
            existing.Type = newExit ? "exit" : "entry";
            existing.Quantite = dto.Quantite;
            if (!string.IsNullOrEmpty(dto.Raison))
                existing.Raison = dto.Raison;
            existing.Note = dto.Note;
            existing.Destination = dto.Destination;
            if (dto.Id_u != Guid.Empty)
                existing.Id_u = dto.Id_u;
            if (dto.DateMouvement != default)
                existing.DateMouvement = dto.DateMouvement;

            // Apply projected quantity after validations passed.
            var delta = newDelta;
            stock.QuantiteDisponible = projectedStockQuantity;

            // Persist
            await _mediator.Send(new PutGenericCommand<StockMovement>(existing), cancellationToken);
            await _mediator.Send(new PutGenericCommand<Stock>(stock), cancellationToken);

            // Publish domain event for alert engine
            await _mediator.Publish(new StockChangedEvent
            {
                StockId = stock.id_s,
                MovementId = existing.id_sm,
                MovementType = existing.Type,
                DeltaQuantity = delta,
                NewQuantity = stock.QuantiteDisponible,
                OccurredAt = DateTime.UtcNow
            }, cancellationToken);

            return UpdateStockMovementResult.Ok(_mapper.Map<StockMovementDto>(existing));
        }

        private static bool IsExitType(string type)
        {
            if (string.IsNullOrWhiteSpace(type)) return false;
            var t = type.Trim();
            return t.Equals("exit", StringComparison.OrdinalIgnoreCase)
                || t.Equals("sortie", StringComparison.OrdinalIgnoreCase);
        }
    }
}
