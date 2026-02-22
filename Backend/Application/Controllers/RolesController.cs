using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Application.Dtos;
using Data.Context;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Application.Controllers
{
    /// <summary>Roles and permissions API. Aligns with frontend Settings (role.model, Permission codes).</summary>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "admin")]
    public class RolesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public RolesController(AppDbContext context)
        {
            _context = context;
        }

        /// <summary>Get all roles with their permissions. Frontend Settings uses this for role-permission management.</summary>
        [HttpGet]
        public async Task<IEnumerable<RoleDto>> GetRoles()
        {
            var roles = await _context.role
                .Include(r => r.RolePermissions)
                .ThenInclude(rp => rp.Permission)
                .ToListAsync();

            return roles.Select(r => new RoleDto
            {
                Nom = r.Nom,
                Description = r.Description,
                Permissions = r.RolePermissions
                    .Where(rp => rp.Permission != null && !string.IsNullOrEmpty(rp.Permission.Code_p))
                    .Select(rp => rp.Permission!.Code_p)
                    .Distinct()
                    .ToList()
            });
        }

        /// <summary>Update permissions for a role. Frontend Settings calls this when toggling permissions.</summary>
        [HttpPut("{roleName}/permissions")]
        public async Task<IActionResult> UpdateRolePermissions(string roleName, [FromBody] UpdateRolePermissionsRequest request)
        {
            if (string.IsNullOrWhiteSpace(roleName))
                return BadRequest(new { message = "Role name is required." });

            var role = await _context.role
                .Include(r => r.RolePermissions)
                .ThenInclude(rp => rp.Permission)
                .FirstOrDefaultAsync(r => r.Nom == roleName.Trim());

            if (role == null)
                return NotFound(new { message = "Role not found." });

            var permissions = request?.Permissions ?? new List<string>();
            var existingPermIds = await _context.permission
                .Where(p => permissions.Contains(p.Code_p))
                .ToDictionaryAsync(p => p.Code_p, p => p.permissionId);

            _context.rolepermission.RemoveRange(role.RolePermissions);

            foreach (var code in permissions.Distinct())
            {
                if (existingPermIds.TryGetValue(code, out var permId))
                {
                    _context.rolepermission.Add(new Domain.Models.RolePermission
                    {
                        id_RP = Guid.NewGuid(),
                        RoleId = role.RoleId,
                        permissionId = permId,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }

            await _context.SaveChangesAsync();

            var updated = await _context.role
                .Include(r => r.RolePermissions)
                .ThenInclude(rp => rp.Permission)
                .FirstAsync(r => r.RoleId == role.RoleId);

            var dto = new RoleDto
            {
                Nom = updated.Nom,
                Description = updated.Description,
                Permissions = updated.RolePermissions
                    .Where(rp => rp.Permission != null && !string.IsNullOrEmpty(rp.Permission.Code_p))
                    .Select(rp => rp.Permission!.Code_p)
                    .Distinct()
                    .ToList()
            };

            return Ok(dto);
        }
    }

    public class UpdateRolePermissionsRequest
    {
        public List<string> Permissions { get; set; } = new List<string>();
    }
}
