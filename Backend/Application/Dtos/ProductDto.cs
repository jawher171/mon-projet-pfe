using System;

namespace Application.Dtos
{
    /// <summary>DTO for Product API responses. CategorieLibelle from Include.</summary>
    public class ProductDto
    {
        public Guid id_p { get; set; }
        public string Nom { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string? CodeBarre { get; set; }
        public double Prix { get; set; }
        public Guid id_c { get; set; }
        public string? CategorieLibelle { get; set; }
    }
}
