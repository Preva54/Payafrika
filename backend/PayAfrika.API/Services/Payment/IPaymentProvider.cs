using PayAfrika.API.Models.Payment;

namespace PayAfrika.API.Services.Payment;

public interface IPaymentProvider
{
    string Name { get; }
    Task<PaymentResult> InitiatePaymentAsync(PaymentRequest request);
    Task<PaymentVerificationResult> VerifyPaymentAsync(string transactionId);
    Task<bool> ProcessWebhookAsync(string payload, string signature);
}
