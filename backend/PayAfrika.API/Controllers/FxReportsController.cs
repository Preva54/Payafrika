using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PayAfrika.API.DTOs;
using PayAfrika.API.Services;

namespace PayAfrika.API.Controllers;

[ApiController]
[Route("api/admin/fx-reports")]
[Authorize]
public class FxReportsController : ControllerBase
{
    private readonly IExchangeRateService _rateService;

    public FxReportsController(IExchangeRateService rateService)
    {
        _rateService = rateService;
    }

    [HttpGet("dashboard")]
    public async Task<ActionResult<FxDashboardDto>> Dashboard()
    {
        return Ok(await _rateService.GetDashboardAsync());
    }

    [HttpGet("analytics")]
    public async Task<ActionResult<AnalyticsDto>> Analytics()
    {
        return Ok(await _rateService.GetAnalyticsAsync());
    }

    [HttpGet("report")]
    public async Task<ActionResult<FxReportDto>> Report([FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        return Ok(await _rateService.GetReportAsync(from, to));
    }

    [HttpGet("volume-trend")]
    public async Task<ActionResult<List<VolumeTrendDto>>> VolumeTrend([FromQuery] string period = "monthly")
    {
        return Ok(await _rateService.GetVolumeTrendAsync(period));
    }
}
