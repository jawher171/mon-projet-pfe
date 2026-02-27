using System.Threading;
using System.Threading.Tasks;
using Domain.Commands;
using Domain.Interface;
using MediatR;

namespace Domain.Handlers
{
    public class AddGenericHandler<TEntity> : IRequestHandler<AddGenericCommand<TEntity>, TEntity> where TEntity : class
    {
        private readonly IGenericRepository<TEntity> _repository;

        public AddGenericHandler(IGenericRepository<TEntity> repository)
        {
            _repository = repository;
        }

        public async Task<TEntity> Handle(AddGenericCommand<TEntity> command, CancellationToken cancellationToken)
        {
            return await _repository.AddAsync(command.Entity, cancellationToken);
        }
    }
}
