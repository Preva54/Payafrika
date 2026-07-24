using System.ComponentModel.DataAnnotations;

namespace PayAfrika.API.DTOs;

public class WalletOverviewResponse
{
    public decimal TotalBalance { get; set; }
    public decimal AvailableBalance { get; set; }
    public decimal PendingBalance { get; set; }
    public decimal MonthlyCashFlow { get; set; }
    public decimal MonthlyIncome { get; set; }
    public decimal MonthlySpending { get; set; }
}

public class CurrencyWalletResponse
{
    public string Currency { get; set; } = string.Empty;
    public string Flag { get; set; } = string.Empty;
    public decimal Balance { get; set; }
    public decimal ZARValue { get; set; }
    public decimal ChangePercent { get; set; }
    public List<decimal> MiniGraph { get; set; } = new();
}

public class WalletActionRequest
{
    [Required, Range(1, double.MaxValue)]
    public decimal Amount { get; set; }
    [MaxLength(3)]
    public string Currency { get; set; } = "ZAR";
    [MaxLength(50)]
    public string? Method { get; set; }
    [MaxLength(500)]
    public string? Description { get; set; }
}

public class TransferRequest
{
    [Required, Range(1, double.MaxValue)]
    public decimal Amount { get; set; }
    [Required, MaxLength(3)]
    public string FromCurrency { get; set; } = "ZAR";
    [Required, MaxLength(3)]
    public string ToCurrency { get; set; } = "USD";
    [MaxLength(200)]
    public string? Recipient { get; set; }
}

public class ExchangeRequest
{
    [Required, Range(1, double.MaxValue)]
    public decimal Amount { get; set; }
    [Required, MaxLength(3)]
    public string FromCurrency { get; set; } = "ZAR";
    [Required, MaxLength(3)]
    public string ToCurrency { get; set; } = "USD";
}

public class ExchangeRateResponse
{
    public string From { get; set; } = string.Empty;
    public string To { get; set; } = string.Empty;
    public decimal Rate { get; set; }
    public decimal Spread { get; set; }
    public string LastUpdated { get; set; } = string.Empty;
}

public class WalletAnalyticsResponse
{
    public List<ChartDataPoint> IncomeVsExpenses { get; set; } = new();
    public List<ChartDataPoint> MonthlyBalance { get; set; } = new();
    public List<ChartDataPoint> SpendingCategories { get; set; } = new();
    public List<ChartDataPoint> TopRecipients { get; set; } = new();
    public decimal AverageTransaction { get; set; }
    public decimal LargestTransaction { get; set; }
    public decimal CashFlow { get; set; }
}

public class SpendingInsightResponse
{
    public string Message { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public List<SpendingRecommendation> Recommendations { get; set; } = new();
}

public class SpendingRecommendation
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
}

public class LinkedBankResponse
{
    public Guid Id { get; set; }
    public string BankName { get; set; } = string.Empty;
    public string AccountName { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public bool IsVerified { get; set; }
    public bool IsPrimary { get; set; }
}

public class LinkBankRequest
{
    [Required, MaxLength(200)]
    public string BankName { get; set; } = string.Empty;
    [Required, MaxLength(200)]
    public string AccountName { get; set; } = string.Empty;
    [Required, MaxLength(50)]
    public string AccountNumber { get; set; } = string.Empty;
}

public class WalletNotificationResponse
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public bool Read { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class StatementRequest
{
    [MaxLength(3)]
    public string Currency { get; set; } = "ZAR";
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    [MaxLength(50)]
    public string? Type { get; set; }
}

public class QRRequest
{
    public decimal? Amount { get; set; }
    [MaxLength(3)]
    public string Currency { get; set; } = "ZAR";
    [MaxLength(500)]
    public string? Description { get; set; }
}

public class QRResponse
{
    public string QrCode { get; set; } = string.Empty;
    public string PaymentLink { get; set; } = string.Empty;
    public string WalletAddress { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
}

public class ScheduledTransferRequest
{
    [Required, Range(1, double.MaxValue)]
    public decimal Amount { get; set; }
    [Required, MaxLength(3)]
    public string Currency { get; set; } = "ZAR";
    [MaxLength(200)]
    public string? Recipient { get; set; }
    [Required, MaxLength(20)]
    public string Frequency { get; set; } = "monthly";
    public DateTime StartDate { get; set; } = DateTime.UtcNow;
    public DateTime? EndDate { get; set; }
}

public class SecurityInfoResponse
{
    public List<LoginSession> LoginHistory { get; set; } = new();
    public List<ActiveDevice> ActiveDevices { get; set; } = new();
    public bool BiometricEnabled { get; set; }
    public bool TwoFactorEnabled { get; set; }
    public int SecurityScore { get; set; }
    public List<string> TrustedDevices { get; set; } = new();
}

public class LoginSession
{
    public string Id { get; set; } = string.Empty;
    public string Device { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string Ip { get; set; } = string.Empty;
    public DateTime Time { get; set; }
    public bool IsCurrent { get; set; }
}

public class ActiveDevice
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public DateTime LastActive { get; set; }
}

public class CardResponse
{
    public string Id { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string LastFour { get; set; } = string.Empty;
    public string Expiry { get; set; } = string.Empty;
    public bool IsFrozen { get; set; }
    public bool IsVirtual { get; set; }
    public decimal? Limit { get; set; }
}