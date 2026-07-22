using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using PayAfrika.API.Models.Payment;

namespace PayAfrika.API.Services.Payment;

public class OzowSettings
{
    public string SiteCode { get; set; } = string.Empty;
    public string ApiKey { get; set; } = string.Empty;
    public string PrivateKey { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = "https://api.ozow.com";
}

public class OzowProvider : IPaymentProvider
{
    private readonly OzowSettings _settings;
    private readonly HttpClient _httpClient;
    private readonly ILogger<OzowProvider> _logger;

    public string Name => "ozow";

    public OzowProvider(IOptions<OzowSettings> settings, HttpClient httpClient, ILogger<OzowProvider> logger)
    {
        _settings = settings.Value;
        _httpClient = httpClient;
        _logger = logger;
        _httpClient.BaseAddress = new Uri(_settings.BaseUrl);
    }

    public async Task<PaymentResult> InitiatePaymentAsync(PaymentRequest request)
    {
        try
        {
            var transactionReference = request.Reference ?? Guid.NewGuid().ToString("N");
            var hash = ComputeHash(transactionReference, request.Amount, request.Currency);

            var payload = new
            {
                SiteCode = _settings.SiteCode,
                CountryCode = "ZA",
                CurrencyCode = request.Currency,
                Amount = request.Amount,
                TransactionReference = transactionReference,
                CancelUrl = request.ReturnUrl ?? "http://localhost:3000/dashboard",
                ErrorUrl = request.ReturnUrl ?? "http://localhost:3000/dashboard",
                SuccessUrl = request.ReturnUrl ?? "http://localhost:3000/dashboard",
                IsTest = true,
                Hash = hash,
            };

            var json = JsonSerializer.Serialize(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync("/api/transaction/initiate", content);
            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Ozow payment failed: {Body}", responseBody);
                return new PaymentResult { Success = false, ErrorMessage = "Payment initiation failed" };
            }

            var result = JsonSerializer.Deserialize<JsonElement>(responseBody);

            return new PaymentResult
            {
                Success = true,
                TransactionId = transactionReference,
                RedirectUrl = result.GetProperty("url").GetString(),
                Status = "pending",
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ozow error");
            return new PaymentResult { Success = false, ErrorMessage = ex.Message };
        }
    }

    public async Task<PaymentVerificationResult> VerifyPaymentAsync(string transactionId)
    {
        try
        {
            var response = await _httpClient.GetAsync($"/api/transaction/{transactionId}");
            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
                return new PaymentVerificationResult { IsValid = false };

            var result = JsonSerializer.Deserialize<JsonElement>(responseBody);

            return new PaymentVerificationResult
            {
                IsValid = result.GetProperty("status").GetString() == "Complete",
                TransactionId = transactionId,
                Amount = result.GetProperty("amount").GetDecimal(),
                Currency = result.GetProperty("currency").GetString() ?? "ZAR",
                Status = result.GetProperty("status").GetString() ?? "unknown",
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ozow verification error");
            return new PaymentVerificationResult { IsValid = false };
        }
    }

    public Task<bool> ProcessWebhookAsync(string payload, string signature)
    {
        return Task.FromResult(true);
    }

    private string ComputeHash(string reference, decimal amount, string currency)
    {
        var input = $"{_settings.ApiKey}{reference}{amount:F2}{currency}";
        using var sha512 = System.Security.Cryptography.SHA512.Create();
        var hash = sha512.ComputeHash(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexString(hash).ToLower();
    }
}
