using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Data.Context;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;

namespace Application.Security
{
    /// <summary>Resolves effective permissions from database, so role permission changes apply immediately.</summary>
    public sealed class PermissionAuthorizationHandler : AuthorizationHandler<PermissionRequirement>
    {
        private readonly AppDbContext _context;

        public PermissionAuthorizationHandler(AppDbContext context)
        {
            _context = context;
        }

        protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context, PermissionRequirement requirement)
        {
            if (context.User?.Identity == null || !context.User.Identity.IsAuthenticated)
            {
                return;
            }

            if (requirement.Permissions == null || requirement.Permissions.Count == 0)
            {
                return;
            }

            var userIdRaw = context.User.FindFirstValue(ClaimTypes.NameIdentifier)
                            ?? context.User.FindFirstValue("sub");

            if (!Guid.TryParse(userIdRaw, out var userId))
            {
                return;
            }

            var required = requirement.Permissions
                .Select(p => p.Trim())
                .Where(p => !string.IsNullOrWhiteSpace(p))
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            if (required.Count == 0)
            {
                return;
            }

            var hasAnyPermission = await _context.users
                .Where(u => u.Id_u == userId)
                .SelectMany(u => u.Role.RolePermissions)
                .Where(rp => rp.Permission != null)
                .Select(rp => rp.Permission!.Code_p)
                .AnyAsync(code => required.Contains(code));

            if (hasAnyPermission)
            {
                context.Succeed(requirement);
            }
        }
    }
}
