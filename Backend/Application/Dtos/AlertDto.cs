using System;

namespace Application.Dtos
{
    /// <summary>DTO for Alert API responses.</summary>
    public class AlertDto
    {
        public Guid Id_a { get; set; }
        public string Type { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public DateTime DateCreation { get; set; }
        public bool Resolue { get; set; }
        public string Severity { get; set; } = "Info";
        public string Status { get; set; } = "Open";
        public string Fingerprint { get; set; } = string.Empty;
        public DateTime? ClosedAt { get; set; }
        public Guid id_s { get; set; }
        /// <summary>Product name from Stock → Produit navigation (enrichment).</summary>
        public string? ProduitNom { get; set; }
        /// <summary>Site name from Stock → Site navigation (enrichment).</summary>
        public string? SiteNom { get; set; }
    }
}
