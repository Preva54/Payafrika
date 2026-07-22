using System.ComponentModel.DataAnnotations;

namespace PayAfrika.API.Models;

public class Transaction
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }

    [Required, MaxLength(50)]
    public string Type { get; set; } = string.Empty; // payment, loan, exchange, transfer, deposit, withdrawal

    [Range(0, double.MaxValue)]
    public decimal Amount { get; set; }

    [Required, MaxLength(3)]
    public string Currency { get; set; } = "ZAR";

    [Required, MaxLength(50)]
    public string Status { get; set; } = "pending"; // pending, completed, failed, refunded

    [MaxLength(500)]
    public string? Description { get; set; }

    [MaxLength(200)]
    public string? Reference { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }

    public User User { get; set; } = null!;
}
