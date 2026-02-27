using System.Threading;
using System.Threading.Tasks;
using Domain.Interface;
using Domain.Queries;
using MediatR;

namespace Domain.Handlers
{
    /// <summary>Handler for ExistsGenericQuery — checks existence via repository.</summary>
    public class ExistsGenericHandler<TEntity> : IRequestHandler<ExistsGenericQuery<TEntity>, bool> where TEntity : class
    {
        private readonly IGenericRepository<TEntity> _repository;

        public ExistsGenericHandler(IGenericRepository<TEntity> repository)
        {
            _repository = repository;
        }

        public async Task<bool> Handle(ExistsGenericQuery<TEntity> query, CancellationToken cancellationToken)
        {
            return await _repository.ExistsAsync(query.Condition, cancellationToken);
        }
    }
}
