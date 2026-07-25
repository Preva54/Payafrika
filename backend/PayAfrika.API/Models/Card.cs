using System.ComponentModel.DataAnnotations;

namespace PayAfrika.API.Models;

public class Card
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    [Required, MaxLength(20)]
    public string Type { get; set; } = "debit";

    [Required, MaxLength(4)]
    public string LastFour { get; set; } = string.Empty;

    [Required, MaxLength(10)]
    public string Expiry { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? CardholderName { get; set; }

    public bool IsFrozen { get; set; }
    public bool IsVirtual { get; set; }
    public decimal? Limit { get; set; }
    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}