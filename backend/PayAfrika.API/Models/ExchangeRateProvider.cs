using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace PayAfrika.API.Models;

public class ExchangeRateProvider
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string ApiEndpoint { get; set; } = string.Empty;

    public string? ApiKeyEncrypted { get; set; }

    public int Priority { get; set; }

    public bool IsActive { get; set; } = true;
    public bool IsPrimary { get; set; }
    public bool IsFallback { get; set; }

    [MaxLength(20)]
    public string HealthStatus { get; set; } = "unknown";

    public DateTime? LastHealthCheck { get; set; }

    public string? ConfigJson { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    [JsonIgnore]
    public ICollection<ExchangeRate> ExchangeRates { get; set; } = new List<ExchangeRate>();
}
