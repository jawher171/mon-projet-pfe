using System;
using System.Collections;
using System.Collections.Generic;
using System.Text;

namespace Domain.Models
{
    /// <summary>Stock movement (entry/exit). Type: "entry" or "exit". Linked to Stock and User.</summary>
    public class StockMovement
    {
        public Guid id_sm { get; set; }
        public DateTime DateMouvement { get; set; } = DateTime.UtcNow;
        public string Raison { get; set; } = string.Empty;
        public int Quantite { get; set; }
        /// <summary>Movement direction: "entry" or "exit". Aligns with frontend type.</summary>
        public string Type { get; set; } = "entry";
        public string? Note { get; set; }
        public Guid Id_s { get; set; }
        public Guid Id_u { get; set; }
        public Stock Stock { get; set; } = null!;
        public User Utilisateur { get; set; } = null!;
    }
}
