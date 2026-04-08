using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Application.Dtos;
using Application.Security;
using Data.Context;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Domain.Models;

namespace Application.Controllers
{
    /// <summary>Roles and permissions API. Aligns with frontend Settings (role.model, Permission codes).</summary>
    [Route("api/[controller]")]
    [ApiController]
    [PermissionAuthorize("manage_roles")]
    public class RolesController : ControllerBase
    {
        private readonly AppDbContext _context;

        // Canonical permissions expected by frontend and API access model.
        private static readonly (string Code, string Description)[] PermissionCatalog = new[]
        {
            ("view_dashboard", "Voir le tableau de bord"),
            ("manage_movements", "Gérer les mouvements"),
            ("view_movements", "Voir les mouvements"),
            ("manage_alerts", "Gérer les alertes"),
            ("view_alerts", "Voir les alertes"),
            ("manage_products", "Gérer les produits"),
            ("view_products", "Voir les produits"),
            ("manage_sites", "Gérer les sites"),
            ("view_sites", "Voir les sites"),
            ("manage_stocks", "Gérer les stocks"),
            ("view_stocks", "Voir les stocks"),
            ("scan_barcode", "Utiliser le scanner"),
            ("manage_users", "Gérer les utilisateurs"),
            ("manage_roles", "Gérer les rôles"),
            ("view_reports", "Voir les rapports"),
            ("view_reapprovisionnement", "Voir le réapprovisionnement"),
            ("manage_reapprovisionnement", "Gérer le réapprovisionnement")
        };

        private static readonly string[] DeprecatedPermissionCodes =
        {
            "basic_entry_exit"
        };

        public RolesController(AppDbContext context)
        {
            _context = context;
        }

