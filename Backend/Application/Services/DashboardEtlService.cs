using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Application.Dtos;
using Domain.Models;
using Domain.Queries;
using MediatR;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;

namespace Application.Services
{
    /// <summary>
    /// Dashboard ETL: extract from operational entities, transform to dashboard snapshot, then load to a JSON cache file.
    /// </summary>
    public class DashboardEtlService : IDashboardEtlService
    {
        private class NormalizedMovement
        {
            public StockMovement Movement { get; set; } = null!;
            public string NormalizedType { get; set; } = "unknown";
            public int Quantity { get; set; }
        }

        private const string CacheDirectoryName = "App_Data";
        private const string CacheFileName = "dashboard-etl-snapshot.json";

        private readonly IMediator _mediator;
        private readonly IWebHostEnvironment _environment;

        public DashboardEtlService(IMediator mediator, IWebHostEnvironment environment)
        {
            _mediator = mediator;
            _environment = environment;
        }

        public async Task<DashboardEtlDto> BuildSnapshotAsync(DashboardEtlFilterDto filter, CancellationToken cancellationToken = default)
        {
            filter = filter ?? new DashboardEtlFilterDto();

            // EXTRACT: read source entities from the operational model.
            var stocks = (await _mediator.Send(
                new GetListGenericQuery<Stock>(
                    condition: x => true,
                    includes: i => i
                        .Include(x => x.Produit)
                            .ThenInclude(p => p.Categorie)
                        .Include(x => x.Site)),
                cancellationToken)).ToList();

            var products = (await _mediator.Send(
                new GetListGenericQuery<Product>(
                    condition: x => true,
                    includes: i => i.Include(x => x.Categorie)),
                cancellationToken)).ToList();

            var alerts = (await _mediator.Send(
                new GetListGenericQuery<Alert>(
                    condition: x => true,
                    includes: i => i
                        .Include(x => x.Stock)
                            .ThenInclude(s => s.Produit)
                        .Include(x => x.Stock)
                            .ThenInclude(s => s.Site)),
                cancellationToken)).ToList();

            var movements = (await _mediator.Send(
                new GetListGenericQuery<StockMovement>(
                    condition: x => true,
                    includes: i => i
                        .Include(x => x.Stock)
                            .ThenInclude(s => s.Produit)
                        .Include(x => x.Stock)
                            .ThenInclude(s => s.Site)
                        .Include(x => x.Utilisateur)),
                cancellationToken)).ToList();

            var sites = (await _mediator.Send(
                new GetListGenericQuery<Site>(condition: x => true),
                cancellationToken)).ToList();

            var users = (await _mediator.Send(
                new GetListGenericQuery<User>(condition: x => true),
                cancellationToken)).ToList();

            var productPriceMap = products.ToDictionary(p => p.id_p, p => p.Prix);
            var productCategoryMap = products.ToDictionary(p => p.id_p, p => p.id_c);

            // TRANSFORM: apply filters and normalize source rows for KPI computation.
            var filteredProducts = products.Where(p => MatchesProductFilters(p, filter)).ToList();
            var filteredStocks = stocks.Where(s => MatchesStockFilters(s, filter, productCategoryMap)).ToList();
            var filteredMovements = movements.Where(m => MatchesMovementFilters(m, filter, productCategoryMap)).ToList();
            var filteredAlerts = alerts.Where(a => MatchesAlertFilters(a, filter, productCategoryMap)).ToList();

            var normalizedMovements = filteredMovements
                .Select(m => new NormalizedMovement
                {
                    Movement = m,
                    NormalizedType = NormalizeMovementType(m.Type, m.Raison, m.Destination),
                    Quantity = Math.Abs(m.Quantite)
                })
                .ToList();

            var movementEntries = normalizedMovements.Where(x => x.NormalizedType == "entry").ToList();
            var movementExits = normalizedMovements.Where(x => x.NormalizedType == "exit").ToList();
            var movementTransfers = normalizedMovements.Where(x => x.NormalizedType == "transfer").ToList();
            var ignoredMovements = normalizedMovements.Count(x => x.NormalizedType == "unknown");

            var allAlertsCount = filteredAlerts.Count;
            var activeAlerts = filteredAlerts.Where(a => !a.Resolue && string.Equals(a.Status, "Open", StringComparison.OrdinalIgnoreCase)).ToList();
            var resolvedAlerts = filteredAlerts.Where(a => a.Resolue || string.Equals(a.Status, "Closed", StringComparison.OrdinalIgnoreCase)).ToList();
            var criticalAlerts = activeAlerts.Where(a => string.Equals(a.Severity, "critical", StringComparison.OrdinalIgnoreCase)).ToList();

            var ruptureStocks = filteredStocks.Where(s => s.QuantiteDisponible == 0).ToList();
            var criticalStocks = filteredStocks.Where(s => s.QuantiteDisponible > 0 && s.QuantiteDisponible <= s.SeuilMinimum).ToList();
            var warningStocks = filteredStocks.Where(s => s.QuantiteDisponible > s.SeuilMinimum && s.QuantiteDisponible <= s.SeuilAlerte).ToList();
            var lowStocks = filteredStocks.Where(s => s.SeuilAlerte > 0 && s.QuantiteDisponible <= s.SeuilAlerte).ToList();
            var overStocks = filteredStocks.Where(s => s.SeuilMaximum > 0 && s.QuantiteDisponible > s.SeuilMaximum).ToList();
            var normalStocksCount = Math.Max(0, filteredStocks.Count - ruptureStocks.Count - criticalStocks.Count - warningStocks.Count - overStocks.Count);

            // TRANSFORM: materialize transformed data into a dashboard snapshot DTO.
            var dashboard = new DashboardEtlDto
            {
                TotalStockDisponible = filteredStocks.Sum(s => s.QuantiteDisponible),
                ValeurTotaleStock = filteredStocks.Sum(s => s.QuantiteDisponible * ResolvePrice(productPriceMap, s.id_p)),
                NombreProduits = filteredProducts.Count,
                NombreSitesActifs = sites.Count,
                NombreUtilisateursActifs = users.Count(u => u.Status),

                TotalMouvements = movementEntries.Count + movementExits.Count + movementTransfers.Count,
                TotalMouvementsBruts = filteredMovements.Count,
                TotalMouvementsIgnores = ignoredMovements,
                TotalEntrees = movementEntries.Count,
                TotalSorties = movementExits.Count,
                TotalTransferts = movementTransfers.Count,
                EntreesQuantite = movementEntries.Sum(x => x.Quantity),
                SortiesQuantite = movementExits.Sum(x => x.Quantity),
                TransfertsQuantite = movementTransfers.Sum(x => x.Quantity),
                NetVariationQuantite = movementEntries.Sum(x => x.Quantity) - movementExits.Sum(x => x.Quantity),

                TotalAlertesActives = activeAlerts.Count,
                TotalAlertesCritiques = criticalAlerts.Count,
                TauxAlertesResolues = allAlertsCount == 0 ? 100 : (int)Math.Round((double)resolvedAlerts.Count / allAlertsCount * 100d),
                TopAlertProducts = BuildTopAlertProducts(activeAlerts),
                TopAlertSites = BuildTopAlertSites(activeAlerts),

                ProduitsEnRupture = ruptureStocks.Count,
                ProduitsCritiques = criticalStocks.Count,
                ProduitsEnAlerte = warningStocks.Count,
                ProduitsSousSeuil = lowStocks.Count,
                ProduitsSurStock = overStocks.Count,
                ProduitsNormaux = normalStocksCount,

                ReplenishmentItems = BuildReplenishmentItems(filteredStocks, productPriceMap),
                RecentMovements = BuildRecentMovements(normalizedMovements),

                StockHealthChart = BuildStockHealthChart(ruptureStocks.Count, criticalStocks.Count, warningStocks.Count, overStocks.Count, normalStocksCount),
                ProductStockChart = BuildProductStockChart(filteredStocks),
                MovementTrendChart = BuildMovementTrendChart(normalizedMovements, filter.DateRange),

                LastRefresh = DateTime.UtcNow,
                ActiveFilter = new DashboardEtlFilterDto
                {
                    SiteType = filter.SiteType,
                    SiteId = filter.SiteId,
                    CategoryId = filter.CategoryId,
                    ProductId = filter.ProductId,
                    DateRange = filter.DateRange
                }
            };

            // LOAD: persist the ETL result as a JSON snapshot cache.
            await WriteSnapshotToCacheAsync(dashboard, cancellationToken);
            return dashboard;
        }

