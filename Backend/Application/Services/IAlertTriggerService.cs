using System;
using System.Threading;
using System.Threading.Tasks;
using Domain.Models;

namespace Application.Services
{
    /// <summary>Alert engine service: creates info alerts, upserts threshold alerts, and closes alerts with deduplication.</summary>
    public interface IAlertService
    {
        /// <summary>Create an informational alert (ENTRY_VALIDATED / EXIT_VALIDATED). Stored as Closed immediately.</summary>
        Task CreateInfoAlertAsync(Guid stockId, string type, string message, CancellationToken ct = default);

        /// <summary>Upsert an open alert for (type + stockId). If one exists, update message/date. If not, insert new.</summary>
        Task UpsertOpenAlertAsync(Guid stockId, string type, string severity, string message, CancellationToken ct = default);

        /// <summary>Close a single open alert by type + stockId. Sets Status=Closed, ClosedAt=now, Resolue=true.</summary>
        Task CloseAlertAsync(Guid stockId, string type, CancellationToken ct = default);

        /// <summary>Close all open threshold alerts (OUT_OF_STOCK, MIN_STOCK, STOCK_SECURITE, STOCK_ALERTE) for a stock.</summary>
        Task CloseThresholdAlertsAsync(Guid stockId, CancellationToken ct = default);
    }

    /// <summary>Kept for backward compatibility. Delegates to IAlertService internally.</summary>
    public interface IAlertTriggerService
    {
        Task TryCreateLowStockAlertAsync(Stock stock, CancellationToken cancellationToken = default);
    }
}
