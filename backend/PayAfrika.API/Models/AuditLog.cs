using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PayAfrika.API.Models;

public class AuditLog
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid? UserId { get; set; }

    [MaxLength(200)]
    public string UserName { get; set; } = string.Empty;

    [MaxLength(100)]
    public string UserRole { get; set; } = string.Empty;

    [MaxLength(300)]
    public string Email { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Action { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Module { get; set; } = string.Empty;

    [MaxLength(200)]
    public string Resource { get; set; } = string.Empty;

    [MaxLength(100)]
    public string ResourceId { get; set; } = string.Empty;

    public string PreviousValue { get; set; } = string.Empty;

    public string NewValue { get; set; } = string.Empty;

    public string Metadata { get; set; } = "{}";

    [MaxLength(50)]
    public string IPAddress { get; set; } = string.Empty;

    [MaxLength(500)]
    public string UserAgent { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Browser { get; set; } = string.Empty;

    [MaxLength(50)]
    public string OperatingSystem { get; set; } = string.Empty;

    [MaxLength(50)]
    public string DeviceType { get; set; } = string.Empty;

    [MaxLength(100)]
    public string SessionId { get; set; } = string.Empty;

    [MaxLength(200)]
    public string Location { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Country { get; set; } = string.Empty;

    [MaxLength(100)]
    public string City { get; set; } = string.Empty;

    [MaxLength(500)]
    public string Endpoint { get; set; } = string.Empty;

    [MaxLength(10)]
    public string HttpMethod { get; set; } = string.Empty;

    public int? HttpStatus { get; set; }

    [MaxLength(20)]
    public string Result { get; set; } = "success";

    [MaxLength(20)]
    public string Severity { get; set; } = "info";

    public long? ResponseTimeMs { get; set; }

    [MaxLength(100)]
    public string Department { get; set; } = string.Empty;

    public bool IsSecurityAlert { get; set; }

    public bool IsAcknowledged { get; set; }

    public Guid? AcknowledgedById { get; set; }

    public DateTime? AcknowledgedAt { get; set; }

    public Guid? CorrelationId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }
}
