using System.ComponentModel.DataAnnotations;

namespace PayAfrika.API.Models;

public class Wallet
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }

    [Required, MaxLength(3)]
    public string Currency { get; set; } = "ZAR";

    [Range(0, double.MaxValue)]
    public decimal Balance { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public User User { get; set; } = null!;
}
