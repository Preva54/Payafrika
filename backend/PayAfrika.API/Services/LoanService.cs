using Microsoft.EntityFrameworkCore;
using PayAfrika.API.Data;
using PayAfrika.API.DTOs;
using PayAfrika.API.Models;

namespace PayAfrika.API.Services;

public class LoanService : ILoanService
{
    private readonly AppDbContext _db;

    public LoanService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<LoanResponse> ApplyAsync(Guid userId, LoanApplicationRequest request)
    {
        var monthlyRate = request.InterestRate / 100 / 12;
        decimal monthlyPayment;

        if (monthlyRate == 0)
        {
            monthlyPayment = request.Amount / request.TermMonths;
        }
        else
        {
            var factor = (decimal)Math.Pow(1 + (double)monthlyRate, request.TermMonths);
            monthlyPayment = request.Amount * monthlyRate * factor / (factor - 1);
        }

        var totalPayment = monthlyPayment * request.TermMonths;
        var totalInterest = totalPayment - request.Amount;

        var loan = new Loan
        {
            UserId = userId,
            Amount = request.Amount,
            InterestRate = request.InterestRate,
            TermMonths = request.TermMonths,
            LoanType = request.LoanType ?? "personal",
            Purpose = request.Purpose,
            MonthlyPayment = Math.Round(monthlyPayment, 2),
            TotalPayment = Math.Round(totalPayment, 2),
            TotalInterest = Math.Round(totalInterest, 2),
            Balance = request.Amount,
            PaidAmount = 0,
            Status = "pending",
        };

        _db.Loans.Add(loan);
        await _db.SaveChangesAsync();

        return MapLoanResponse(loan);
    }

    public async Task<LoanResponse> GetByIdAsync(Guid loanId)
    {
        var loan = await _db.Loans.FindAsync(loanId)
            ?? throw new KeyNotFoundException("Loan not found.");
        return MapLoanResponse(loan);
    }

    public async Task<IEnumerable<LoanResponse>> GetUserLoansAsync(Guid userId)
    {
        var loans = await _db.Loans
            .Where(l => l.UserId == userId)
            .OrderByDescending(l => l.CreatedAt)
            .ToListAsync();

        return loans.Select(MapLoanResponse);
    }

    public async Task<LoanResponse> ApproveAsync(Guid loanId)
    {
        var loan = await _db.Loans.FindAsync(loanId)
            ?? throw new KeyNotFoundException("Loan not found.");

        loan.Status = "approved";
        loan.ApprovedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return MapLoanResponse(loan);
    }

    public async Task<LoanResponse> RejectAsync(Guid loanId, string reason)
    {
        var loan = await _db.Loans.FindAsync(loanId)
            ?? throw new KeyNotFoundException("Loan not found.");

        loan.Status = "rejected";
        await _db.SaveChangesAsync();

        return MapLoanResponse(loan);
    }

    public async Task<LoanOverviewResponse> GetOverviewAsync(Guid userId)
    {
        var loans = await _db.Loans.Where(l => l.UserId == userId).ToListAsync();
        var activeLoan = loans.FirstOrDefault(l => l.Status == "active" || l.Status == "approved");
        var totalBorrowed = loans.Where(l => l.Status == "paid" || l.Status == "active").Sum(l => l.Amount);

        return new LoanOverviewResponse
        {
            ActiveLoanAmount = activeLoan?.Amount ?? 0,
            ActiveLoanStatus = activeLoan?.Status ?? "none",
            ActiveLoanProgress = activeLoan != null ? Math.Round((activeLoan.PaidAmount / activeLoan.Amount) * 100, 1) : 0,
            AvailableCredit = Math.Max(0, 500000 - totalBorrowed),
            MonthlyRepayment = activeLoan?.MonthlyPayment ?? 0,
            NextPaymentDate = activeLoan != null ? DateTime.UtcNow.AddDays(30).ToString("dd MMM yyyy") : null,
            CreditScore = await CalculateCreditScore(userId),
            CreditScoreRating = GetCreditRating(await CalculateCreditScore(userId)),
        };
    }

