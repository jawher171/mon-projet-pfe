using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Application.Dtos;
using Application.Services;
using Data.Context;
using Domain.Commands;
using Domain.Models;
using Domain.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Application.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [AllowAnonymous]
    public class AuthentificationController : ControllerBase
    {
        private readonly IMediator _mediator;
        private readonly AppDbContext _context;
        private readonly IJwtService _jwtService;

        public AuthentificationController(IMediator mediator, AppDbContext context, IJwtService jwtService)
        {
            _mediator = mediator;
            _context = context;
            _jwtService = jwtService;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
                return BadRequest(new { message = "Email and password are required." });

            var user = await _mediator.Send(
                new GetGenericQuery<User>(condition: u => u.Email == request.Email.Trim(), includes: null));

            if (user == null)
                return Unauthorized(new { message = "Invalid email or password." });

            bool passwordValid;
            try
            {
                passwordValid = BCrypt.Net.BCrypt.Verify(request.Password, user.MotDePasse);
            }
            catch
            {
                passwordValid = user.MotDePasse == request.Password;
            }

            if (!passwordValid)
                return Unauthorized(new { message = "Invalid email or password." });

            if (!user.Status)
                return Unauthorized(new { message = "Account is inactive." });

            user.LastLogin = DateTime.UtcNow;

            await _mediator.Send(new PutGenericCommand<User>(user));

            var role = await _mediator.Send(
                new GetGenericQuery<Role>(condition: r => r.RoleId == user.RoleId, includes: null));
            var roleNom = role?.Nom ?? string.Empty;

            var rolePermissions = await _context.rolepermission
                .Include(rp => rp.Permission)
                .Where(rp => rp.RoleId == user.RoleId)
                .ToListAsync();

            var permissions = rolePermissions
                .Where(rp => rp.Permission != null)
                .Select(rp => rp.Permission!.Code_p)
                .Where(code => !string.IsNullOrEmpty(code))
                .Distinct()
                .ToList();

            var token = _jwtService.GenerateToken(user.Id_u.ToString(), user.Email, roleNom, permissions);

            var userDto = new LoginUserDto
            {
                Id = user.Id_u,
                Nom = user.Nom,
                Prenom = user.Prenom,
                Email = user.Email,
                Role = roleNom,
                Status = user.Status ? "active" : "inactive",
                LastLogin = user.LastLogin,
                Permissions = permissions
            };

            return Ok(new LoginResponse { Token = token, User = userDto });
        }
    }

    public class LoginRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class LoginResponse
    {
        public string Token { get; set; } = string.Empty;
        public LoginUserDto User { get; set; } = null!;
    }
}
