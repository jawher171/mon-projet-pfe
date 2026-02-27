using System.Threading;
using System.Threading.Tasks;
using Domain.Commands;
using Domain.Interface;
using MediatR;

namespace Domain.Handlers
{
    public class PutGenericHandler<TEntity> : IRequestHandler<PutGenericCommand<TEntity>, TEntity> where TEntity : class
    {
        private readonly IGenericRepository<TEntity> _repository;

        public PutGenericHandler(IGenericRepository<TEntity> repository)
        {
            _repository = repository;
        }

        public async Task<TEntity> Handle(PutGenericCommand<TEntity> command, CancellationToken cancellationToken)
        {
            return await _repository.PutAsync(command.Entity, cancellationToken);
        }
    }
}
