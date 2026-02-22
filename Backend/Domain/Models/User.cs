using System;
using System.Collections.Generic;
using System.Data;
using System.Text;

namespace Domain.Models
{
    /// <summary>Application user. Status: true=active, false=inactive. Links to Role.</summary>
    public class User
    {
        public Guid Id_u { get; set; }
        public string Nom { get; set; } = string.Empty;
        public string Prenom { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string MotDePasse { get; set; } = string.Empty;
        public bool Status { get; set; } = true; // true=active, false=inactive
        public Guid RoleId { get; set; }
        public DateTime? LastLogin { get; set; }

        public Role Role { get; set; } = null!;
        public ICollection<StockMovement> MouvementsStock { get; set; } = new List<StockMovement>();
    }
}
