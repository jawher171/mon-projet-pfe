using System;
using System.Threading.Tasks;
using Application.Dtos;
using AutoMapper;
using Domain.Commands;
using Domain.Models;
using Domain.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;

namespace Application.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class SitesController : ControllerBase
    {
        private readonly IMediator _mediator;
        private readonly IMapper _mapper;

        public SitesController(IMediator mediator, IMapper mapper)
        {
            _mediator = mediator;
            _mapper = mapper;
        }

        [HttpGet("GetSites")]
        public async Task<IEnumerable<SiteDto>> GetSites()
        {
            var result = await _mediator.Send(
                new GetListGenericQuery<Site>(condition: x => true, includes: null));

            return _mapper.Map<IEnumerable<SiteDto>>(result);
        }

        [HttpGet("GetSite/{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var entity = await _mediator.Send(
                new GetGenericQuery<Site>(condition: x => x.Id_site == id, includes: null));

            if (entity == null) return NotFound();
            return Ok(_mapper.Map<SiteDto>(entity));
        }

        [HttpPost("AddSite")]
        [Authorize(Roles = "admin,gestionnaire_de_stock")]
        public async Task<IActionResult> Add([FromBody] SiteDto dto)
        {
            var site = _mapper.Map<Site>(dto);
            site.Id_site = Guid.NewGuid();
            var result = await _mediator.Send(new AddGenericCommand<Site>(site));
            return Ok(_mapper.Map<SiteDto>(result));
        }

        [HttpPut("UpdateSite")]
        [Authorize(Roles = "admin,gestionnaire_de_stock")]
        public async Task<IActionResult> Update([FromBody] SiteDto dto)
        {
            if (dto.Id_site == Guid.Empty)
                return BadRequest(new { message = "Id_site is required." });

            var existing = await _mediator.Send(
                new GetGenericQuery<Site>(condition: x => x.Id_site == dto.Id_site, includes: null));

            if (existing == null)
                return NotFound(new { message = "Site not found." });

            _mapper.Map(dto, existing);

            var result = await _mediator.Send(new PutGenericCommand<Site>(existing));
            return Ok(_mapper.Map<SiteDto>(result));
        }

        [HttpDelete("DeleteSite/{id}")]
        [Authorize(Roles = "admin,gestionnaire_de_stock")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var deleted = await _mediator.Send(new RemoveGenericCommand<Site>(id));
            if (deleted == null) return NotFound();
            return NoContent();
        }
    }
}
