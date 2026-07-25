namespace PayAfrika.API.Services;

public static class ExchangeRateService
{
    private static readonly Dictionary<string, CurrencyInfo> Currencies = new()
    {
        ["ZAR"] = new("🇿🇦", "South African Rand", 1m),
        ["USD"] = new("🇺🇸", "US Dollar", 18.42m),
        ["EUR"] = new("🇪🇺", "Euro", 20.15m),
        ["GBP"] = new("🇬🇧", "British Pound", 23.45m),
        ["NGN"] = new("🇳🇬", "Nigerian Naira", 0.012m),
        ["KES"] = new("🇰🇪", "Kenyan Shilling", 0.142m),
        ["GHS"] = new("🇬🇭", "Ghanaian Cedi", 1.38m),
        ["XOF"] = new("🌍", "CFA Franc", 0.031m),
        ["ZMW"] = new("🇿🇲", "Zambian Kwacha", 0.71m),
        ["TZS"] = new("🇹🇿", "Tanzanian Shilling", 0.0069m),
        ["BTC"] = new("₿", "Bitcoin", 1_180_000m),
        ["ETH"] = new("⟠", "Ethereum", 92_500m),
        ["USDT"] = new("💵", "Tether USD", 18.40m),
        ["USDC"] = new("💰", "USD Coin", 18.40m),
    };

    public static readonly DateTime LastUpdated = DateTime.UtcNow;

    public static string GetFlag(string currency) =>
        Currencies.TryGetValue(currency, out var info) ? info.Flag : "🏦";

    public static string GetName(string currency) =>
        Currencies.TryGetValue(currency, out var info) ? info.Name : currency;

    public static decimal GetZARRate(string currency) =>
        Currencies.TryGetValue(currency, out var info) ? info.ZARRate : 1m;

    public static decimal Convert(decimal amount, string fromCurrency, string toCurrency)
    {
        var fromRate = GetZARRate(fromCurrency);
        var toRate = GetZARRate(toCurrency);
        if (toRate == 0) return 0;
        return amount * (fromRate / toRate);
    }

    public static List<string> GetSupportedCurrencies() => Currencies.Keys.ToList();

    public static List<(string From, string To)> GetExchangePairs() =>
    [
        ("ZAR", "USD"), ("ZAR", "EUR"), ("ZAR", "GBP"),
        ("USD", "EUR"), ("USD", "GBP"), ("EUR", "GBP"),
        ("ZAR", "NGN"), ("ZAR", "KES"), ("ZAR", "GHS"),
        ("USD", "NGN"), ("USD", "KES"),
        ("ZAR", "BTC"), ("ZAR", "ETH"), ("ZAR", "USDT"),
        ("USD", "BTC"), ("USD", "ETH"),
    ];

    private readonly record struct CurrencyInfo(string Flag, string Name, decimal ZARRate);
}