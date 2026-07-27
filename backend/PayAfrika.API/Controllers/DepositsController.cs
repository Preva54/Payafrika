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
public class DepositsController : ControllerBase
{
    private readonly AppDbContext _db;

    public DepositsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("reference")]
    public async Task<ActionResult<DepositReferenceResponse>> GenerateReference()
    {
        var count = await _db.Deposits.CountAsync() + 1;
        var refStr = $"PAF-{100000 + count}";
        return Ok(new DepositReferenceResponse { Reference = refStr });
    }

    [HttpPost]
    public async Task<ActionResult<DepositResponse>> SubmitDeposit([FromBody] SubmitDepositRequest request)
    {
        var userId = GetUserId();

        if (request.Amount <= 0)
            return BadRequest(new { error = "Amount must be positive." });

        var count = await _db.Deposits.CountAsync() + 1;
        var reference = $"PAF-{100000 + count}";

        var deposit = new Deposit
        {
            UserId = userId,
            Reference = reference,
            Amount = request.Amount,
            Currency = request.Currency,
            Status = "pending",
            BankName = request.BankName,
            AccountHolderName = request.AccountHolderName,
            ReferenceUsed = request.ReferenceUsed,
            TransferDate = request.TransferDate,
            TransferTime = request.TransferTime,
            Notes = request.Notes,
        };

        _db.Deposits.Add(deposit);

        _db.AuditLogs.Add(new AuditLog
        {
            UserId = userId,
            Action = "Deposit Submitted",
            Module = "Deposits",
            Resource = "Deposit",
            ResourceId = deposit.Id.ToString(),
            NewValue = $"Amount: {request.Amount} {request.Currency}, Ref: {reference}",
            Result = "success",
        });

        await _db.SaveChangesAsync();

        return Ok(MapDeposit(deposit));
    }

    [HttpPost("{id}/proof")]
    public async Task<ActionResult> UploadProof(Guid id, IFormFile file)
    {
        var userId = GetUserId();
        var deposit = await _db.Deposits.FirstOrDefaultAsync(d => d.Id == id && d.UserId == userId);

        if (deposit == null)
            return NotFound(new { error = "Deposit not found." });

        if (file == null || file.Length == 0)
            return BadRequest(new { error = "No file provided." });

        var maxSize = 10 * 1024 * 1024;
        if (file.Length > maxSize)
            return BadRequest(new { error = "File too large. Max 10MB." });

        var allowed = new[] { "application/pdf", "image/jpeg", "image/png" };
        if (!allowed.Contains(file.ContentType))
            return BadRequest(new { error = "Invalid file type. Only PDF, JPG, PNG." });

        using var ms = new MemoryStream();
        await file.CopyToAsync(ms);
        deposit.ProofData = Convert.ToBase64String(ms.ToArray());
        deposit.ProofFileName = file.FileName;
        deposit.ProofContentType = file.ContentType;
        deposit.ProofUrl = $"/api/deposits/{id}/proof";
        deposit.UpdatedAt = DateTime.UtcNow;

        _db.AuditLogs.Add(new AuditLog
        {
            UserId = userId,
            Action = "Deposit Proof Uploaded",
            Module = "Deposits",
            Resource = "Deposit",
            ResourceId = deposit.Id.ToString(),
            NewValue = $"File: {file.FileName}",
            Result = "success",
        });

        await _db.SaveChangesAsync();
        return Ok(new { message = "Proof uploaded successfully." });
    }

    [HttpGet("{id}/proof")]
    public async Task<IActionResult> DownloadProof(Guid id)
    {
        var userId = GetUserId();
        var deposit = await _db.Deposits.FirstOrDefaultAsync(d => d.Id == id && d.UserId == userId);

        if (deposit == null || string.IsNullOrEmpty(deposit.ProofData))
            return NotFound(new { error = "Proof not found." });

        var bytes = Convert.FromBase64String(deposit.ProofData);
        return File(bytes, deposit.ProofContentType ?? "application/octet-stream", deposit.ProofFileName ?? "proof");
    }

    [HttpGet]
    public async Task<ActionResult<DepositListResponse>> GetMyDeposits(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20,
        [FromQuery] string? status = null)
    {
        var userId = GetUserId();
        var query = _db.Deposits.Where(d => d.UserId == userId);

        if (!string.IsNullOrEmpty(status))
            query = query.Where(d => d.Status == status);

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
        var userId = GetUserId();
        var deposit = await _db.Deposits
            .Include(d => d.User)
            .Include(d => d.ApprovedBy)
            .FirstOrDefaultAsync(d => d.Id == id && d.UserId == userId);

        if (deposit == null)
            return NotFound(new { error = "Deposit not found." });

        return Ok(MapDeposit(deposit));
    }

    [HttpPost("{id}/read-notification")]
    public async Task<ActionResult> MarkNotificationRead(Guid id)
    {
        var userId = GetUserId();
        var deposit = await _db.Deposits.FirstOrDefaultAsync(d => d.Id == id && d.UserId == userId);
        if (deposit == null)
            return NotFound(new { error = "Deposit not found." });
        return Ok(new { message = "Notification marked as read." });
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
