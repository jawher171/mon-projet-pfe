using System.Threading;
using System.Threading.Tasks;
using Domain.Interface;
using Domain.Queries;
using MediatR;

namespace Domain.Handlers
{
    /// <summary>Handler for GetCountGenericQuery — returns count from repository.</summary>
    public class GetCountGenericHandler<TEntity> : IRequestHandler<GetCountGenericQuery<TEntity>, int> where TEntity : class
    {
        private readonly IGenericRepository<TEntity> _repository;

        public GetCountGenericHandler(IGenericRepository<TEntity> repository)
        {
            _repository = repository;
        }

        public async Task<int> Handle(GetCountGenericQuery<TEntity> query, CancellationToken cancellationToken)
        {
            return await _repository.CountAsync(query.Condition, cancellationToken);
        }
    }
}
