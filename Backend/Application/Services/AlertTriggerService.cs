using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Domain.Commands;
using Domain.Enums;
using Domain.Models;
using Domain.Queries;
using MediatR;

namespace Application.Services
{
    /// <summary>
    /// Full alert engine: info alerts, upsert/close threshold alerts with Fingerprint deduplication.
    /// Also implements legacy IAlertTriggerService for backward compatibility.
    /// </summary>
    public class AlertService : IAlertService, IAlertTriggerService
    {
        private readonly IMediator _mediator;

        private static readonly string[] ThresholdTypes = new[]
        {
            nameof(AlertType.OUT_OF_STOCK),
            nameof(AlertType.MIN_STOCK),
            nameof(AlertType.STOCK_SECURITE),
            nameof(AlertType.STOCK_ALERTE)
        };

        public AlertService(IMediator mediator)
        {
            _mediator = mediator;
        }

        /// <inheritdoc />
        public async Task CreateInfoAlertAsync(Guid stockId, string type, string message, CancellationToken ct = default)
        {
            var fingerprint = BuildFingerprint(type, stockId);

            var alert = new Alert
            {
                Id_a = Guid.NewGuid(),
                Type = type,
                Message = message,
                DateCreation = DateTime.UtcNow,
                Severity = "Info",
                Status = "Closed",
                Fingerprint = fingerprint,
                ClosedAt = DateTime.UtcNow,
                Resolue = true,
                id_s = stockId
            };

            await _mediator.Send(new AddGenericCommand<Alert>(alert), ct);
        }

        /// <inheritdoc />
        public async Task UpsertOpenAlertAsync(Guid stockId, string type, string severity, string message, CancellationToken ct = default)
        {
            var fingerprint = BuildFingerprint(type, stockId);

            // Check if an open alert with this fingerprint already exists
            var existing = await _mediator.Send(
                new GetGenericQuery<Alert>(
                    condition: a => a.Fingerprint == fingerprint && a.Status == "Open",
                    includes: null),
                ct);

            if (existing != null)
            {
                // Update message and date, keep it open
                existing.Message = message;
                existing.DateCreation = DateTime.UtcNow;
                existing.Severity = severity;
                await _mediator.Send(new PutGenericCommand<Alert>(existing), ct);
            }
            else
            {
                // Insert new open alert
                var alert = new Alert
                {
                    Id_a = Guid.NewGuid(),
                    Type = type,
                    Message = message,
                    DateCreation = DateTime.UtcNow,
                    Severity = severity,
                    Status = "Open",
                    Fingerprint = fingerprint,
                    ClosedAt = null,
                    Resolue = false,
                    id_s = stockId
                };

                await _mediator.Send(new AddGenericCommand<Alert>(alert), ct);
            }
        }

        /// <inheritdoc />
        public async Task CloseAlertAsync(Guid stockId, string type, CancellationToken ct = default)
        {
            var fingerprint = BuildFingerprint(type, stockId);

            var existing = await _mediator.Send(
                new GetGenericQuery<Alert>(
                    condition: a => a.Fingerprint == fingerprint && a.Status == "Open",
                    includes: null),
                ct);

            if (existing != null)
            {
                existing.Status = "Closed";
                existing.ClosedAt = DateTime.UtcNow;
                existing.Resolue = true;
                await _mediator.Send(new PutGenericCommand<Alert>(existing), ct);
            }
        }

        /// <inheritdoc />
        public async Task CloseThresholdAlertsAsync(Guid stockId, CancellationToken ct = default)
        {
            // Fetch all open threshold alerts for this stock
            var openAlerts = await _mediator.Send(
                new GetListGenericQuery<Alert>(
                    condition: a => a.id_s == stockId
                        && a.Status == "Open"
                        && (a.Type == nameof(AlertType.OUT_OF_STOCK)
                            || a.Type == nameof(AlertType.MIN_STOCK)
                            || a.Type == nameof(AlertType.STOCK_SECURITE)
                            || a.Type == nameof(AlertType.STOCK_ALERTE)),
                    includes: null),
                ct);

            foreach (var alert in openAlerts)
            {
                alert.Status = "Closed";
                alert.ClosedAt = DateTime.UtcNow;
                alert.Resolue = true;
                await _mediator.Send(new PutGenericCommand<Alert>(alert), ct);
            }
        }

        /// <summary>Legacy method: backward compatibility with existing handlers that call TryCreateLowStockAlertAsync.</summary>
        public async Task TryCreateLowStockAlertAsync(Stock stock, CancellationToken cancellationToken = default)
        {
            // This is now handled by StockChangedEventHandler — kept as no-op for compile compat
            await Task.CompletedTask;
        }

        private static string BuildFingerprint(string type, Guid stockId)
        {
            return $"{type}|{stockId}";
        }
    }
}