        private static double ResolvePrice(IReadOnlyDictionary<Guid, double> priceMap, Guid productId)
        {
            return priceMap.TryGetValue(productId, out var price) ? price : 0d;
        }

        private static bool MatchesProductFilters(Product product, DashboardEtlFilterDto filter)
        {
            if (TryParseGuid(filter.ProductId, out var productId) && product.id_p != productId)
                return false;

            if (TryParseGuid(filter.CategoryId, out var categoryId) && product.id_c != categoryId)
                return false;

            return true;
        }

        private static bool MatchesStockFilters(Stock stock, DashboardEtlFilterDto filter, IReadOnlyDictionary<Guid, Guid> productCategoryMap)
        {
            if (!MatchesSiteFilters(stock.Site, filter))
                return false;

            if (TryParseGuid(filter.ProductId, out var productId) && stock.id_p != productId)
                return false;

            if (TryParseGuid(filter.CategoryId, out var categoryId))
            {
                if (!productCategoryMap.TryGetValue(stock.id_p, out var stockCategoryId) || stockCategoryId != categoryId)
                    return false;
            }

            return true;
        }

        private static bool MatchesMovementFilters(StockMovement movement, DashboardEtlFilterDto filter, IReadOnlyDictionary<Guid, Guid> productCategoryMap)
        {
            if (!IsWithinDateRange(movement.DateMouvement, filter.DateRange))
                return false;

            var stock = movement.Stock;
            if (stock == null)
                return false;

            if (!MatchesSiteFilters(stock.Site, filter))
                return false;

            if (TryParseGuid(filter.ProductId, out var productId) && stock.id_p != productId)
                return false;

            if (TryParseGuid(filter.CategoryId, out var categoryId))
            {
                if (!productCategoryMap.TryGetValue(stock.id_p, out var stockCategoryId) || stockCategoryId != categoryId)
                    return false;
            }

            return true;
        }

