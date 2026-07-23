using System.ComponentModel.DataAnnotations;

namespace PayAfrika.API.Models;

public class ScheduledPayment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public Guid? BeneficiaryId { get; set; }

    [Required, MaxLength(200)]
    public string BeneficiaryName { get; set; } = string.Empty;

    [Range(1, double.MaxValue)]
    public decimal Amount { get; set; }

    [Required, MaxLength(3)]
    public string Currency { get; set; } = "ZAR";

    [Required, MaxLength(20)]
    public string Frequency { get; set; } = "monthly"; // daily, weekly, monthly, quarterly, yearly

    public DateTime NextDate { get; set; }
    public DateTime? EndDate { get; set; }

    [MaxLength(20)]
    public string Status { get; set; } = "active"; // active, paused, cancelled

    [MaxLength(500)]
    public string? Description { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
}
