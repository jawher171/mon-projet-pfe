using System;
using System.Linq.Expressions;
using MediatR;

namespace Domain.Queries
{
    /// <summary>Query to count entities matching a condition.</summary>
    public class GetCountGenericQuery<TEntity> : IRequest<int> where TEntity : class
    {
        public Expression<Func<TEntity, bool>> Condition { get; }

        public GetCountGenericQuery(Expression<Func<TEntity, bool>> condition)
        {
            Condition = condition;
        }
    }
}
