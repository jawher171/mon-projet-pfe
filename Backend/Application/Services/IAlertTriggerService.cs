using System.Threading;
using System.Threading.Tasks;
using Domain.Models;

namespace Application.Services
{
    /// <summary>Triggers low_stock alerts when product stock falls below threshold. Each product (Stock) has its own alert.</summary>
    public interface IAlertTriggerService
    {
        /// <summary>Creates a low_stock alert for the product if quantity is at or below SeuilAlerte. Avoids duplicates.</summary>
        Task TryCreateLowStockAlertAsync(Stock stock, CancellationToken cancellationToken = default);
    }
}
