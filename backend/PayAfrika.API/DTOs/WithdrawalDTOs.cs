using System.ComponentModel.DataAnnotations;

namespace PayAfrika.API.DTOs;

public class WithdrawalResponse
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string UserEmail { get; set; } = string.Empty;
    public string Reference { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public decimal Fee { get; set; }
    public decimal NetAmount => Amount - Fee;
    public string Currency { get; set; } = "ZAR";
    public string Status { get; set; } = "pending";
    public string BankName { get; set; } = string.Empty;
    public string AccountHolderName { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string? BranchCode { get; set; }
    public string? AccountType { get; set; }
    public string? Purpose { get; set; }
    public string? CustomerReference { get; set; }
    public string? RejectionReason { get; set; }
    public string? RejectionCategory { get; set; }
    public string? BankPaymentReference { get; set; }
    public string? ProcessedByName { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public DateTime? PaidAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class WithdrawalListResponse
{
    public List<WithdrawalResponse> Data { get; set; } = new();
    public int Total { get; set; }
    public int Page { get; set; }
    public int Limit { get; set; }
    public int TotalPages { get; set; }
}

public class WithdrawalStatsResponse
{
    public int PendingWithdrawals { get; set; }
    public int ApprovedToday { get; set; }
    public int RejectedToday { get; set; }
    public int CompletedToday { get; set; }
    public decimal TotalWithdrawalValue { get; set; }
    public decimal PendingValue { get; set; }
    public double AverageProcessingTimeHours { get; set; }
}

public class SubmitWithdrawalRequest
{
    [Required, Range(1, double.MaxValue)]
    public decimal Amount { get; set; }

    [MaxLength(3)]
    public string Currency { get; set; } = "ZAR";

    [Required]
    public Guid BankId { get; set; }

    [MaxLength(500)]
    public string? Purpose { get; set; }

    [MaxLength(200)]
    public string? CustomerReference { get; set; }

    [MaxLength(500)]
    public string? OtpChallengeId { get; set; }

    [MaxLength(20)]
    public string? OtpCode { get; set; }
}

public class RejectWithdrawalRequest
{
    [Required, MaxLength(100)]
    public string Category { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Reason { get; set; }
}

public class MarkPaidRequest
{
    [MaxLength(500)]
    public string? BankPaymentReference { get; set; }
}

public class LinkedBankResponse
{
    public Guid Id { get; set; }
    public string BankName { get; set; } = string.Empty;
    public string AccountName { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string? BranchCode { get; set; }
    public string? AccountType { get; set; }
    public string? Nickname { get; set; }
    public string? Country { get; set; }
    public string Currency { get; set; } = "ZAR";
    public string Status { get; set; } = "pending";
    public bool IsVerified { get; set; }
    public bool IsPrimary { get; set; }
    public string? RejectionReason { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class LinkBankRequest
{
    [Required, MaxLength(200)]
    public string BankName { get; set; } = string.Empty;

    [Required, MaxLength(200)]
    public string AccountName { get; set; } = string.Empty;

    [Required, MaxLength(50)]
    public string AccountNumber { get; set; } = string.Empty;

    [MaxLength(20)]
    public string? BranchCode { get; set; }

    [MaxLength(50)]
    public string? AccountType { get; set; }

    [MaxLength(200)]
    public string? Nickname { get; set; }

    [MaxLength(100)]
    public string? Country { get; set; }

    [MaxLength(3)]
    public string Currency { get; set; } = "ZAR";
}

public class UpdateBankRequest
{
    [MaxLength(200)]
    public string? Nickname { get; set; }

    public bool? IsPrimary { get; set; }
}

public class WalletBalanceResponse
{
    public decimal Balance { get; set; }
    public decimal ReservedBalance { get; set; }
    public decimal AvailableBalance => Balance - ReservedBalance;
    public string Currency { get; set; } = "ZAR";
}
