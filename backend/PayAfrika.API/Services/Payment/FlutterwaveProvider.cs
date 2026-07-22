using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using PayAfrika.API.Models.Payment;

namespace PayAfrika.API.Services.Payment;

public class FlutterwaveSettings
{
    public string SecretKey { get; set; } = string.Empty;
    public string PublicKey { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = "https://api.flutterwave.com/v3";
}

public class FlutterwaveProvider : IPaymentProvider
{
    private readonly FlutterwaveSettings _settings;
    private readonly HttpClient _httpClient;
    private readonly ILogger<FlutterwaveProvider> _logger;

    public string Name => "flutterwave";

    public FlutterwaveProvider(IOptions<FlutterwaveSettings> settings, HttpClient httpClient, ILogger<FlutterwaveProvider> logger)
    {
        _settings = settings.Value;
        _httpClient = httpClient;
        _logger = logger;
        _httpClient.BaseAddress = new Uri(_settings.BaseUrl);
        _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {_settings.SecretKey}");
    }

    public async Task<PaymentResult> InitiatePaymentAsync(PaymentRequest request)
    {
        try
        {
            var payload = new
            {
                tx_ref = request.Reference ?? Guid.NewGuid().ToString("N"),
                amount = request.Amount,
                currency = request.Currency,
                redirect_url = request.ReturnUrl ?? "http://localhost:3000/dashboard",
                customer = new { email = "customer@payafrika.com" },
                customizations = new
                {
                    title = "PayAfrika Payment",
                    logo = "https://payafrika.com/logo.png",
                },
            };

            var json = JsonSerializer.Serialize(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync("/payments", content);
            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Flutterwave payment failed: {Body}", responseBody);
                return new PaymentResult { Success = false, ErrorMessage = "Payment initiation failed" };
            }

            var result = JsonSerializer.Deserialize<JsonElement>(responseBody);
            var data = result.GetProperty("data");

            return new PaymentResult
            {
                Success = true,
                TransactionId = data.GetProperty("id").GetInt64().ToString(),
                RedirectUrl = data.GetProperty("link").GetString(),
                Status = "pending",
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Flutterwave error");
            return new PaymentResult { Success = false, ErrorMessage = ex.Message };
        }
    }

    public async Task<PaymentVerificationResult> VerifyPaymentAsync(string transactionId)
    {
        try
        {
            var response = await _httpClient.GetAsync($"/transactions/{transactionId}/verify");
            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
                return new PaymentVerificationResult { IsValid = false };

            var result = JsonSerializer.Deserialize<JsonElement>(responseBody);
            var data = result.GetProperty("data");

            return new PaymentVerificationResult
            {
                IsValid = data.GetProperty("status").GetString() == "successful",
                TransactionId = transactionId,
                Amount = data.GetProperty("amount").GetDecimal(),
                Currency = data.GetProperty("currency").GetString() ?? "ZAR",
                Status = data.GetProperty("status").GetString() ?? "unknown",
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Flutterwave verification error");
            return new PaymentVerificationResult { IsValid = false };
        }
    }

    public Task<bool> ProcessWebhookAsync(string payload, string signature)
    {
        var hash = ComputeHMACSHA256(payload, _settings.SecretKey);
        var isValid = hash == signature;
        return Task.FromResult(isValid);
    }

    private static string ComputeHMACSHA256(string data, string key)
    {
        using var hmac = new System.Security.Cryptography.HMACSHA256(System.Text.Encoding.UTF8.GetBytes(key));
        var hash = hmac.ComputeHash(System.Text.Encoding.UTF8.GetBytes(data));
        return Convert.ToHexString(hash).ToLower();
    }
}
