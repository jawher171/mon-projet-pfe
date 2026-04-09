using System;
using System.Collections.Generic;

namespace Application.Dtos
{
    public class DashboardEtlFilterDto
    {
        public string? SiteType { get; set; }
        public string? SiteId { get; set; }
        public string? CategoryId { get; set; }
        public string? ProductId { get; set; }
        public string? DateRange { get; set; }
    }

    public class DashboardChartDatasetDto
    {
        public string? Label { get; set; }
        public List<double> Data { get; set; } = new List<double>();
        public object? BackgroundColor { get; set; }
        public object? BorderColor { get; set; }
        public bool? Fill { get; set; }
        public double? Tension { get; set; }
        public double? BorderRadius { get; set; }
        public double? BorderWidth { get; set; }
    }

    public class DashboardChartDataDto
    {
        public List<string> Labels { get; set; } = new List<string>();
        public List<DashboardChartDatasetDto> Datasets { get; set; } = new List<DashboardChartDatasetDto>();
    }

    public class DashboardReplenishmentItemDto
    {
        public Guid StockId { get; set; }
        public string ProduitNom { get; set; } = string.Empty;
        public string SiteNom { get; set; } = string.Empty;
        public int QuantiteDisponible { get; set; }
        public int SeuilMinimum { get; set; }
        public int SeuilAlerte { get; set; }
        public int SeuilMaximum { get; set; }
        public int QteAReapprovisionner { get; set; }
        public string Status { get; set; } = "normal";
        public double? Prix { get; set; }
    }

    public class DashboardRecentMovementDto
    {
        public Guid Id { get; set; }
        public DateTime Date { get; set; }
        public string Type { get; set; } = "unknown";
        public string ProduitNom { get; set; } = "Produit inconnu";
        public string SiteNom { get; set; } = "Site inconnu";
        public int Quantite { get; set; }
        public string Raison { get; set; } = string.Empty;
        public string Utilisateur { get; set; } = "-";
    }

    public class DashboardTopAlertEntryDto
    {
        public string Name { get; set; } = string.Empty;
        public int Count { get; set; }
    }

    public class DashboardEtlDto
    {
        public int TotalStockDisponible { get; set; }
        public double ValeurTotaleStock { get; set; }
        public int NombreProduits { get; set; }
        public int NombreSitesActifs { get; set; }
        public int NombreUtilisateursActifs { get; set; }

        public int TotalMouvements { get; set; }
        public int TotalMouvementsBruts { get; set; }
        public int TotalMouvementsIgnores { get; set; }
        public int TotalEntrees { get; set; }
        public int TotalSorties { get; set; }
        public int TotalTransferts { get; set; }
        public int EntreesQuantite { get; set; }
        public int SortiesQuantite { get; set; }
        public int TransfertsQuantite { get; set; }
        public int NetVariationQuantite { get; set; }

        public int TotalAlertesActives { get; set; }
        public int TotalAlertesCritiques { get; set; }
        public int TauxAlertesResolues { get; set; }
        public List<DashboardTopAlertEntryDto> TopAlertProducts { get; set; } = new List<DashboardTopAlertEntryDto>();
        public List<DashboardTopAlertEntryDto> TopAlertSites { get; set; } = new List<DashboardTopAlertEntryDto>();

        public int ProduitsEnRupture { get; set; }
        public int ProduitsCritiques { get; set; }
        public int ProduitsEnAlerte { get; set; }
        public int ProduitsSousSeuil { get; set; }
        public int ProduitsSurStock { get; set; }
        public int ProduitsNormaux { get; set; }

        public List<DashboardReplenishmentItemDto> ReplenishmentItems { get; set; } = new List<DashboardReplenishmentItemDto>();
        public List<DashboardRecentMovementDto> RecentMovements { get; set; } = new List<DashboardRecentMovementDto>();

        public DashboardChartDataDto StockHealthChart { get; set; } = new DashboardChartDataDto();
        public DashboardChartDataDto ProductStockChart { get; set; } = new DashboardChartDataDto();
        public DashboardChartDataDto MovementTrendChart { get; set; } = new DashboardChartDataDto();

        public DateTime LastRefresh { get; set; }
        public DashboardEtlFilterDto ActiveFilter { get; set; } = new DashboardEtlFilterDto();
    }
}
