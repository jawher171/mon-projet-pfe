using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Application.Dtos;
using Domain.Commands;
using Domain.Models;
using Domain.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Application.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ProfileController : ControllerBase
    {
        private readonly IMediator _mediator;

        public ProfileController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpPut]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "User not authenticated." });

            if (!Guid.TryParse(userId, out var guid))
                return Unauthorized(new { message = "Invalid user ID." });

            var user = await _mediator.Send(
                new GetGenericQuery<User>(condition: u => u.Id_u == guid, includes: null));

            if (user == null)
                return NotFound(new { message = "User not found." });

            if (request?.Nom != null) user.Nom = request.Nom.Trim();
            if (request?.Prenom != null) user.Prenom = request.Prenom.Trim();
            if (request?.Email != null)
            {
                var trimmed = request.Email.Trim();
                if (trimmed != user.Email)
                {
                    var existing = await _mediator.Send(
                        new GetGenericQuery<User>(condition: u => u.Email == trimmed, includes: null));
                    if (existing != null)
                        return BadRequest(new { message = "A user with this email already exists." });
                    user.Email = trimmed;
                }
            }
            if (!string.IsNullOrEmpty(request?.Password))
                user.MotDePasse = BCrypt.Net.BCrypt.HashPassword(request.Password);

            var updated = await _mediator.Send(new PutGenericCommand<User>(user));

            var role = await _mediator.Send(
                new GetGenericQuery<Role>(condition: r => r.RoleId == updated.RoleId, includes: null));
            var dto = new UserDto
            {
                Id = updated.Id_u,
                Nom = updated.Nom,
                Prenom = updated.Prenom,
                Email = updated.Email,
                Role = role?.Nom ?? string.Empty,
                Status = updated.Status ? "active" : "inactive",
                LastLogin = updated.LastLogin
            };

            return Ok(dto);
        }
    }

    public class UpdateProfileRequest
    {
        public string? Nom { get; set; }
        public string? Prenom { get; set; }
        public string? Email { get; set; }
        public string? Password { get; set; }
    }
}
