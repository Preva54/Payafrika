using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using PayAfrika.API.Models.Payment;

namespace PayAfrika.API.Services.Payment;

public class PeachPaymentsSettings
{
    public string EntityId { get; set; } = string.Empty;
    public string BearerToken { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = "https://api.peachpayments.com";
}

public class PeachPaymentsProvider : IPaymentProvider
{
    private readonly PeachPaymentsSettings _settings;
    private readonly HttpClient _httpClient;
    private readonly ILogger<PeachPaymentsProvider> _logger;

    public string Name => "peach";

    public PeachPaymentsProvider(IOptions<PeachPaymentsSettings> settings, HttpClient httpClient, ILogger<PeachPaymentsProvider> logger)
    {
        _settings = settings.Value;
        _httpClient = httpClient;
        _logger = logger;
        _httpClient.BaseAddress = new Uri(_settings.BaseUrl);
        _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {_settings.BearerToken}");
    }

    public async Task<PaymentResult> InitiatePaymentAsync(PaymentRequest request)
    {
        try
        {
            var payload = new
            {
                entityId = _settings.EntityId,
                amount = request.Amount.ToString("F2"),
                currency = request.Currency,
                paymentType = "DB",
                merchantTransactionId = request.Reference ?? Guid.NewGuid().ToString("N"),
                notificationUrl = request.CallbackUrl ?? "http://localhost:5000/api/payments/webhook/peach",
            };

            var formData = new FormUrlEncodedContent(
                payload.GetType().GetProperties()
                    .Select(p => new KeyValuePair<string, string>(p.Name, p.GetValue(payload)?.ToString() ?? ""))
            );

            var response = await _httpClient.PostAsync("/v1/checkouts", formData);
            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Peach payment failed: {Body}", responseBody);
                return new PaymentResult { Success = false, ErrorMessage = "Payment initiation failed" };
            }

            var result = JsonSerializer.Deserialize<JsonElement>(responseBody);

            return new PaymentResult
            {
                Success = true,
                TransactionId = result.GetProperty("id").GetString() ?? string.Empty,
                RedirectUrl = $"{result.GetProperty("redirectUrl").GetString()}?id={result.GetProperty("id").GetString()}",
                Status = "pending",
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Peach error");
            return new PaymentResult { Success = false, ErrorMessage = ex.Message };
        }
    }

    public async Task<PaymentVerificationResult> VerifyPaymentAsync(string checkoutId)
    {
        try
        {
            var response = await _httpClient.GetAsync($"/v1/checkouts/{checkoutId}/payment?entityId={_settings.EntityId}");
            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
                return new PaymentVerificationResult { IsValid = false };

            var result = JsonSerializer.Deserialize<JsonElement>(responseBody);

            return new PaymentVerificationResult
            {
                IsValid = result.GetProperty("result").GetProperty("code").GetString() == "000.100.110",
                TransactionId = checkoutId,
                Amount = decimal.Parse(result.GetProperty("amount").GetString() ?? "0"),
                Currency = result.GetProperty("currency").GetString() ?? "ZAR",
                Status = result.GetProperty("result").GetProperty("description").GetString() ?? "unknown",
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Peach verification error");
            return new PaymentVerificationResult { IsValid = false };
        }
    }

    public Task<bool> ProcessWebhookAsync(string payload, string signature)
    {
        return Task.FromResult(true);
    }
}
