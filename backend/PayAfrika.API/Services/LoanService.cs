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
            Purpose = request.Purpose,
            MonthlyPayment = Math.Round(monthlyPayment, 2),
            TotalPayment = Math.Round(totalPayment, 2),
            TotalInterest = Math.Round(totalInterest, 2),
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

    private static LoanResponse MapLoanResponse(Loan loan) => new()
    {
        Id = loan.Id,
        Amount = loan.Amount,
        InterestRate = loan.InterestRate,
        TermMonths = loan.TermMonths,
        Status = loan.Status,
        Purpose = loan.Purpose,
        MonthlyPayment = loan.MonthlyPayment,
        TotalPayment = loan.TotalPayment,
        TotalInterest = loan.TotalInterest,
        CreatedAt = loan.CreatedAt,
    };
}
