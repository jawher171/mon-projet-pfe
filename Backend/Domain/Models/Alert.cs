using System;
using System.Collections.Generic;
using System.Text;

namespace Domain.Models
{
    /// <summary>Stock alert with deduplication via Fingerprint. Severity: Info/Warning/Critical. Status: Open/Closed.</summary>
    public class Alert
    {
        public Guid Id_a { get; set; }
        public string Type { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public DateTime DateCreation { get; set; } = DateTime.UtcNow;
        public bool Resolue { get; set; }
        /// <summary>Info, Warning, Critical</summary>
        public string Severity { get; set; } = "Info";
        /// <summary>Open or Closed</summary>
        public string Status { get; set; } = "Open";
        /// <summary>Dedup key: "{Type}|{id_s}"</summary>
        public string Fingerprint { get; set; } = string.Empty;
        /// <summary>When the alert was closed (null if still open).</summary>
        public DateTime? ClosedAt { get; set; }
        public Guid id_s { get; set; }

        public Stock Stock { get; set; } = null!;
    }
}
