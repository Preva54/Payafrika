using System.ComponentModel.DataAnnotations;

namespace PayAfrika.API.DTOs;

public class InitiateBankTransferRequest
{
    [Required, Range(0.01, double.MaxValue)]
    public decimal Amount { get; set; }

    [Required, MaxLength(3)]
    public string Currency { get; set; } = "NGN";

    [Required, MaxLength(3)]
    public string CountryCode { get; set; } = "NG";

    [Required, MaxLength(50)]
    public string BankCode { get; set; } = string.Empty;

    [Required, MaxLength(50)]
    public string AccountNumber { get; set; } = string.Empty;

    [Required, MaxLength(200)]
    public string AccountName { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Narration { get; set; }

    [Required, MaxLength(10)]
    public string Pin { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? OtpChallengeId { get; set; }

    [MaxLength(20)]
    public string? OtpCode { get; set; }
}

public class TransferQuoteRequest
{
    [Required, Range(0.01, double.MaxValue)]
    public decimal Amount { get; set; }

    [Required, MaxLength(3)]
    public string CountryCode { get; set; } = "NG";

    [Required, MaxLength(3)]
    public string Currency { get; set; } = "NGN";
}

public class TransferQuoteResponse
{
    public decimal Amount { get; set; }
    public decimal Fee { get; set; }
    public decimal Vat { get; set; }
    public decimal TotalDebit { get; set; }
    public string Currency { get; set; } = "NGN";
    public string EstimatedArrival { get; set; } = "Instant";
}

public class BankTransferResponse
{
    public Guid Id { get; set; }
    public string Reference { get; set; } = string.Empty;
    public string CountryCode { get; set; } = string.Empty;
    public string? BankName { get; set; }
    public string AccountNumber { get; set; } = string.Empty;
    public string? AccountName { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "NGN";
    public decimal Fee { get; set; }
    public decimal Vat { get; set; }
    public decimal TotalDebit { get; set; }
    public string? Narration { get; set; }
    public string Status { get; set; } = "pending";
    public string? FailureReason { get; set; }
    public string? ProviderRequestId { get; set; }
    public string? ReversalReason { get; set; }
    public DateTime? ReversedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ReceiveAccountResponse
{
    public string BankName { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string AccountName { get; set; } = string.Empty;
    public string Currency { get; set; } = "NGN";
    public bool IsSponsorBank { get; set; }
}

public class SetTransferPinRequest
{
    [Required, MaxLength(10)]
    public string Pin { get; set; } = string.Empty;
}

public class ReverseTransferRequest
{
    [MaxLength(500)]
    public string? Reason { get; set; }
}

public class TransferStatsResponse
{
    public int TotalTransfers { get; set; }
    public int Successful { get; set; }
    public int Pending { get; set; }
    public int Failed { get; set; }
    public int Reversed { get; set; }
    public decimal TotalValue { get; set; }
    public decimal FeesCollected { get; set; }
    public int FailedToday { get; set; }
}

public class TransferSettingsResponse
{
    public string FeeType { get; set; } = "percent"; // percent | flat
    public decimal FeeRate { get; set; } = 1.0m;
    public decimal FeeFlat { get; set; } = 10m;
    public decimal VatRate { get; set; } = 7.5m;
    public decimal MinAmount { get; set; } = 100m;
    public decimal MaxAmount { get; set; } = 500000m;
    public decimal DailyLimit { get; set; } = 5000000m;
    public int MaxDailyTransfers { get; set; } = 50;
    public string BlacklistedAccounts { get; set; } = string.Empty;
    public string EstimatedArrival { get; set; } = "Instant";
}

public class UpdateTransferSettingsRequest
{
    public string? FeeType { get; set; }
    public decimal? FeeRate { get; set; }
    public decimal? FeeFlat { get; set; }
    public decimal? VatRate { get; set; }
    public decimal? MinAmount { get; set; }
    public decimal? MaxAmount { get; set; }
    public decimal? DailyLimit { get; set; }
    public int? MaxDailyTransfers { get; set; }
    public string? BlacklistedAccounts { get; set; }
    public string? EstimatedArrival { get; set; }
}

public class AdminTransferResponse : BankTransferResponse
{
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string UserEmail { get; set; } = string.Empty;
}
