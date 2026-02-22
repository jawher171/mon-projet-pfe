using System;
using System.Collections.Generic;
using System.Text;

namespace Domain.Models
{
    /// <summary>Stock alert (e.g. below threshold). Resolue = resolved.</summary>
    public class Alert
    {
        public Guid Id_a { get; set; }
        public string Type { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public DateTime DateCreation { get; set; } = DateTime.UtcNow;
        public bool Resolue { get; set; }
        public Guid id_s { get; set; }
    
        public Stock Stock { get; set; } = null!;
    }
}
