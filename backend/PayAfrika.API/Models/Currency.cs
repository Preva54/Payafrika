using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace PayAfrika.API.Models;

public class Currency
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(3)]
    public string Code { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(10)]
    public string Symbol { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Country { get; set; } = string.Empty;

    [MaxLength(10)]
    public string FlagEmoji { get; set; } = string.Empty;

    public int DecimalPlaces { get; set; } = 2;

    public bool IsActive { get; set; } = true;
    public bool IsDefault { get; set; }
    public bool IsArchived { get; set; }

    public int SortOrder { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
