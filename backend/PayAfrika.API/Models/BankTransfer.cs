using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace PayAfrika.API.Models;

public class BankTransfer
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }

    [Required, MaxLength(50)]
    public string Reference { get; set; } = string.Empty;

    [Required, MaxLength(3)]
    public string CountryCode { get; set; } = string.Empty;

    [MaxLength(50)]
    public string? BankCode { get; set; }

    [MaxLength(200)]
    public string? BankName { get; set; }

    [MaxLength(50)]
    public string AccountNumber { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? AccountName { get; set; }

    [Range(0, double.MaxValue)]
    public decimal Amount { get; set; }

    [Required, MaxLength(3)]
    public string Currency { get; set; } = "NGN";

    [Range(0, double.MaxValue)]
    public decimal Fee { get; set; }

    [Range(0, double.MaxValue)]
    public decimal Vat { get; set; }

    [Range(0, double.MaxValue)]
    public decimal TotalDebit { get; set; }

    [MaxLength(500)]
    public string? Narration { get; set; }

    [MaxLength(20)]
    public string Status { get; set; } = "pending"; // pending, successful, failed, reversed

    [MaxLength(100)]
    public string? Provider { get; set; }

    [MaxLength(200)]
    public string? ProviderRequestId { get; set; }

    [MaxLength(500)]
    public string? FailureReason { get; set; }

    [MaxLength(500)]
    public string? ReversalReason { get; set; }

    public Guid? ReversedById { get; set; }

    public DateTime? ReversedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [JsonIgnore]
    public User? User { get; set; }
}
