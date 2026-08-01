namespace PayAfrika.API.Services.Payment;

/// <summary>
/// Simulates a real-time bank transfer rail (e.g. NIBSS for Nigeria).
/// Deterministic failure rules let the UI demonstrate failed-transfer handling:
/// - Account numbers ending in "000" or starting with "5" are rejected by the rail.
/// - Account number "0000000000" / "9999999999" are hard rejects.
/// </summary>
public class SimulatorTransferProvider : ITransferProvider
{
    private static readonly HashSet<string> SupportedCountries = new(StringComparer.OrdinalIgnoreCase)
    {
        "NG", "ZA", "KE", "GH", "BW", "ZM", "TZ", "UG", "RW", "NA", "MW", "ZW", "ET", "MZ",
    };

    public string ProviderName => "simulator";

    public bool IsCountrySupported(string countryCode) => SupportedCountries.Contains(countryCode.ToUpper());

    public Task<ProviderTransferResult> ExecuteAsync(ProviderTransferRequest request)
    {
        var account = request.AccountNumber;

        if (account is "0000000000" or "9999999999")
            return Task.FromResult(new ProviderTransferResult
            {
                Success = false,
                ErrorMessage = "Recipient account is blacklisted by the payment rail.",
            });

        if (account.EndsWith("000"))
            return Task.FromResult(new ProviderTransferResult
            {
                Success = false,
                ErrorMessage = "The transfer was declined by the recipient bank. Please verify the account details.",
            });

        if (account.StartsWith("5"))
            return Task.FromResult(new ProviderTransferResult
            {
                Success = false,
                ErrorMessage = "Recipient bank is temporarily unavailable. Please retry in a few minutes.",
            });

        return Task.FromResult(new ProviderTransferResult
        {
            Success = true,
            RequestId = $"SIM-{Guid.NewGuid():N}",
        });
    }

    public Task<ProviderTransferResult> ReverseAsync(string providerRequestId, decimal amount, string currency)
    {
        if (string.IsNullOrWhiteSpace(providerRequestId))
            return Task.FromResult(new ProviderTransferResult
            {
                Success = false,
                ErrorMessage = "Missing provider reference for reversal.",
            });

        return Task.FromResult(new ProviderTransferResult
        {
            Success = true,
            RequestId = $"RV-{Guid.NewGuid():N}",
        });
    }
}
