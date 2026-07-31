namespace PayAfrika.API.Services;

public class ProviderVerificationResult
{
    public bool Success { get; set; }
    public string? AccountName { get; set; }
    public string? RequestId { get; set; }
    public string? ErrorMessage { get; set; }
}

public interface IBankVerificationProvider
{
    string ProviderName { get; }
    bool IsCountrySupported(string countryCode);
    Task<ProviderVerificationResult> VerifyAsync(string countryCode, string bankCode, string accountNumber);
}
