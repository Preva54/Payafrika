using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PayAfrika.API.Models;

/// <summary>
/// One-time password (OTP) and login challenge. Codes are stored hashed;
/// expiry and attempt limits are enforced server-side.
/// </summary>
public class SecurityToken
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }

    [MaxLength(50)]
    public string Purpose { get; set; } = string.Empty; // login, password_reset, email_verify, phone_verify, transaction, withdrawal, new_device, settings, kyc

    [MaxLength(20)]
    public string Channel { get; set; } = "email"; // sms, email, authenticator

    [MaxLength(500)]
    public string CodeHash { get; set; } = string.Empty;

    public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddMinutes(5);

    public int Attempts { get; set; }

    public int MaxAttempts { get; set; } = 5;

    public int ResentCount { get; set; }

    public bool IsConsumed { get; set; }

    public DateTime? VerifiedAt { get; set; }

    /// <summary>JSON payload (device fingerprint, risk score, metadata for the challenge).</summary>
    public string Metadata { get; set; } = "{}";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;
}
