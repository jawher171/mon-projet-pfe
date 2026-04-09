using System.Threading;
using System.Threading.Tasks;
using Application.Dtos;
using Application.Security;
using Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Application.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class DashboardEtlController : ControllerBase
    {
        private readonly IDashboardEtlService _dashboardEtlService;

        public DashboardEtlController(IDashboardEtlService dashboardEtlService)
        {
            _dashboardEtlService = dashboardEtlService;
        }

        [HttpGet("GetDashboardEtl")]
        [PermissionAuthorize("view_dashboard")]
        public async Task<IActionResult> GetDashboardEtl(
            [FromQuery] string? siteType,
            [FromQuery] string? siteId,
            [FromQuery] string? categoryId,
            [FromQuery] string? productId,
            [FromQuery] string? dateRange,
            CancellationToken cancellationToken)
        {
            var filter = new DashboardEtlFilterDto
            {
                SiteType = siteType,
                SiteId = siteId,
                CategoryId = categoryId,
                ProductId = productId,
                DateRange = dateRange
            };

            // VISUALIZATION API bridge: serve ETL snapshot to dashboard charts/cards.
            var snapshot = await _dashboardEtlService.BuildSnapshotAsync(filter, cancellationToken);
            return Ok(snapshot);
        }
    }
}
