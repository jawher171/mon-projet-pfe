using System.Threading;
using System.Threading.Tasks;
using Domain.Commands;
using Domain.Interface;

namespace Domain.Handlers
{
    public class DeleteGenericHandler<TEntity> where TEntity : class
    {
        private readonly IGenericRepository<TEntity> _repository;

        public DeleteGenericHandler(IGenericRepository<TEntity> repository)
        {
            _repository = repository;
        }

        public async Task<TEntity> Handle(DeleteGenericCommand<TEntity> request, CancellationToken cancellationToken)
        {
            var result = _repository.Remove(request.Id);
            return await Task.FromResult(result);
        }
    }
}
