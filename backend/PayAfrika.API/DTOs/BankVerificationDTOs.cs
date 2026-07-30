using System.ComponentModel.DataAnnotations;

namespace PayAfrika.API.DTOs;

public class VerifyAccountRequest
{
    [Required, MaxLength(3)]
    public string CountryCode { get; set; } = string.Empty;

    [MaxLength(200)]
    public string BankCode { get; set; } = string.Empty;

    [Required, MaxLength(50)]
    public string AccountNumber { get; set; } = string.Empty;
}

public class VerifyAccountResponse
{
    public bool Success { get; set; }
    public string Status { get; set; } = "unknown";
    public string? AccountName { get; set; }
    public string? BankName { get; set; }
    public string? CountryCode { get; set; }
    public string? Message { get; set; }
    public string? VerificationId { get; set; }
}

public class BankListResponse
{
    public Guid Id { get; set; }
    public string CountryCode { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
}

public class CountryListResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string CurrencyCode { get; set; } = "ZAR";
    public string? CurrencySymbol { get; set; }
    public bool IsEnabled { get; set; }
}

public class InitiateTransferRequest
{
    [Required, Range(0.01, double.MaxValue)]
    public decimal Amount { get; set; }

    [Required, MaxLength(3)]
    public string Currency { get; set; } = "ZAR";

    [MaxLength(200)]
    public string? RecipientName { get; set; }

    [MaxLength(200)]
    public string? RecipientType { get; set; }

    [MaxLength(3)]
    public string? RecipientCountryCode { get; set; }

    [MaxLength(200)]
    public string? RecipientBankName { get; set; }

    [MaxLength(50)]
    public string? RecipientAccountNumber { get; set; }

    [MaxLength(3)]
    public string? RecipientCurrency { get; set; }

    [MaxLength(100)]
    public string? Reference { get; set; }

    [MaxLength(500)]
    public string? Description { get; set; }

    [MaxLength(3)]
    public string? BeneficiaryId { get; set; }
}

public class InitiateTransferResponse
{
    public string TransactionId { get; set; } = string.Empty;
    public string Reference { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public decimal Fee { get; set; }
    public decimal Total { get; set; }
    public string Currency { get; set; } = string.Empty;
    public string Status { get; set; } = "pending";
    public string? EstimatedArrival { get; set; }
}

public class TransferSummaryResponse
{
    public string RecipientName { get; set; } = string.Empty;
    public string RecipientType { get; set; } = string.Empty;
    public string BankName { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = string.Empty;
    public decimal Fee { get; set; }
    public decimal ExchangeRate { get; set; }
    public decimal RecipientAmount { get; set; }
    public decimal Total { get; set; }
    public string EstimatedArrival { get; set; } = string.Empty;
}

public class BeneficiaryResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? BankName { get; set; }
    public string? AccountNumber { get; set; }
    public string? Country { get; set; }
    public string Currency { get; set; } = "ZAR";
    public bool IsVerified { get; set; }
    public bool IsFavorite { get; set; }
    public DateTime CreatedAt { get; set; }
}