        private static bool MatchesAlertFilters(Alert alert, DashboardEtlFilterDto filter, IReadOnlyDictionary<Guid, Guid> productCategoryMap)
        {
            if (!IsWithinDateRange(alert.DateCreation, filter.DateRange))
                return false;

            var stock = alert.Stock;
            if (stock == null)
                return false;

            if (!MatchesSiteFilters(stock.Site, filter))
                return false;

            if (TryParseGuid(filter.ProductId, out var productId) && stock.id_p != productId)
                return false;

            if (TryParseGuid(filter.CategoryId, out var categoryId))
            {
                if (!productCategoryMap.TryGetValue(stock.id_p, out var stockCategoryId) || stockCategoryId != categoryId)
                    return false;
            }

            return true;
        }

        private static bool MatchesSiteFilters(Site? site, DashboardEtlFilterDto filter)
        {
            if (site == null)
                return false;

            if (TryParseGuid(filter.SiteId, out var siteId) && site.Id_site != siteId)
                return false;

            var requestedSiteType = NormalizeSiteType(filter.SiteType);
            if (string.IsNullOrWhiteSpace(requestedSiteType) || requestedSiteType == "all")
                return true;

            return NormalizeSiteType(site.Type) == requestedSiteType;
        }

        private static string NormalizeSiteType(string? value)
        {
            var normalized = (value ?? string.Empty).Trim().ToLowerInvariant();
            if (normalized == "warehouse" || normalized == "entrepot" || normalized == "entrepôt" || normalized == "depot")
                return "warehouse";
            if (normalized == "store" || normalized == "magasin")
                return "store";
            return normalized;
        }

