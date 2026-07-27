using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace PayAfrika.API.Models;

public class SettlementCurrency
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(3)]
    public string Currency { get; set; } = string.Empty;

    public bool IsDefaultSettlement { get; set; }
    public bool AutoConversion { get; set; } = true;

    [MaxLength(20)]
    public string SettlementFrequency { get; set; } = "daily";

    public decimal MarginPercent { get; set; }
    public decimal FeePercent { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
