using System;
using System.Threading;
using System.Threading.Tasks;
using Application.Events;
using Application.Services;
using Domain.Enums;
using Domain.Models;
using Domain.Queries;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Handlers
{
    /// <summary>
    /// Handles StockChangedEvent: evaluates ALL alert rules after a stock movement is validated.
    /// 
    /// Business rules:
    /// A) Info alerts: ENTRY_VALIDATED or EXIT_VALIDATED (always, stored as Closed).
    /// B) Threshold hierarchy (only ONE open at a time per stock):
    ///    QuantiteDisponible == 0          → OUT_OF_STOCK   (Critical)
    ///    QuantiteDisponible ≤ SeuilMinimum → MIN_STOCK      (Critical)
    ///    QuantiteDisponible ≤ SeuilSecurite→ STOCK_SECURITE  (Warning)
    ///    QuantiteDisponible ≤ SeuilAlerte  → STOCK_ALERTE    (Warning)
    ///    Else                              → close all threshold alerts
    /// C) Maximum (independent):
    ///    QuantiteDisponible ≥ SeuilMaximum → STOCK_MAXIMUM  (Warning)
    ///    Else                              → close STOCK_MAXIMUM
    /// </summary>
    public class StockChangedEventHandler : INotificationHandler<StockChangedEvent>
    {
        private readonly IAlertService _alertService;
        private readonly IMediator _mediator;

        public StockChangedEventHandler(IAlertService alertService, IMediator mediator)
        {
            _alertService = alertService;
            _mediator = mediator;
        }

        public async Task Handle(StockChangedEvent notification, CancellationToken cancellationToken)
        {
            // Load the stock with product/site names for alert messages
            var stock = await _mediator.Send(
                new GetGenericQuery<Stock>(
                    condition: s => s.id_s == notification.StockId,
                    includes: i => i.Include(x => x.Produit).Include(x => x.Site)),
                cancellationToken);

            if (stock == null) return;

            var produitNom = stock.Produit?.Nom ?? "Produit";
            var siteNom = stock.Site?.Nom ?? "Site";
            var qty = notification.NewQuantity;

            // ═══════════════════════════════════════════════════
            // A) INFORMATIONAL ALERT — always created
            // ═══════════════════════════════════════════════════
            if (notification.MovementType.Equals("entry", StringComparison.OrdinalIgnoreCase)
                || notification.MovementType.Equals("IN", StringComparison.OrdinalIgnoreCase))
            {
                await _alertService.CreateInfoAlertAsync(
                    stock.id_s,
                    nameof(AlertType.ENTRY_VALIDATED),
                    $"Mouvement d'entrée validé pour {produitNom} au site {siteNom}. " +
                    $"Quantité ajoutée: {Math.Abs(notification.DeltaQuantity)}. Nouveau stock: {qty}.",
                    cancellationToken);
            }
            else
            {
                await _alertService.CreateInfoAlertAsync(
                    stock.id_s,
                    nameof(AlertType.EXIT_VALIDATED),
                    $"Mouvement de sortie validé pour {produitNom} au site {siteNom}. " +
                    $"Quantité retirée: {Math.Abs(notification.DeltaQuantity)}. Nouveau stock: {qty}.",
                    cancellationToken);
            }

            // ═══════════════════════════════════════════════════
            // B) THRESHOLD ALERTS — hierarchical, only ONE open
            // ═══════════════════════════════════════════════════
            await EvaluateThresholdAlerts(stock, qty, produitNom, siteNom, cancellationToken);

            // ═══════════════════════════════════════════════════
            // C) MAXIMUM ALERT — independent
            // ═══════════════════════════════════════════════════
            await EvaluateMaximumAlert(stock, qty, produitNom, siteNom, cancellationToken);
        }

        private async Task EvaluateThresholdAlerts(Stock stock, int qty, string produitNom, string siteNom, CancellationToken ct)
        {
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
                var allThresholdTypes = new[]
                {
                    nameof(AlertType.OUT_OF_STOCK),
                    nameof(AlertType.MIN_STOCK),
                    nameof(AlertType.STOCK_SECURITE),
                    nameof(AlertType.STOCK_ALERTE)
                };

                foreach (var t in allThresholdTypes)
                {
                    if (t != activeType)
                        await _alertService.CloseAlertAsync(stock.id_s, t, ct);
                }

                // Upsert the active alert
                await _alertService.UpsertOpenAlertAsync(stock.id_s, activeType, severity, message, ct);
            }
            else
            {
                // Quantity is above all thresholds → close all threshold alerts
                await _alertService.CloseThresholdAlertsAsync(stock.id_s, ct);
            }
        }

        private async Task EvaluateMaximumAlert(Stock stock, int qty, string produitNom, string siteNom, CancellationToken ct)
        {
            if (stock.SeuilMaximum > 0 && qty >= stock.SeuilMaximum)
            {
                await _alertService.UpsertOpenAlertAsync(
                    stock.id_s,
                    nameof(AlertType.STOCK_MAXIMUM),
                    "Warning",
                    $"Stock maximum atteint pour {produitNom} au site {siteNom}. " +
                    $"Quantité: {qty}, Seuil maximum: {stock.SeuilMaximum}.",
                    ct);
            }
            else
            {
                await _alertService.CloseAlertAsync(stock.id_s, nameof(AlertType.STOCK_MAXIMUM), ct);
            }
        }
    }
}
