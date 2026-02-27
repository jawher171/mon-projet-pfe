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
    public class CategoriesController : ControllerBase
    {
        private readonly IMediator _mediator;
        private readonly IMapper _mapper;

        public CategoriesController(IMediator mediator, IMapper mapper)
        {
            _mediator = mediator;
            _mapper = mapper;
        }

        [HttpGet("GetCategories")]
        public async Task<IEnumerable<CategoryDto>> GetCategories()
        {
            var result = await _mediator.Send(
                new GetListGenericQuery<Category>(condition: x => true, includes: null));

            return _mapper.Map<IEnumerable<CategoryDto>>(result);
        }

        [HttpGet("GetCategory/{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var entity = await _mediator.Send(
                new GetGenericQuery<Category>(condition: x => x.Id_c == id, includes: null));

            if (entity == null) return NotFound();
            return Ok(_mapper.Map<CategoryDto>(entity));
        }

        [HttpPost("AddCategory")]
        [Authorize(Roles = "admin,gestionnaire_de_stock")]
        public async Task<IActionResult> Add([FromBody] CategoryDto dto)
        {
            var category = _mapper.Map<Category>(dto);
            category.Id_c = Guid.NewGuid();
            var result = await _mediator.Send(new AddGenericCommand<Category>(category));
            return Ok(_mapper.Map<CategoryDto>(result));
        }

        [HttpPut("UpdateCategory")]
        [Authorize(Roles = "admin,gestionnaire_de_stock")]
        public async Task<IActionResult> Update([FromBody] CategoryDto dto)
        {
            var category = _mapper.Map<Category>(dto);
            var result = await _mediator.Send(new PutGenericCommand<Category>(category));
            return Ok(_mapper.Map<CategoryDto>(result));
        }

        [HttpDelete("DeleteCategory/{id}")]
        [Authorize(Roles = "admin,gestionnaire_de_stock")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var deleted = await _mediator.Send(new RemoveGenericCommand<Category>(id));
            if (deleted == null) return NotFound();
            return NoContent();
        }
    }
}
