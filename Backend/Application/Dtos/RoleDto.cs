using System.Collections.Generic;

namespace Application.Dtos
{
    /// <summary>Role with permissions for Settings/API alignment with frontend.</summary>
    public class RoleDto
    {
        public string Nom { get; set; } = string.Empty;
        public string? Description { get; set; }
        public List<string> Permissions { get; set; } = new List<string>();
    }
}
