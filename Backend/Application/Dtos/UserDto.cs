using System;

namespace Application.Dtos
{
    /// <summary>DTO for User API responses. Id as string, Status as "active"/"inactive".</summary>
    public class UserDto
    {
        public Guid Id { get; set; }
        public string Nom { get; set; } = string.Empty;
        public string Prenom { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime? LastLogin { get; set; }
    }
}
