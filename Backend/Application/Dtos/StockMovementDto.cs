using System;

namespace Application.Dtos
{
    /// <summary>DTO for StockMovement API requests/responses. Type: entry | exit.</summary>
    public class StockMovementDto
    {
        public Guid id_sm { get; set; }
        public DateTime DateMouvement { get; set; }
        public string Raison { get; set; } = string.Empty;
        public int Quantite { get; set; }
        public string Type { get; set; } = "entry";
        public string? Note { get; set; }
        public Guid Id_s { get; set; }
        public Guid Id_u { get; set; }

        // Frontend-friendly fields
        public Guid? ProductId { get; set; }
        public Guid? SiteId { get; set; }
        public string? ProduitNom { get; set; }
        public string? SiteNom { get; set; }
        public string? UtilisateurNom { get; set; }
    }
}
