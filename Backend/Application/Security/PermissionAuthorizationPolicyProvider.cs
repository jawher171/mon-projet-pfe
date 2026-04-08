using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Options;

namespace Application.Security
{
    /// <summary>Builds authorization policies dynamically for any permission code.</summary>
    public sealed class PermissionAuthorizationPolicyProvider : IAuthorizationPolicyProvider
    {
        private readonly DefaultAuthorizationPolicyProvider _fallbackProvider;

        public PermissionAuthorizationPolicyProvider(IOptions<AuthorizationOptions> options)
        {
            _fallbackProvider = new DefaultAuthorizationPolicyProvider(options);
        }

        public Task<AuthorizationPolicy> GetDefaultPolicyAsync()
            => _fallbackProvider.GetDefaultPolicyAsync();

        public Task<AuthorizationPolicy?> GetFallbackPolicyAsync()
            => _fallbackProvider.GetFallbackPolicyAsync();

        public Task<AuthorizationPolicy?> GetPolicyAsync(string policyName)
        {
            if (!string.IsNullOrWhiteSpace(policyName)
                && policyName.StartsWith(PermissionAuthorizeAttribute.PolicyPrefix, StringComparison.OrdinalIgnoreCase))
            {
                var raw = policyName.Substring(PermissionAuthorizeAttribute.PolicyPrefix.Length);
                var permissions = raw
                    .Split(',', StringSplitOptions.RemoveEmptyEntries)
                    .Select(p => p.Trim())
                    .Where(p => !string.IsNullOrWhiteSpace(p))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToArray();

                if (permissions.Length == 0)
                {
                    return _fallbackProvider.GetPolicyAsync(policyName);
                }

                var policy = new AuthorizationPolicyBuilder(JwtBearerDefaults.AuthenticationScheme)
                    .RequireAuthenticatedUser()
                    .AddRequirements(new PermissionRequirement(permissions))
                    .Build();

                return Task.FromResult<AuthorizationPolicy?>(policy);
            }

            return _fallbackProvider.GetPolicyAsync(policyName);
        }
    }
}
