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
    public class StocksController : ControllerBase
    {
        private readonly IMediator _mediator;
        private readonly IMapper _mapper;

        public StocksController(IMediator mediator, IMapper mapper)
        {
            _mediator = mediator;
            _mapper = mapper;
        }

        [HttpGet("GetStocks")]
        public async Task<IEnumerable<StockDto>> GetNotDeleted()
        {
            var result = await _mediator.Send(
                new GetListGenericQuery<Stock>(
                    condition: x => true,
                    includes: i => i.Include(x => x.Produit).Include(x => x.Site)));

            return _mapper.Map<IEnumerable<StockDto>>(result);
        }

        [HttpGet("GetStock/{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var entity = await _mediator.Send(
                new GetGenericQuery<Stock>(
                    condition: x => x.id_s == id,
                    includes: i => i.Include(x => x.Produit).Include(x => x.Site)));

            if (entity == null) return NotFound();
            return Ok(_mapper.Map<StockDto>(entity));
        }

        [HttpGet("GetStocksBySite/{siteId}")]
        public async Task<IEnumerable<StockDto>> GetBySite(Guid siteId)
        {
            var result = await _mediator.Send(
                new GetListGenericQuery<Stock>(
                    condition: x => x.Id_site == siteId,
                    includes: i => i.Include(x => x.Produit).Include(x => x.Site)));

            return _mapper.Map<IEnumerable<StockDto>>(result);
        }

        [HttpPost("AddStock")]
        [Authorize(Roles = "admin,gestionnaire_de_stock")]
        public async Task<IActionResult> Add([FromBody] StockDto dto)
        {
            var stock = _mapper.Map<Stock>(dto);

            if (stock.id_s == Guid.Empty)
                stock.id_s = Guid.NewGuid();

            var result = await _mediator.Send(new AddGenericCommand<Stock>(stock));
            
            // Re-fetch with includes for the response
            var stockWithIncludes = await _mediator.Send(
                new GetGenericQuery<Stock>(
                    condition: x => x.id_s == result.id_s,
                    includes: i => i.Include(x => x.Produit).Include(x => x.Site)));

            return Ok(_mapper.Map<StockDto>(stockWithIncludes ?? result));
        }

        [HttpPut("UpdateStock")]
        [Authorize(Roles = "admin,gestionnaire_de_stock")]
        public async Task<IActionResult> Update([FromBody] StockDto dto)
        {
            if (dto.id_s == Guid.Empty)
                return BadRequest(new { message = "id_s is required." });

            // Fetch existing to ensure it exists
            var existing = await _mediator.Send(
                new GetGenericQuery<Stock>(
                    condition: x => x.id_s == dto.id_s,
                    includes: null));

            if (existing == null)
                return NotFound(new { message = "Stock not found." });

            // Map DTO values onto the tracked entity
            existing.QuantiteDisponible = dto.QuantiteDisponible;
            existing.SeuilAlerte = dto.SeuilAlerte;
            existing.SeuilSecurite = dto.SeuilSecurite;
            existing.SeuilMinimum = dto.SeuilMinimum;
            existing.SeuilMaximum = dto.SeuilMaximum;
            existing.id_p = dto.id_p;
            existing.Id_site = dto.Id_site;

            var result = await _mediator.Send(new PutGenericCommand<Stock>(existing));

            // Re-fetch with includes for the response
            var stockWithIncludes = await _mediator.Send(
                new GetGenericQuery<Stock>(
                    condition: x => x.id_s == result.id_s,
                    includes: i => i.Include(x => x.Produit).Include(x => x.Site)));

            return Ok(_mapper.Map<StockDto>(stockWithIncludes ?? result));
        }

        [HttpDelete("DeleteStock/{id}")]
        [Authorize(Roles = "admin,gestionnaire_de_stock")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var deleted = await _mediator.Send(new RemoveGenericCommand<Stock>(id));
            if (deleted == null) return NotFound();
            return NoContent();
        }
    }
}
