using System.ComponentModel.DataAnnotations;

namespace PayAfrika.API.Models;

public class Country
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(3)]
    public string Code { get; set; } = string.Empty;

    [MaxLength(3)]
    public string CurrencyCode { get; set; } = "ZAR";

    [MaxLength(5)]
    public string? CurrencySymbol { get; set; }

    public bool IsEnabled { get; set; } = true;
    public int SortOrder { get; set; } = 0;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}