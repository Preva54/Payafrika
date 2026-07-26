using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PayAfrika.API.Models;

public class ScheduledReport
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid CreatedById { get; set; }

    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;

    [MaxLength(100)]
    public string ReportType { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Frequency { get; set; } = "weekly";

    [MaxLength(100)]
    public string CronExpression { get; set; } = string.Empty;

    public string Filters { get; set; } = "{}";

    [MaxLength(50)]
    public string Format { get; set; } = "pdf";

    [MaxLength(500)]
    public string RecipientEmails { get; set; } = string.Empty;

    public bool IncludeCharts { get; set; } = true;
    public bool IncludeSummary { get; set; } = true;

    [MaxLength(50)]
    public string Status { get; set; } = "active";

    public DateTime? LastRunAt { get; set; }
    public DateTime? NextRunAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}

public class ReportExportJob
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? UserId { get; set; }

    [MaxLength(100)]
    public string ReportType { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Format { get; set; } = "xlsx";

    public string Filters { get; set; } = "{}";
    public string FileUrl { get; set; } = string.Empty;
    public long FileSize { get; set; }

    [MaxLength(50)]
    public string Status { get; set; } = "pending";

    public string ErrorMessage { get; set; } = string.Empty;
    public DateTime? CompletedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class ReportDashboardResponse
{
    public List<KpiCard> Kpis { get; set; } = new();
    public List<TimeSeriesPoint> RevenueTrend { get; set; } = new();
    public List<TimeSeriesPoint> TransactionTrend { get; set; } = new();
    public List<TimeSeriesPoint> UserGrowthTrend { get; set; } = new();
    public List<TimeSeriesPoint> PaymentMethodDistribution { get; set; } = new();
    public TopPerformersData TopPerformers { get; set; } = new();
    public List<AiInsight> AiInsights { get; set; } = new();
}

public class KpiCard
{
    public string Label { get; set; } = string.Empty;
    public decimal Value { get; set; }
    public decimal PreviousValue { get; set; }
    public double ChangePercent { get; set; }
    public string Trend { get; set; } = "neutral";
    public string Format { get; set; } = "number";
    public string Icon { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
}

public class TimeSeriesPoint
{
    public string Date { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public decimal Value { get; set; }
    public decimal? SecondaryValue { get; set; }
}

public class TopPerformersData
{
    public List<PerformerItem> TopMerchantsByRevenue { get; set; } = new();
    public List<PerformerItem> TopAffiliatesByEarnings { get; set; } = new();
    public List<PerformerItem> TopCountriesByVolume { get; set; } = new();
}

public class PerformerItem
{
    public string Name { get; set; } = string.Empty;
    public decimal Value { get; set; }
    public decimal? SecondaryValue { get; set; }
    public string? Identifier { get; set; }
    public string? Badge { get; set; }
}

public class AiInsight
{
    public string Type { get; set; } = "info";
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public double? Severity { get; set; }
    public string? Metric { get; set; }
    public decimal? CurrentValue { get; set; }
    public decimal? PreviousValue { get; set; }
}

public class RevenueReportResponse
{
    public List<KpiCard> Kpis { get; set; } = new();
    public List<TimeSeriesPoint> DailyRevenue { get; set; } = new();
    public List<TimeSeriesPoint> MonthlyRevenue { get; set; } = new();
    public List<TimeSeriesPoint> RevenueByPaymentMethod { get; set; } = new();
    public List<TimeSeriesPoint> RevenueByCurrency { get; set; } = new();
}

public class TransactionReportResponse
{
    public List<KpiCard> Kpis { get; set; } = new();
    public List<TimeSeriesPoint> VolumeTrend { get; set; } = new();
    public List<TimeSeriesPoint> StatusDistribution { get; set; } = new();
    public List<TimeSeriesPoint> PeakHours { get; set; } = new();
    public List<TimeSeriesPoint> ByPaymentMethod { get; set; } = new();
    public List<TransactionRow> RecentTransactions { get; set; } = new();
}

public class TransactionRow
{
    public Guid Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "ZAR";
    public string Status { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string? Reference { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class MerchantReportResponse
{
    public List<KpiCard> Kpis { get; set; } = new();
    public List<TimeSeriesPoint> GrowthTrend { get; set; } = new();
    public List<PerformerItem> RevenueLeaderboard { get; set; } = new();
    public List<PerformerItem> GrowthLeaderboard { get; set; } = new();
    public List<PerformerItem> TransactionLeaderboard { get; set; } = new();
}

public class CustomerReportResponse
{
    public List<KpiCard> Kpis { get; set; } = new();
    public List<TimeSeriesPoint> RegistrationTrend { get; set; } = new();
    public List<TimeSeriesPoint> CountryDistribution { get; set; } = new();
    public List<TimeSeriesPoint> KycStatusDistribution { get; set; } = new();
}

public class FinancialReportResponse
{
    public List<KpiCard> Kpis { get; set; } = new();
    public List<TimeSeriesPoint> MonthlyPnl { get; set; } = new();
    public List<TimeSeriesPoint> FeeBreakdown { get; set; } = new();
    public FinancialSummary Summary { get; set; } = new();
}

public class FinancialSummary
{
    public decimal TotalRevenue { get; set; }
    public decimal TotalFees { get; set; }
    public decimal TotalRefunds { get; set; }
    public decimal TotalChargebacks { get; set; }
    public decimal AffiliateExpenses { get; set; }
    public decimal NetProfit { get; set; }
    public decimal GrossMargin { get; set; }
}

public class ComplianceReportResponse
{
    public List<KpiCard> Kpis { get; set; } = new();
    public List<TimeSeriesPoint> ApplicationTrend { get; set; } = new();
    public List<TimeSeriesPoint> CountryDistribution { get; set; } = new();
    public List<TimeSeriesPoint> DocumentTypeDistribution { get; set; } = new();
}

public class AffiliateReportResponse
{
    public List<KpiCard> Kpis { get; set; } = new();
    public List<TimeSeriesPoint> ReferralTrend { get; set; } = new();
    public List<TimeSeriesPoint> CommissionTrend { get; set; } = new();
    public List<PerformerItem> TopAffiliates { get; set; } = new();
}

public class WalletReportResponse
{
    public List<KpiCard> Kpis { get; set; } = new();
    public List<TimeSeriesPoint> BalanceTrend { get; set; } = new();
    public List<TimeSeriesPoint> CurrencyDistribution { get; set; } = new();
}

public class SupportReportResponse
{
    public List<KpiCard> Kpis { get; set; } = new();
    public List<TimeSeriesPoint> TicketTrend { get; set; } = new();
    public List<TimeSeriesPoint> CategoryDistribution { get; set; } = new();
    public List<TimeSeriesPoint> SatisfactionTrend { get; set; } = new();
}

public class ReportQuery
{
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string Period { get; set; } = "last30days";
    public string? MerchantId { get; set; }
    public string? CustomerId { get; set; }
    public string? Currency { get; set; }
    public string? PaymentMethod { get; set; }
    public string? Status { get; set; }
    public string? Country { get; set; }
}
