using PayAfrika.API.Data;
using PayAfrika.API.Models;
using PayAfrika.API.Models.Payment;

namespace PayAfrika.API.Services.Payment;

public interface IPaymentService
{
    Task<PaymentResult> InitiatePaymentAsync(PaymentRequest request);
    Task<PaymentVerificationResult> VerifyPaymentAsync(string provider, string transactionId);
    Task<bool> ProcessWebhookAsync(string provider, string payload, string signature);
}

public class PaymentService : IPaymentService
{
    private readonly IEnumerable<IPaymentProvider> _providers;
    private readonly AppDbContext _db;
    private readonly ILogger<PaymentService> _logger;

    public PaymentService(IEnumerable<IPaymentProvider> providers, AppDbContext db, ILogger<PaymentService> logger)
    {
        _providers = providers;
        _db = db;
        _logger = logger;
    }

    public async Task<PaymentResult> InitiatePaymentAsync(PaymentRequest request)
    {
        var provider = _providers.FirstOrDefault(p => p.Name == request.Provider.ToLower())
            ?? throw new ArgumentException($"Payment provider '{request.Provider}' not supported.");

        var result = await provider.InitiatePaymentAsync(request);

        if (result.Success)
        {
            _db.Transactions.Add(new Transaction
            {
                UserId = request.UserId,
                Type = "payment",
                Amount = request.Amount,
                Currency = request.Currency,
                Status = "pending",
                Description = request.Description ?? $"Payment via {request.Provider}",
                Reference = result.TransactionId,
            });

            await _db.SaveChangesAsync();
        }

        return result;
    }

    public async Task<PaymentVerificationResult> VerifyPaymentAsync(string provider, string transactionId)
    {
        var paymentProvider = _providers.FirstOrDefault(p => p.Name == provider.ToLower())
            ?? throw new ArgumentException($"Payment provider '{provider}' not supported.");

        return await paymentProvider.VerifyPaymentAsync(transactionId);
    }

    public async Task<bool> ProcessWebhookAsync(string provider, string payload, string signature)
    {
        var paymentProvider = _providers.FirstOrDefault(p => p.Name == provider.ToLower());
        if (paymentProvider == null) return false;

        return await paymentProvider.ProcessWebhookAsync(payload, signature);
    }
}
