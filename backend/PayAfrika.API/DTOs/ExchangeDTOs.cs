using System.ComponentModel.DataAnnotations;

namespace PayAfrika.API.DTOs;

public class CurrencyRequest
{
    [Required, MaxLength(3)] public string Code { get; set; } = string.Empty;
    [Required, MaxLength(100)] public string Name { get; set; } = string.Empty;
    [MaxLength(10)] public string Symbol { get; set; } = string.Empty;
    [MaxLength(100)] public string Country { get; set; } = string.Empty;
    [MaxLength(10)] public string FlagEmoji { get; set; } = string.Empty;
    public int DecimalPlaces { get; set; } = 2;
    public int SortOrder { get; set; }
}

public class ExchangeRateRequest
{
    [Required, MaxLength(3)] public string BaseCurrency { get; set; } = string.Empty;
    [Required, MaxLength(3)] public string QuoteCurrency { get; set; } = string.Empty;
    public decimal BuyRate { get; set; }
    public decimal SellRate { get; set; }
    public decimal MidMarketRate { get; set; }
    public decimal Spread { get; set; }
    public Guid? ProviderId { get; set; }
    public string Source { get; set; } = "manual";
    public DateTime? LockedUntil { get; set; }
}

public class ProviderRequest
{
    [Required, MaxLength(100)] public string Name { get; set; } = string.Empty;
    [MaxLength(500)] public string ApiEndpoint { get; set; } = string.Empty;
    public string? ApiKey { get; set; }
    public int Priority { get; set; }
    public bool IsPrimary { get; set; }
    public bool IsFallback { get; set; }
    public string? ConfigJson { get; set; }
}

public class CurrencyPairRequest
{
    [Required, MaxLength(3)] public string BaseCurrency { get; set; } = string.Empty;
    [Required, MaxLength(3)] public string QuoteCurrency { get; set; } = string.Empty;
    public bool IsEnabled { get; set; } = true;
    public Guid? PreferredProviderId { get; set; }
    public decimal MinBuySpread { get; set; }
    public decimal MaxBuySpread { get; set; }
    public decimal MinSellSpread { get; set; }
    public decimal MaxSellSpread { get; set; }
    public decimal DailyBuyLimit { get; set; }
    public decimal DailySellLimit { get; set; }
    public decimal BuyFee { get; set; }
    public decimal SellFee { get; set; }
    public string FeeType { get; set; } = "percentage";
    public int SortOrder { get; set; }
}

public class FxMarginRequest
{
    [Required, MaxLength(100)] public string Name { get; set; } = string.Empty;
    [Required, MaxLength(20)] public string Type { get; set; } = "global";
    public Guid? EntityId { get; set; }
    [Required, MaxLength(20)] public string MarginType { get; set; } = "percentage";
    public decimal Value { get; set; }
    public decimal? MinValue { get; set; }
    public decimal? MaxValue { get; set; }
    public bool IsActive { get; set; } = true;
    public int Priority { get; set; }
}

public class ConversionRuleRequest
{
    [Required, MaxLength(100)] public string Name { get; set; } = string.Empty;
    [Required, MaxLength(30)] public string RuleType { get; set; } = string.Empty;
    public string RoundingRule { get; set; } = "standard";
    public int DecimalPrecision { get; set; } = 2;
    public decimal? MinAmount { get; set; }
    public decimal? MaxAmount { get; set; }
    public bool IsActive { get; set; } = true;
    public int Priority { get; set; }
}

public class SettlementCurrencyRequest
{
    [Required, MaxLength(3)] public string Currency { get; set; } = string.Empty;
    public bool IsDefaultSettlement { get; set; }
    public bool AutoConversion { get; set; } = true;
    public string SettlementFrequency { get; set; } = "daily";
    public decimal MarginPercent { get; set; }
    public decimal FeePercent { get; set; }
}

public class RegionalRuleRequest
{
    [Required, MaxLength(100)] public string Country { get; set; } = string.Empty;
    [Required, MaxLength(3)] public string DefaultCurrency { get; set; } = string.Empty;
    public string SupportedCurrenciesJson { get; set; } = "[]";
    public string AllowedPairsJson { get; set; } = "[]";
    public string RestrictionsJson { get; set; } = "{}";
    public string LocalPaymentMethodsJson { get; set; } = "[]";
}

public class ExchangeAlertRequest
{
    [Required, MaxLength(50)] public string AlertType { get; set; } = string.Empty;
    [Required, MaxLength(50)] public string Channel { get; set; } = "email";
    public decimal Threshold { get; set; }
    public bool IsEnabled { get; set; } = true;
}

public class FxDashboardDto
{
    public int SupportedCurrencies { get; set; }
    public int ActiveRates { get; set; }
    public DateTime? LastSync { get; set; }
    public decimal TodayFxVolume { get; set; }
    public decimal AverageMargin { get; set; }
    public int FailedUpdates { get; set; }
    public int CurrencyPairs { get; set; }
    public int ActiveProviders { get; set; }
    public int DegradedProviders { get; set; }
    public List<LiveRateDto> LiveRates { get; set; } = new();
}

public class LiveRateDto
{
    public string Pair { get; set; } = string.Empty;
    public decimal Rate { get; set; }
    public decimal Change { get; set; }
    public string Direction { get; set; } = "flat";
    public DateTime UpdatedAt { get; set; }
}

public class FxReportDto
{
    public decimal ExchangeVolume { get; set; }
    public decimal FxRevenue { get; set; }
    public decimal AverageMargin { get; set; }
    public double ConversionSuccessRate { get; set; }
    public int TotalConversions { get; set; }
    public int FailedConversions { get; set; }
    public List<CurrencyUsageDto> CurrencyUsage { get; set; } = new();
    public List<PairVolumeDto> TopPairs { get; set; } = new();
}

public class CurrencyUsageDto
{
    public string Currency { get; set; } = string.Empty;
    public int Count { get; set; }
    public decimal Volume { get; set; }
}

public class PairVolumeDto
{
    public string Pair { get; set; } = string.Empty;
    public decimal Volume { get; set; }
    public int Count { get; set; }
}

public class AnalyticsDto
{
    public string MostUsedCurrency { get; set; } = string.Empty;
    public string MostActivePair { get; set; } = string.Empty;
    public decimal DailyFxVolume { get; set; }
    public decimal WeeklyFxVolume { get; set; }
    public decimal MonthlyFxVolume { get; set; }
    public decimal FxProfit { get; set; }
    public int TotalConversions { get; set; }
    public int FailedConversions { get; set; }
    public double ConversionRate { get; set; }
    public List<VolumeTrendDto> VolumeTrend { get; set; } = new();
}

public class VolumeTrendDto
{
    public DateTime Date { get; set; }
    public decimal Volume { get; set; }
}
