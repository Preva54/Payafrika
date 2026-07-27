using PayAfrika.API.DTOs;

namespace PayAfrika.API.Services;

public interface IExchangeRateService
{
    Task<FxDashboardDto> GetDashboardAsync();
    Task<AnalyticsDto> GetAnalyticsAsync();
    Task<FxReportDto> GetReportAsync(DateTime? from, DateTime? to);
    Task<List<VolumeTrendDto>> GetVolumeTrendAsync(string period);
    Task<int> SyncRatesFromProviderAsync(Guid providerId);
    Task CheckProviderHealthAsync();
}
