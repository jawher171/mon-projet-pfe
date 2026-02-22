using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace Application.Services
{
    /// <summary>JWT generation: encodes userId, email, role, permissions into signed token.</summary>
    public class JwtService : IJwtService
    {
        private readonly IConfiguration _configuration;

        public JwtService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public string GenerateToken(string userId, string email, string role, IList<string> permissions)
        {
            var key = new SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(
                _configuration["Jwt:Key"] ?? "DefaultSecretKeyForJwtTokenGenerationMinimum32Chars"));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            var issuer = _configuration["Jwt:Issuer"] ?? "InventaireApi";
            var audience = _configuration["Jwt:Audience"] ?? "InventaireApp";
            var expirationMinutes = int.TryParse(_configuration["Jwt:ExpirationMinutes"], out var min) ? min : 1440;

            // Standard claims + role + permissions
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, userId),
                new Claim(ClaimTypes.Email, email),
                new Claim(ClaimTypes.Role, role),
                new Claim("role", role)
            };

            foreach (var permission in permissions ?? new List<string>())
            {
                claims.Add(new Claim("permission", permission));
            }

            var token = new JwtSecurityToken(
                issuer: issuer,
                audience: audience,
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(expirationMinutes),
                signingCredentials: creds);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
