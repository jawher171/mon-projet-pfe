using System;

namespace Application.Dtos
{
    /// <summary>DTO for Site API responses.</summary>
    public class SiteDto
    {
        public Guid Id_site { get; set; }
        public string Nom { get; set; } = string.Empty;
        public string Adresse { get; set; } = string.Empty;
        public string Ville { get; set; } = string.Empty;
        public string code_fiscale { get; set; } = string.Empty;
        public string? Telephone { get; set; }
        public string? Email { get; set; }
        public string? ResponsableSite { get; set; }
        public string Type { get; set; } = string.Empty;
        public int? Capacite { get; set; }
    }
}
