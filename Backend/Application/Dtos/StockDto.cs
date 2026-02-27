using System;

namespace Application.Dtos
{
    /// <summary>DTO for Stock API responses. ProduitNom, SiteNom from Include.</summary>
    public class StockDto
    {
        public Guid id_s { get; set; }
        public int QuantiteDisponible { get; set; }
        public int SeuilAlerte { get; set; }
        public int SeuilSecurite { get; set; }
        public int SeuilMinimum { get; set; }
        public int SeuilMaximum { get; set; }
        public Guid id_p { get; set; }
        public Guid Id_site { get; set; }
        public string? ProduitNom { get; set; }
        public string? SiteNom { get; set; }
    }
}
