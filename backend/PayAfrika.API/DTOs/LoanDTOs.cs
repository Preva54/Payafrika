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

    [MaxLength(50)]
    public string? LoanType { get; set; }
}

public class LoanResponse
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public decimal Amount { get; set; }
    public decimal InterestRate { get; set; }
    public int TermMonths { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Purpose { get; set; }
    public string? LoanType { get; set; }
    public decimal MonthlyPayment { get; set; }
    public decimal TotalPayment { get; set; }
    public decimal TotalInterest { get; set; }
    public decimal Balance { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ApprovedAt { get; set; }
}

public class RepaymentScheduleItem
{
    public int PaymentNumber { get; set; }
    public DateTime DueDate { get; set; }
    public decimal Principal { get; set; }
    public decimal Interest { get; set; }
    public decimal Fees { get; set; }
    public decimal Total { get; set; }
    public decimal BalanceAfter { get; set; }
    public string Status { get; set; } = "upcoming";
}

public class CreditScoreResponse
{
    public int Score { get; set; }
    public string Rating { get; set; } = string.Empty;
    public string? NextMilestone { get; set; }
    public int? ScoreToNextMilestone { get; set; }
    public List<CreditFactor> Factors { get; set; } = new();
    public List<ScoreHistoryPoint> History { get; set; } = new();
    public List<Recommendation> Recommendations { get; set; } = new();
}

public class CreditFactor
{
    public string Name { get; set; } = string.Empty;
    public int Score { get; set; }
    public int MaxScore { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Tip { get; set; }
}

public class ScoreHistoryPoint
{
    public string Date { get; set; } = string.Empty;
    public int Score { get; set; }
}

public class Recommendation
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Impact { get; set; } = string.Empty;
}

public class EligibilityRequest
{
    [Required, Range(0, double.MaxValue)]
    public decimal MonthlyIncome { get; set; }

    [MaxLength(50)]
    public string EmploymentStatus { get; set; } = "employed";

    [Range(0, double.MaxValue)]
    public decimal? BusinessRevenue { get; set; }

    [Range(0, double.MaxValue)]
    public decimal? ExistingDebt { get; set; }

    [Range(0, 999)]
    public int? CreditScore { get; set; }

    [MaxLength(50)]
    public string LoanPurpose { get; set; } = "personal";

    [Range(100, double.MaxValue)]
    public decimal LoanAmount { get; set; }

    [Range(1, 120)]
    public int LoanTermMonths { get; set; }
}

public class EligibilityResponse
{
    public decimal EligibilityPercentage { get; set; }
    public decimal MaximumLoanAmount { get; set; }
    public decimal EstimatedInterestRate { get; set; }
    public decimal MonthlyInstallment { get; set; }
    public decimal ApprovalProbability { get; set; }
    public string EstimatedProcessingTime { get; set; } = string.Empty;
    public List<string> RequiredDocuments { get; set; } = new();
}

public class CalculatorRequest
{
    [Required, Range(100, double.MaxValue)]
    public decimal LoanAmount { get; set; }

    [Required, Range(0, 100)]
    public decimal InterestRate { get; set; }

    [Required, Range(1, 120)]
    public int DurationMonths { get; set; }

    [MaxLength(20)]
    public string PaymentFrequency { get; set; } = "monthly";

    [Range(0, double.MaxValue)]
    public decimal? ProcessingFee { get; set; }

    [Range(0, double.MaxValue)]
    public decimal? InsuranceAmount { get; set; }
}

public class CalculatorResponse
{
    public decimal MonthlyRepayment { get; set; }
    public decimal TotalRepayment { get; set; }
    public decimal TotalInterest { get; set; }
    public decimal ProcessingFee { get; set; }
    public decimal Insurance { get; set; }
    public decimal EarlySettlementAmount { get; set; }
    public List<RepaymentScheduleItem> RepaymentSchedule { get; set; } = new();
}

public class LoanPaymentRequest
{
    [Required]
    public Guid LoanId { get; set; }

    [Required, Range(1, double.MaxValue)]
    public decimal Amount { get; set; }

    [MaxLength(50)]
    public string PaymentMethod { get; set; } = "wallet";
}

public class LoanNotificationResponse
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public bool Read { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class LoanAnalyticsResponse
{
    public List<ChartDataPoint> BorrowingHistory { get; set; } = new();
    public List<ChartDataPoint> RepaymentTrend { get; set; } = new();
    public decimal TotalInterestPaid { get; set; }
    public decimal TotalPrincipalPaid { get; set; }
    public decimal CreditGrowth { get; set; }
    public decimal LoanUtilization { get; set; }
    public List<ChartDataPoint> InterestPaid { get; set; } = new();
    public List<ChartDataPoint> PrincipalPaid { get; set; } = new();
}

public class ChartDataPoint
{
    public string Label { get; set; } = string.Empty;
    public decimal Value { get; set; }
}

public class LoanOverviewResponse
{
    public decimal ActiveLoanAmount { get; set; }
    public string ActiveLoanStatus { get; set; } = string.Empty;
    public decimal ActiveLoanProgress { get; set; }
    public decimal AvailableCredit { get; set; }
    public decimal MonthlyRepayment { get; set; }
    public string? NextPaymentDate { get; set; }
    public int CreditScore { get; set; }
    public string CreditScoreRating { get; set; } = string.Empty;
}

public class LoanDocumentResponse
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime UploadedAt { get; set; }
    public string? Url { get; set; }
    public long Size { get; set; }
}