    public async Task<List<RepaymentScheduleItem>> GetRepaymentScheduleAsync(Guid loanId)
    {
        var loan = await _db.Loans.FindAsync(loanId)
            ?? throw new KeyNotFoundException("Loan not found.");

        var schedule = new List<RepaymentScheduleItem>();
        var monthlyRate = loan.InterestRate / 100 / 12;
        var balance = loan.Amount;
        var payment = loan.MonthlyPayment;
        var startDate = loan.ApprovedAt ?? loan.CreatedAt;

        for (int i = 1; i <= loan.TermMonths; i++)
        {
            var interest = balance * monthlyRate;
            var principal = payment - interest;
            var fees = i % 3 == 0 ? 50m : 0;
            balance -= principal;
            if (balance < 0) balance = 0;

            var dueDate = startDate.AddMonths(i);
            var status = dueDate < DateTime.UtcNow ? "paid" : (dueDate < DateTime.UtcNow.AddDays(-7) ? "missed" : "upcoming");

            schedule.Add(new RepaymentScheduleItem
            {
                PaymentNumber = i,
                DueDate = dueDate,
                Principal = Math.Round(principal, 2),
                Interest = Math.Round(interest, 2),
                Fees = fees,
                Total = Math.Round(payment + fees, 2),
                BalanceAfter = Math.Round(balance, 2),
                Status = status,
            });
        }

        return schedule;
    }

    public async Task<CreditScoreResponse> GetCreditScoreAsync(Guid userId)
    {
        var user = await _db.Users.Include(u => u.Loans).FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) throw new KeyNotFoundException("User not found.");

        var score = await CalculateCreditScore(userId);
        var now = DateTime.UtcNow;

