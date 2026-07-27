using Microsoft.EntityFrameworkCore;
using PayAfrika.API.Data;
using PayAfrika.API.DTOs;

namespace PayAfrika.API.Services;

public class ExchangeRateService : IExchangeRateService
{
    private readonly AppDbContext _db;

    public ExchangeRateService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<FxDashboardDto> GetDashboardAsync()
    {
        var currencies = await _db.Currencies.CountAsync(c => c.IsActive);
        var rates = await _db.ExchangeRates.CountAsync(r => r.IsActive);
        var pairs = await _db.CurrencyPairs.CountAsync(p => p.IsEnabled);
        var providers = await _db.ExchangeRateProviders.Where(p => p.IsActive).ToListAsync();

        return new FxDashboardDto
        {
            SupportedCurrencies = currencies,
            ActiveRates = rates,
            CurrencyPairs = pairs,
            ActiveProviders = providers.Count(p => p.HealthStatus == "healthy"),
            DegradedProviders = providers.Count(p => p.HealthStatus == "degraded" || p.HealthStatus == "down"),
            LastSync = providers.MaxBy(p => p.LastHealthCheck)?.LastHealthCheck,
            LiveRates = await GetLiveRatesAsync(),
        };
    }

    public async Task<AnalyticsDto> GetAnalyticsAsync()
    {
        var now = DateTime.UtcNow;
        var todayStart = now.Date;
        var weekStart = todayStart.AddDays(-(int)now.DayOfWeek);
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var todayLogs = await _db.FxAuditLogs
            .Where(l => l.CreatedAt >= todayStart && l.Action.Contains("conversion", StringComparison.OrdinalIgnoreCase))
            .ToListAsync();

        var weekLogs = await _db.FxAuditLogs
            .Where(l => l.CreatedAt >= weekStart && l.Action.Contains("conversion", StringComparison.OrdinalIgnoreCase))
            .ToListAsync();

        var monthLogs = await _db.FxAuditLogs
            .Where(l => l.CreatedAt >= monthStart && l.Action.Contains("conversion", StringComparison.OrdinalIgnoreCase))
            .ToListAsync();

        return new AnalyticsDto
        {
            DailyFxVolume = todayLogs.Sum(l => ParseDecimal(l.NewValueJson)),
            WeeklyFxVolume = weekLogs.Sum(l => ParseDecimal(l.NewValueJson)),
            MonthlyFxVolume = monthLogs.Sum(l => ParseDecimal(l.NewValueJson)),
            TotalConversions = monthLogs.Count,
            FailedConversions = monthLogs.Count(l => l.Action.Contains("failed")),
            ConversionRate = monthLogs.Count == 0 ? 0 : (double)(monthLogs.Count - monthLogs.Count(l => l.Action.Contains("failed"))) / monthLogs.Count * 100,
        };
    }

    public async Task<FxReportDto> GetReportAsync(DateTime? from, DateTime? to)
    {
        from ??= DateTime.UtcNow.AddMonths(-1);
        to ??= DateTime.UtcNow;

        var logs = await _db.FxAuditLogs
            .Where(l => l.CreatedAt >= from && l.CreatedAt <= to)
            .ToListAsync();

        return new FxReportDto
        {
            TotalConversions = logs.Count,
            FailedConversions = logs.Count(l => l.Action.Contains("failed")),
            ConversionSuccessRate = logs.Count == 0 ? 0 : (double)(logs.Count - logs.Count(l => l.Action.Contains("failed"))) / logs.Count * 100,
            ExchangeVolume = logs.Sum(l => ParseDecimal(l.NewValueJson)),
        };
    }

    public async Task<List<VolumeTrendDto>> GetVolumeTrendAsync(string period)
    {
        var now = DateTime.UtcNow;
        DateTime start = period switch
        {
            "weekly" => now.AddDays(-7),
            "monthly" => now.AddMonths(-1),
            "yearly" => now.AddYears(-1),
            _ => now.AddDays(-30),
        };

        var logs = await _db.FxAuditLogs
            .Where(l => l.CreatedAt >= start && l.Action.Contains("conversion"))
            .OrderBy(l => l.CreatedAt)
            .ToListAsync();

        return logs
            .GroupBy(l => l.CreatedAt.Date)
            .Select(g => new VolumeTrendDto { Date = g.Key, Volume = g.Sum(l => ParseDecimal(l.NewValueJson)) })
            .OrderBy(v => v.Date)
            .ToList();
    }

    public async Task<int> SyncRatesFromProviderAsync(Guid providerId)
    {
        var now = DateTime.UtcNow;
        var updated = 0;

        var pendingRates = await _db.ExchangeRates
            .Where(r => r.ProviderId == providerId && r.IsActive)
            .ToListAsync();

        foreach (var rate in pendingRates)
        {
            rate.Spread = rate.SellRate - rate.BuyRate;
            rate.MidMarketRate = (rate.BuyRate + rate.SellRate) / 2;
            rate.UpdatedAt = now;
            updated++;
        }

        await _db.SaveChangesAsync();
        return updated;
    }

    public async Task CheckProviderHealthAsync()
    {
        var now = DateTime.UtcNow;
        var providers = await _db.ExchangeRateProviders.Where(p => p.IsActive).ToListAsync();

        foreach (var provider in providers)
        {
            provider.HealthStatus = "healthy";
            provider.LastHealthCheck = now;
        }

        await _db.SaveChangesAsync();
    }

