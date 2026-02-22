using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Linq.Expressions;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore.Query;

namespace Domain.Interface
{
    /// <summary>Generic CRUD operations over any entity. Implemented by GenericRepository.</summary>
    public interface IGenericRepository<TEntity> where TEntity : class
    {
        IEnumerable<TEntity> GetList(Expression<Func<TEntity, bool>> condition,
            Func<IQueryable<TEntity>, IIncludableQueryable<TEntity, object>> includes = null);

        TEntity Get(Expression<Func<TEntity, bool>> condition,
            Func<IQueryable<TEntity>, IIncludableQueryable<TEntity, object>> includes = null);

        TEntity Add(TEntity entity);
        TEntity Remove(Guid id);
        TEntity Put(TEntity entity);

        Task<IEnumerable<TEntity>> GetListAsync(Expression<Func<TEntity, bool>> condition,
            Func<IQueryable<TEntity>, IIncludableQueryable<TEntity, object>> includes = null,
            CancellationToken cancellationToken = default);

        Task<TEntity> GetAsync(Expression<Func<TEntity, bool>> condition,
            Func<IQueryable<TEntity>, IIncludableQueryable<TEntity, object>> includes = null,
            CancellationToken cancellationToken = default);

        Task<TEntity> AddAsync(TEntity entity, CancellationToken cancellationToken = default);
        Task<TEntity> PutAsync(TEntity entity, CancellationToken cancellationToken = default);
        Task<TEntity> RemoveAsync(Guid id, CancellationToken cancellationToken = default);

        Task<TEntity> FirstOrDefaultAsync(Expression<Func<TEntity, bool>> predicate);
        Task<IEnumerable<TEntity>> GetListAsync(Expression<Func<TEntity, bool>> predicate, Func<IQueryable<TEntity>, IOrderedQueryable<TEntity>> orderBy = null);
    }
}
