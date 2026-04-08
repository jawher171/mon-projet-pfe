using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Application.Commands;
using Application.Dtos;
using Application.Security;
using AutoMapper;
using Domain.Models;
using Domain.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Application.Controllers
{
    /// <summary>Thin controller: delegates business logic to dedicated CQRS handlers via MediatR.</summary>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class StockMovementsController : ControllerBase
    {
        private static readonly SemaphoreSlim ReasonCatalogLock = new SemaphoreSlim(1, 1);
        private static readonly SemaphoreSlim ScanHistoryLock = new SemaphoreSlim(1, 1);
        private static readonly JsonSerializerOptions JsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = true
        };

        private readonly IMediator _mediator;
        private readonly IMapper _mapper;
        private readonly IWebHostEnvironment _environment;

        public StockMovementsController(IMediator mediator, IMapper mapper, IWebHostEnvironment environment)
        {
            _mediator = mediator;
            _mapper = mapper;
            _environment = environment;
        }

        [HttpGet("GetStockMovements")]
        [PermissionAuthorize("view_movements")]
        public async Task<ActionResult<IEnumerable<StockMovementDto>>> GetNotDeleted()
        {
            var currentUserId = GetCurrentUserId();
            if (!currentUserId.HasValue)
                return Unauthorized(new { message = "Utilisateur non authentifié." });

            var canSeeAllHistory = await CurrentUserCanSeeAllHistoryAsync(currentUserId.Value);

            IEnumerable<StockMovement> result;
            if (canSeeAllHistory)
            {
                result = await _mediator.Send(
                    new GetListGenericQuery<StockMovement>(
                        condition: x => true,
                        includes: i => i
                            .Include(x => x.Stock).ThenInclude(s => s.Produit)
                            .Include(x => x.Stock).ThenInclude(s => s.Site)
                            .Include(x => x.Utilisateur)));
            }
            else
            {
                var userId = currentUserId.Value;
                result = await _mediator.Send(
                    new GetListGenericQuery<StockMovement>(
                        condition: x => x.Id_u == userId,
                        includes: i => i
                            .Include(x => x.Stock).ThenInclude(s => s.Produit)
                            .Include(x => x.Stock).ThenInclude(s => s.Site)
                            .Include(x => x.Utilisateur)));
            }

            var dtos = _mapper.Map<IEnumerable<StockMovementDto>>(result).ToList();

            // Resolve destination GUIDs to site names for display
            foreach (var dto in dtos)
            {
                if (!string.IsNullOrWhiteSpace(dto.Destination) && Guid.TryParse(dto.Destination, out var destGuid))
                {
                    var site = await _mediator.Send(
                        new GetGenericQuery<Site>(
                            condition: s => s.Id_site == destGuid,
                            includes: null));
                    dto.Destination = site?.Nom ?? $"Site supprimé";
                }
            }

            return Ok(dtos);
        }

        [HttpGet("GetStockMovement/{id}")]
        [PermissionAuthorize("view_movements")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var currentUserId = GetCurrentUserId();
            if (!currentUserId.HasValue)
                return Unauthorized(new { message = "Utilisateur non authentifié." });

            var entity = await _mediator.Send(
                new GetGenericQuery<StockMovement>(
                    condition: x => x.id_sm == id,
                    includes: i => i
                        .Include(x => x.Stock).ThenInclude(s => s.Produit)
                        .Include(x => x.Stock).ThenInclude(s => s.Site)
                        .Include(x => x.Utilisateur)));

            if (entity == null) return NotFound();

            var canSeeAllHistory = await CurrentUserCanSeeAllHistoryAsync(currentUserId.Value);
            if (!canSeeAllHistory && entity.Id_u != currentUserId.Value)
                return Forbid();

            return Ok(_mapper.Map<StockMovementDto>(entity));
        }

        [HttpPost("AddStockMovement")]
        [PermissionAuthorize("manage_movements")]
        public async Task<IActionResult> Add([FromBody] StockMovementDto dto)
        {
            var currentUserId = GetCurrentUserId();
            if (!currentUserId.HasValue)
                return Unauthorized(new { message = "Utilisateur non authentifié." });

            // Enforce actor from JWT; client cannot spoof movement owner.
            dto.Id_u = currentUserId.Value;

            var result = await _mediator.Send(new CreateStockMovementCommand(dto));

            if (!result.Success)
                return BadRequest(new { message = result.ErrorMessage });

            return Ok(result.Movement);
        }

        [HttpPut("UpdateStockMovement")]
        [PermissionAuthorize("manage_movements")]
        public async Task<IActionResult> Update([FromBody] StockMovementDto dto)
        {
            var currentUserId = GetCurrentUserId();
            if (!currentUserId.HasValue)
                return Unauthorized(new { message = "Utilisateur non authentifié." });

            var existing = await _mediator.Send(
                new GetGenericQuery<StockMovement>(
                    condition: x => x.id_sm == dto.id_sm,
                    includes: null));

            if (existing == null)
                return NotFound(new { message = "Mouvement introuvable." });

            var canSeeAllHistory = await CurrentUserCanSeeAllHistoryAsync(currentUserId.Value);
            if (!canSeeAllHistory && existing.Id_u != currentUserId.Value)
                return Forbid();

            dto.Id_u = existing.Id_u;

            var result = await _mediator.Send(new UpdateStockMovementCommand(dto));

            if (!result.Success)
            {
                if (result.NotFound)
                    return NotFound(new { message = result.ErrorMessage });
                return BadRequest(new { message = result.ErrorMessage });
            }

            return Ok(result.Movement);
        }

        [HttpDelete("DeleteStockMovement/{id}")]
        [PermissionAuthorize("manage_movements")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var currentUserId = GetCurrentUserId();
            if (!currentUserId.HasValue)
                return Unauthorized(new { message = "Utilisateur non authentifié." });

            var existing = await _mediator.Send(
                new GetGenericQuery<StockMovement>(
                    condition: x => x.id_sm == id,
                    includes: null));

            if (existing == null)
                return NotFound(new { message = "Mouvement introuvable." });

            var canSeeAllHistory = await CurrentUserCanSeeAllHistoryAsync(currentUserId.Value);
            if (!canSeeAllHistory && existing.Id_u != currentUserId.Value)
                return Forbid();

            var result = await _mediator.Send(new DeleteStockMovementCommand(id));

            if (!result.Success)
            {
                if (result.NotFound)
                    return NotFound(new { message = result.ErrorMessage });
                return BadRequest(new { message = result.ErrorMessage });
            }

            return NoContent();
        }

        [HttpGet("GetScanHistory")]
        [PermissionAuthorize("scan_barcode", "view_movements")]
        public async Task<ActionResult<IEnumerable<ScanHistoryDto>>> GetScanHistory([FromQuery] int maxResults = 200)
        {
            var currentUserId = GetCurrentUserId();
            if (!currentUserId.HasValue)
                return Unauthorized(new { message = "Utilisateur non authentifié." });

            var allHistory = await ReadScanHistoryAsync();
            var canSeeAllHistory = await CurrentUserCanSeeAllHistoryAsync(currentUserId.Value);

            if (maxResults <= 0) maxResults = 200;
            if (maxResults > 500) maxResults = 500;

            var visible = canSeeAllHistory
                ? allHistory
                : allHistory.Where(x => x.CreatedByUserId == currentUserId.Value).ToList();

            return Ok(visible
                .OrderByDescending(x => x.Timestamp)
                .Take(maxResults)
                .ToList());
        }

        [HttpPost("AddScanHistory")]
        [PermissionAuthorize("scan_barcode")]
        public async Task<IActionResult> AddScanHistory([FromBody] ScanHistoryDto dto)
        {
            var currentUserId = GetCurrentUserId();
            if (!currentUserId.HasValue)
                return Unauthorized(new { message = "Utilisateur non authentifié." });

            if (dto == null || string.IsNullOrWhiteSpace(dto.Barcode))
                return BadRequest(new { message = "Le code-barres est obligatoire." });

            var created = new ScanHistoryDto
            {
                Id = Guid.NewGuid(),
                Barcode = dto.Barcode.Trim(),
                ProductId = dto.ProductId,
                ProductName = string.IsNullOrWhiteSpace(dto.ProductName) ? null : dto.ProductName.Trim(),
                Status = NormalizeScanStatus(dto.Status),
                Timestamp = dto.Timestamp == default ? DateTime.UtcNow : dto.Timestamp.ToUniversalTime(),
                CreatedByUserId = currentUserId.Value,
                CreatedByUserName = await ResolveCurrentUserDisplayNameAsync(currentUserId.Value)
            };

            await ScanHistoryLock.WaitAsync();
            try
            {
                var history = await ReadScanHistoryAsync();
                history.Add(created);

                // Keep only most recent 1000 entries.
                var trimmed = history
                    .OrderByDescending(x => x.Timestamp)
                    .Take(1000)
                    .ToList();

                await WriteScanHistoryAsync(trimmed);
            }
            finally
            {
                ScanHistoryLock.Release();
            }

            return Ok(created);
        }

        [HttpDelete("ClearScanHistory")]
        [PermissionAuthorize("scan_barcode", "manage_movements")]
        public async Task<IActionResult> ClearScanHistory([FromQuery] bool all = false)
        {
            var currentUserId = GetCurrentUserId();
            if (!currentUserId.HasValue)
                return Unauthorized(new { message = "Utilisateur non authentifié." });

            var canSeeAllHistory = await CurrentUserCanSeeAllHistoryAsync(currentUserId.Value);

            await ScanHistoryLock.WaitAsync();
            try
            {
                var history = await ReadScanHistoryAsync();
                int removed;

                if (all && canSeeAllHistory)
                {
                    removed = history.Count;
                    history.Clear();
                }
                else
                {
                    removed = history.RemoveAll(x => x.CreatedByUserId == currentUserId.Value);
                }

                await WriteScanHistoryAsync(history);
                return Ok(new { removed });
            }
            finally
            {
                ScanHistoryLock.Release();
            }
        }

        [HttpGet("GetMovementReasons")]
        [PermissionAuthorize("view_movements", "manage_movements", "scan_barcode")]
        public async Task<ActionResult<IEnumerable<MovementReasonDto>>> GetMovementReasons()
        {
            var reasons = await ReadReasonCatalogAsync();
            return Ok(reasons.OrderBy(r => r.Type).ThenBy(r => r.Label));
        }

        [HttpPost("AddMovementReason")]
        [PermissionAuthorize("manage_movements")]
        public async Task<IActionResult> AddMovementReason([FromBody] MovementReasonDto dto)
        {
            var validationError = ValidateReasonDto(dto, checkValue: false);
            if (validationError != null)
                return BadRequest(new { message = validationError });

            await ReasonCatalogLock.WaitAsync();
            try
            {
                var reasons = await ReadReasonCatalogAsync();

                var duplicateLabel = reasons.Any(r =>
                    r.Type.Equals(dto.Type, StringComparison.OrdinalIgnoreCase)
                    && r.Label.Equals(dto.Label, StringComparison.OrdinalIgnoreCase));

                if (duplicateLabel)
                    return Conflict(new { message = "Cette raison existe déjà pour ce type." });

                var desiredValue = string.IsNullOrWhiteSpace(dto.Value)
                    ? BuildReasonValue(dto.Type, dto.Label)
                    : dto.Value.Trim();

                var uniqueValue = EnsureUniqueValue(desiredValue, reasons.Select(r => r.Value));

                var created = new MovementReasonDto
                {
                    Value = uniqueValue,
                    Label = dto.Label.Trim(),
                    Type = NormalizeReasonType(dto.Type)
                };

                reasons.Add(created);
                await WriteReasonCatalogAsync(reasons);

                return Ok(created);
            }
            finally
            {
                ReasonCatalogLock.Release();
            }
        }

        [HttpPut("UpdateMovementReason/{value}")]
        [PermissionAuthorize("manage_movements")]
        public async Task<IActionResult> UpdateMovementReason(string value, [FromBody] MovementReasonDto dto)
        {
            var validationError = ValidateReasonDto(dto, checkValue: false);
            if (validationError != null)
                return BadRequest(new { message = validationError });

            if (string.IsNullOrWhiteSpace(value))
                return BadRequest(new { message = "value is required." });

            await ReasonCatalogLock.WaitAsync();
            try
            {
                var reasons = await ReadReasonCatalogAsync();
                var existing = reasons.FirstOrDefault(r => r.Value.Equals(value, StringComparison.OrdinalIgnoreCase));
                if (existing == null)
                    return NotFound(new { message = "Raison introuvable." });

                var duplicateLabel = reasons.Any(r =>
                    !r.Value.Equals(existing.Value, StringComparison.OrdinalIgnoreCase)
                    && r.Type.Equals(dto.Type, StringComparison.OrdinalIgnoreCase)
                    && r.Label.Equals(dto.Label, StringComparison.OrdinalIgnoreCase));

                if (duplicateLabel)
                    return Conflict(new { message = "Cette raison existe déjà pour ce type." });

                existing.Label = dto.Label.Trim();
                existing.Type = NormalizeReasonType(dto.Type);

                await WriteReasonCatalogAsync(reasons);
                return Ok(existing);
            }
            finally
            {
                ReasonCatalogLock.Release();
            }
        }

        [HttpDelete("DeleteMovementReason/{value}")]
        [PermissionAuthorize("manage_movements")]
        public async Task<IActionResult> DeleteMovementReason(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
                return BadRequest(new { message = "value is required." });

            await ReasonCatalogLock.WaitAsync();
            try
            {
                var reasons = await ReadReasonCatalogAsync();
                var removed = reasons.RemoveAll(r => r.Value.Equals(value, StringComparison.OrdinalIgnoreCase));
                if (removed == 0)
                    return NotFound(new { message = "Raison introuvable." });

                await WriteReasonCatalogAsync(reasons);
                return NoContent();
            }
            finally
            {
                ReasonCatalogLock.Release();
            }
        }

        private string GetReasonCatalogPath()
        {
            var directory = Path.Combine(_environment.ContentRootPath, "App_Data");
            Directory.CreateDirectory(directory);
            return Path.Combine(directory, "movement-reasons.json");
        }

        private string GetScanHistoryPath()
        {
            var directory = Path.Combine(_environment.ContentRootPath, "App_Data");
            Directory.CreateDirectory(directory);
            return Path.Combine(directory, "scan-history.json");
        }

        private async Task<List<MovementReasonDto>> ReadReasonCatalogAsync()
        {
            var path = GetReasonCatalogPath();
            if (!System.IO.File.Exists(path))
                return new List<MovementReasonDto>();

            var json = await System.IO.File.ReadAllTextAsync(path);
            if (string.IsNullOrWhiteSpace(json))
                return new List<MovementReasonDto>();

            var parsed = JsonSerializer.Deserialize<List<MovementReasonDto>>(json, JsonOptions) ?? new List<MovementReasonDto>();
            return parsed
                .Where(r => !string.IsNullOrWhiteSpace(r.Value)
                    && !string.IsNullOrWhiteSpace(r.Label)
                    && IsValidReasonType(r.Type))
                .Select(r => new MovementReasonDto
                {
                    Value = r.Value.Trim(),
                    Label = r.Label.Trim(),
                    Type = NormalizeReasonType(r.Type)
                })
                .GroupBy(r => r.Value, StringComparer.OrdinalIgnoreCase)
                .Select(g => g.First())
                .ToList();
        }

        private async Task WriteReasonCatalogAsync(IEnumerable<MovementReasonDto> reasons)
        {
            var path = GetReasonCatalogPath();
            var normalized = reasons
                .Where(r => !string.IsNullOrWhiteSpace(r.Value)
                    && !string.IsNullOrWhiteSpace(r.Label)
                    && IsValidReasonType(r.Type))
                .Select(r => new MovementReasonDto
                {
                    Value = r.Value.Trim(),
                    Label = r.Label.Trim(),
                    Type = NormalizeReasonType(r.Type)
                })
                .OrderBy(r => r.Type)
                .ThenBy(r => r.Label)
                .ToList();

            var json = JsonSerializer.Serialize(normalized, JsonOptions);
            await System.IO.File.WriteAllTextAsync(path, json);
        }

        private async Task<List<ScanHistoryDto>> ReadScanHistoryAsync()
        {
            var path = GetScanHistoryPath();
            if (!System.IO.File.Exists(path))
                return new List<ScanHistoryDto>();

            var json = await System.IO.File.ReadAllTextAsync(path);
            if (string.IsNullOrWhiteSpace(json))
                return new List<ScanHistoryDto>();

            var parsed = JsonSerializer.Deserialize<List<ScanHistoryDto>>(json, JsonOptions) ?? new List<ScanHistoryDto>();
            return parsed
                .Where(x => x != null
                    && !string.IsNullOrWhiteSpace(x.Barcode)
                    && x.CreatedByUserId != Guid.Empty)
                .Select(x => new ScanHistoryDto
                {
                    Id = x.Id == Guid.Empty ? Guid.NewGuid() : x.Id,
                    Barcode = x.Barcode.Trim(),
                    ProductId = x.ProductId,
                    ProductName = string.IsNullOrWhiteSpace(x.ProductName) ? null : x.ProductName.Trim(),
                    Status = NormalizeScanStatus(x.Status),
                    Timestamp = x.Timestamp == default ? DateTime.UtcNow : x.Timestamp,
                    CreatedByUserId = x.CreatedByUserId,
                    CreatedByUserName = string.IsNullOrWhiteSpace(x.CreatedByUserName) ? null : x.CreatedByUserName.Trim()
                })
                .OrderByDescending(x => x.Timestamp)
                .Take(1000)
                .ToList();
        }

        private async Task WriteScanHistoryAsync(IEnumerable<ScanHistoryDto> history)
        {
            var path = GetScanHistoryPath();
            var normalized = history
                .Where(x => x != null
                    && !string.IsNullOrWhiteSpace(x.Barcode)
                    && x.CreatedByUserId != Guid.Empty)
                .Select(x => new ScanHistoryDto
                {
                    Id = x.Id == Guid.Empty ? Guid.NewGuid() : x.Id,
                    Barcode = x.Barcode.Trim(),
                    ProductId = x.ProductId,
                    ProductName = string.IsNullOrWhiteSpace(x.ProductName) ? null : x.ProductName.Trim(),
                    Status = NormalizeScanStatus(x.Status),
                    Timestamp = x.Timestamp == default ? DateTime.UtcNow : x.Timestamp,
                    CreatedByUserId = x.CreatedByUserId,
                    CreatedByUserName = string.IsNullOrWhiteSpace(x.CreatedByUserName) ? null : x.CreatedByUserName.Trim()
                })
                .OrderByDescending(x => x.Timestamp)
                .Take(1000)
                .ToList();

            var json = JsonSerializer.Serialize(normalized, JsonOptions);
            await System.IO.File.WriteAllTextAsync(path, json);
        }

        private Guid? GetCurrentUserId()
        {
            var raw = User?.FindFirstValue(ClaimTypes.NameIdentifier) ?? User?.FindFirst("sub")?.Value;
            if (Guid.TryParse(raw, out var userId))
                return userId;

            return null;
        }

        private async Task<bool> CurrentUserCanSeeAllHistoryAsync(Guid userId)
        {
            var user = await _mediator.Send(
                new GetGenericQuery<User>(
                    condition: u => u.Id_u == userId,
                    includes: i => i
                        .Include(u => u.Role)));

            var roleName = user?.Role?.Nom?.Trim().ToLowerInvariant();
            return roleName == "admin" || roleName == "gestionnaire_de_stock";
        }

        private async Task<string?> ResolveCurrentUserDisplayNameAsync(Guid userId)
        {
            var user = await _mediator.Send(
                new GetGenericQuery<User>(
                    condition: u => u.Id_u == userId,
                    includes: null));

            if (user == null)
                return null;

            var fullName = string.Join(" ", new[] { user.Prenom, user.Nom }
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Select(x => x.Trim()));

            if (!string.IsNullOrWhiteSpace(fullName))
                return fullName;

            return user.Email;
        }

        private static string NormalizeScanStatus(string? status)
        {
            if (string.IsNullOrWhiteSpace(status)) return "pending";
            var normalized = status.Trim().ToLowerInvariant();
            if (normalized == "found" || normalized == "not_found" || normalized == "pending")
                return normalized;
            return "pending";
        }

        private static bool IsValidReasonType(string type)
        {
            var normalized = NormalizeReasonType(type);
            return normalized == "entry" || normalized == "exit" || normalized == "transfer";
        }

        private static string NormalizeReasonType(string type)
        {
            var normalized = type?.Trim().ToLowerInvariant() ?? "entry";
            if (normalized == "exit" || normalized == "sortie") return "exit";
            if (normalized == "transfer" || normalized == "transfert") return "transfer";
            return "entry";
        }

        private static string BuildReasonValue(string type, string label)
        {
            var normalizedType = NormalizeReasonType(type);
            var trimmedLabel = label?.Trim().ToLowerInvariant() ?? string.Empty;
            var slug = Regex.Replace(trimmedLabel, "[^a-z0-9]+", "_").Trim('_');
            if (string.IsNullOrWhiteSpace(slug))
                slug = DateTime.UtcNow.Ticks.ToString();

            return $"custom_{normalizedType}_{slug}";
        }

        private static string EnsureUniqueValue(string baseValue, IEnumerable<string> existingValues)
        {
            var set = new HashSet<string>(existingValues, StringComparer.OrdinalIgnoreCase);
            if (!set.Contains(baseValue)) return baseValue;

            var index = 2;
            var candidate = $"{baseValue}_{index}";
            while (set.Contains(candidate))
            {
                index++;
                candidate = $"{baseValue}_{index}";
            }

            return candidate;
        }

        private static string? ValidateReasonDto(MovementReasonDto? dto, bool checkValue)
        {
            if (dto == null) return "Raison invalide.";
            if (string.IsNullOrWhiteSpace(dto.Label)) return "Le libellé est obligatoire.";
            if (!IsValidReasonType(dto.Type)) return "Le type doit être entry, exit ou transfer.";
            if (checkValue && string.IsNullOrWhiteSpace(dto.Value)) return "La valeur est obligatoire.";
            return null;
        }
    }
}
