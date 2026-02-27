using System.Threading;
using System.Threading.Tasks;
using Domain.Interface;
using Domain.Queries;
using MediatR;

namespace Domain.Handlers
{
    public class GetGenericHandler<TEntity> : IRequestHandler<GetGenericQuery<TEntity>, TEntity> where TEntity : class
    {
        private readonly IGenericRepository<TEntity> _repository;

        public GetGenericHandler(IGenericRepository<TEntity> repository)
        {
            _repository = repository;
        }

        public async Task<TEntity> Handle(GetGenericQuery<TEntity> query, CancellationToken cancellationToken)
        {
            return await _repository.GetAsync(query.Condition, query.Includes, cancellationToken);
        }
    }
}
