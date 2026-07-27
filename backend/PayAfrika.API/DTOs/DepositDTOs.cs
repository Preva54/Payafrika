using System.ComponentModel.DataAnnotations;

namespace PayAfrika.API.DTOs;

public class SubmitDepositRequest
{
    [Required, Range(1, double.MaxValue)]
    public decimal Amount { get; set; }

    [MaxLength(3)]
    public string Currency { get; set; } = "ZAR";

    [Required, MaxLength(200)]
    public string BankName { get; set; } = string.Empty;

    [Required, MaxLength(200)]
    public string AccountHolderName { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? ReferenceUsed { get; set; }

    public DateTime TransferDate { get; set; }

    [MaxLength(20)]
    public string? TransferTime { get; set; }

    [MaxLength(1000)]
    public string? Notes { get; set; }
}

public class DepositResponse
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Reference { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "ZAR";
    public string Status { get; set; } = "pending";
    public string BankName { get; set; } = string.Empty;
    public string AccountHolderName { get; set; } = string.Empty;
    public string? ReferenceUsed { get; set; }
    public DateTime TransferDate { get; set; }
    public string? TransferTime { get; set; }
    public string? ProofUrl { get; set; }
    public string? ProofFileName { get; set; }
    public string? ProofContentType { get; set; }
    public string? Notes { get; set; }
    public string? RejectionReason { get; set; }
    public string? RejectionCategory { get; set; }
    public string? ApprovedByName { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string UserEmail { get; set; } = string.Empty;
    public string? DuplicateWarning { get; set; }
    public bool HasDuplicate { get; set; }
}

public class DepositListResponse
{
    public List<DepositResponse> Data { get; set; } = new();
    public int Total { get; set; }
    public int Page { get; set; }
    public int Limit { get; set; }
    public int TotalPages { get; set; }
}

public class ApproveDepositRequest
{
    public Guid DepositId { get; set; }
}

public class RejectDepositRequest
{
    public Guid DepositId { get; set; }

    [Required, MaxLength(100)]
    public string Category { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Reason { get; set; }
}

public class DepositStatsResponse
{
    public int PendingDeposits { get; set; }
    public int TodaysDeposits { get; set; }
    public int ApprovedToday { get; set; }
    public int RejectedToday { get; set; }
    public decimal TotalDepositValue { get; set; }
    public decimal PendingValue { get; set; }
}

public class DepositReferenceResponse
{
    public string Reference { get; set; } = string.Empty;
}
