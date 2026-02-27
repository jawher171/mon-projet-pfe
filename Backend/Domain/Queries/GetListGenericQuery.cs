using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using MediatR;
using Microsoft.EntityFrameworkCore.Query;

namespace Domain.Queries
{
    public class GetListGenericQuery<TEntity> : IRequest<IEnumerable<TEntity>> where TEntity : class
    {
        public Expression<Func<TEntity, bool>> Condition { get; }
        public Func<IQueryable<TEntity>, IIncludableQueryable<TEntity, object>> Includes { get; }

        public GetListGenericQuery(
            Expression<Func<TEntity, bool>> condition,
            Func<IQueryable<TEntity>, IIncludableQueryable<TEntity, object>> includes = null)
        {
            Condition = condition;
            Includes = includes;
        }
    }
}
