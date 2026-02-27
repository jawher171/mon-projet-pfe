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
    public class ProductsController : ControllerBase
    {
        private readonly IMediator _mediator;
        private readonly IMapper _mapper;

        public ProductsController(IMediator mediator, IMapper mapper)
        {
            _mediator = mediator;
            _mapper = mapper;
        }

        [HttpGet("GetProducts")]
        public async Task<IEnumerable<ProductDto>> GetNotDeleted()
        {
            var result = await _mediator.Send(
                new GetListGenericQuery<Product>(
                    condition: x => true,
                    includes: i => i.Include(x => x.Categorie)));

            return _mapper.Map<IEnumerable<ProductDto>>(result);
        }

        [HttpGet("GetProduct/{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var entity = await _mediator.Send(
                new GetGenericQuery<Product>(
                    condition: x => x.id_p == id,
                    includes: i => i.Include(x => x.Categorie)));

            if (entity == null) return NotFound();
            return Ok(_mapper.Map<ProductDto>(entity));
        }

        [HttpPost("AddProduct")]
        [Authorize(Roles = "admin,gestionnaire_de_stock")]
        public async Task<IActionResult> Add([FromBody] ProductDto dto)
        {
            var product = _mapper.Map<Product>(dto);
            product.id_p = Guid.NewGuid();
            var result = await _mediator.Send(new AddGenericCommand<Product>(product));
            return Ok(_mapper.Map<ProductDto>(result));
        }

        [HttpPut("UpdateProduct")]
        [Authorize(Roles = "admin,gestionnaire_de_stock")]
        public async Task<IActionResult> Update([FromBody] ProductDto dto)
        {
            if (dto.id_p == Guid.Empty)
                return BadRequest(new { message = "id_p is required." });

            var existing = await _mediator.Send(
                new GetGenericQuery<Product>(condition: x => x.id_p == dto.id_p, includes: null));

            if (existing == null)
                return NotFound(new { message = "Product not found." });

            _mapper.Map(dto, existing);

            var result = await _mediator.Send(new PutGenericCommand<Product>(existing));
            return Ok(_mapper.Map<ProductDto>(result));
        }

        [HttpDelete("DeleteProduct/{id}")]
        [Authorize(Roles = "admin,gestionnaire_de_stock")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var deleted = await _mediator.Send(new RemoveGenericCommand<Product>(id));
            if (deleted == null) return NotFound();
            return NoContent();
        }
    }
}