        return new CreditScoreResponse
        {
            Score = score,
            Rating = GetCreditRating(score),
            NextMilestone = GetNextMilestone(score),
            ScoreToNextMilestone = GetScoreToNext(score),
            Factors = new List<CreditFactor>
            {
                new() { Name = "Payment History", Score = Math.Min(35, (int)(score * 0.35)), MaxScore = 35, Status = "good", Tip = "Continue making timely payments" },
                new() { Name = "Debt Ratio", Score = Math.Min(30, (int)(score * 0.30)), MaxScore = 30, Status = user.Loans.Count > 2 ? "fair" : "good", Tip = "Try to keep debt below 30% of income" },
                new() { Name = "Loan Utilization", Score = Math.Min(20, (int)(score * 0.20)), MaxScore = 20, Status = "excellent", Tip = "You're using credit responsibly" },
                new() { Name = "Account History", Score = Math.Min(15, (int)(score * 0.15)), MaxScore = 15, Status = "good", Tip = "Your account age is healthy" },
            },
            History = Enumerable.Range(0, 12).Select(i => new ScoreHistoryPoint
            {
                Date = now.AddMonths(-11 + i).ToString("MMM yyyy"),
                Score = Math.Max(300, score + new Random().Next(-50, 30)),
            }).ToList(),
            Recommendations = new List<Recommendation>
            {
                new() { Title = "Increase Payment", Description = "Paying more than minimum reduces interest", Impact = "high" },
                new() { Title = "Consolidate Debt", Description = "Combine loans for better rates", Impact = "medium" },
            },
        };
    }

    public async Task<EligibilityResponse> CheckEligibilityAsync(EligibilityRequest request)
    {
        await Task.Delay(50);
        var dti = request.ExistingDebt.HasValue && request.ExistingDebt > 0
            ? (request.ExistingDebt.Value / request.MonthlyIncome) * 100 : 0;
        var incomeScore = Math.Min(40, (int)(request.MonthlyIncome / 10000));
        var debtScore = Math.Max(0, 30 - (int)(dti / 2));
        var employmentScore = request.EmploymentStatus switch
        {
            "employed" => 15,
            "self-employed" => 12,
            "business" => 18,
            "contract" => 10,
            _ => 5,
        };
        var creditScore = request.CreditScore.HasValue ? Math.Min(15, request.CreditScore.Value / 60) : 5;

        var totalScore = Math.Min(100, incomeScore + debtScore + employmentScore + creditScore);
        var maxLoan = request.MonthlyIncome * 12 * 0.4m;
        var baseRate = 10m;
        var rateAdjustment = Math.Max(0, (100 - totalScore) * 0.1m);
        var interestRate = baseRate + rateAdjustment;
        var monthlyRate = interestRate / 100 / 12;
        var monthlyInstallment = request.LoanAmount * monthlyRate * (decimal)Math.Pow(1 + (double)monthlyRate, request.LoanTermMonths)
            / ((decimal)Math.Pow(1 + (double)monthlyRate, request.LoanTermMonths) - 1);

        return new EligibilityResponse
        {
            EligibilityPercentage = Math.Round((decimal)totalScore, 1),
            MaximumLoanAmount = Math.Round(maxLoan, 2),
            EstimatedInterestRate = Math.Round(interestRate, 2),
            MonthlyInstallment = Math.Round(monthlyInstallment, 2),
            ApprovalProbability = Math.Round(totalScore * 0.95m, 1),
            EstimatedProcessingTime = totalScore >= 70 ? "2-4 hours" : (totalScore >= 50 ? "1-2 business days" : "3-5 business days"),
            RequiredDocuments = new List<string> { "ID Document", "Proof of Address", "Payslip/Bank Statement" },
        };
    }

    public async Task<CalculatorResponse> CalculateLoanAsync(CalculatorRequest request)
    {
        await Task.Delay(30);
        var periodsPerYear = request.PaymentFrequency switch
        {
            "weekly" => 52,
            "bi-weekly" => 26,
            "monthly" => 12,
            _ => 12,
        };
        var totalPeriods = (int)(request.DurationMonths / (12m / periodsPerYear));
        var ratePerPeriod = request.InterestRate / 100 / periodsPerYear;

        decimal payment;
        if (ratePerPeriod == 0)
        {
            payment = request.LoanAmount / totalPeriods;
        }
        else
        {
            var factor = (decimal)Math.Pow(1 + (double)ratePerPeriod, totalPeriods);
            payment = request.LoanAmount * ratePerPeriod * factor / (factor - 1);
        }

        var totalRepayment = payment * totalPeriods;
        var totalInterest = totalRepayment - request.LoanAmount;
        var fee = request.ProcessingFee ?? request.LoanAmount * 0.01m;
        var insurance = request.InsuranceAmount ?? request.LoanAmount * 0.005m;
        var halfLife = totalPeriods / 2;
        var earlyFraction = (decimal)Math.Pow(1 + (double)ratePerPeriod, halfLife);
        var earlySettlement = request.LoanAmount * ratePerPeriod * earlyFraction / (earlyFraction - 1) * halfLife;

        var schedule = new List<RepaymentScheduleItem>();
        var balance = request.LoanAmount;
        var startDate = DateTime.UtcNow;

        for (int i = 1; i <= Math.Min(totalPeriods, 120); i++)
        {
            var interest = balance * ratePerPeriod;
            var principal = payment - interest;
            balance -= principal;
            if (balance < 0) balance = 0;
            var daysOffset = request.PaymentFrequency switch { "weekly" => 7, "bi-weekly" => 14, _ => 30 };

            schedule.Add(new RepaymentScheduleItem
            {
                PaymentNumber = i,
                DueDate = startDate.AddDays(i * daysOffset),
                Principal = Math.Round(principal, 2),
                Interest = Math.Round(interest, 2),
                Fees = 0,
                Total = Math.Round(payment, 2),
                BalanceAfter = Math.Round(balance, 2),
                Status = "upcoming",
            });

            if (balance <= 0) break;
        }

        return new CalculatorResponse
        {
            MonthlyRepayment = Math.Round(payment, 2),
            TotalRepayment = Math.Round(totalRepayment + fee + insurance, 2),
            TotalInterest = Math.Round(totalInterest, 2),
            ProcessingFee = Math.Round(fee, 2),
            Insurance = Math.Round(insurance, 2),
            EarlySettlementAmount = Math.Round(earlySettlement + fee, 2),
            RepaymentSchedule = schedule,
        };
    }

    public async Task<LoanResponse> MakePaymentAsync(Guid userId, LoanPaymentRequest request)
    {
        var loan = await _db.Loans.FirstOrDefaultAsync(l => l.Id == request.LoanId && l.UserId == userId)
            ?? throw new KeyNotFoundException("Loan not found.");

        if (loan.Status != "active" && loan.Status != "approved")
            throw new InvalidOperationException("Loan is not active.");

        loan.PaidAmount += request.Amount;
        loan.Balance = loan.Amount - loan.PaidAmount;

        if (loan.Balance <= 0)
        {
            loan.Status = "paid";
            loan.PaidAt = DateTime.UtcNow;
            loan.Balance = 0;
        }

        _db.Transactions.Add(new Transaction
        {
            UserId = userId,
            Type = "loan_payment",
            Amount = request.Amount,
            Currency = "ZAR",
            Status = "completed",
            Description = $"Loan payment for {loan.Id}",
            Reference = $"LP-{loan.Id.ToString()[..8]}",
        });

        await _db.SaveChangesAsync();
        return MapLoanResponse(loan);
    }

    public async Task<List<LoanNotificationResponse>> GetNotificationsAsync(Guid userId)
    {
        var loans = await _db.Loans.Where(l => l.UserId == userId).ToListAsync();
        var notifications = new List<LoanNotificationResponse>();
        var now = DateTime.UtcNow;

        foreach (var loan in loans.Where(l => l.Status == "approve" || l.Status == "active" || l.Status == "pending"))
        {
            if (loan.Status == "pending")
            {
                notifications.Add(new()
                {
                    Id = $"applied-{loan.Id}",
                    Title = "Application Submitted",
                    Message = $"Your R {loan.Amount:N0} loan application has been submitted for review.",
                    Type = "info",
                    CreatedAt = loan.CreatedAt,
                });
            }

            if (loan.ApprovedAt.HasValue)
            {
                notifications.Add(new()
                {
                    Id = $"approved-{loan.Id}",
                    Title = "Loan Approved",
                    Message = $"Congratulations! Your loan of R {loan.Amount:N0} has been approved.",
                    Type = "success",
                    CreatedAt = loan.ApprovedAt.Value,
                });

                notifications.Add(new()
                {
                    Id = $"payment-due-{loan.Id}",
                    Title = "Payment Due",
                    Message = $"Your monthly payment of R {loan.MonthlyPayment:N0} is due on {now.AddDays(30):dd MMM yyyy}.",
                    Type = "warning",
                    CreatedAt = now,
                });
            }

            if (loan.PaidAt.HasValue)
            {
                notifications.Add(new()
                {
                    Id = $"paid-{loan.Id}",
                    Title = "Payment Successful",
                    Message = $"Payment of R {loan.MonthlyPayment:N0} received successfully.",
                    Type = "success",
                    CreatedAt = loan.PaidAt.Value,
                });
            }
        }

        return notifications.OrderByDescending(n => n.CreatedAt).Take(20).ToList();
    }

    public async Task<LoanAnalyticsResponse> GetAnalyticsAsync(Guid userId)
    {
        var loans = await _db.Loans.Where(l => l.UserId == userId).OrderBy(l => l.CreatedAt).ToListAsync();
        var now = DateTime.UtcNow;

        return new LoanAnalyticsResponse
        {
            BorrowingHistory = loans.GroupBy(l => l.CreatedAt.ToString("MMM yyyy"))
                .Select(g => new ChartDataPoint { Label = g.Key, Value = g.Sum(l => l.Amount) })
                .ToList(),
            RepaymentTrend = Enumerable.Range(0, 6).Select(i => new ChartDataPoint
            {
                Label = now.AddMonths(-5 + i).ToString("MMM"),
                Value = loans.Where(l => l.PaidAt.HasValue && l.PaidAt.Value.Month == now.AddMonths(-5 + i).Month).Sum(l => l.MonthlyPayment)
            }).ToList(),
            TotalInterestPaid = loans.Where(l => l.Status == "paid" || l.Status == "active").Sum(l => l.TotalInterest),
            TotalPrincipalPaid = loans.Where(l => l.Status == "paid" || l.Status == "active").Sum(l => l.PaidAmount),
            CreditGrowth = loans.Any() ? (loans.Sum(l => l.Amount) / loans.Count) * 1.2m : 0,
            LoanUtilization = loans.Any() ? Math.Min(100, (loans.Where(l => l.Status == "active").Sum(l => l.Balance) / Math.Max(1, loans.Sum(l => l.Amount))) * 100) : 0,
            InterestPaid = loans.Where(l => l.Status == "paid" || l.Status == "active").Select(l => new ChartDataPoint { Label = l.CreatedAt.ToString("MMM yyyy"), Value = l.TotalInterest }).ToList(),
            PrincipalPaid = loans.Where(l => l.Status == "paid" || l.Status == "active").Select(l => new ChartDataPoint { Label = l.CreatedAt.ToString("MMM yyyy"), Value = l.PaidAmount }).ToList(),
        };
    }

    public async Task<List<LoanDocumentResponse>> GetDocumentsAsync(Guid userId)
    {
        var loans = await _db.Loans.Where(l => l.UserId == userId).ToListAsync();
        var docs = new List<LoanDocumentResponse>();
        foreach (var loan in loans)
        {
            docs.Add(new() { Id = $"agreement-{loan.Id}", Name = "Loan Agreement", Type = "agreement", Status = "generated", UploadedAt = loan.CreatedAt, Size = 245000 });
            if (loan.Status == "active" || loan.Status == "paid")
            {
                docs.Add(new() { Id = $"statement-{loan.Id}", Name = $"Statement - {loan.CreatedAt:MMM yyyy}", Type = "statement", Status = "available", UploadedAt = loan.CreatedAt.AddMonths(1), Size = 128000 });
            }
        }
        return docs;
    }

    private async Task<int> CalculateCreditScore(Guid userId)
    {
        var loans = await _db.Loans.Where(l => l.UserId == userId).ToListAsync();
        var baseScore = 600;
        var paidOnTime = loans.Count(l => l.Status == "paid");
        var active = loans.Count(l => l.Status == "active");
        var defaulted = loans.Count(l => l.Status == "defaulted");
        return Math.Min(999, baseScore + paidOnTime * 50 - defaulted * 100 + active * 20);
    }

    private static string GetCreditRating(int score) => score switch
    {
        >= 800 => "Excellent",
        >= 700 => "Very Good",
        >= 600 => "Good",
        >= 500 => "Fair",
        _ => "Poor",
    };

    private static string? GetNextMilestone(int score) => score switch
    {
        < 600 => "Good (600)",
        < 700 => "Very Good (700)",
        < 800 => "Excellent (800)",
        < 900 => "Premium (900)",
        _ => null,
    };

    private static int? GetScoreToNext(int score) => score switch
    {
        < 600 => 600 - score,
        < 700 => 700 - score,
        < 800 => 800 - score,
        < 900 => 900 - score,
        _ => null,
    };

    private static LoanResponse MapLoanResponse(Loan loan) => new()
    {
        Id = loan.Id,
        UserId = loan.UserId,
        Amount = loan.Amount,
        InterestRate = loan.InterestRate,
        TermMonths = loan.TermMonths,
        LoanType = loan.LoanType,
        Status = loan.Status,
        Purpose = loan.Purpose,
        MonthlyPayment = loan.MonthlyPayment,
        TotalPayment = loan.TotalPayment,
        TotalInterest = loan.TotalInterest,
        Balance = loan.Balance,
        CreatedAt = loan.CreatedAt,
        ApprovedAt = loan.ApprovedAt,
    };
}