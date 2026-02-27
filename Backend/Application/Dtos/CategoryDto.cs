using System;

namespace Application.Dtos
{
    /// <summary>DTO for Category API requests/responses.</summary>
    public class CategoryDto
    {
        public Guid Id { get; set; }
        public string Libelle { get; set; } = string.Empty;
    }
}
