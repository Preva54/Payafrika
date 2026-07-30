using System.ComponentModel.DataAnnotations;

namespace PayAfrika.API.Models;

public class BankVerification
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }

    [Required, MaxLength(3)]
    public string CountryCode { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? BankCode { get; set; }

    [MaxLength(50)]
    public string? BankName { get; set; }

    [MaxLength(50)]
    public string AccountNumber { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? AccountName { get; set; }

    [MaxLength(20)]
    public string Status { get; set; } = "pending";

    [MaxLength(100)]
    public string? Provider { get; set; }

    [MaxLength(200)]
    public string? ProviderRequestId { get; set; }

    public string? RawResponse { get; set; }

    public string? ErrorMessage { get; set; }

    public DateTime? VerifiedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
}