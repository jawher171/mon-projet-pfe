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
using System.Linq;

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
    ///    QuantiteDisponible ≥ SeuilMaximum                 → STOCK_MAXIMUM       (Critical)
    ///    QuantiteDisponible ≥ 90% SeuilMaximum et < max    → STOCK_NEAR_MAXIMUM  (Warning)
    ///    Else                                               → close maximum alerts
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
            // A) INFORMATIONAL ALERT — only for actual movements (skip threshold/stock updates)
            // ═══════════════════════════════════════════════════
            if (!notification.MovementType.Equals("update", StringComparison.OrdinalIgnoreCase))
            {
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
                else if (notification.MovementType.Equals("transfer", StringComparison.OrdinalIgnoreCase))
                {
                    await _alertService.CreateInfoAlertAsync(
                        stock.id_s,
                        nameof(AlertType.TRANSFER_VALIDATED),
                        $"Transfert entre magasins validé pour {produitNom} au site {siteNom}. " +
                        $"Quantité transférée: {Math.Abs(notification.DeltaQuantity)}. Nouveau stock: {qty}.",
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
            }

            // ═══════════════════════════════════════════════════
            // B) THRESHOLD ALERTS — Fig 6.3: checkSeuils(id_s, newQuantite)
            // ═══════════════════════════════════════════════════
            await _alertService.CheckSeuilsAsync(stock.id_s, qty, cancellationToken);

            // ═══════════════════════════════════════════════════
            // C) MAXIMUM ALERT — independent
            // ═══════════════════════════════════════════════════
            await EvaluateMaximumAlert(stock, qty, produitNom, siteNom, cancellationToken);

            // ═══════════════════════════════════════════════════
            // D) SITE CAPACITY ALERTS — independent (near max / max reached)
            // ═══════════════════════════════════════════════════
            await EvaluateSiteCapacityAlerts(stock, siteNom, cancellationToken);
        }




        private async Task EvaluateMaximumAlert(Stock stock, int qty, string produitNom, string siteNom, CancellationToken ct)
        {
            if (stock.SeuilMaximum <= 0)
            {
                await _alertService.CloseAlertAsync(stock.id_s, nameof(AlertType.STOCK_MAXIMUM), ct);
                await _alertService.CloseAlertAsync(stock.id_s, nameof(AlertType.STOCK_NEAR_MAXIMUM), ct);
                return;
            }

            var seuilMaximum = stock.SeuilMaximum;
            var seuilProcheMaximum = (int)Math.Floor(seuilMaximum * 0.9d);
            seuilProcheMaximum = Math.Max(1, seuilProcheMaximum);

            // If max is very low, avoid near-max having the same threshold as max.
            if (seuilProcheMaximum >= seuilMaximum)
                seuilProcheMaximum = Math.Max(1, seuilMaximum - 1);

            if (qty >= seuilMaximum)
            {
                await _alertService.CloseAlertAsync(stock.id_s, nameof(AlertType.STOCK_NEAR_MAXIMUM), ct);

                await _alertService.UpsertOpenAlertAsync(
                    stock.id_s,
                    nameof(AlertType.STOCK_MAXIMUM),
                    "Critical",
                    $"Stock maximum atteint pour {produitNom} au site {siteNom}. " +
                    $"Quantité: {qty}, Seuil maximum: {seuilMaximum}.",
                    ct);
            }
            else if (qty >= seuilProcheMaximum)
            {
                await _alertService.CloseAlertAsync(stock.id_s, nameof(AlertType.STOCK_MAXIMUM), ct);

                await _alertService.UpsertOpenAlertAsync(
                    stock.id_s,
                    nameof(AlertType.STOCK_NEAR_MAXIMUM),
                    "Warning",
                    $"Stock proche du maximum pour {produitNom} au site {siteNom}. " +
                    $"Quantité: {qty}, seuil proche maximum: {seuilProcheMaximum}, seuil maximum: {seuilMaximum}.",
                    ct);
            }
            else
            {
                await _alertService.CloseAlertAsync(stock.id_s, nameof(AlertType.STOCK_MAXIMUM), ct);
                await _alertService.CloseAlertAsync(stock.id_s, nameof(AlertType.STOCK_NEAR_MAXIMUM), ct);
            }
        }

        private async Task EvaluateSiteCapacityAlerts(Stock stock, string siteNom, CancellationToken ct)
        {
            var siteCapacity = stock.Site?.Capacite.GetValueOrDefault() ?? 0;

            var siteStocks = (await _mediator.Send(
                new GetListGenericQuery<Stock>(
                    condition: s => s.Id_site == stock.Id_site,
                    includes: null),
                ct)).ToList();

            var anchorStockId = siteStocks
                .OrderBy(s => s.id_s)
                .Select(s => s.id_s)
                .FirstOrDefault();

            if (anchorStockId == Guid.Empty)
                anchorStockId = stock.id_s;

            if (siteCapacity <= 0)
            {
                await _alertService.CloseAlertAsync(anchorStockId, nameof(AlertType.SITE_CAPACITY_MAXIMUM), ct);
                await _alertService.CloseAlertAsync(anchorStockId, nameof(AlertType.SITE_CAPACITY_NEAR_MAXIMUM), ct);
                return;
            }

            var currentSiteLoad = siteStocks.Sum(s => s.QuantiteDisponible);
            var nearMaxThreshold = (int)Math.Floor(siteCapacity * 0.9d);
            nearMaxThreshold = Math.Max(1, nearMaxThreshold);
            if (nearMaxThreshold >= siteCapacity)
                nearMaxThreshold = Math.Max(1, siteCapacity - 1);

            if (currentSiteLoad >= siteCapacity)
            {
                await _alertService.CloseAlertAsync(anchorStockId, nameof(AlertType.SITE_CAPACITY_NEAR_MAXIMUM), ct);

                await _alertService.UpsertOpenAlertAsync(
                    anchorStockId,
                    nameof(AlertType.SITE_CAPACITY_MAXIMUM),
                    "Critical",
                    $"Capacité maximale du site atteinte pour {siteNom}. Charge actuelle: {currentSiteLoad}, capacité: {siteCapacity}.",
                    ct);
            }
            else if (currentSiteLoad >= nearMaxThreshold)
            {
                await _alertService.CloseAlertAsync(anchorStockId, nameof(AlertType.SITE_CAPACITY_MAXIMUM), ct);

                await _alertService.UpsertOpenAlertAsync(
                    anchorStockId,
                    nameof(AlertType.SITE_CAPACITY_NEAR_MAXIMUM),
                    "Warning",
                    $"Capacité du site proche du maximum pour {siteNom}. Charge actuelle: {currentSiteLoad}, seuil proche max: {nearMaxThreshold}, capacité: {siteCapacity}.",
                    ct);
            }
            else
            {
                await _alertService.CloseAlertAsync(anchorStockId, nameof(AlertType.SITE_CAPACITY_MAXIMUM), ct);
                await _alertService.CloseAlertAsync(anchorStockId, nameof(AlertType.SITE_CAPACITY_NEAR_MAXIMUM), ct);
            }
        }
    }
}
