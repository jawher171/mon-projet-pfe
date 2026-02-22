using System;

namespace Application.Dtos
{
    /// <summary>DTO for Alert API responses.</summary>
    public class AlertDto
    {
        public Guid Id_a { get; set; }
        public string Type { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public DateTime DateCreation { get; set; }
        public bool Resolue { get; set; }
        public Guid id_s { get; set; }
    }
}
