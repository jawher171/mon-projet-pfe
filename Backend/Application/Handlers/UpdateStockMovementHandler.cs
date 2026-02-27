using System;
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
                return UpdateStockMovementResult.Fail("Stock movement is required.");

            if (dto.id_sm == Guid.Empty)
                return UpdateStockMovementResult.Fail("id_sm is required.");

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
                return UpdateStockMovementResult.Fail("Stock not found.");

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
                return UpdateStockMovementResult.Fail("Type must be 'entry' or 'exit' (or 'entrée'/'sortie').");

            // Reverse old stock impact
            if (oldExit)
                stock.QuantiteDisponible += oldQuantite;
            else
                stock.QuantiteDisponible -= oldQuantite;

            // Update existing tracked entity with DTO values
            existing.Type = newExit ? "exit" : "entry";
            existing.Quantite = dto.Quantite;
            if (!string.IsNullOrEmpty(dto.Raison))
                existing.Raison = dto.Raison;
            existing.Note = dto.Note;
            if (dto.Id_u != Guid.Empty)
                existing.Id_u = dto.Id_u;
            if (dto.DateMouvement != default)
                existing.DateMouvement = dto.DateMouvement;

            // Apply new stock impact
            int delta;
            if (newExit)
            {
                delta = -existing.Quantite;
                stock.QuantiteDisponible -= existing.Quantite;
                if (stock.QuantiteDisponible < 0)
                    stock.QuantiteDisponible = 0;
            }
            else
            {
                delta = existing.Quantite;
                stock.QuantiteDisponible += existing.Quantite;
            }

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
