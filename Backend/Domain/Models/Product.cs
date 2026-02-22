using System;
using System.Collections.Generic;
using System.Text;

namespace Domain.Models
{
    /// <summary>Product. Belongs to Category. Has Stocks per Site.</summary>
    public class Product
    {
        public Guid id_p { get; set; }
        public string Nom { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string? CodeBarre { get; set; }
        public double Prix { get; set; }
        public Guid id_c { get; set; }

        public Category Categorie { get; set; } = null!;
        public ICollection<Stock> Stocks { get; set; } = new List<Stock>();
    }
}
