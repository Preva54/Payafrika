using System.ComponentModel.DataAnnotations;

namespace PayAfrika.API.Models;

public class Beneficiary
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }

    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? BankName { get; set; }

    [MaxLength(50)]
    public string? AccountNumber { get; set; }

    [MaxLength(100)]
    public string? Country { get; set; }

    [MaxLength(3)]
    public string Currency { get; set; } = "ZAR";

    public bool IsVerified { get; set; }
    public bool IsFavorite { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
}
