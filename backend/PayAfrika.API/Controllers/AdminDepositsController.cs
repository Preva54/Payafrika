using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PayAfrika.API.Data;
using PayAfrika.API.DTOs;
using PayAfrika.API.Models;

namespace PayAfrika.API.Controllers;

[ApiController]
[Route("api/admin/deposits")]
[Authorize(Roles = "admin")]
public class AdminDepositsController : ControllerBase
{
    private readonly AppDbContext _db;

    public AdminDepositsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("stats")]
    public async Task<ActionResult<DepositStatsResponse>> GetStats()
    {
        var today = DateTime.UtcNow.Date;
        var tomorrow = today.AddDays(1);

        var stats = new DepositStatsResponse
        {
            PendingDeposits = await _db.Deposits.CountAsync(d => d.Status == "pending"),
            TodaysDeposits = await _db.Deposits.CountAsync(d => d.CreatedAt >= today && d.CreatedAt < tomorrow),
            ApprovedToday = await _db.Deposits.CountAsync(d => d.Status == "approved" && d.ApprovedAt >= today),
            RejectedToday = await _db.Deposits.CountAsync(d => d.Status == "rejected" && d.UpdatedAt >= today),
            TotalDepositValue = await _db.Deposits.Where(d => d.Status == "approved").SumAsync(d => d.Amount),
            PendingValue = await _db.Deposits.Where(d => d.Status == "pending").SumAsync(d => d.Amount),
        };

        return Ok(stats);
    }

    [HttpGet]
    public async Task<ActionResult<DepositListResponse>> GetDeposits(
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
        var query = _db.Deposits
            .Include(d => d.User)
            .Include(d => d.ApprovedBy)
            .AsQueryable();

        if (!string.IsNullOrEmpty(status))
            query = query.Where(d => d.Status == status);

        if (!string.IsNullOrEmpty(search))
            query = query.Where(d =>
                d.Reference.Contains(search) ||
                d.User.FullName.Contains(search) ||
                d.User.Email.Contains(search));

        if (!string.IsNullOrEmpty(bank))
            query = query.Where(d => d.BankName.Contains(bank));

        if (minAmount.HasValue)
            query = query.Where(d => d.Amount >= minAmount.Value);

        if (maxAmount.HasValue)
            query = query.Where(d => d.Amount <= maxAmount.Value);

        if (dateFrom.HasValue)
            query = query.Where(d => d.CreatedAt >= dateFrom.Value);

        if (dateTo.HasValue)
            query = query.Where(d => d.CreatedAt <= dateTo.Value);

        var total = await query.CountAsync();
        var deposits = await query
            .OrderByDescending(d => d.CreatedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        return Ok(new DepositListResponse
        {
            Data = deposits.Select(MapDeposit).ToList(),
            Total = total,
            Page = page,
            Limit = limit,
            TotalPages = (int)Math.Ceiling(total / (double)limit),
        });
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<DepositResponse>> GetDeposit(Guid id)
    {
        var deposit = await _db.Deposits
            .Include(d => d.User)
            .Include(d => d.ApprovedBy)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (deposit == null)
            return NotFound(new { error = "Deposit not found." });

        var response = MapDeposit(deposit);

        // Duplicate detection
        response.HasDuplicate = await _db.Deposits.AnyAsync(d =>
            d.Id != id &&
            d.UserId == deposit.UserId &&
            d.Amount == deposit.Amount &&
            d.Status == "pending" &&
            d.CreatedAt > deposit.CreatedAt.AddHours(-24));

        if (!string.IsNullOrEmpty(deposit.ReferenceUsed))
        {
            var dupRef = await _db.Deposits.AnyAsync(d =>
                d.Id != id &&
                d.ReferenceUsed == deposit.ReferenceUsed &&
                d.Status == "pending");
            if (dupRef)
            {
                response.HasDuplicate = true;
                response.DuplicateWarning = $"Reference '{deposit.ReferenceUsed}' was used in another pending deposit.";
            }
        }

        return Ok(response);
    }

    [HttpGet("{id}/proof")]
    public async Task<IActionResult> DownloadProof(Guid id)
    {
        var deposit = await _db.Deposits.FirstOrDefaultAsync(d => d.Id == id);
        if (deposit == null || string.IsNullOrEmpty(deposit.ProofData))
            return NotFound(new { error = "Proof not found." });

        var bytes = Convert.FromBase64String(deposit.ProofData);
        return File(bytes, deposit.ProofContentType ?? "application/octet-stream", deposit.ProofFileName ?? "proof");
    }

    [HttpPost("{id}/approve")]
    public async Task<ActionResult> ApproveDeposit(Guid id)
    {
        var adminId = GetUserId();
        var admin = await _db.Users.FindAsync(adminId);
        var deposit = await _db.Deposits
            .Include(d => d.User)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (deposit == null)
            return NotFound(new { error = "Deposit not found." });

        if (deposit.Status != "pending")
            return BadRequest(new { error = "Deposit is not pending." });

        deposit.Status = "approved";
        deposit.ApprovedById = adminId;
        deposit.ApprovedAt = DateTime.UtcNow;
        deposit.UpdatedAt = DateTime.UtcNow;

        var wallet = await _db.Wallets.FirstOrDefaultAsync(w => w.UserId == deposit.UserId);
        if (wallet != null)
        {
            wallet.Balance += deposit.Amount;
            wallet.UpdatedAt = DateTime.UtcNow;
        }

        var balance = await _db.WalletBalances
            .FirstOrDefaultAsync(b => b.UserId == deposit.UserId && b.Currency == deposit.Currency);
        if (balance != null)
        {
            balance.Balance += deposit.Amount;
            balance.UpdatedAt = DateTime.UtcNow;
        }

        var txnRef = $"DEP-{DateTime.UtcNow:yyyyMMdd}-{deposit.Reference}";
        _db.Transactions.Add(new Transaction
        {
            UserId = deposit.UserId,
            Type = "deposit",
            Amount = deposit.Amount,
            Currency = deposit.Currency,
            Status = "completed",
            Description = $"Manual deposit approved - Ref: {deposit.Reference}",
            Reference = txnRef,
            CreatedAt = DateTime.UtcNow,
            CompletedAt = DateTime.UtcNow,
        });

        // Create in-app notification
        _db.ActivityLogs.Add(new ActivityLog
        {
            UserId = deposit.UserId,
            Action = "Deposit Approved",
            Category = "deposit",
            Details = System.Text.Json.JsonSerializer.Serialize(new
            {
                amount = deposit.Amount,
                currency = deposit.Currency,
                reference = deposit.Reference,
                title = "Deposit Approved",
                message = $"Your wallet has been credited. Amount: R {deposit.Amount:N2}. Reference: {deposit.Reference}",
            }),
        });

        _db.AuditLogs.Add(new AuditLog
        {
            UserId = adminId,
            Action = "Deposit Approved",
            Module = "Deposits",
            Resource = "Deposit",
            ResourceId = deposit.Id.ToString(),
            PreviousValue = "pending",
            NewValue = "approved",
            Result = "success",
        });

        await _db.SaveChangesAsync();
        return Ok(new { message = "Deposit approved successfully." });
    }

    [HttpPost("{id}/reject")]
    public async Task<ActionResult> RejectDeposit(Guid id, [FromBody] RejectDepositRequest request)
    {
        var adminId = GetUserId();
        var admin = await _db.Users.FindAsync(adminId);
        var deposit = await _db.Deposits.Include(d => d.User).FirstOrDefaultAsync(d => d.Id == id);

        if (deposit == null)
            return NotFound(new { error = "Deposit not found." });

        if (deposit.Status != "pending")
            return BadRequest(new { error = "Deposit is not pending." });

        deposit.Status = "rejected";
        deposit.RejectionCategory = request.Category;
        deposit.RejectionReason = request.Reason;
        deposit.ApprovedById = adminId;
        deposit.ApprovedAt = DateTime.UtcNow;
        deposit.UpdatedAt = DateTime.UtcNow;

        // Create in-app notification
        _db.ActivityLogs.Add(new ActivityLog
        {
            UserId = deposit.UserId,
            Action = "Deposit Rejected",
            Category = "deposit",
            Details = System.Text.Json.JsonSerializer.Serialize(new
            {
                amount = deposit.Amount,
                currency = deposit.Currency,
                reference = deposit.Reference,
                reason = request.Reason ?? request.Category,
                title = "Deposit Rejected",
                message = $"Your deposit could not be verified. Reason: {request.Reason ?? request.Category}",
            }),
        });

        _db.AuditLogs.Add(new AuditLog
        {
            UserId = adminId,
            Action = "Deposit Rejected",
            Module = "Deposits",
            Resource = "Deposit",
            ResourceId = deposit.Id.ToString(),
            PreviousValue = "pending",
            NewValue = "rejected",
            Metadata = $"{{\"category\":\"{request.Category}\",\"reason\":\"{request.Reason}\"}}",
            Result = "success",
        });

        await _db.SaveChangesAsync();
        return Ok(new { message = "Deposit rejected." });
    }

    [HttpPost("{id}/request-info")]
    public async Task<ActionResult> RequestMoreInfo(Guid id)
    {
        var adminId = GetUserId();
        var deposit = await _db.Deposits.Include(d => d.User).FirstOrDefaultAsync(d => d.Id == id);
        if (deposit == null)
            return NotFound(new { error = "Deposit not found." });

        deposit.Status = "processing";
        deposit.UpdatedAt = DateTime.UtcNow;

        _db.ActivityLogs.Add(new ActivityLog
        {
            UserId = deposit.UserId,
            Action = "More Information Requested",
            Category = "deposit",
            Details = System.Text.Json.JsonSerializer.Serialize(new
            {
                reference = deposit.Reference,
                title = "Additional Information Needed",
                message = $"We need more information to verify your deposit (Ref: {deposit.Reference}). Please contact support.",
            }),
        });

        await _db.SaveChangesAsync();
        return Ok(new { message = "More information requested." });
    }

    private DepositResponse MapDeposit(Deposit d)
    {
        return new DepositResponse
        {
            Id = d.Id,
            UserId = d.UserId,
            Reference = d.Reference,
            Amount = d.Amount,
            Currency = d.Currency,
            Status = d.Status,
            BankName = d.BankName,
            AccountHolderName = d.AccountHolderName,
            ReferenceUsed = d.ReferenceUsed,
            TransferDate = d.TransferDate,
            TransferTime = d.TransferTime,
            ProofUrl = d.ProofUrl,
            ProofFileName = d.ProofFileName,
            ProofContentType = d.ProofContentType,
            Notes = d.Notes,
            RejectionReason = d.RejectionReason,
            RejectionCategory = d.RejectionCategory,
            ApprovedByName = d.ApprovedBy?.FullName,
            ApprovedAt = d.ApprovedAt,
            CreatedAt = d.CreatedAt,
            UserName = d.User?.FullName ?? "",
            UserEmail = d.User?.Email ?? "",
        };
    }

    private Guid GetUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.Parse(claim!);
    }
}