    private async Task<List<LiveRateDto>> GetLiveRatesAsync()
    {
        var rates = await _db.ExchangeRates
            .Where(r => r.IsActive)
            .OrderBy(r => r.BaseCurrency)
            .ToListAsync();

        var history = await _db.FxAuditLogs
            .Where(l => l.Action == "Rate Updated")
            .OrderByDescending(l => l.CreatedAt)
            .Take(100)
            .ToListAsync();

        return rates.Select(r =>
        {
            var prev = history.FirstOrDefault(h => h.EntityId == r.Id.ToString());
            var prevRate = prev != null ? ParseDecimal(prev.PreviousValueJson) : r.MidMarketRate;
            var change = prevRate == 0 ? 0 : ((r.MidMarketRate - prevRate) / prevRate) * 100;

            return new LiveRateDto
            {
                Pair = $"{r.BaseCurrency}/{r.QuoteCurrency}",
                Rate = r.MidMarketRate,
                Change = Math.Round(change, 2),
                Direction = change > 0 ? "up" : change < 0 ? "down" : "flat",
                UpdatedAt = r.UpdatedAt ?? r.CreatedAt,
            };
        }).ToList();
    }

    // Static helpers used by WalletController
    private static readonly Dictionary<string, (string Flag, string Name, decimal ZARRate)> StaticCurrencies = new()
    {
        ["ZAR"] = ("🇿🇦", "South African Rand", 1m),
        ["USD"] = ("🇺🇸", "US Dollar", 18.42m),
        ["EUR"] = ("🇪🇺", "Euro", 20.15m),
        ["GBP"] = ("🇬🇧", "British Pound", 23.45m),
        ["NGN"] = ("🇳🇬", "Nigerian Naira", 0.012m),
        ["KES"] = ("🇰🇪", "Kenyan Shilling", 0.142m),
        ["GHS"] = ("🇬🇭", "Ghanaian Cedi", 1.38m),
        ["XOF"] = ("🌍", "CFA Franc", 0.031m),
        ["ZMW"] = ("🇿🇲", "Zambian Kwacha", 0.71m),
        ["TZS"] = ("🇹🇿", "Tanzanian Shilling", 0.0069m),
        ["BWP"] = ("🇧🇼", "Botswana Pula", 0.75m),
        ["MZN"] = ("🇲🇿", "Mozambican Metical", 0.29m),
        ["EGP"] = ("🇪🇬", "Egyptian Pound", 0.59m),
        ["MAD"] = ("🇲🇦", "Moroccan Dirham", 1.82m),
        ["NAD"] = ("🇳🇦", "Namibian Dollar", 1.0m),
        ["UGX"] = ("🇺🇬", "Ugandan Shilling", 0.0048m),
        ["BTC"] = ("₿", "Bitcoin", 1_180_000m),
        ["ETH"] = ("⟠", "Ethereum", 92_500m),
        ["USDT"] = ("💵", "Tether USD", 18.40m),
        ["USDC"] = ("💰", "USD Coin", 18.40m),
    };

    public static DateTime LastUpdated => DateTime.UtcNow;

    public static string GetFlag(string currency) =>
        StaticCurrencies.TryGetValue(currency, out var info) ? info.Flag : "🏦";

    public static string GetName(string currency) =>
        StaticCurrencies.TryGetValue(currency, out var info) ? info.Name : currency;

    public static decimal GetZARRate(string currency) =>
        StaticCurrencies.TryGetValue(currency, out var info) ? info.ZARRate : 1m;

    public static decimal Convert(decimal amount, string fromCurrency, string toCurrency)
    {
        var fromRate = GetZARRate(fromCurrency);
        var toRate = GetZARRate(toCurrency);
        if (toRate == 0) return 0;
        return amount * (fromRate / toRate);
    }

    public static List<string> GetSupportedCurrencies() => StaticCurrencies.Keys.ToList();

    public static List<(string From, string To)> GetExchangePairs() =>
    [
        ("ZAR", "USD"), ("ZAR", "EUR"), ("ZAR", "GBP"),
        ("USD", "EUR"), ("USD", "GBP"), ("EUR", "GBP"),
        ("ZAR", "NGN"), ("ZAR", "KES"), ("ZAR", "GHS"),
        ("USD", "NGN"), ("USD", "KES"),
        ("ZAR", "BTC"), ("ZAR", "ETH"), ("ZAR", "USDT"),
        ("USD", "BTC"), ("USD", "ETH"),
    ];

    private static decimal ParseDecimal(string? jsonValue)
    {
        if (string.IsNullOrWhiteSpace(jsonValue)) return 0;
        try
        {
            var doc = System.Text.Json.JsonDocument.Parse(jsonValue);
            if (doc.RootElement.TryGetProperty("volume", out var vol) && vol.ValueKind == System.Text.Json.JsonValueKind.Number)
                return vol.GetDecimal();
            if (doc.RootElement.TryGetProperty("rate", out var rate) && rate.ValueKind == System.Text.Json.JsonValueKind.Number)
                return rate.GetDecimal();
            if (decimal.TryParse(jsonValue.Trim('"'), out var d)) return d;
            return 0;
        }
        catch { return 0; }
    }
}
