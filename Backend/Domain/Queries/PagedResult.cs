using System.Collections.Generic;

namespace Domain.Queries
{
    /// <summary>Paged result wrapper with items, total count, page info.</summary>
    public class PagedResult<TEntity> where TEntity : class
    {
        public IEnumerable<TEntity> Items { get; set; }
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages => PageSize > 0 ? (TotalCount + PageSize - 1) / PageSize : 0;

        public PagedResult(IEnumerable<TEntity> items, int totalCount, int page, int pageSize)
        {
            Items = items;
            TotalCount = totalCount;
            Page = page;
            PageSize = pageSize;
        }
    }
}
