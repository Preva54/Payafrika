using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PayAfrika.API.Models;

public class Integration
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }

    [MaxLength(50)]
    public string Provider { get; set; } = string.Empty;

    public bool IsConnected { get; set; }

    public string Permissions { get; set; } = "[]";

    [MaxLength(20)]
    public string SyncStatus { get; set; } = "idle";

    public DateTime? LastSyncedAt { get; set; }

    public string Credentials { get; set; } = "{}";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;
}