using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Application.Dtos;
using Application.Security;
using AutoMapper;
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
    [Authorize]
    public class AlertsController : ControllerBase
    {
        private readonly IMediator _mediator;
        private readonly IMapper _mapper;

        public AlertsController(IMediator mediator, IMapper mapper)
        {
            _mediator = mediator;
            _mapper = mapper;
        }

        [HttpGet("GetAlerts")]
        [PermissionAuthorize("view_alerts")]
        public async Task<ActionResult<IEnumerable<AlertDto>>> GetNotDeleted()
        {
            var currentUserId = GetCurrentUserId();
            if (!currentUserId.HasValue)
                return Unauthorized(new { message = "Utilisateur non authentifié." });

            var currentUser = await _mediator.Send(
                new GetGenericQuery<User>(
                    condition: u => u.Id_u == currentUserId.Value,
                    includes: i => i.Include(u => u.Role)));

            if (currentUser == null)
                return Unauthorized(new { message = "Utilisateur non authentifié." });

            var canSeeAllAlerts = CanRoleSeeAllAlerts(currentUser.Role?.Nom);

            var result = (await _mediator.Send(
                new GetListGenericQuery<Alert>(
                    condition: x => true,
                    includes: i => i.Include(x => x.Stock).ThenInclude(s => s.Produit)
                                    .Include(x => x.Stock).ThenInclude(s => s.Site))))
                .ToList();

            if (result.Count == 0)
                return Ok(Array.Empty<AlertDto>());

            var stockIds = result.Select(a => a.id_s).Distinct().ToList();
            var movements = (await _mediator.Send(
                new GetListGenericQuery<StockMovement>(
                    condition: m => stockIds.Contains(m.Id_s),
                    includes: i => i.Include(m => m.Utilisateur))))
                .ToList();

            var movementsByStock = movements
                .GroupBy(m => m.Id_s)
                .ToDictionary(
                    g => g.Key,
                    g => g.OrderByDescending(m => m.DateMouvement).ToList());

            var visible = canSeeAllAlerts
                ? result
                : result.Where(alert => IsAlertOwnedByUser(alert, currentUserId.Value, movementsByStock)).ToList();

            var dtos = _mapper.Map<List<AlertDto>>(visible);
            foreach (var dto in dtos)
            {
                var sourceAlert = visible.FirstOrDefault(a => a.Id_a == dto.Id_a);
                if (sourceAlert == null) continue;

                var owner = GetAlertOwnerMovement(sourceAlert, movementsByStock);
                dto.UtilisateurNom = BuildUserDisplayName(owner?.Utilisateur);
            }

            return Ok(dtos);
        }

        [HttpGet("GetAlert/{id}")]
        [PermissionAuthorize("view_alerts")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var currentUserId = GetCurrentUserId();
            if (!currentUserId.HasValue)
                return Unauthorized(new { message = "Utilisateur non authentifié." });

            var currentUser = await _mediator.Send(
                new GetGenericQuery<User>(
                    condition: u => u.Id_u == currentUserId.Value,
                    includes: i => i.Include(u => u.Role)));

            if (currentUser == null)
                return Unauthorized(new { message = "Utilisateur non authentifié." });

            var canSeeAllAlerts = CanRoleSeeAllAlerts(currentUser.Role?.Nom);

            var entity = await _mediator.Send(
                new GetGenericQuery<Alert>(
                    condition: x => x.Id_a == id,
                    includes: i => i.Include(x => x.Stock).ThenInclude(s => s.Produit)
                                    .Include(x => x.Stock).ThenInclude(s => s.Site)));

            if (entity == null) return NotFound();

            var stockMovements = (await _mediator.Send(
                new GetListGenericQuery<StockMovement>(
                    condition: m => m.Id_s == entity.id_s,
                    includes: i => i.Include(m => m.Utilisateur))))
                .OrderByDescending(m => m.DateMouvement)
                .ToList();

            var byStock = new Dictionary<Guid, List<StockMovement>> { [entity.id_s] = stockMovements };
            if (!canSeeAllAlerts && !IsAlertOwnedByUser(entity, currentUserId.Value, byStock))
                return Forbid();

            var dto = _mapper.Map<AlertDto>(entity);
            var owner = GetAlertOwnerMovement(entity, byStock);
            dto.UtilisateurNom = BuildUserDisplayName(owner?.Utilisateur);

            return Ok(dto);
        }

        [HttpPost("AddAlert")]
        [PermissionAuthorize("manage_alerts")]
        public async Task<IActionResult> Add([FromBody] AlertDto dto)
        {
            var alert = _mapper.Map<Alert>(dto);

            if (alert.Id_a == Guid.Empty)
                alert.Id_a = Guid.NewGuid();

            var result = await _mediator.Send(new AddGenericCommand<Alert>(alert));
            return Ok(_mapper.Map<AlertDto>(result));
        }

        [HttpPut("UpdateAlert")]
        [PermissionAuthorize("manage_alerts")]
        public async Task<IActionResult> Update([FromBody] AlertDto dto)
        {
            if (dto.Id_a == Guid.Empty)
                return BadRequest(new { message = "Id_a is required." });

            var existing = await _mediator.Send(
                new GetGenericQuery<Alert>(
                    condition: x => x.Id_a == dto.Id_a,
                    includes: null));

            if (existing == null)
                return NotFound(new { message = "Alert not found." });

            // Update fields from DTO
            existing.Type = dto.Type;
            existing.Message = dto.Message;
            existing.Resolue = dto.Resolue;
            existing.Severity = dto.Severity;
            existing.Status = dto.Status;
            existing.Fingerprint = dto.Fingerprint;
            existing.ClosedAt = dto.ClosedAt;

            var result = await _mediator.Send(new PutGenericCommand<Alert>(existing));
            return Ok(_mapper.Map<AlertDto>(result));
        }

        [HttpDelete("DeleteAlert/{id}")]
        [PermissionAuthorize("manage_alerts")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var deleted = await _mediator.Send(new RemoveGenericCommand<Alert>(id));
            if (deleted == null) return NotFound();
            return NoContent();
        }

        private Guid? GetCurrentUserId()
        {
            var raw = User?.FindFirstValue(ClaimTypes.NameIdentifier) ?? User?.FindFirst("sub")?.Value;
            if (Guid.TryParse(raw, out var userId))
                return userId;

            return null;
        }

        private static bool IsAlertOwnedByUser(
            Alert alert,
            Guid userId,
            IReadOnlyDictionary<Guid, List<StockMovement>> movementsByStock)
        {
            // Stock state alerts are system-level and must remain visible to all users
            // that already have permission to view alerts.
            if (IsSystemStockAlertType(alert.Type))
                return true;

            var ownerMovement = GetAlertOwnerMovement(alert, movementsByStock);
            return ownerMovement?.Id_u == userId;
        }

        private static StockMovement? GetAlertOwnerMovement(
            Alert alert,
            IReadOnlyDictionary<Guid, List<StockMovement>> movementsByStock)
        {
            if (!movementsByStock.TryGetValue(alert.id_s, out var stockMovements) || stockMovements.Count == 0)
                return null;

            var referenceDate = alert.DateCreation;

            // Owner = user who made the most recent movement for this stock at/before the alert creation timestamp.
            var ownerMovement = stockMovements
                .Where(m => m.DateMouvement <= referenceDate)
                .OrderByDescending(m => m.DateMouvement)
                .FirstOrDefault();

            // Fallback for older rows with inconsistent timestamps.
            ownerMovement ??= stockMovements[0];

            return ownerMovement;
        }

        private static string? BuildUserDisplayName(User? user)
        {
            if (user == null) return null;

            var fullName = string.Join(" ", new[] { user.Prenom, user.Nom }
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Select(x => x.Trim()));

            if (!string.IsNullOrWhiteSpace(fullName))
                return fullName;

            return user.Email;
        }

        private static bool CanRoleSeeAllAlerts(string? roleName)
        {
            var normalized = roleName?.Trim().ToLowerInvariant();
            return normalized == "admin" || normalized == "gestionnaire_de_stock";
        }

        private static bool IsSystemStockAlertType(string? type)
        {
            var normalized = type?.Trim();
            return normalized == nameof(Domain.Enums.AlertType.OUT_OF_STOCK)
                || normalized == nameof(Domain.Enums.AlertType.MIN_STOCK)
                || normalized == nameof(Domain.Enums.AlertType.SITE_CAPACITY_NEAR_MAXIMUM)
                || normalized == nameof(Domain.Enums.AlertType.SITE_CAPACITY_MAXIMUM)
                || normalized == nameof(Domain.Enums.AlertType.STOCK_SECURITE)
                || normalized == nameof(Domain.Enums.AlertType.STOCK_ALERTE)
                || normalized == nameof(Domain.Enums.AlertType.STOCK_NEAR_MAXIMUM)
                || normalized == nameof(Domain.Enums.AlertType.STOCK_MAXIMUM);
        }
    }
}
