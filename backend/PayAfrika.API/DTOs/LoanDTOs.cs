using System.ComponentModel.DataAnnotations;

namespace PayAfrika.API.DTOs;

public class LoanApplicationRequest
{
    [Required, Range(100, 1_000_000_000)]
    public decimal Amount { get; set; }

    [Required, Range(1, 100)]
    public decimal InterestRate { get; set; }

    [Required, Range(1, 72)]
    public int TermMonths { get; set; }

    [MaxLength(500)]
    public string? Purpose { get; set; }
}

public class LoanResponse
{
    public Guid Id { get; set; }
    public decimal Amount { get; set; }
    public decimal InterestRate { get; set; }
    public int TermMonths { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Purpose { get; set; }
    public decimal MonthlyPayment { get; set; }
    public decimal TotalPayment { get; set; }
    public decimal TotalInterest { get; set; }
    public DateTime CreatedAt { get; set; }
}
