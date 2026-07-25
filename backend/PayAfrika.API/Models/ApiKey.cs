using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PayAfrika.API.Models;

public class ApiKey
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }

    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(64)]
    public string KeyHash { get; set; } = string.Empty;

    [MaxLength(128)]
    public string SecretHash { get; set; } = string.Empty;

    [MaxLength(20)]
    public string Environment { get; set; } = "sandbox";

    public string Scopes { get; set; } = "[]";

    public string AllowedDomains { get; set; } = "[]";

    public string CallbackUrls { get; set; } = "[]";

    [MaxLength(500)]
    public string? WebhookUrl { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastUsedAt { get; set; }

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;
}