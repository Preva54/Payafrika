using System.ComponentModel.DataAnnotations;

namespace PayAfrika.API.Models;

public class CurrencyExchange
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }

    [Required, MaxLength(20)]
    public string Reference { get; set; } = string.Empty;

    [Required, MaxLength(3)]
    public string FromCurrency { get; set; } = string.Empty;

    [Required, MaxLength(3)]
    public string ToCurrency { get; set; } = string.Empty;

    public decimal Amount { get; set; }
    public decimal ConvertedAmount { get; set; }
    public decimal Rate { get; set; }
    public decimal Fee { get; set; }

    [MaxLength(3)]
    public string FeeCurrency { get; set; } = "ZAR";

    public decimal FxMargin { get; set; }

    [Required, MaxLength(20)]
    public string Status { get; set; } = "completed";

    public decimal SourceWalletBalanceBefore { get; set; }
    public decimal SourceWalletBalanceAfter { get; set; }
    public decimal DestWalletBalanceBefore { get; set; }
    public decimal DestWalletBalanceAfter { get; set; }

    public Guid? SourceTransactionId { get; set; }
    public Guid? DestTransactionId { get; set; }

    public Guid? ReversedById { get; set; }
    public DateTime? ReversedAt { get; set; }

    [MaxLength(500)]
    public string? ReversalReason { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }

    public User User { get; set; } = null!;
    public User? ReversedBy { get; set; }
    public Transaction? SourceTransaction { get; set; }
    public Transaction? DestTransaction { get; set; }
}
