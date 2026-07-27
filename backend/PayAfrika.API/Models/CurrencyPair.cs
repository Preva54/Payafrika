using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace PayAfrika.API.Models;

public class CurrencyPair
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(3)]
    public string BaseCurrency { get; set; } = string.Empty;

    [Required, MaxLength(3)]
    public string QuoteCurrency { get; set; } = string.Empty;

    public bool IsEnabled { get; set; } = true;

    public Guid? PreferredProviderId { get; set; }

    public decimal MinBuySpread { get; set; }
    public decimal MaxBuySpread { get; set; }
    public decimal MinSellSpread { get; set; }
    public decimal MaxSellSpread { get; set; }

    [Range(0, double.MaxValue)]
    public decimal DailyBuyLimit { get; set; }

    [Range(0, double.MaxValue)]
    public decimal DailySellLimit { get; set; }

    public decimal BuyFee { get; set; }
    public decimal SellFee { get; set; }

    [MaxLength(20)]
    public string FeeType { get; set; } = "percentage";

    public int SortOrder { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
