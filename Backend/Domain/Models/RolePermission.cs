using System;
using System.Collections.Generic;
using System.Data;
using System.Security;
using System.Text;

namespace Domain.Models
{
    /// <summary>Junction table: Role-Permission many-to-many. Used for JWT permission claims.</summary>
    public class RolePermission
    {
        public Guid id_RP { get; set; }
        public Guid RoleId { get; set; }
        public Guid permissionId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public Role Role { get; set; } = null!;
        public Permission Permission { get; set; }
    }
}
