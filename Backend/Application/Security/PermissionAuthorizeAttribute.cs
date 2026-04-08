using System;
using System.Linq;
using Microsoft.AspNetCore.Authorization;

namespace Application.Security
{
    /// <summary>Use dynamic permission policies without hardcoding role names in controllers.</summary>
    [AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true, Inherited = true)]
    public sealed class PermissionAuthorizeAttribute : AuthorizeAttribute
    {
        internal const string PolicyPrefix = "PermissionAny:";

        public PermissionAuthorizeAttribute(params string[] permissions)
        {
            if (permissions == null || permissions.Length == 0)
            {
                throw new ArgumentException("At least one permission must be provided.", nameof(permissions));
            }

            var normalized = permissions
                .Select(p => p?.Trim())
                .Where(p => !string.IsNullOrWhiteSpace(p));

            Policy = PolicyPrefix + string.Join(",", normalized);
        }
    }
}
