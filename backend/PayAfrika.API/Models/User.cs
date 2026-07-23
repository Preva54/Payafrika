using System.ComponentModel.DataAnnotations;

namespace PayAfrika.API.Models;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(100)]
    public string FullName { get; set; } = string.Empty;

    [Required, MaxLength(200)]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string PasswordHash { get; set; } = string.Empty;

    [MaxLength(20)]
    public string? PhoneNumber { get; set; }

    [MaxLength(100)]
    public string? Country { get; set; }

    public string Role { get; set; } = "customer"; // customer, business, admin
    public string? KYCStatus { get; set; } = "pending"; // pending, verified, rejected
    public bool IsEmailVerified { get; set; }
    public bool TwoFactorEnabled { get; set; }
    public string? AvatarUrl { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public Wallet? Wallet { get; set; }
    public ICollection<Loan> Loans { get; set; } = new List<Loan>();
    public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
    public ICollection<Beneficiary> Beneficiaries { get; set; } = new List<Beneficiary>();
    public ICollection<ScheduledPayment> ScheduledPayments { get; set; } = new List<ScheduledPayment>();
}
