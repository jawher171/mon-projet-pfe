using System;
using System.Collections.Generic;
using System.Text;

namespace Domain.Models
{
    /// <summary>Product category. Has many Products.</summary>
    public class Category
    {
        public Guid Id_c { get; set; }
        public string Libelle { get; set; } = string.Empty;

        public ICollection<Product> Produits { get; set; } = new List<Product>();
    }
}