        private static string NormalizeMovementType(string? type, string? reason, string? destination)
        {
            var normalizedType = (type ?? string.Empty).Trim().ToLowerInvariant();
            if (normalizedType == "entry" || normalizedType == "exit" || normalizedType == "transfer")
                return normalizedType;

            var normalizedReason = (reason ?? string.Empty).Trim().ToLowerInvariant();
            if (normalizedReason.Contains("transfer") || normalizedReason.Contains("transfert"))
                return "transfer";
            if (normalizedReason.Contains("sortie") || normalizedReason.Contains("exit"))
                return "exit";
            if (normalizedReason.Contains("entree") || normalizedReason.Contains("entrée") || normalizedReason.Contains("entry"))
                return "entry";

            if (!string.IsNullOrWhiteSpace(destination))
                return "transfer";

            return "unknown";
        }

        private static bool IsWithinDateRange(DateTime date, string? dateRange)
        {
            var range = (dateRange ?? string.Empty).Trim().ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(range) || range == "all")
                return true;

            var now = DateTime.UtcNow;
            var target = date.ToUniversalTime();

            if (range == "today")
                return target.Date == now.Date;
            if (range == "7days")
                return target >= now.AddDays(-7);
            if (range == "30days")
                return target >= now.AddDays(-30);
            if (range == "thismonth")
                return target.Month == now.Month && target.Year == now.Year;

            return true;
        }

        private static bool TryParseGuid(string? value, out Guid id)
        {
            return Guid.TryParse(value, out id) && id != Guid.Empty;
        }

