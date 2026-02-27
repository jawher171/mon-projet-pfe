using System;
using System.Linq.Expressions;
using MediatR;

namespace Domain.Queries
{
    /// <summary>Query to check if any entity matches a condition.</summary>
    public class ExistsGenericQuery<TEntity> : IRequest<bool> where TEntity : class
    {
        public Expression<Func<TEntity, bool>> Condition { get; }

        public ExistsGenericQuery(Expression<Func<TEntity, bool>> condition)
        {
            Condition = condition;
        }
    }
}
