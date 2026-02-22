using System.Threading;
using System.Threading.Tasks;
using Domain.Commands;
using Domain.Interface;

namespace Domain.Handlers
{
    public class RemoveGenericHandler<TEntity> where TEntity : class
    {
        private readonly IGenericRepository<TEntity> _repository;

        public RemoveGenericHandler(IGenericRepository<TEntity> repository)
        {
            _repository = repository;
        }

        public async Task<TEntity> Handle(RemoveGenericCommand command, CancellationToken cancellationToken)
        {
            return await _repository.RemoveAsync(command.Id, cancellationToken);
        }
    }
}
