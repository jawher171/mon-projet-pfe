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

namespace Application.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class CategoriesController : ControllerBase
    {
        private readonly IGenericRepository<Category> _repository;
        private readonly IMapper _mapper;

        public CategoriesController(IGenericRepository<Category> repository, IMapper mapper)
        {
            _repository = repository;
            _mapper = mapper;
        }

        [HttpGet("GetCategories")]
        public async Task<IEnumerable<CategoryDto>> GetNotDeleted()
        {
            var result = await (new GetListGenericHandler<Category>(_repository))
                .Handle(
                    new GetListGenericQuery<Category>(condition: x => true, includes: null),
                    new CancellationToken());

            return _mapper.Map<IEnumerable<CategoryDto>>(result);
        }

        [HttpGet("GetCategory/{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var entity = await (new GetGenericHandler<Category>(_repository))
                .Handle(
                    new GetGenericQuery<Category>(condition: x => x.Id_c == id, includes: null),
                    new CancellationToken());

            if (entity == null) return NotFound();
            return Ok(_mapper.Map<CategoryDto>(entity));
        }

        [HttpPost("AddCategory")]
        [Authorize(Roles = "admin,gestionnaire_de_stock")]
        public async Task<IActionResult> Add([FromBody] Category category)
        {
            var handler = new AddGenericHandler<Category>(_repository);
            var command = new AddGenericCommand<Category>(category);
            var result = await handler.Handle(command, new CancellationToken());
            return Ok(_mapper.Map<CategoryDto>(result));
        }

        [HttpPut("UpdateCategory")]
        [Authorize(Roles = "admin,gestionnaire_de_stock")]
        public async Task<IActionResult> Update([FromBody] Category category)
        {
            var handler = new PutGenericHandler<Category>(_repository);
            var command = new PutGenericCommand<Category>(category);
            var result = await handler.Handle(command, new CancellationToken());
            return Ok(_mapper.Map<CategoryDto>(result));
        }

        [HttpDelete("DeleteCategory/{id}")]
        [Authorize(Roles = "admin,gestionnaire_de_stock")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var handler = new RemoveGenericHandler<Category>(_repository);
            var command = new RemoveGenericCommand(id);
            var deleted = await handler.Handle(command, new CancellationToken());
            if (deleted == null) return NotFound();
            return NoContent();
        }
    }
}
