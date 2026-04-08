using System;

namespace Application.Dtos
{
    /// <summary>Scan history entry used by scanner UI. Stored server-side for user/admin visibility.</summary>
    public class ScanHistoryDto
    {
        public Guid Id { get; set; }
        public string Barcode { get; set; } = string.Empty;
        public Guid? ProductId { get; set; }
        public string? ProductName { get; set; }
        public string Status { get; set; } = "pending";
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
        public Guid CreatedByUserId { get; set; }
        public string? CreatedByUserName { get; set; }
    }
}
