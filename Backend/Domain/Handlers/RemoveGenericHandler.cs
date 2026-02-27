using System.Threading;
using System.Threading.Tasks;
using Domain.Commands;
using Domain.Interface;
using MediatR;

namespace Domain.Handlers
{
    public class RemoveGenericHandler<TEntity> : IRequestHandler<RemoveGenericCommand<TEntity>, TEntity> where TEntity : class
    {
        private readonly IGenericRepository<TEntity> _repository;

        public RemoveGenericHandler(IGenericRepository<TEntity> repository)
        {
            _repository = repository;
        }

        public async Task<TEntity> Handle(RemoveGenericCommand<TEntity> command, CancellationToken cancellationToken)
        {
            return await _repository.RemoveAsync(command.Id, cancellationToken);
        }
    }
}
