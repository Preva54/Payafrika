using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PayAfrika.API.Models;

public class ConnectedDevice
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }

    [MaxLength(200)]
    public string DeviceName { get; set; } = string.Empty;

    [MaxLength(50)]
    public string DeviceType { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? DeviceId { get; set; }

    [MaxLength(100)]
    public string? Browser { get; set; }

    [MaxLength(50)]
    public string? OS { get; set; }

    [MaxLength(50)]
    public string? IPAddress { get; set; }

    [MaxLength(200)]
    public string? Location { get; set; }

    [MaxLength(30)]
    public string? ScreenResolution { get; set; }

    [MaxLength(20)]
    public string? BrowserLanguage { get; set; }

    [MaxLength(100)]
    public string? TimeZone { get; set; }

    public int RiskScore { get; set; }

    public bool IsTrusted { get; set; }
    public bool IsCurrent { get; set; }

    public DateTime? LastLoginAt { get; set; }

    [MaxLength(200)]
    public string? LastLoginLocation { get; set; }

    public DateTime LastActiveAt { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;
}