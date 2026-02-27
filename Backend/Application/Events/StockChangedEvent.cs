using System;
using MediatR;

namespace Application.Events
{
    /// <summary>
    /// Domain event published after a stock movement is validated and stock quantity is updated.
    /// Consumed by StockChangedEventHandler to evaluate alert rules.
    /// </summary>
    public class StockChangedEvent : INotification
    {
        /// <summary>The stock that was affected (id_s).</summary>
        public Guid StockId { get; set; }

        /// <summary>The movement that triggered this event (id_sm).</summary>
        public Guid MovementId { get; set; }

        /// <summary>IN or OUT.</summary>
        public string MovementType { get; set; } = string.Empty;

        /// <summary>Signed delta: positive for IN, negative for OUT.</summary>
        public int DeltaQuantity { get; set; }

        /// <summary>New QuantiteDisponible after the movement.</summary>
        public int NewQuantity { get; set; }

        /// <summary>When the event occurred.</summary>
        public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
    }
}
