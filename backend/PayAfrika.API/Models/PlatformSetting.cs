using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PayAfrika.API.Models;

public class PlatformSetting
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(100)]
    public string Category { get; set; } = string.Empty;

    [Required, MaxLength(200)]
    public string Key { get; set; } = string.Empty;

    public string Value { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }

    [MaxLength(50)]
    public string Type { get; set; } = "string";

    public bool IsEncrypted { get; set; }

    public int SortOrder { get; set; }

    public Guid? UpdatedById { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(UpdatedById))]
    public User? UpdatedBy { get; set; }
}

public class SettingChangeLog
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [MaxLength(100)]
    public string Category { get; set; } = string.Empty;

    [MaxLength(200)]
    public string Key { get; set; } = string.Empty;

    public string OldValue { get; set; } = string.Empty;
    public string NewValue { get; set; } = string.Empty;

    public Guid? ChangedById { get; set; }

    [MaxLength(200)]
    public string ChangedByName { get; set; } = string.Empty;

    public DateTime ChangedAt { get; set; } = DateTime.UtcNow;
}

public class PlatformSettingsCategory
{
    public string Id { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<PlatformSettingsField> Fields { get; set; } = new();
}

public class PlatformSettingsField
{
    public string Key { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Type { get; set; } = "text";
    public string Value { get; set; } = string.Empty;
    public string? DefaultValue { get; set; }
    public bool IsEncrypted { get; set; }
    public List<string>? Options { get; set; }
    public string? Placeholder { get; set; }
    public string? Validation { get; set; }
}

public class AdminSettingsDashboard
{
    public string PlatformName { get; set; } = string.Empty;
    public string CurrentVersion { get; set; } = string.Empty;
    public int ActiveIntegrationCount { get; set; }
    public bool SecurityScore { get; set; }
    public bool BackupConfigured { get; set; }
    public bool ApiHealthy { get; set; }
    public bool MaintenanceMode { get; set; }
    public string LicenseStatus { get; set; } = string.Empty;
}
