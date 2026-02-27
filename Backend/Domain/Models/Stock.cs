using System;
using System.Collections.Generic;
using System.Text;

namespace Domain.Models
{
    /// <summary>Stock = Product x Site. Quantity + alert threshold. Has movements and alerts.</summary>
    public class Stock
    {
        public Guid id_s { get; set; }
        public int QuantiteDisponible { get; set; }
        public int SeuilAlerte { get; set; }
        public int SeuilSecurite { get; set; }
        public int SeuilMinimum { get; set; }
        public int SeuilMaximum { get; set; }
        public Guid id_p { get; set; }
        public Guid Id_site { get; set; }

        public Product Produit { get; set; } = null!;
        public Site Site { get; set; } = null!;
        public ICollection<StockMovement> MouvementsStock { get; set; } = new List<StockMovement>();
        public ICollection<Alert> Alertes { get; set; } = new List<Alert>();
    }
}
