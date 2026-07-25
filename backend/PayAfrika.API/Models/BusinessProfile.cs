using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PayAfrika.API.Models;

public class BusinessProfile
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }

    [MaxLength(200)]
    public string? BusinessName { get; set; }

    [MaxLength(100)]
    public string? RegistrationNumber { get; set; }

    [MaxLength(50)]
    public string? VATNumber { get; set; }

    [MaxLength(100)]
    public string? Industry { get; set; }

    [MaxLength(500)]
    public string? CompanyAddress { get; set; }

    [MaxLength(200)]
    public string? Website { get; set; }

    [MaxLength(500)]
    public string? BusinessDescription { get; set; }

    [MaxLength(500)]
    public string? LogoUrl { get; set; }

    public string? Directors { get; set; }

    public string? BankAccountDetails { get; set; }

    [MaxLength(50)]
    public string? SettlementPreference { get; set; } = "daily";

    public string? Documents { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;
}