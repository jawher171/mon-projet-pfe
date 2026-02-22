using System;
using System.Collections.Generic;
using System.Text;

namespace Domain.Models
{
    /// <summary>Permission (e.g. code_p). Many-to-many with Role via RolePermission.</summary>
    public class Permission
    {
        public Guid  permissionId { get; set; }
        public string Code_p { get; set; } = string.Empty;
        public string? Description { get; set; }

        public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
    }
}
