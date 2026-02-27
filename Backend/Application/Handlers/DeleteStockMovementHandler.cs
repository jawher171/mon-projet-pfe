using System;
using System.Threading;
using System.Threading.Tasks;
using Application.Commands;
using Application.Events;
using Domain.Commands;
using Domain.Models;
using Domain.Queries;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Handlers
{
    /// <summary>Handles DeleteStockMovementCommand: reverses stock impact, deletes movement, publishes StockChangedEvent.</summary>
    public class DeleteStockMovementHandler : IRequestHandler<DeleteStockMovementCommand, DeleteStockMovementResult>
    {
        private readonly IMediator _mediator;

        public DeleteStockMovementHandler(IMediator mediator)
        {
            _mediator = mediator;
        }

        public async Task<DeleteStockMovementResult> Handle(DeleteStockMovementCommand request, CancellationToken cancellationToken)
        {
            // Fetch existing movement
            var existing = await _mediator.Send(
                new GetGenericQuery<StockMovement>(
                    condition: x => x.id_sm == request.Id,
                    includes: null),
                cancellationToken);

            if (existing == null)
                return DeleteStockMovementResult.NotFoundResult();

            // Fetch associated stock and reverse impact
            var stock = await _mediator.Send(
                new GetGenericQuery<Stock>(
                    condition: x => x.id_s == existing.Id_s,
                    includes: i => i.Include(x => x.Produit).Include(x => x.Site)),
                cancellationToken);

            int delta = 0;
            if (stock != null)
            {
                var wasExit = IsExitType(existing.Type);
                if (wasExit)
                {
                    delta = existing.Quantite; // reversing exit = adding back
                    stock.QuantiteDisponible += existing.Quantite;
                }
                else
                {
                    delta = -existing.Quantite; // reversing entry = removing
                    stock.QuantiteDisponible -= existing.Quantite;
                }

                if (stock.QuantiteDisponible < 0)
                    stock.QuantiteDisponible = 0;

                await _mediator.Send(new PutGenericCommand<Stock>(stock), cancellationToken);
            }

            // Delete the movement
            var deleted = await _mediator.Send(new RemoveGenericCommand<StockMovement>(request.Id), cancellationToken);
            if (deleted == null)
                return DeleteStockMovementResult.NotFoundResult();

            // Publish domain event for alert engine (reversal creates a synthetic event)
            if (stock != null)
            {
                var reverseType = IsExitType(existing.Type) ? "entry" : "exit";
                await _mediator.Publish(new StockChangedEvent
                {
                    StockId = stock.id_s,
                    MovementId = existing.id_sm,
                    MovementType = reverseType,
                    DeltaQuantity = delta,
                    NewQuantity = stock.QuantiteDisponible,
                    OccurredAt = DateTime.UtcNow
                }, cancellationToken);
            }

            return DeleteStockMovementResult.Ok();
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
