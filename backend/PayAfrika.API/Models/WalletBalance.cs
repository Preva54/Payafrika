using System.ComponentModel.DataAnnotations;

namespace PayAfrika.API.Models;

public class WalletBalance
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }

    [Required, MaxLength(3)]
    public string Currency { get; set; } = "ZAR";

    [Range(0, double.MaxValue)]
    public decimal Balance { get; set; }

    [Range(0, double.MaxValue)]
    public decimal ReservedBalance { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
}

public class LinkedBank
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }

    [Required, MaxLength(200)]
    public string BankName { get; set; } = string.Empty;

    [Required, MaxLength(200)]
    public string AccountName { get; set; } = string.Empty;

    [Required, MaxLength(50)]
    public string AccountNumber { get; set; } = string.Empty;

    [MaxLength(50)]
    public string? BranchCode { get; set; }

    [MaxLength(50)]
    public string? AccountType { get; set; }

    [MaxLength(200)]
    public string? Nickname { get; set; }

    [MaxLength(100)]
    public string? Country { get; set; }

    [MaxLength(3)]
    public string Currency { get; set; } = "ZAR";

    [MaxLength(20)]
    public string Status { get; set; } = "pending";

    public bool IsVerified { get; set; }
    public bool IsPrimary { get; set; }

    [MaxLength(500)]
    public string? RejectionReason { get; set; }

    public Guid? VerifiedById { get; set; }
    public DateTime? VerifiedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public User User { get; set; } = null!;
    public User? VerifiedBy { get; set; }
}