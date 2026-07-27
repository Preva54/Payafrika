using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace PayAfrika.API.Models;

public class RegionalCurrencyRule
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(100)]
    public string Country { get; set; } = string.Empty;

    [Required, MaxLength(3)]
    public string DefaultCurrency { get; set; } = string.Empty;

    public string SupportedCurrenciesJson { get; set; } = "[]";
    public string AllowedPairsJson { get; set; } = "[]";
    public string RestrictionsJson { get; set; } = "{}";
    public string LocalPaymentMethodsJson { get; set; } = "[]";

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
