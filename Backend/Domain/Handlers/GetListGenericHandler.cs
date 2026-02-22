using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Domain.Interface;
using Domain.Queries;

namespace Domain.Handlers
{
    public class GetListGenericHandler<TEntity> where TEntity : class
    {
        private readonly IGenericRepository<TEntity> _repository;

        public GetListGenericHandler(IGenericRepository<TEntity> repository)
        {
            _repository = repository;
        }

        public async Task<IEnumerable<TEntity>> Handle(GetListGenericQuery<TEntity> query, CancellationToken cancellationToken)
        {
            return await _repository.GetListAsync(query.Condition, query.Includes, cancellationToken);
        }
    }
}
