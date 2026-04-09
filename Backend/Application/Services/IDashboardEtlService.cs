using System.Threading;
using System.Threading.Tasks;
using Application.Dtos;

namespace Application.Services
{
    public interface IDashboardEtlService
    {
        Task<DashboardEtlDto> BuildSnapshotAsync(DashboardEtlFilterDto filter, CancellationToken cancellationToken = default);
    }
}
