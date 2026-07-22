using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using PayAfrika.API.Models.Payment;

namespace PayAfrika.API.Services.Payment;

public class PaystackSettings
{
    public string SecretKey { get; set; } = string.Empty;
    public string PublicKey { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = "https://api.paystack.co";
}

public class PaystackProvider : IPaymentProvider
{
    private readonly PaystackSettings _settings;
    private readonly HttpClient _httpClient;
    private readonly ILogger<PaystackProvider> _logger;

    public string Name => "paystack";

    public PaystackProvider(IOptions<PaystackSettings> settings, HttpClient httpClient, ILogger<PaystackProvider> logger)
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
                email = "customer@payafrika.com",
                amount = (int)(request.Amount * 100),
                currency = request.Currency == "ZAR" ? "ZAR" : request.Currency,
                reference = request.Reference ?? Guid.NewGuid().ToString("N"),
                callback_url = request.ReturnUrl ?? "http://localhost:3000/dashboard",
            };

            var json = JsonSerializer.Serialize(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync("/transaction/initialize", content);
            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Paystack payment failed: {Body}", responseBody);
                return new PaymentResult { Success = false, ErrorMessage = "Payment initiation failed" };
            }

            var result = JsonSerializer.Deserialize<JsonElement>(responseBody);
            var data = result.GetProperty("data");

            return new PaymentResult
            {
                Success = true,
                TransactionId = data.GetProperty("reference").GetString() ?? string.Empty,
                RedirectUrl = data.GetProperty("authorization_url").GetString(),
                Status = "pending",
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Paystack error");
            return new PaymentResult { Success = false, ErrorMessage = ex.Message };
        }
    }

    public async Task<PaymentVerificationResult> VerifyPaymentAsync(string reference)
    {
        try
        {
            var response = await _httpClient.GetAsync($"/transaction/verify/{reference}");
            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
                return new PaymentVerificationResult { IsValid = false };

            var result = JsonSerializer.Deserialize<JsonElement>(responseBody);
            var data = result.GetProperty("data");

            return new PaymentVerificationResult
            {
                IsValid = data.GetProperty("status").GetString() == "success",
                TransactionId = data.GetProperty("reference").GetString() ?? string.Empty,
                Amount = data.GetProperty("amount").GetDecimal() / 100,
                Currency = data.GetProperty("currency").GetString() ?? "ZAR",
                Status = data.GetProperty("status").GetString() ?? "unknown",
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Paystack verification error");
            return new PaymentVerificationResult { IsValid = false };
        }
    }

    public Task<bool> ProcessWebhookAsync(string payload, string signature)
    {
        var hash = ComputeHMACSHA512(payload, _settings.SecretKey);
        var isValid = hash == signature;
        return Task.FromResult(isValid);
    }

    private static string ComputeHMACSHA512(string data, string key)
    {
        using var hmac = new System.Security.Cryptography.HMACSHA512(System.Text.Encoding.UTF8.GetBytes(key));
        var hash = hmac.ComputeHash(System.Text.Encoding.UTF8.GetBytes(data));
        return Convert.ToHexString(hash).ToLower();
    }
}