        /// <summary>Get all roles with their permissions. Frontend Settings uses this for role-permission management.</summary>
        [HttpGet]
        public async Task<IEnumerable<RoleDto>> GetRoles()
        {
            await EnsurePermissionCatalogAsync();

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

        /// <summary>Get full permission catalog from DB (auto-synced with canonical codes).</summary>
        [HttpGet("permissions")]
        public async Task<IEnumerable<PermissionDto>> GetPermissions()
        {
            await EnsurePermissionCatalogAsync();

            var permissions = await _context.permission
                .OrderBy(p => p.Code_p)
                .Select(p => new PermissionDto
                {
                    Code = p.Code_p,
                    Description = p.Description
                })
                .ToListAsync();

            return permissions;
        }

        /// <summary>Update permissions for a role. Frontend Settings calls this when toggling permissions.</summary>
        [HttpPut("{roleName}/permissions")]
        public async Task<IActionResult> UpdateRolePermissions(string roleName, [FromBody] UpdateRolePermissionsRequest request)
        {
            if (string.IsNullOrWhiteSpace(roleName))
                return BadRequest(new { message = "Role name is required." });

            await EnsurePermissionCatalogAsync();

            var role = await _context.role
                .Include(r => r.RolePermissions)
                .ThenInclude(rp => rp.Permission)
                .FirstOrDefaultAsync(r => r.Nom.ToLower() == roleName.Trim().ToLower());

            if (role == null)
                return NotFound(new { message = "Role not found." });

            var permissions = request?.Permissions ?? new List<string>();
            var existingPermIds = await _context.permission
                .Where(p => permissions.Contains(p.Code_p))
                .ToDictionaryAsync(p => p.Code_p, p => p.permissionId);

            // Auto-create any permission codes that don't exist yet in the Permission table
            var missingCodes = permissions.Distinct().Where(c => !existingPermIds.ContainsKey(c)).ToList();
            foreach (var code in missingCodes)
            {
                var newPerm = new Domain.Models.Permission
                {
                    permissionId = Guid.NewGuid(),
                    Code_p = code,
                    Description = BuildDefaultPermissionDescription(code)
                };
                _context.permission.Add(newPerm);
                existingPermIds[code] = newPerm.permissionId;
            }

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

        private async Task EnsurePermissionCatalogAsync()
        {
            var changed = false;

            var existingPermissions = await _context.permission.ToListAsync();
            var existingSet = new HashSet<string>(existingPermissions.Select(p => p.Code_p), StringComparer.OrdinalIgnoreCase);
            var catalogMap = PermissionCatalog.ToDictionary(
                p => p.Code,
                p => p.Description,
                StringComparer.OrdinalIgnoreCase);

            var missing = PermissionCatalog
                .Where(p => !existingSet.Contains(p.Code))
                .ToList();

            if (missing.Count == 0)
            {
                // no-op: keep evaluating deprecated cleanup below
            }
            else
            {
                foreach (var item in missing)
                {
                    _context.permission.Add(new Permission
                    {
                        permissionId = Guid.NewGuid(),
                        Code_p = item.Code,
                        Description = item.Description
                    });
                }
                changed = true;
            }

            foreach (var permission in existingPermissions)
            {
                if (string.IsNullOrWhiteSpace(permission.Code_p))
                    continue;

                if (catalogMap.TryGetValue(permission.Code_p, out var canonicalDescription))
                {
                    if (!string.Equals(permission.Description, canonicalDescription, StringComparison.Ordinal))
                    {
                        permission.Description = canonicalDescription;
                        changed = true;
                    }
                    continue;
                }

                var normalizedDescription = BuildDefaultPermissionDescription(permission.Code_p);
                if (!string.Equals(permission.Description, normalizedDescription, StringComparison.Ordinal))
                {
                    permission.Description = normalizedDescription;
                    changed = true;
                }
            }

            var deprecatedPermissions = await _context.permission
                .Where(p => DeprecatedPermissionCodes.Contains(p.Code_p))
                .ToListAsync();

            if (deprecatedPermissions.Count > 0)
            {
                var deprecatedIds = deprecatedPermissions
                    .Select(p => p.permissionId)
                    .ToList();

                var rolePermissionLinks = await _context.rolepermission
                    .Where(rp => deprecatedIds.Contains(rp.permissionId))
                    .ToListAsync();

                if (rolePermissionLinks.Count > 0)
                {
                    _context.rolepermission.RemoveRange(rolePermissionLinks);
                    changed = true;
                }

                _context.permission.RemoveRange(deprecatedPermissions);
                changed = true;
            }

            if (changed)
            {
                await _context.SaveChangesAsync();
            }
        }

        private static string BuildDefaultPermissionDescription(string code)
        {
            if (string.IsNullOrWhiteSpace(code))
                return string.Empty;

            var normalized = code.Trim().ToLowerInvariant();

            if (normalized.StartsWith("view_"))
            {
                var target = normalized.Substring("view_".Length).Replace("_", " ");
                return $"Voir {target}";
            }

            if (normalized.StartsWith("manage_"))
            {
                var target = normalized.Substring("manage_".Length).Replace("_", " ");
                return $"Gérer {target}";
            }

            if (normalized.StartsWith("scan_"))
            {
                var target = normalized.Substring("scan_".Length).Replace("_", " ");
                return $"Utiliser {target}";
            }

            return normalized.Replace("_", " ");
        }

        /// <summary>Create a new role. Returns 409 if role name already exists.</summary>
        [HttpPost]
        public async Task<IActionResult> CreateRole([FromBody] CreateRoleRequest request)
        {
            if (string.IsNullOrWhiteSpace(request?.Nom))
                return BadRequest(new { message = "Le nom du rôle est obligatoire." });

            var normalized = request.Nom.Trim().ToLower();
            var exists = await _context.role.AnyAsync(r => r.Nom.ToLower() == normalized);
            if (exists)
                return Conflict(new { message = "Ce rôle existe déjà." });

            var role = new Domain.Models.Role
            {
                RoleId = Guid.NewGuid(),
                Nom = normalized,
                Description = request.Description?.Trim()
            };
            _context.role.Add(role);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetRoles), new RoleDto
            {
                Nom = role.Nom,
                Description = role.Description,
                Permissions = new List<string>()
            });
        }

        /// <summary>Delete a role. Returns 400 if role is assigned to users (cannot delete used role).</summary>
        [HttpDelete("{roleName}")]
        public async Task<IActionResult> DeleteRole(string roleName)
        {
            if (string.IsNullOrWhiteSpace(roleName))
                return BadRequest(new { message = "Le nom du rôle est obligatoire." });

            var role = await _context.role
                .Include(r => r.RolePermissions)
                .Include(r => r.Users)
                .FirstOrDefaultAsync(r => r.Nom.ToLower() == roleName.Trim().ToLower());

            if (role == null)
                return NotFound(new { message = "Rôle introuvable." });

            if (role.Users != null && role.Users.Any())
                return BadRequest(new { message = "Impossible de supprimer ce rôle car il est assigné à des utilisateurs." });

            _context.rolepermission.RemoveRange(role.RolePermissions);
            _context.role.Remove(role);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }

    public class CreateRoleRequest
    {
        public string Nom { get; set; } = string.Empty;
        public string? Description { get; set; }
    }

    public class UpdateRolePermissionsRequest
    {
        public List<string> Permissions { get; set; } = new List<string>();
    }

    public class PermissionDto
    {
        public string Code { get; set; } = string.Empty;
        public string? Description { get; set; }
    }
}
