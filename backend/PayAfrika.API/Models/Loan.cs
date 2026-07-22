using System.ComponentModel.DataAnnotations;

namespace PayAfrika.API.Models;

public class Loan
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }

    [Range(0, double.MaxValue)]
    public decimal Amount { get; set; }

    [Range(0, 100)]
    public decimal InterestRate { get; set; }

    public int TermMonths { get; set; }

    [Required, MaxLength(50)]
    public string Status { get; set; } = "pending"; // pending, approved, active, rejected, paid

    [MaxLength(500)]
    public string? Purpose { get; set; }

    public decimal MonthlyPayment { get; set; }
    public decimal TotalPayment { get; set; }
    public decimal TotalInterest { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ApprovedAt { get; set; }
    public DateTime? PaidAt { get; set; }

    public User User { get; set; } = null!;
}
