using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Application.Dtos;
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
        public async Task<IEnumerable<AlertDto>> GetNotDeleted()
        {
            var result = await _mediator.Send(
                new GetListGenericQuery<Alert>(
                    condition: x => true,
                    includes: i => i.Include(x => x.Stock).ThenInclude(s => s.Produit)
                                    .Include(x => x.Stock).ThenInclude(s => s.Site)));

            return _mapper.Map<IEnumerable<AlertDto>>(result);
        }

        [HttpGet("GetAlert/{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var entity = await _mediator.Send(
                new GetGenericQuery<Alert>(
                    condition: x => x.Id_a == id,
                    includes: i => i.Include(x => x.Stock).ThenInclude(s => s.Produit)
                                    .Include(x => x.Stock).ThenInclude(s => s.Site)));

            if (entity == null) return NotFound();
            return Ok(_mapper.Map<AlertDto>(entity));
        }

        [HttpPost("AddAlert")]
        [Authorize(Roles = "admin,gestionnaire_de_stock,operateur")]
        public async Task<IActionResult> Add([FromBody] AlertDto dto)
        {
            var alert = _mapper.Map<Alert>(dto);

            if (alert.Id_a == Guid.Empty)
                alert.Id_a = Guid.NewGuid();

            var result = await _mediator.Send(new AddGenericCommand<Alert>(alert));
            return Ok(_mapper.Map<AlertDto>(result));
        }

        [HttpPut("UpdateAlert")]
        [Authorize(Roles = "admin,gestionnaire_de_stock,operateur")]
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
        [Authorize(Roles = "admin,gestionnaire_de_stock")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var deleted = await _mediator.Send(new RemoveGenericCommand<Alert>(id));
            if (deleted == null) return NotFound();
            return NoContent();
        }
    }
}
