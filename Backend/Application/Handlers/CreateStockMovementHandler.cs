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
    /// <summary>Handles CreateStockMovementCommand: resolves stock, adjusts quantity, persists movement, publishes StockChangedEvent.</summary>
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
                return CreateStockMovementResult.Fail("Stock movement is required.");

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
            }

            if (stock == null)
                return CreateStockMovementResult.Fail("Stock not found.");

            stockMovement.Id_s = stock.id_s;

            // Parse and validate type
            var type = stockMovement.Type?.Trim() ?? "entry";
            var isExit = type.Equals("exit", StringComparison.OrdinalIgnoreCase)
                || type.Equals("sortie", StringComparison.OrdinalIgnoreCase);
            var isEntry = type.Equals("entry", StringComparison.OrdinalIgnoreCase)
                || type.Equals("entrée", StringComparison.OrdinalIgnoreCase)
                || type.Equals("entree", StringComparison.OrdinalIgnoreCase);

            if (!isExit && !isEntry)
                return CreateStockMovementResult.Fail("Type must be 'entry' or 'exit' (or 'entrée'/'sortie').");

            stockMovement.Type = isExit ? "exit" : "entry";

            // Adjust stock quantity
            int delta;
            if (isExit)
            {
                delta = -stockMovement.Quantite;
                stock.QuantiteDisponible -= stockMovement.Quantite;
                if (stock.QuantiteDisponible < 0)
                    stock.QuantiteDisponible = 0;
            }
            else
            {
                delta = stockMovement.Quantite;
                stock.QuantiteDisponible += stockMovement.Quantite;
            }

            // Persist
            var result = await _mediator.Send(new AddGenericCommand<StockMovement>(stockMovement), cancellationToken);
            await _mediator.Send(new PutGenericCommand<Stock>(stock), cancellationToken);

            // Publish domain event for alert engine
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
