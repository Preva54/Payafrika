using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PayAfrika.API.Data;
using PayAfrika.API.DTOs;
using PayAfrika.API.Models;

namespace PayAfrika.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class WithdrawalsController : ControllerBase
{
    private readonly AppDbContext _db;

    public WithdrawalsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpPost]
    public async Task<ActionResult<WithdrawalResponse>> RequestWithdrawal([FromBody] SubmitWithdrawalRequest request)
    {
        var userId = GetUserId();
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return Unauthorized();

        // Compliance checks
        if (user.KYCStatus != "verified" && user.KYCStatus != "approved")
            return BadRequest(new { error = "KYC verification required before withdrawal." });

        var bank = await _db.LinkedBanks.FirstOrDefaultAsync(b => b.Id == request.BankId && b.UserId == userId);
        if (bank == null)
            return BadRequest(new { error = "Bank account not found." });
        if (bank.Status != "verified" && !bank.IsVerified)
            return BadRequest(new { error = "Bank account must be verified before withdrawal." });

        var walletBalance = await _db.WalletBalances
            .FirstOrDefaultAsync(b => b.UserId == userId && b.Currency == request.Currency);
        if (walletBalance == null)
            return BadRequest(new { error = "Wallet not found for this currency." });

        var available = walletBalance.Balance - walletBalance.ReservedBalance;
        if (available < request.Amount)
            return BadRequest(new { error = "Insufficient available balance." });

        // Generate reference
        var count = await _db.Withdrawals.CountAsync() + 1;
        var reference = $"WTH-{100000 + count}";

        // Simple fee: 0.5% or R10, whichever is higher
        var fee = Math.Max(request.Amount * 0.005m, 10m);
        var totalDeduction = request.Amount + fee;

        if (available < totalDeduction)
            return BadRequest(new { error = "Insufficient balance to cover amount and fee." });

        var withdrawal = new Withdrawal
        {
            UserId = userId,
            Reference = reference,
            Amount = request.Amount,
            Fee = fee,
            Currency = request.Currency,
            Status = "pending",
            BankId = bank.Id,
            BankName = bank.BankName,
            AccountHolderName = bank.AccountName,
            AccountNumber = bank.AccountNumber,
            BranchCode = bank.BranchCode,
            AccountType = bank.AccountType,
            Purpose = request.Purpose,
            CustomerReference = request.CustomerReference,
        };

        _db.Withdrawals.Add(withdrawal);

        // Reserve the balance
        walletBalance.ReservedBalance += totalDeduction;
        walletBalance.UpdatedAt = DateTime.UtcNow;

        var legacyWallet = await _db.Wallets.FirstOrDefaultAsync(w => w.UserId == userId);
        if (legacyWallet != null)
        {
            legacyWallet.Balance -= totalDeduction;
            legacyWallet.UpdatedAt = DateTime.UtcNow;
        }

        _db.AuditLogs.Add(new AuditLog
        {
            UserId = userId,
            Action = "Withdrawal Requested",
            Module = "Withdrawals",
            Resource = "Withdrawal",
            ResourceId = withdrawal.Id.ToString(),
            NewValue = $"Amount: {request.Amount} {request.Currency}, Fee: {fee}, Ref: {reference}",
            Result = "success",
        });

        await _db.SaveChangesAsync();
        return Ok(MapWithdrawal(withdrawal));
    }

    [HttpGet]
    public async Task<ActionResult<WithdrawalListResponse>> GetMyWithdrawals(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20,
        [FromQuery] string? status = null)
    {
        var userId = GetUserId();
        var query = _db.Withdrawals.Where(w => w.UserId == userId);

        if (!string.IsNullOrEmpty(status))
            query = query.Where(w => w.Status == status);

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(w => w.CreatedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        return Ok(new WithdrawalListResponse
        {
            Data = items.Select(MapWithdrawal).ToList(),
            Total = total,
            Page = page,
            Limit = limit,
            TotalPages = (int)Math.Ceiling(total / (double)limit),
        });
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<WithdrawalResponse>> GetWithdrawal(Guid id)
    {
        var userId = GetUserId();
        var withdrawal = await _db.Withdrawals
            .Include(w => w.User)
            .Include(w => w.ProcessedBy)
            .FirstOrDefaultAsync(w => w.Id == id && w.UserId == userId);

        if (withdrawal == null)
            return NotFound(new { error = "Withdrawal not found." });

        return Ok(MapWithdrawal(withdrawal));
    }

    private WithdrawalResponse MapWithdrawal(Withdrawal w)
    {
        return new WithdrawalResponse
        {
            Id = w.Id,
            UserId = w.UserId,
            UserName = w.User?.FullName ?? "",
            UserEmail = w.User?.Email ?? "",
            Reference = w.Reference,
            Amount = w.Amount,
            Fee = w.Fee,
            Currency = w.Currency,
            Status = w.Status,
            BankName = w.BankName,
            AccountHolderName = w.AccountHolderName,
            AccountNumber = MaskAccount(w.AccountNumber),
            BranchCode = w.BranchCode,
            AccountType = w.AccountType,
            Purpose = w.Purpose,
            CustomerReference = w.CustomerReference,
            RejectionReason = w.RejectionReason,
            RejectionCategory = w.RejectionCategory,
            BankPaymentReference = w.BankPaymentReference,
            ProcessedByName = w.ProcessedBy?.FullName,
            ApprovedAt = w.ApprovedAt,
            PaidAt = w.PaidAt,
            CreatedAt = w.CreatedAt,
        };
    }

    private static string MaskAccount(string number)
    {
        return number.Length >= 4 ? $"****{number[^4..]}" : $"****{number}";
    }

    private Guid GetUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.Parse(claim!);
    }
}
