using System.ComponentModel.DataAnnotations;

namespace PayAfrika.API.Models;

public class Withdrawal
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }

    [Required, MaxLength(20)]
    public string Reference { get; set; } = string.Empty;

    [Range(0, double.MaxValue)]
    public decimal Amount { get; set; }

    [Range(0, double.MaxValue)]
    public decimal Fee { get; set; }

    [MaxLength(3)]
    public string Currency { get; set; } = "ZAR";

    [MaxLength(20)]
    public string Status { get; set; } = "pending";

    public Guid? BankId { get; set; }

    [MaxLength(200)]
    public string BankName { get; set; } = string.Empty;

    [MaxLength(200)]
    public string AccountHolderName { get; set; } = string.Empty;

    [MaxLength(50)]
    public string AccountNumber { get; set; } = string.Empty;

    [MaxLength(20)]
    public string? BranchCode { get; set; }

    [MaxLength(50)]
    public string? AccountType { get; set; }

    [MaxLength(500)]
    public string? Purpose { get; set; }

    [MaxLength(200)]
    public string? CustomerReference { get; set; }

    [MaxLength(500)]
    public string? RejectionReason { get; set; }

    [MaxLength(100)]
    public string? RejectionCategory { get; set; }

    [MaxLength(500)]
    public string? BankPaymentReference { get; set; }

    public Guid? ProcessedById { get; set; }

    public DateTime? ApprovedAt { get; set; }
    public DateTime? PaidAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public User User { get; set; } = null!;
    public User? ProcessedBy { get; set; }
}
