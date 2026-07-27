using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace PayAfrika.API.Models;

public class ConversionRule
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(30)]
    public string RuleType { get; set; } = string.Empty;

    [MaxLength(20)]
    public string RoundingRule { get; set; } = "standard";

    public int DecimalPrecision { get; set; } = 2;

    public decimal? MinAmount { get; set; }
    public decimal? MaxAmount { get; set; }

    public bool IsActive { get; set; } = true;
    public int Priority { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
