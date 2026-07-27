using System.ComponentModel.DataAnnotations;

namespace PayAfrika.API.Models;

public class Deposit
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }

    [Required, MaxLength(20)]
    public string Reference { get; set; } = string.Empty;

    [Range(0, double.MaxValue)]
    public decimal Amount { get; set; }

    [MaxLength(3)]
    public string Currency { get; set; } = "ZAR";

    // pending, processing, approved, rejected
    [Required, MaxLength(20)]
    public string Status { get; set; } = "pending";

    [MaxLength(200)]
    public string BankName { get; set; } = string.Empty;

    [MaxLength(200)]
    public string AccountHolderName { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? ReferenceUsed { get; set; }

    public DateTime TransferDate { get; set; }

    [MaxLength(20)]
    public string? TransferTime { get; set; }

    [MaxLength(500)]
    public string? ProofUrl { get; set; }

    public string? ProofData { get; set; }

    [MaxLength(500)]
    public string? ProofFileName { get; set; }

    [MaxLength(100)]
    public string? ProofContentType { get; set; }

    [MaxLength(1000)]
    public string? Notes { get; set; }

    [MaxLength(500)]
    public string? RejectionReason { get; set; }

    public string? RejectionCategory { get; set; }

    public Guid? ApprovedById { get; set; }
    public DateTime? ApprovedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public User User { get; set; } = null!;
    public User? ApprovedBy { get; set; }
}
