namespace PayAfrika.API.Services.Payment;

public class ProviderTransferRequest
{
    public string CountryCode { get; set; } = string.Empty;
    public string BankCode { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string AccountName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "NGN";
    public string? Narration { get; set; }
    public string? Reference { get; set; }
}

public class ProviderTransferResult
{
    public bool Success { get; set; }
    public string? RequestId { get; set; }
    public string? ErrorMessage { get; set; }
}

public interface ITransferProvider
{
    string ProviderName { get; }
    bool IsCountrySupported(string countryCode);
    Task<ProviderTransferResult> ExecuteAsync(ProviderTransferRequest request);
    Task<ProviderTransferResult> ReverseAsync(string providerRequestId, decimal amount, string currency);
}
