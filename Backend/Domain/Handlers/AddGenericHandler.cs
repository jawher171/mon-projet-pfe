using System.Threading;
using System.Threading.Tasks;
using Domain.Commands;
using Domain.Interface;

namespace Domain.Handlers
{
    public class AddGenericHandler<TEntity> where TEntity : class
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
