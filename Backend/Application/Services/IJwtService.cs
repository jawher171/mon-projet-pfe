using System.Collections.Generic;

namespace Application.Services
{
    /// <summary>Generates JWT tokens for authenticated users.</summary>
    public interface IJwtService
    {
        string GenerateToken(string userId, string email, string role, IList<string> permissions);
    }
}
