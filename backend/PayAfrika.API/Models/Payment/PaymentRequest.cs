using System.ComponentModel.DataAnnotations;

namespace PayAfrika.API.Models.Payment;

public class PaymentRequest
{
    [Required]
    public Guid UserId { get; set; }

    [Required, Range(1, double.MaxValue)]
    public decimal Amount { get; set; }

    [Required, MaxLength(3)]
    public string Currency { get; set; } = "ZAR";

    [Required, MaxLength(50)]
    public string Provider { get; set; } = string.Empty; // flutterwave, paystack, ozow, peach

    [MaxLength(200)]
    public string? Reference { get; set; }

    [MaxLength(500)]
    public string? Description { get; set; }

    [MaxLength(200)]
    public string? ReturnUrl { get; set; }

    [MaxLength(200)]
    public string? CallbackUrl { get; set; }
}

public class PaymentResult
{
    public bool Success { get; set; }
    public string TransactionId { get; set; } = string.Empty;
    public string? RedirectUrl { get; set; }
    public string? Status { get; set; }
    public string? ErrorMessage { get; set; }
}

public class PaymentVerificationResult
{
    public bool IsValid { get; set; }
    public string TransactionId { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? CustomerEmail { get; set; }
}
