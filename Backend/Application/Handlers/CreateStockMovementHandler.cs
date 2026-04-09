using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Application.Commands;
using Application.Dtos;
using Application.Events;
using AutoMapper;
using Domain.Commands;
using Domain.Enums;
using Domain.Models;
using Domain.Queries;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Handlers
{
    /// <summary>Handles CreateStockMovementCommand: resolves stock, adjusts quantity, persists movement, publishes StockChangedEvent. Supports entry, exit, and transfer types.</summary>
    public class CreateStockMovementHandler : IRequestHandler<CreateStockMovementCommand, CreateStockMovementResult>
    {
        private readonly IMediator _mediator;
        private readonly IMapper _mapper;

        public CreateStockMovementHandler(IMediator mediator, IMapper mapper)
        {
            _mediator = mediator;
            _mapper = mapper;
        }

        public async Task<CreateStockMovementResult> Handle(CreateStockMovementCommand request, CancellationToken cancellationToken)
        {
            var dto = request.Dto;
            if (dto == null)
                return CreateStockMovementResult.Fail("Le mouvement de stock est obligatoire.");

            var stockMovement = _mapper.Map<StockMovement>(dto);

            if (stockMovement.id_sm == Guid.Empty)
                stockMovement.id_sm = Guid.NewGuid();

            // Resolve Stock: use Id_s directly, or find by ProductId + SiteId
            Stock stock = null;
            if (stockMovement.Id_s != Guid.Empty)
            {
                stock = await _mediator.Send(
                    new GetGenericQuery<Stock>(
                        condition: x => x.id_s == stockMovement.Id_s,
                        includes: i => i.Include(x => x.Produit).Include(x => x.Site)),
                    cancellationToken);
            }
            else if (dto.ProductId.HasValue && dto.SiteId.HasValue)
            {
                var productId = dto.ProductId.Value;
                var siteId = dto.SiteId.Value;
                stock = await _mediator.Send(
                    new GetGenericQuery<Stock>(
                        condition: x => x.id_p == productId && x.Id_site == siteId,
                        includes: i => i.Include(x => x.Produit).Include(x => x.Site)),
                    cancellationToken);

                // Auto-create Stock if it doesn't exist for this product+site
                if (stock == null)
                {
                    stock = new Stock
                    {
                        id_s = Guid.NewGuid(),
                        id_p = productId,
                        Id_site = siteId,
                        QuantiteDisponible = 0,
                        SeuilAlerte = 10,
                        SeuilSecurite = 5,
                        SeuilMinimum = 0,
                        SeuilMaximum = 0
                    };
                    stock = await _mediator.Send(new AddGenericCommand<Stock>(stock), cancellationToken);

                    // Re-fetch with includes so Produit and Site are loaded
                    stock = await _mediator.Send(
                        new GetGenericQuery<Stock>(
                            condition: x => x.id_s == stock.id_s,
                            includes: i => i.Include(x => x.Produit).Include(x => x.Site)),
                        cancellationToken);
                }
            }

            if (stock == null)
                return CreateStockMovementResult.Fail("Stock introuvable.");

            stockMovement.Id_s = stock.id_s;

            // Parse and validate type
            var type = stockMovement.Type?.Trim() ?? "entry";
            var isExit = type.Equals("exit", StringComparison.OrdinalIgnoreCase)
                || type.Equals("sortie", StringComparison.OrdinalIgnoreCase);
            var isEntry = type.Equals("entry", StringComparison.OrdinalIgnoreCase)
                || type.Equals("entrée", StringComparison.OrdinalIgnoreCase)
                || type.Equals("entree", StringComparison.OrdinalIgnoreCase);
            var isTransfer = type.Equals("transfer", StringComparison.OrdinalIgnoreCase)
                || type.Equals("transfert", StringComparison.OrdinalIgnoreCase);

            if (!isExit && !isEntry && !isTransfer)
                return CreateStockMovementResult.Fail("Le type doit être 'entry', 'exit' ou 'transfer'.");

            // Normalize the type string
            if (isTransfer)
                stockMovement.Type = "transfer";
            else
                stockMovement.Type = isExit ? "exit" : "entry";

            // Resolve destination for transfers and exits with destination
            // The frontend may send destination as a GUID (site ID) or a site name
            Guid? resolvedDestSiteId = null;
            string? resolvedDestSiteName = null;
            Stock? destStock = null;
            if ((isExit || isTransfer) && !string.IsNullOrWhiteSpace(stockMovement.Destination))
            {
                var destinationInput = stockMovement.Destination.Trim();
                Site? destinationSite;

                if (Guid.TryParse(destinationInput, out var parsedGuid))
                {
                    destinationSite = await _mediator.Send(
                        new GetGenericQuery<Site>(
                            condition: s => s.Id_site == parsedGuid),
                        cancellationToken);
                }
                else
                {
                    // Try to resolve by site name
                    destinationSite = await _mediator.Send(
                        new GetGenericQuery<Site>(
                            condition: s => s.Nom == destinationInput),
                        cancellationToken);
                }

                if (destinationSite == null)
                    return CreateStockMovementResult.Fail("Le site de destination est introuvable.");

                resolvedDestSiteId = destinationSite.Id_site;
                resolvedDestSiteName = destinationSite.Nom;

                // Store the destination site NAME in the movement for display
                stockMovement.Destination = resolvedDestSiteName;
            }

            // Preload destination stock when destination is resolved to validate limits before writes.
            if (resolvedDestSiteId.HasValue && stock.id_p != Guid.Empty)
            {
                var destSiteId = resolvedDestSiteId.Value;
                destStock = await _mediator.Send(
                    new GetGenericQuery<Stock>(
                        condition: x => x.id_p == stock.id_p && x.Id_site == destSiteId,
                        includes: i => i.Include(x => x.Produit).Include(x => x.Site)),
                    cancellationToken);
            }

            // Validate source stock availability / max threshold before any persistence.
            if (isExit || isTransfer)
            {
                if (stock.QuantiteDisponible <= 0)
                    return CreateStockMovementResult.Fail("Impossible de créer le mouvement : le stock disponible est de 0.");

                if (stockMovement.Quantite > stock.QuantiteDisponible)
                    return CreateStockMovementResult.Fail($"Impossible de créer le mouvement : la quantité demandée ({stockMovement.Quantite}) dépasse le stock disponible ({stock.QuantiteDisponible}).");
            }
            else
            {
                if (stock.SeuilMaximum > 0 && stock.QuantiteDisponible + stockMovement.Quantite > stock.SeuilMaximum)
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

                    return CreateStockMovementResult.Fail($"L'entrée dépasse le seuil maximum. Capacité restante : {Math.Max(0, stock.SeuilMaximum - stock.QuantiteDisponible)}.");
                }
            }

            // Validate destination stock threshold before persisting source movement.
            if (resolvedDestSiteId.HasValue && destStock != null && destStock.id_s != stock.id_s)
            {
                if (destStock.SeuilMaximum > 0 && destStock.QuantiteDisponible + stockMovement.Quantite > destStock.SeuilMaximum)
                {
                    await _mediator.Publish(new StockChangedEvent
                    {
                        StockId = destStock.id_s,
                        MovementId = Guid.Empty,
                        MovementType = "update",
                        DeltaQuantity = 0,
                        NewQuantity = destStock.QuantiteDisponible,
                        OccurredAt = DateTime.UtcNow
                    }, cancellationToken);

                    return CreateStockMovementResult.Fail($"Le transfert dépasse le seuil maximum du site de destination. Capacité restante : {Math.Max(0, destStock.SeuilMaximum - destStock.QuantiteDisponible)}.");
                }
            }

            // Validate site-level capacities with net deltas so same-site transfers are handled correctly.
            var siteDeltas = new Dictionary<Guid, int>();
            void AccumulateSiteDelta(Guid siteId, int amount)
            {
                if (siteDeltas.ContainsKey(siteId))
                {
                    siteDeltas[siteId] += amount;
                }
                else
                {
                    siteDeltas[siteId] = amount;
                }
            }

            var sourceDelta = isEntry ? stockMovement.Quantite : -stockMovement.Quantite;
            AccumulateSiteDelta(stock.Id_site, sourceDelta);
            if (resolvedDestSiteId.HasValue)
                AccumulateSiteDelta(resolvedDestSiteId.Value, stockMovement.Quantite);

            foreach (var siteDelta in siteDeltas.Where(x => x.Value > 0))
            {
                var site = await _mediator.Send(
                    new GetGenericQuery<Site>(
                        condition: s => s.Id_site == siteDelta.Key),
                    cancellationToken);

                if (site?.Capacite.HasValue != true || site.Capacite <= 0)
                    continue;

                var siteCapacity = site.Capacite.GetValueOrDefault();

                var siteStocks = await _mediator.Send(
                    new GetListGenericQuery<Stock>(
                        condition: s => s.Id_site == siteDelta.Key),
                    cancellationToken);

                var currentSiteLoad = siteStocks.Sum(s => s.QuantiteDisponible);
                if (currentSiteLoad + siteDelta.Value > siteCapacity)
                {
                    var remainingCapacity = Math.Max(0, siteCapacity - currentSiteLoad);
                    return CreateStockMovementResult.Fail($"Le mouvement dépasse la capacité du site '{site.Nom}'. Capacité restante : {remainingCapacity}.");
                }
            }

            // Apply source stock quantity change now that all business checks passed.
            var delta = sourceDelta;
            stock.QuantiteDisponible += sourceDelta;

            // Persist the movement and update source stock
            var result = await _mediator.Send(new AddGenericCommand<StockMovement>(stockMovement), cancellationToken);
            await _mediator.Send(new PutGenericCommand<Stock>(stock), cancellationToken);

            // If movement has a resolved destination site, increase stock there
            if (resolvedDestSiteId.HasValue && stock.id_p != Guid.Empty)
            {
                var destSiteId = resolvedDestSiteId.Value;
                if (destStock == null)
                {
                    destStock = new Stock
                    {
                        id_s = Guid.NewGuid(),
                        id_p = stock.id_p,
                        Id_site = destSiteId,
                        QuantiteDisponible = 0,
                        SeuilAlerte = 10,
                        SeuilSecurite = 5,
                        SeuilMinimum = 0,
                        SeuilMaximum = 0
                    };
                    destStock = await _mediator.Send(new AddGenericCommand<Stock>(destStock), cancellationToken);

                    destStock = await _mediator.Send(
                        new GetGenericQuery<Stock>(
                            condition: x => x.id_s == destStock.id_s,
                            includes: i => i.Include(x => x.Produit).Include(x => x.Site)),
                        cancellationToken);
                }

                destStock.QuantiteDisponible += stockMovement.Quantite;
                await _mediator.Send(new PutGenericCommand<Stock>(destStock), cancellationToken);

                // Publish alert event for destination stock
                await _mediator.Publish(new StockChangedEvent
                {
                    StockId = destStock.id_s,
                    MovementId = stockMovement.id_sm,
                    MovementType = isTransfer ? "transfer" : "entry",
                    DeltaQuantity = stockMovement.Quantite,
                    NewQuantity = destStock.QuantiteDisponible,
                    OccurredAt = DateTime.UtcNow
                }, cancellationToken);
            }

            // Attach loaded stock (with Produit and Site) so AutoMapper can resolve ProduitNom/SiteNom
            result.Stock = stock;

            // Publish domain event for source stock alert engine
            await _mediator.Publish(new StockChangedEvent
            {
                StockId = stock.id_s,
                MovementId = stockMovement.id_sm,
                MovementType = stockMovement.Type,
                DeltaQuantity = delta,
                NewQuantity = stock.QuantiteDisponible,
                OccurredAt = DateTime.UtcNow
            }, cancellationToken);

            return CreateStockMovementResult.Ok(_mapper.Map<StockMovementDto>(result));
        }
    }
}
