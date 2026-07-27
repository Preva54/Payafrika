using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PayAfrika.API.Data;
using PayAfrika.API.DTOs;
using PayAfrika.API.Models;

namespace PayAfrika.API.Controllers;

[ApiController]
[Route("api/admin/withdrawals")]
[Authorize(Roles = "admin")]
public class AdminWithdrawalsController : ControllerBase
{
    private readonly AppDbContext _db;

    public AdminWithdrawalsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("stats")]
    public async Task<ActionResult<WithdrawalStatsResponse>> GetStats()
    {
        var today = DateTime.UtcNow.Date;
        var tomorrow = today.AddDays(1);

        var completedTimings = await _db.Withdrawals
            .Where(w => w.Status == "paid" && w.PaidAt != null)
            .Select(w => new { w.CreatedAt, PaidAt = w.PaidAt!.Value })
            .ToListAsync();
        var avgTime = completedTimings.Any()
            ? completedTimings.Average(w => (w.PaidAt - w.CreatedAt).TotalHours)
            : 0;

        return Ok(new WithdrawalStatsResponse
        {
            PendingWithdrawals = await _db.Withdrawals.CountAsync(w => w.Status == "pending"),
            ApprovedToday = await _db.Withdrawals.CountAsync(w => w.Status == "approved" && w.ApprovedAt >= today),
            RejectedToday = await _db.Withdrawals.CountAsync(w => w.Status == "rejected" && w.UpdatedAt >= today),
            CompletedToday = await _db.Withdrawals.CountAsync(w => w.Status == "completed" && w.PaidAt >= today),
            TotalWithdrawalValue = await _db.Withdrawals.Where(w => w.Status == "completed").SumAsync(w => w.Amount),
            PendingValue = await _db.Withdrawals.Where(w => w.Status == "pending").SumAsync(w => w.Amount + w.Fee),
            AverageProcessingTimeHours = Math.Round(avgTime, 1),
        });
    }

    [HttpGet]
    public async Task<ActionResult<WithdrawalListResponse>> GetWithdrawals(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20,
        [FromQuery] string? status = null,
        [FromQuery] string? search = null,
        [FromQuery] string? bank = null,
        [FromQuery] decimal? minAmount = null,
        [FromQuery] decimal? maxAmount = null,
        [FromQuery] DateTime? dateFrom = null,
        [FromQuery] DateTime? dateTo = null)
    {
        var query = _db.Withdrawals
            .Include(w => w.User)
            .Include(w => w.ProcessedBy)
            .AsQueryable();

        if (!string.IsNullOrEmpty(status))
            query = query.Where(w => w.Status == status);

        if (!string.IsNullOrEmpty(search))
            query = query.Where(w =>
                w.Reference.Contains(search) ||
                w.User.FullName.Contains(search) ||
                w.User.Email.Contains(search) ||
                w.BankName.Contains(search));

        if (!string.IsNullOrEmpty(bank))
            query = query.Where(w => w.BankName.Contains(bank));

        if (minAmount.HasValue)
            query = query.Where(w => w.Amount >= minAmount.Value);

        if (maxAmount.HasValue)
            query = query.Where(w => w.Amount <= maxAmount.Value);

        if (dateFrom.HasValue)
            query = query.Where(w => w.CreatedAt >= dateFrom.Value);

        if (dateTo.HasValue)
            query = query.Where(w => w.CreatedAt <= dateTo.Value);

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
        var withdrawal = await _db.Withdrawals
            .Include(w => w.User)
            .Include(w => w.ProcessedBy)
            .FirstOrDefaultAsync(w => w.Id == id);

        if (withdrawal == null)
            return NotFound(new { error = "Withdrawal not found." });

        return Ok(MapWithdrawal(withdrawal));
    }

    [HttpPost("{id}/approve")]
    public async Task<ActionResult> ApproveWithdrawal(Guid id)
    {
        var adminId = GetUserId();
        var withdrawal = await _db.Withdrawals
            .Include(w => w.User)
            .FirstOrDefaultAsync(w => w.Id == id);

        if (withdrawal == null)
            return NotFound(new { error = "Withdrawal not found." });

        if (withdrawal.Status != "pending")
            return BadRequest(new { error = "Withdrawal is not pending." });

        withdrawal.Status = "approved";
        withdrawal.ProcessedById = adminId;
        withdrawal.ApprovedAt = DateTime.UtcNow;
        withdrawal.UpdatedAt = DateTime.UtcNow;

        _db.ActivityLogs.Add(new ActivityLog
        {
            UserId = withdrawal.UserId,
            Action = "Withdrawal Approved",
            Category = "withdrawal",
            Details = System.Text.Json.JsonSerializer.Serialize(new
            {
                amount = withdrawal.Amount,
                currency = withdrawal.Currency,
                reference = withdrawal.Reference,
                title = "Withdrawal Approved",
                message = $"Your withdrawal of {withdrawal.Currency} {withdrawal.Amount:N2} has been approved and is being processed.",
            }),
        });

        _db.AuditLogs.Add(new AuditLog
        {
            UserId = adminId,
            Action = "Withdrawal Approved",
            Module = "Withdrawals",
            Resource = "Withdrawal",
            ResourceId = withdrawal.Id.ToString(),
            PreviousValue = "pending",
            NewValue = "approved",
            Result = "success",
        });

        await _db.SaveChangesAsync();
        return Ok(new { message = "Withdrawal approved." });
    }

    [HttpPost("{id}/reject")]
    public async Task<ActionResult> RejectWithdrawal(Guid id, [FromBody] RejectWithdrawalRequest request)
    {
        var adminId = GetUserId();
        var withdrawal = await _db.Withdrawals
            .Include(w => w.User)
            .FirstOrDefaultAsync(w => w.Id == id);

        if (withdrawal == null)
            return NotFound(new { error = "Withdrawal not found." });

        if (withdrawal.Status != "pending")
            return BadRequest(new { error = "Withdrawal is not pending." });

        withdrawal.Status = "rejected";
        withdrawal.RejectionCategory = request.Category;
        withdrawal.RejectionReason = request.Reason;
        withdrawal.ProcessedById = adminId;
        withdrawal.UpdatedAt = DateTime.UtcNow;

        // Release reserved balance
        var totalReserved = withdrawal.Amount + withdrawal.Fee;
        var walletBalance = await _db.WalletBalances
            .FirstOrDefaultAsync(b => b.UserId == withdrawal.UserId && b.Currency == withdrawal.Currency);
        if (walletBalance != null)
        {
            walletBalance.ReservedBalance = Math.Max(0, walletBalance.ReservedBalance - totalReserved);
            walletBalance.UpdatedAt = DateTime.UtcNow;
        }

        var legacyWallet = await _db.Wallets.FirstOrDefaultAsync(w => w.UserId == withdrawal.UserId);
        if (legacyWallet != null)
        {
            legacyWallet.Balance += totalReserved;
            legacyWallet.UpdatedAt = DateTime.UtcNow;
        }

        _db.ActivityLogs.Add(new ActivityLog
        {
            UserId = withdrawal.UserId,
            Action = "Withdrawal Rejected",
            Category = "withdrawal",
            Details = System.Text.Json.JsonSerializer.Serialize(new
            {
                amount = withdrawal.Amount,
                currency = withdrawal.Currency,
                reference = withdrawal.Reference,
                reason = request.Reason ?? request.Category,
                title = "Withdrawal Rejected",
                message = $"Your withdrawal request has been declined. Reason: {request.Reason ?? request.Category}",
            }),
        });

        _db.AuditLogs.Add(new AuditLog
        {
            UserId = adminId,
            Action = "Withdrawal Rejected",
            Module = "Withdrawals",
            Resource = "Withdrawal",
            ResourceId = withdrawal.Id.ToString(),
            PreviousValue = "pending",
            NewValue = "rejected",
            Metadata = $"{{\"category\":\"{request.Category}\",\"reason\":\"{request.Reason}\"}}",
            Result = "success",
        });

        await _db.SaveChangesAsync();
        return Ok(new { message = "Withdrawal rejected. Reserved funds released." });
    }

    [HttpPost("{id}/mark-paid")]
    public async Task<ActionResult> MarkAsPaid(Guid id, [FromBody] MarkPaidRequest request)
    {
        var adminId = GetUserId();
        var withdrawal = await _db.Withdrawals
            .Include(w => w.User)
            .FirstOrDefaultAsync(w => w.Id == id);

        if (withdrawal == null)
            return NotFound(new { error = "Withdrawal not found." });

        if (withdrawal.Status != "approved")
            return BadRequest(new { error = "Withdrawal must be approved before marking as paid." });

        var totalDeduction = withdrawal.Amount + withdrawal.Fee;

        // Deduct reserved balance permanently
        var walletBalance = await _db.WalletBalances
            .FirstOrDefaultAsync(b => b.UserId == withdrawal.UserId && b.Currency == withdrawal.Currency);
        if (walletBalance != null)
        {
            walletBalance.ReservedBalance = Math.Max(0, walletBalance.ReservedBalance - totalDeduction);
            walletBalance.Balance = Math.Max(0, walletBalance.Balance - totalDeduction);
            walletBalance.UpdatedAt = DateTime.UtcNow;
        }

        withdrawal.Status = "completed";
        withdrawal.BankPaymentReference = request.BankPaymentReference;
        withdrawal.ProcessedById = adminId;
        withdrawal.PaidAt = DateTime.UtcNow;
        withdrawal.UpdatedAt = DateTime.UtcNow;

        var txnRef = $"WTH-{DateTime.UtcNow:yyyyMMdd}-{withdrawal.Reference}";
        _db.Transactions.Add(new Transaction
        {
            UserId = withdrawal.UserId,
            Type = "withdrawal",
            Amount = withdrawal.Amount,
            Currency = withdrawal.Currency,
            Status = "completed",
            Description = $"Withdrawal to {withdrawal.BankName} - Ref: {withdrawal.Reference}",
            Reference = txnRef,
            CreatedAt = DateTime.UtcNow,
            CompletedAt = DateTime.UtcNow,
        });

        _db.ActivityLogs.Add(new ActivityLog
        {
            UserId = withdrawal.UserId,
            Action = "Withdrawal Completed",
            Category = "withdrawal",
            Details = System.Text.Json.JsonSerializer.Serialize(new
            {
                amount = withdrawal.Amount,
                currency = withdrawal.Currency,
                reference = withdrawal.Reference,
                bank = withdrawal.BankName,
                title = "Withdrawal Completed",
                message = $"Your withdrawal of {withdrawal.Currency} {withdrawal.Amount:N2} has been sent to {withdrawal.BankName}.",
            }),
        });

        _db.AuditLogs.Add(new AuditLog
        {
            UserId = adminId,
            Action = "Withdrawal Paid",
            Module = "Withdrawals",
            Resource = "Withdrawal",
            ResourceId = withdrawal.Id.ToString(),
            PreviousValue = "approved",
            NewValue = "completed",
            Metadata = $"{{\"bankRef\":\"{request.BankPaymentReference}\"}}",
            Result = "success",
        });

        await _db.SaveChangesAsync();
        return Ok(new { message = "Withdrawal marked as paid." });
    }

    [HttpPost("{id}/cancel")]
    public async Task<ActionResult> CancelWithdrawal(Guid id)
    {
        var adminId = GetUserId();
        var withdrawal = await _db.Withdrawals
            .Include(w => w.User)
            .FirstOrDefaultAsync(w => w.Id == id);

        if (withdrawal == null)
            return NotFound(new { error = "Withdrawal not found." });

        if (withdrawal.Status != "pending")
            return BadRequest(new { error = "Only pending withdrawals can be cancelled." });

        var totalReserved = withdrawal.Amount + withdrawal.Fee;
        var walletBalance = await _db.WalletBalances
            .FirstOrDefaultAsync(b => b.UserId == withdrawal.UserId && b.Currency == withdrawal.Currency);
        if (walletBalance != null)
        {
            walletBalance.ReservedBalance = Math.Max(0, walletBalance.ReservedBalance - totalReserved);
            walletBalance.UpdatedAt = DateTime.UtcNow;
        }

        var legacyWallet = await _db.Wallets.FirstOrDefaultAsync(w => w.UserId == withdrawal.UserId);
        if (legacyWallet != null)
        {
            legacyWallet.Balance += totalReserved;
            legacyWallet.UpdatedAt = DateTime.UtcNow;
        }

        withdrawal.Status = "cancelled";
        withdrawal.ProcessedById = adminId;
        withdrawal.UpdatedAt = DateTime.UtcNow;

        _db.AuditLogs.Add(new AuditLog
        {
            UserId = adminId,
            Action = "Withdrawal Cancelled",
            Module = "Withdrawals",
            Resource = "Withdrawal",
            ResourceId = withdrawal.Id.ToString(),
            PreviousValue = "pending",
            NewValue = "cancelled",
            Result = "success",
        });

        await _db.SaveChangesAsync();
        return Ok(new { message = "Withdrawal cancelled. Reserved funds released." });
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
