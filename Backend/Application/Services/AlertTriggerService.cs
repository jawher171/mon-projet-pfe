using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Application.Hubs;
using Domain.Commands;
using Domain.Enums;
using Domain.Models;
using Domain.Queries;
using MediatR;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace Application.Services
{
    /// <summary>
    /// Full alert engine: info alerts, upsert/close threshold alerts with Fingerprint deduplication.
    /// Fig 6.3: checkSeuils → hash(type+id_s) → dedup → INSERT → BroadcastAlert (InventoryHub).
    /// Also implements legacy IAlertTriggerService for backward compatibility.
    /// </summary>
    public class AlertService : IAlertService, IAlertTriggerService
    {
        private readonly IMediator _mediator;
        private readonly IHubContext<InventoryHub> _hubContext;

        private static readonly string[] ThresholdTypes = new[]
        {
            nameof(AlertType.OUT_OF_STOCK),
            nameof(AlertType.MIN_STOCK),
            nameof(AlertType.STOCK_SECURITE),
            nameof(AlertType.STOCK_ALERTE)
        };

        public AlertService(IMediator mediator, IHubContext<InventoryHub> hubContext)
        {
            _mediator = mediator;
            _hubContext = hubContext;
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

            // Fig 6.3 — BroadcastAlert (InventoryHub) → tous les clients connectés
            await _hubContext.Clients.All.SendAsync("BroadcastAlert", new
            {
                Type = type,
                Severity = severity,
                Message = message,
                StockId = stockId,
                DateCreation = DateTime.UtcNow
            }, ct);
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

        /// <summary>
        /// Fig 6.3 — checkSeuils(id_s, newQuantite):
        /// Loads stock from DB, determines threshold alert type, calculates fingerprint hash(type + id_s),
        /// deduplicates, inserts alert if new, and broadcasts via SignalR.
        /// </summary>
        public async Task CheckSeuilsAsync(Guid stockId, int newQuantite, CancellationToken ct = default)
        {
            // SELECT QuantiteDisponible, SeuilMinimum, SeuilAlerte, SeuilMaximum FROM Stock WHERE id_s=?
            var stock = await _mediator.Send(
                new GetGenericQuery<Stock>(
                    condition: s => s.id_s == stockId,
                    includes: i => i.Include(x => x.Produit).Include(x => x.Site)),
                ct);

            if (stock == null) return;

            var produitNom = stock.Produit?.Nom ?? "Produit";
            var siteNom = stock.Site?.Nom ?? "Site";
            var qty = newQuantite;

            // Déterminer type d'alerte (hierarchy from diagram):
            // • Stock = 0 → Rupture (Critical)
            // • Qte ≤ SeuilMinimum → Critique (Critical)
            // • SeuilMinimum < Qte ≤ SeuilAlerte → avertissement (Warning)
            // • Qte > SeuilMaximum → Surstock
            string activeType = null;
            string severity = null;
            string message = null;

            if (qty == 0)
            {
                activeType = nameof(AlertType.OUT_OF_STOCK);
                severity = "Critical";
                message = $"RUPTURE DE STOCK: {produitNom} au site {siteNom}. Quantité disponible: 0. Réapprovisionnement urgent nécessaire.";
            }
            else if (stock.SeuilMinimum > 0 && qty <= stock.SeuilMinimum)
            {
                activeType = nameof(AlertType.MIN_STOCK);
                severity = "Critical";
                message = $"Stock minimum atteint pour {produitNom} au site {siteNom}. " +
                          $"Quantité: {qty}, Seuil minimum: {stock.SeuilMinimum}. Réapprovisionnement nécessaire.";
            }
            else if (stock.SeuilSecurite > 0 && qty <= stock.SeuilSecurite)
            {
                activeType = nameof(AlertType.STOCK_SECURITE);
                severity = "Warning";
                message = $"Seuil de sécurité atteint pour {produitNom} au site {siteNom}. " +
                          $"Quantité: {qty}, Seuil sécurité: {stock.SeuilSecurite}.";
            }
            else if (stock.SeuilAlerte > 0 && qty <= stock.SeuilAlerte)
            {
                activeType = nameof(AlertType.STOCK_ALERTE);
                severity = "Warning";
                message = $"Seuil d'alerte atteint pour {produitNom} au site {siteNom}. " +
                          $"Quantité: {qty}, Seuil alerte: {stock.SeuilAlerte}.";
            }

            if (activeType != null)
            {
                // Close all OTHER threshold alerts that are not the active type
                foreach (var t in ThresholdTypes)
                {
                    if (t != activeType)
                        await CloseAlertAsync(stock.id_s, t, ct);
                }

                // Upsert the active alert (includes fingerprint dedup + BroadcastAlert)
                await UpsertOpenAlertAsync(stock.id_s, activeType, severity, message, ct);
            }
            else
            {
                // Quantity is above all thresholds → close all threshold alerts
                // (Section 2: Résolution stock revenu normal)
                await CloseThresholdAlertsAsync(stock.id_s, ct);
            }
        }

        /// <summary>
        /// Fig 6.3 — listActiveAlerts():
        /// SELECT * FROM Alert WHERE Resolue=false ORDER BY DateCreation DESC
        /// </summary>
        public async Task<List<Alert>> ListActiveAlertsAsync(CancellationToken ct = default)
        {
            var alerts = await _mediator.Send(
                new GetListGenericQuery<Alert>(
                    condition: a => a.Resolue == false,
                    includes: i => i.Include(a => a.Stock).ThenInclude(s => s.Produit)
                                    .Include(a => a.Stock).ThenInclude(s => s.Site)),
                ct);

            return alerts.OrderByDescending(a => a.DateCreation).ToList();
        }

        /// <summary>
        /// Fig 6.3 — resolveAlert(id):
        /// UPDATE Alert SET Resolue=true, ClosedAt=NOW() WHERE Id_a=?
        /// Then BroadcastAlertResolved via InventoryHub.
        /// </summary>
        public async Task<Alert> ResolveAlertAsync(Guid alertId, CancellationToken ct = default)
        {
            var alert = await _mediator.Send(
                new GetGenericQuery<Alert>(
                    condition: a => a.Id_a == alertId,
                    includes: null),
                ct);

            if (alert == null) return null;

            alert.Resolue = true;
            alert.Status = "Closed";
            alert.ClosedAt = DateTime.UtcNow;
            await _mediator.Send(new PutGenericCommand<Alert>(alert), ct);

            // Fig 6.3 — BroadcastAlertResolved (InventoryHub)
            await _hubContext.Clients.All.SendAsync("BroadcastAlertResolved", new
            {
                AlertId = alertId
            }, ct);

            return alert;
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
