using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Application.Dtos;
using Application.Services;
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
    public class StocksController : ControllerBase
    {
        private readonly IGenericRepository<Stock> _repository;
        private readonly IAlertTriggerService _alertTriggerService;
        private readonly IMapper _mapper;

        public StocksController(IGenericRepository<Stock> repository, IAlertTriggerService alertTriggerService, IMapper mapper)
        {
            _repository = repository;
            _alertTriggerService = alertTriggerService;
            _mapper = mapper;
        }

        [HttpGet("GetStocks")]
        public async Task<IEnumerable<StockDto>> GetNotDeleted()
        {
            var result = await (new GetListGenericHandler<Stock>(_repository))
                .Handle(
                    new GetListGenericQuery<Stock>(
                        condition: x => true,
                        includes: i => i.Include(x => x.Produit).Include(x => x.Site)),
                    new CancellationToken());

            return _mapper.Map<IEnumerable<StockDto>>(result);
        }

        [HttpGet("GetStock/{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var entity = await (new GetGenericHandler<Stock>(_repository))
                .Handle(
                    new GetGenericQuery<Stock>(
                        condition: x => x.id_s == id,
                        includes: i => i.Include(x => x.Produit).Include(x => x.Site)),
                    new CancellationToken());

            if (entity == null) return NotFound();
            return Ok(_mapper.Map<StockDto>(entity));
        }

        [HttpPost("AddStock")]
        [Authorize(Roles = "admin,gestionnaire_de_stock")]
        public async Task<IActionResult> Add([FromBody] Stock stock)
        {
            var handler = new AddGenericHandler<Stock>(_repository);
            var command = new AddGenericCommand<Stock>(stock);
            var result = await handler.Handle(command, new CancellationToken());

            var stockWithIncludes = await (new GetGenericHandler<Stock>(_repository))
                .Handle(
                    new GetGenericQuery<Stock>(
                        condition: x => x.id_s == result.id_s,
                        includes: i => i.Include(x => x.Produit).Include(x => x.Site)),
                    new CancellationToken());
            await _alertTriggerService.TryCreateLowStockAlertAsync(stockWithIncludes ?? result);

            return Ok(_mapper.Map<StockDto>(result));
        }

        [HttpPut("UpdateStock")]
        [Authorize(Roles = "admin,gestionnaire_de_stock")]
        public async Task<IActionResult> Update([FromBody] Stock stock)
        {
            var stockWithIncludes = await (new GetGenericHandler<Stock>(_repository))
                .Handle(
                    new GetGenericQuery<Stock>(
                        condition: x => x.id_s == stock.id_s,
                        includes: i => i.Include(x => x.Produit).Include(x => x.Site)),
                    new CancellationToken());

            var handler = new PutGenericHandler<Stock>(_repository);
            var command = new PutGenericCommand<Stock>(stock);
            var result = await handler.Handle(command, new CancellationToken());

            if (stockWithIncludes != null)
            {
                stockWithIncludes.QuantiteDisponible = result.QuantiteDisponible;
                stockWithIncludes.SeuilAlerte = result.SeuilAlerte;
                await _alertTriggerService.TryCreateLowStockAlertAsync(stockWithIncludes);
            }
            else
            {
                await _alertTriggerService.TryCreateLowStockAlertAsync(result);
            }

            return Ok(_mapper.Map<StockDto>(result));
        }

        [HttpDelete("DeleteStock/{id}")]
        [Authorize(Roles = "admin,gestionnaire_de_stock")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var handler = new RemoveGenericHandler<Stock>(_repository);
            var command = new RemoveGenericCommand(id);
            var deleted = await handler.Handle(command, new CancellationToken());
            if (deleted == null) return NotFound();
            return NoContent();
        }
    }
}
