using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Application.Dtos;
using AutoMapper;
using Domain.Commands;
using Domain.Handlers;
using Domain.Interface;
using Domain.Models;
using Domain.Queries;
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
        private readonly IGenericRepository<Alert> _repository;
        private readonly IMapper _mapper;

        public AlertsController(IGenericRepository<Alert> repository, IMapper mapper)
        {
            _repository = repository;
            _mapper = mapper;
        }

        [HttpGet("GetAlerts")]
        public async Task<IEnumerable<AlertDto>> GetNotDeleted()
        {
            var result = await (new GetListGenericHandler<Alert>(_repository))
                .Handle(
                    new GetListGenericQuery<Alert>(
                        condition: x => true,
                        includes: i => i.Include(x => x.Stock)),
                    new CancellationToken());

            return _mapper.Map<IEnumerable<AlertDto>>(result);
        }

        [HttpGet("GetAlert/{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var entity = await (new GetGenericHandler<Alert>(_repository))
                .Handle(
                    new GetGenericQuery<Alert>(
                        condition: x => x.Id_a == id,
                        includes: i => i.Include(x => x.Stock)),
                    new CancellationToken());

            if (entity == null) return NotFound();
            return Ok(_mapper.Map<AlertDto>(entity));
        }

        [HttpPost("AddAlert")]
        [Authorize(Roles = "admin,gestionnaire_de_stock,operateur")]
        public async Task<IActionResult> Add([FromBody] Alert alert)
        {
            var handler = new AddGenericHandler<Alert>(_repository);
            var command = new AddGenericCommand<Alert>(alert);
            var result = await handler.Handle(command, new CancellationToken());
            return Ok(_mapper.Map<AlertDto>(result));
        }

        [HttpPut("UpdateAlert")]
        [Authorize(Roles = "admin,gestionnaire_de_stock,operateur")]
        public async Task<IActionResult> Update([FromBody] Alert alert)
        {
            var handler = new PutGenericHandler<Alert>(_repository);
            var command = new PutGenericCommand<Alert>(alert);
            var result = await handler.Handle(command, new CancellationToken());
            return Ok(_mapper.Map<AlertDto>(result));
        }

        [HttpDelete("DeleteAlert/{id}")]
        [Authorize(Roles = "admin,gestionnaire_de_stock")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var handler = new RemoveGenericHandler<Alert>(_repository);
            var command = new RemoveGenericCommand(id);
            var deleted = await handler.Handle(command, new CancellationToken());
            if (deleted == null) return NotFound();
            return NoContent();
        }
    }
}
