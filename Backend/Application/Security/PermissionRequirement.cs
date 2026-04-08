using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.AspNetCore.Authorization;

namespace Application.Security
{
    /// <summary>Authorization requirement that grants access when user has at least one listed permission.</summary>
    public sealed class PermissionRequirement : IAuthorizationRequirement
    {
        public IReadOnlyCollection<string> Permissions { get; }

        public PermissionRequirement(IEnumerable<string> permissions)
        {
            if (permissions == null) throw new ArgumentNullException(nameof(permissions));

            Permissions = permissions
                .Select(p => p?.Trim())
                .Where(p => !string.IsNullOrWhiteSpace(p))
                .Select(p => p!)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();
        }
    }
}
