using System;
using System.Collections.Generic;
using System.Text;

namespace Domain.Models
{
    /// <summary>Warehouse or storage site. Has many Stocks.</summary>
    public class Site
    {
        public Guid Id_site { get; set; }
        public string Nom { get; set; } = string.Empty;
        public string Adresse { get; set; } = string.Empty;
        public string Ville { get; set; } = string.Empty;
        public string code_fiscale { get; set; } = string.Empty;
        public string? Telephone { get; set; }
        public string? Email { get; set; }
        public string? ResponsableSite { get; set; }
        public string Type { get; set; }
        public int? Capacite { get; set; }

        public ICollection<Stock> Stocks { get; set; } = new List<Stock>();
    }
}
