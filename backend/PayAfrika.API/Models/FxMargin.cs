using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace PayAfrika.API.Models;

public class FxMargin
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(20)]
    public string Type { get; set; } = "global";

    public Guid? EntityId { get; set; }

    [Required, MaxLength(20)]
    public string MarginType { get; set; } = "percentage";

    public decimal Value { get; set; }
    public decimal? MinValue { get; set; }
    public decimal? MaxValue { get; set; }

    public bool IsActive { get; set; } = true;
    public int Priority { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
