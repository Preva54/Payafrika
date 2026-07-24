using Microsoft.AspNetCore.Mvc;

namespace PayAfrika.API.Controllers;

[ApiController]
[Route("api/exchangerates")]
[ApiExplorerSettings(IgnoreApi = false)]
public class ExchangeRatesController : ControllerBase
{
    private static readonly List<ExchangeRate> Rates =
    [
        new("USD", 18.25m, 18.35m, "US Dollar", "🇺🇸", 0.32m),
        new("NGN", 75.50m, 76.00m, "Nigerian Naira", "🇳🇬", -0.15m),
        new("GBP", 23.10m, 23.30m, "British Pound", "🇬🇧", 0.18m),
        new("EUR", 20.00m, 20.15m, "Euro", "🇪🇺", -0.08m),
        new("KES", 7.85m, 7.95m, "Kenyan Shilling", "🇰🇪", 0.25m),
        new("GHS", 0.72m, 0.74m, "Ghanaian Cedi", "🇬🇭", 0.10m),
        new("BWP", 0.75m, 0.77m, "Botswana Pula", "🇧🇼", 0.05m),
        new("ZMW", 1.05m, 1.07m, "Zambian Kwacha", "🇿🇲", -0.12m),
    ];

    [HttpGet]
    public ActionResult<IEnumerable<ExchangeRate>> Get() => Ok(Rates);
}

public record ExchangeRate(string Code, decimal Buy, decimal Sell, string Name, string Flag, decimal ChangePercent);
