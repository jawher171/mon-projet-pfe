using System;
using System.Collections.Generic;
using System.Text;

namespace Domain.Models
{
    /// <summary>User role (admin, gestionnaire_de_stock, operateur). Many-to-many with Permission via RolePermission.</summary>
    public class Role
    {
        public Guid RoleId { get; set; }
        public string Nom { get; set; } = string.Empty;
        public string? Description { get; set; }

        public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
        public ICollection<User> Users { get; set; } = new List<User>();
    }
}
