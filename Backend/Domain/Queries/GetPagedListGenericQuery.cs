using System;
using System.Linq;
using System.Linq.Expressions;
using MediatR;
using Microsoft.EntityFrameworkCore.Query;

namespace Domain.Queries
{
    /// <summary>Query to get a paged list of entities with optional includes.</summary>
    public class GetPagedListGenericQuery<TEntity> : IRequest<PagedResult<TEntity>> where TEntity : class
    {
        public Expression<Func<TEntity, bool>> Condition { get; }
        public int Page { get; }
        public int PageSize { get; }
        public Func<IQueryable<TEntity>, IIncludableQueryable<TEntity, object>> Includes { get; }

        public GetPagedListGenericQuery(
            Expression<Func<TEntity, bool>> condition,
            int page,
            int pageSize,
            Func<IQueryable<TEntity>, IIncludableQueryable<TEntity, object>> includes = null)
        {
            Condition = condition;
            Page = page;
            PageSize = pageSize;
            Includes = includes;
        }
    }
}
