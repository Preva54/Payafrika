using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PayAfrika.API.Data;
using PayAfrika.API.DTOs;
using PayAfrika.API.Services;

namespace PayAfrika.API.Controllers;

[ApiController]
[Route("api/admin/transfers")]
[Authorize(Roles = "admin")]
public class AdminTransfersController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITransferService _transferService;

    public AdminTransfersController(AppDbContext db, ITransferService transferService)
    {
        _db = db;
        _transferService = transferService;
    }

    private Guid GetAdminId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.Parse(claim!);
    }

    [HttpGet]
    public async Task<ActionResult<List<AdminTransferResponse>>> GetAll(
        [FromQuery] string? status,
        [FromQuery] string? country,
        [FromQuery] string? search,
        [FromQuery] int limit = 200)
    {
        var query = _db.BankTransfers
            .Include(t => t.User)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(t => t.Status == status);

        if (!string.IsNullOrWhiteSpace(country))
            query = query.Where(t => t.CountryCode == country.ToUpper());

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(t =>
                t.Reference.Contains(term) ||
                t.AccountNumber.Contains(term) ||
                t.AccountName!.Contains(term) ||
                t.User!.FullName.Contains(term) ||
                t.User!.Email.Contains(term));
        }

        var transfers = await query
            .OrderByDescending(t => t.CreatedAt)
            .Take(Math.Min(limit, 500))
            .ToListAsync();

        return Ok(transfers.Select(t => new AdminTransferResponse
        {
            Id = t.Id,
            UserId = t.UserId,
            UserName = t.User?.FullName ?? string.Empty,
            UserEmail = t.User?.Email ?? string.Empty,
            Reference = t.Reference,
            CountryCode = t.CountryCode,
            BankName = t.BankName,
            AccountNumber = MaskAccount(t.AccountNumber),
            AccountName = t.AccountName,
            Amount = t.Amount,
            Currency = t.Currency,
            Fee = t.Fee,
            Vat = t.Vat,
            TotalDebit = t.TotalDebit,
            Narration = t.Narration,
            Status = t.Status,
            FailureReason = t.FailureReason,
            ProviderRequestId = t.ProviderRequestId,
            ReversalReason = t.ReversalReason,
            ReversedAt = t.ReversedAt,
            CompletedAt = t.CompletedAt,
            CreatedAt = t.CreatedAt,
        }).ToList());
    }

    [HttpGet("stats")]
    public async Task<ActionResult<TransferStatsResponse>> GetStats()
    {
        var transfers = await _db.BankTransfers.ToListAsync();

        return Ok(new TransferStatsResponse
        {
            TotalTransfers = transfers.Count,
            Successful = transfers.Count(t => t.Status == "successful"),
            Pending = transfers.Count(t => t.Status is "pending" or "processing"),
            Failed = transfers.Count(t => t.Status == "failed"),
            Reversed = transfers.Count(t => t.Status == "reversed"),
            TotalValue = transfers.Sum(t => t.Amount),
            FeesCollected = transfers.Where(t => t.Status == "successful").Sum(t => t.Fee + t.Vat),
            FailedToday = transfers.Count(t => t.Status == "failed" && t.CreatedAt >= DateTime.UtcNow.Date),
        });
    }

    [HttpPost("{id}/reverse")]
    public async Task<ActionResult<BankTransferResponse>> Reverse(Guid id, [FromBody] ReverseTransferRequest request)
    {
        try
        {
            var transfer = await _transferService.ReverseAsync(GetAdminId(), id, request?.Reason, isAdmin: true);
            if (transfer == null) return NotFound(new { error = "Transfer not found." });
            return Ok(transfer);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("settings")]
    public async Task<ActionResult<TransferSettingsResponse>> GetSettings()
    {
        var values = await _db.PlatformSettings
            .Where(s => s.Category == "transfers")
            .ToDictionaryAsync(s => s.Key, s => s.Value);

        return Ok(new TransferSettingsResponse
        {
            FeeType = values.GetValueOrDefault("fee_type", "percent"),
            FeeRate = ParseDecimal(values.GetValueOrDefault("fee_rate", "1.0"), 1.0m),
            FeeFlat = ParseDecimal(values.GetValueOrDefault("fee_flat", "10"), 10m),
            VatRate = ParseDecimal(values.GetValueOrDefault("vat_rate", "7.5"), 7.5m),
            MinAmount = ParseDecimal(values.GetValueOrDefault("min_amount", "100"), 100m),
            MaxAmount = ParseDecimal(values.GetValueOrDefault("max_amount", "500000"), 500000m),
            DailyLimit = ParseDecimal(values.GetValueOrDefault("daily_limit", "5000000"), 5000000m),
            MaxDailyTransfers = (int)ParseDecimal(values.GetValueOrDefault("max_daily_transfers", "50"), 50m),
            BlacklistedAccounts = values.GetValueOrDefault("blacklist", string.Empty),
            EstimatedArrival = values.GetValueOrDefault("estimated_arrival", "Instant"),
        });
    }

    [HttpPut("settings")]
    public async Task<ActionResult<TransferSettingsResponse>> UpdateSettings([FromBody] UpdateTransferSettingsRequest request)
    {
        var adminName = User.FindFirst(ClaimTypes.Name)?.Value ?? User.FindFirst(ClaimTypes.Email)?.Value ?? "Admin";
        var adminId = GetAdminId();

        var updates = new Dictionary<string, string>
        {
            ["fee_type"] = request.FeeType ?? string.Empty,
            ["fee_rate"] = request.FeeRate?.ToString(System.Globalization.CultureInfo.InvariantCulture) ?? string.Empty,
            ["fee_flat"] = request.FeeFlat?.ToString(System.Globalization.CultureInfo.InvariantCulture) ?? string.Empty,
            ["vat_rate"] = request.VatRate?.ToString(System.Globalization.CultureInfo.InvariantCulture) ?? string.Empty,
            ["min_amount"] = request.MinAmount?.ToString(System.Globalization.CultureInfo.InvariantCulture) ?? string.Empty,
            ["max_amount"] = request.MaxAmount?.ToString(System.Globalization.CultureInfo.InvariantCulture) ?? string.Empty,
            ["daily_limit"] = request.DailyLimit?.ToString(System.Globalization.CultureInfo.InvariantCulture) ?? string.Empty,
            ["max_daily_transfers"] = request.MaxDailyTransfers?.ToString() ?? string.Empty,
            ["blacklist"] = request.BlacklistedAccounts ?? string.Empty,
            ["estimated_arrival"] = request.EstimatedArrival ?? string.Empty,
        };

        var existing = await _db.PlatformSettings
            .Where(s => s.Category == "transfers")
            .ToListAsync();

        foreach (var (key, value) in updates)
        {
            var setting = existing.FirstOrDefault(s => s.Key == key);
            if (setting == null)
            {
                _db.PlatformSettings.Add(new Models.PlatformSetting
                {
                    Category = "transfers",
                    Key = key,
                    Value = value,
                    Description = $"Transfer setting: {key}",
                    UpdatedById = adminId,
                });
            }
            else
            {
                setting.Value = value;
                setting.UpdatedById = adminId;
                setting.UpdatedAt = DateTime.UtcNow;
            }

            _db.SettingChangeLogs.Add(new Models.SettingChangeLog
            {
                Category = "transfers",
                Key = key,
                OldValue = existing.FirstOrDefault(s => s.Key == key)?.Value ?? string.Empty,
                NewValue = value,
                ChangedById = adminId,
                ChangedByName = adminName,
                ChangedAt = DateTime.UtcNow,
            });
        }

        await _db.SaveChangesAsync();

        return await GetSettings();
    }

    private static string MaskAccount(string accountNumber)
    {
        if (string.IsNullOrEmpty(accountNumber)) return string.Empty;
        return accountNumber.Length >= 4
            ? $"****{accountNumber[^4..]}"
            : $"****{accountNumber}";
    }

    private static decimal ParseDecimal(string? raw, decimal fallback)
        => decimal.TryParse(raw, System.Globalization.CultureInfo.InvariantCulture, out var value) ? value : fallback;
}
