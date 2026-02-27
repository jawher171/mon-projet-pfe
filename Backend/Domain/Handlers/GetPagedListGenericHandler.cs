using System.Threading;
using System.Threading.Tasks;
using Domain.Interface;
using Domain.Queries;
using MediatR;

namespace Domain.Handlers
{
    /// <summary>Handler for GetPagedListGenericQuery — returns paged result from repository.</summary>
    public class GetPagedListGenericHandler<TEntity> : IRequestHandler<GetPagedListGenericQuery<TEntity>, PagedResult<TEntity>> where TEntity : class
    {
        private readonly IGenericRepository<TEntity> _repository;

        public GetPagedListGenericHandler(IGenericRepository<TEntity> repository)
        {
            _repository = repository;
        }

        public async Task<PagedResult<TEntity>> Handle(GetPagedListGenericQuery<TEntity> query, CancellationToken cancellationToken)
        {
            var (items, totalCount) = await _repository.GetPagedListAsync(
                query.Condition, query.Page, query.PageSize, query.Includes, cancellationToken);
            return new PagedResult<TEntity>(items, totalCount, query.Page, query.PageSize);
        }
    }
}
