using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Application.Commands;
using Application.Dtos;
using AutoMapper;
using Domain.Models;
using Domain.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
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
        private readonly IMediator _mediator;
        private readonly IMapper _mapper;

        public StockMovementsController(IMediator mediator, IMapper mapper)
        {
            _mediator = mediator;
            _mapper = mapper;
        }

        [HttpGet("GetStockMovements")]
        public async Task<IEnumerable<StockMovementDto>> GetNotDeleted()
        {
            var result = await _mediator.Send(
                new GetListGenericQuery<StockMovement>(
                    condition: x => true,
                    includes: i => i.Include(x => x.Stock).Include(x => x.Utilisateur)));

            return _mapper.Map<IEnumerable<StockMovementDto>>(result);
        }

        [HttpGet("GetStockMovement/{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var entity = await _mediator.Send(
                new GetGenericQuery<StockMovement>(
                    condition: x => x.id_sm == id,
                    includes: i => i.Include(x => x.Stock).Include(x => x.Utilisateur)));

            if (entity == null) return NotFound();
            return Ok(_mapper.Map<StockMovementDto>(entity));
        }

        [HttpPost("AddStockMovement")]
        [Authorize(Roles = "admin,gestionnaire_de_stock,operateur")]
        public async Task<IActionResult> Add([FromBody] StockMovementDto dto)
        {
            var result = await _mediator.Send(new CreateStockMovementCommand(dto));

            if (!result.Success)
                return BadRequest(new { message = result.ErrorMessage });

            return Ok(result.Movement);
        }

        [HttpPut("UpdateStockMovement")]
        [Authorize(Roles = "admin,gestionnaire_de_stock,operateur")]
        public async Task<IActionResult> Update([FromBody] StockMovementDto dto)
        {
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
        [Authorize(Roles = "admin,gestionnaire_de_stock")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var result = await _mediator.Send(new DeleteStockMovementCommand(id));

            if (!result.Success)
            {
                if (result.NotFound)
                    return NotFound(new { message = result.ErrorMessage });
                return BadRequest(new { message = result.ErrorMessage });
            }

            return NoContent();
        }
    }
}
