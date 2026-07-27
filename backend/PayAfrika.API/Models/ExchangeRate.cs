using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace PayAfrika.API.Models;

public class ExchangeRate
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(3)]
    public string BaseCurrency { get; set; } = string.Empty;

    [Required, MaxLength(3)]
    public string QuoteCurrency { get; set; } = string.Empty;

    public decimal BuyRate { get; set; }
    public decimal SellRate { get; set; }
    public decimal MidMarketRate { get; set; }
    public decimal Spread { get; set; }

    public Guid? ProviderId { get; set; }

    [MaxLength(20)]
    public string Source { get; set; } = "manual";

    public DateTime? LockedUntil { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    [JsonIgnore]
    public ExchangeRateProvider? Provider { get; set; }
}