        private static List<DashboardTopAlertEntryDto> BuildTopAlertProducts(IEnumerable<Alert> activeAlerts)
        {
            return activeAlerts
                .GroupBy(a => string.IsNullOrWhiteSpace(a.Stock?.Produit?.Nom) ? "Produit inconnu" : a.Stock.Produit.Nom)
                .Select(g => new DashboardTopAlertEntryDto { Name = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .Take(5)
                .ToList();
        }

        private static List<DashboardTopAlertEntryDto> BuildTopAlertSites(IEnumerable<Alert> activeAlerts)
        {
            return activeAlerts
                .GroupBy(a => string.IsNullOrWhiteSpace(a.Stock?.Site?.Nom) ? "Site inconnu" : a.Stock.Site.Nom)
                .Select(g => new DashboardTopAlertEntryDto { Name = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .Take(5)
                .ToList();
        }

        private static List<DashboardReplenishmentItemDto> BuildReplenishmentItems(IEnumerable<Stock> stocks, IReadOnlyDictionary<Guid, double> priceMap)
        {
            var orderMap = new Dictionary<string, int>
            {
                ["rupture"] = 0,
                ["critique"] = 1,
                ["alerte"] = 2,
                ["surstock"] = 3,
                ["normal"] = 4
            };

            return stocks
                .Select(s =>
                {
                    var status = "normal";
                    if (s.QuantiteDisponible == 0)
                        status = "rupture";
                    else if (s.QuantiteDisponible <= s.SeuilMinimum)
                        status = "critique";
                    else if (s.SeuilAlerte > 0 && s.QuantiteDisponible <= s.SeuilAlerte)
                        status = "alerte";
                    else if (s.SeuilMaximum > 0 && s.QuantiteDisponible > s.SeuilMaximum)
                        status = "surstock";

                    var qteAReapprovisionner = s.SeuilMaximum > 0 ? Math.Max(0, s.SeuilMaximum - s.QuantiteDisponible) : 0;

                    return new DashboardReplenishmentItemDto
                    {
                        StockId = s.id_s,
                        ProduitNom = string.IsNullOrWhiteSpace(s.Produit?.Nom) ? "Produit" : s.Produit.Nom,
                        SiteNom = string.IsNullOrWhiteSpace(s.Site?.Nom) ? "Site" : s.Site.Nom,
                        QuantiteDisponible = s.QuantiteDisponible,
                        SeuilMinimum = s.SeuilMinimum,
                        SeuilAlerte = s.SeuilAlerte,
                        SeuilMaximum = s.SeuilMaximum,
                        QteAReapprovisionner = qteAReapprovisionner,
                        Status = status,
                        Prix = ResolvePrice(priceMap, s.id_p)
                    };
                })
                .OrderBy(item => orderMap.TryGetValue(item.Status, out var rank) ? rank : 4)
                .ToList();
        }

        private static List<DashboardRecentMovementDto> BuildRecentMovements(IEnumerable<NormalizedMovement> normalizedMovements)
        {
            return normalizedMovements
                .OrderByDescending(x => x.Movement.DateMouvement)
                .Take(10)
                .Select(x =>
                {
                    var movement = x.Movement;
                    return new DashboardRecentMovementDto
                    {
                        Id = movement.id_sm,
                        Date = movement.DateMouvement,
                        Type = x.NormalizedType,
                        ProduitNom = string.IsNullOrWhiteSpace(movement.Stock?.Produit?.Nom) ? "Produit inconnu" : movement.Stock.Produit.Nom,
                        SiteNom = string.IsNullOrWhiteSpace(movement.Stock?.Site?.Nom) ? "Site inconnu" : movement.Stock.Site.Nom,
                        Quantite = Math.Abs(movement.Quantite),
                        Raison = movement.Raison ?? string.Empty,
                        Utilisateur = ResolveUserLabel(movement.Utilisateur)
                    };
                })
                .ToList();
        }

        private static string ResolveUserLabel(User? user)
        {
            if (user == null)
                return "-";

            var fullName = $"{user.Prenom} {user.Nom}".Trim();
            if (!string.IsNullOrWhiteSpace(fullName))
                return fullName;

            return string.IsNullOrWhiteSpace(user.Email) ? "-" : user.Email;
        }

        private static DashboardChartDataDto BuildStockHealthChart(int ruptureCount, int criticalCount, int warningCount, int overStockCount, int normalCount)
        {
            return new DashboardChartDataDto
            {
                Labels = new List<string> { "En Rupture", "Critiques", "En Alerte", "En Sur-stock", "Normaux" },
                Datasets = new List<DashboardChartDatasetDto>
                {
                    new DashboardChartDatasetDto
                    {
                        Data = new List<double> { ruptureCount, criticalCount, warningCount, overStockCount, Math.Max(0, normalCount) },
                        BackgroundColor = new[] { "#ef4444", "#f97316", "#f59e0b", "#8b5cf6", "#10b981" },
                        BorderWidth = 0
                    }
                }
            };
        }

        private static DashboardChartDataDto BuildProductStockChart(IEnumerable<Stock> filteredStocks)
        {
            var grouped = filteredStocks
                .GroupBy(s => string.IsNullOrWhiteSpace(s.Produit?.Nom) ? "Inconnu" : s.Produit.Nom)
                .Select(g => new { Name = g.Key, Quantity = g.Sum(x => x.QuantiteDisponible) })
                .OrderByDescending(x => x.Quantity)
                .Take(15)
                .ToList();

            var labels = grouped.Select(x => x.Name).ToList();
            var data = grouped.Select(x => (double)x.Quantity).ToList();

            if (!labels.Any())
            {
                labels.Add("Aucune Donnee");
                data.Add(0d);
            }

            return new DashboardChartDataDto
            {
                Labels = labels,
                Datasets = new List<DashboardChartDatasetDto>
                {
                    new DashboardChartDatasetDto
                    {
                        Label = "Quantite Totale en Stock",
                        Data = data,
                        BackgroundColor = "#3b82f6",
                        BorderRadius = 4
                    }
                }
            };
        }

        private static DashboardChartDataDto BuildMovementTrendChart(IEnumerable<NormalizedMovement> normalizedMovements, string? dateRange)
        {
            var movementList = normalizedMovements.ToList();
            var (rangeStart, rangeEnd) = ResolveMovementTrendBounds(dateRange, movementList);

            var trend = new Dictionary<DateTime, (int entries, int exits, int transfers)>();
            for (var day = rangeStart; day <= rangeEnd; day = day.AddDays(1))
            {
                trend[day] = (0, 0, 0);
            }

            foreach (var item in movementList)
            {
                var movement = item.Movement;
                var movementDay = movement.DateMouvement.ToUniversalTime().Date;
                if (!trend.ContainsKey(movementDay))
                    continue;

                var current = trend[movementDay];
                if (item.NormalizedType == "entry")
                    trend[movementDay] = (current.entries + Math.Abs(movement.Quantite), current.exits, current.transfers);
                else if (item.NormalizedType == "exit")
                    trend[movementDay] = (current.entries, current.exits + Math.Abs(movement.Quantite), current.transfers);
                else if (item.NormalizedType == "transfer")
                    trend[movementDay] = (current.entries, current.exits, current.transfers + Math.Abs(movement.Quantite));
            }

            var orderedDays = trend.Keys.OrderBy(day => day).ToList();
            var labels = orderedDays.Select(day => day.ToString("dd/MM", CultureInfo.InvariantCulture)).ToList();
            var entries = orderedDays.Select(day => (double)trend[day].entries).ToList();
            var exits = orderedDays.Select(day => (double)trend[day].exits).ToList();
            var transfers = orderedDays.Select(day => (double)trend[day].transfers).ToList();

            return new DashboardChartDataDto
            {
                Labels = labels,
                Datasets = new List<DashboardChartDatasetDto>
                {
                    new DashboardChartDatasetDto
                    {
                        Label = "Entrees",
                        Data = entries,
                        BorderColor = "#059669",
                        BackgroundColor = "transparent",
                        BorderWidth = 3,
                        Fill = false,
                        Tension = 0.4
                    },
                    new DashboardChartDatasetDto
                    {
                        Label = "Sorties",
                        Data = exits,
                        BorderColor = "#dc2626",
                        BackgroundColor = "transparent",
                        BorderWidth = 3,
                        Fill = false,
                        Tension = 0.4
                    },
                    new DashboardChartDatasetDto
                    {
                        Label = "Transferts",
                        Data = transfers,
                        BorderColor = "#7c3aed",
                        BackgroundColor = "transparent",
                        BorderWidth = 3,
                        Fill = false,
                        Tension = 0.4
                    }
                }
            };
        }

        private static (DateTime Start, DateTime End) ResolveMovementTrendBounds(string? dateRange, IReadOnlyCollection<NormalizedMovement> normalizedMovements)
        {
            var today = DateTime.UtcNow.Date;
            var range = (dateRange ?? string.Empty).Trim().ToLowerInvariant();

            if (range == "today")
                return (today, today);

            if (range == "7days")
                return (today.AddDays(-6), today);

            if (range == "30days")
                return (today.AddDays(-29), today);

            if (range == "thismonth" || string.IsNullOrWhiteSpace(range))
                return (new DateTime(today.Year, today.Month, 1), today);

            if (normalizedMovements.Count == 0)
                return (today.AddDays(-9), today);

            var minDate = normalizedMovements.Min(x => x.Movement.DateMouvement.ToUniversalTime().Date);
            var maxDate = normalizedMovements.Max(x => x.Movement.DateMouvement.ToUniversalTime().Date);
            return (minDate, maxDate);
        }

        private async Task WriteSnapshotToCacheAsync(DashboardEtlDto snapshot, CancellationToken cancellationToken)
        {
            // LOAD target: App_Data/dashboard-etl-snapshot.json
            var contentRoot = _environment.ContentRootPath ?? Directory.GetCurrentDirectory();
            var cacheDir = Path.Combine(contentRoot, CacheDirectoryName);
            if (!Directory.Exists(cacheDir))
                Directory.CreateDirectory(cacheDir);

            var cachePath = Path.Combine(cacheDir, CacheFileName);
            var payload = JsonConvert.SerializeObject(snapshot, Formatting.Indented);
            await File.WriteAllTextAsync(cachePath, payload, cancellationToken);
        }
    }
}
