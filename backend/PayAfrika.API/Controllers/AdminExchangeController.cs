using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PayAfrika.API.Data;
using PayAfrika.API.DTOs;
using PayAfrika.API.Models;

namespace PayAfrika.API.Controllers;

[ApiController]
[Route("api/admin/exchanges")]
[Authorize]
public class AdminExchangeController : ControllerBase
{
    private readonly AppDbContext _db;

    public AdminExchangeController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("stats")]
    public async Task<ActionResult<AdminExchangeStatsResponse>> GetStats()
    {
        var now = DateTime.UtcNow;
        var todayStart = now.Date;

        var todayExchanges = await _db.CurrencyExchanges
            .Where(e => e.CreatedAt >= todayStart)
            .ToListAsync();

        var todaysCount = todayExchanges.Count;
        var totalVolume = todayExchanges.Where(e => e.Status == "completed").Sum(e => e.Amount);
        var totalRevenue = todayExchanges.Where(e => e.Status == "completed").Sum(e => e.Fee);
        var failedCount = todayExchanges.Count(e => e.Status == "failed");
        var avgSize = todaysCount > 0 ? totalVolume / todaysCount : 0;

        var mostTraded = todayExchanges
            .Where(e => e.Status == "completed")
            .GroupBy(e => $"{e.FromCurrency}/{e.ToCurrency}")
            .OrderByDescending(g => g.Count())
            .Select(g => g.Key)
            .FirstOrDefault() ?? "";

        return Ok(new AdminExchangeStatsResponse
        {
            TodaysExchanges = todaysCount,
            TotalFxVolume = totalVolume,
            FxRevenue = totalRevenue,
            AverageExchangeSize = Math.Round(avgSize, 2),
            FailedExchanges = failedCount,
            MostTradedPair = mostTraded,
        });
    }

    [HttpGet]
    public async Task<ActionResult<ExchangeListResponse>> GetAllExchanges(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20,
        [FromQuery] string? search = null,
        [FromQuery] string? status = null,
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null)
    {
        var query = _db.CurrencyExchanges.AsQueryable();

        if (!string.IsNullOrEmpty(status))
            query = query.Where(e => e.Status == status);

        if (from.HasValue)
            query = query.Where(e => e.CreatedAt >= from.Value);

        if (to.HasValue)
            query = query.Where(e => e.CreatedAt <= to.Value);

        if (!string.IsNullOrEmpty(search))
        {
            query = query.Where(e => e.Reference.Contains(search)
                || e.User.FullName.Contains(search));
        }

        var total = await query.CountAsync();
        var exchanges = await query
            .Include(e => e.User)
            .OrderByDescending(e => e.CreatedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        return Ok(new ExchangeListResponse
        {
            Data = exchanges.Select(MapExchange).ToList(),
            Total = total,
            Page = page,
            Limit = limit,
            TotalPages = (int)Math.Ceiling((double)total / limit),
        });
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ExchangeResponse>> GetExchange(Guid id)
    {
        var exchange = await _db.CurrencyExchanges
            .Include(e => e.User)
            .Include(e => e.ReversedBy)
            .Include(e => e.SourceTransaction)
            .Include(e => e.DestTransaction)
            .FirstOrDefaultAsync(e => e.Id == id);

        if (exchange == null) return NotFound(new { error = "Exchange not found." });

        return Ok(MapExchange(exchange));
    }

    [HttpPost("{id}/reverse")]
    public async Task<ActionResult> ReverseExchange(Guid id, [FromBody] ReverseExchangeRequest request)
    {
        var adminId = GetUserId();

        var exchange = await _db.CurrencyExchanges
            .Include(e => e.SourceTransaction)
            .Include(e => e.DestTransaction)
            .FirstOrDefaultAsync(e => e.Id == id);

        if (exchange == null) return NotFound(new { error = "Exchange not found." });
        if (exchange.Status != "completed")
            return BadRequest(new { error = "Only completed exchanges can be reversed." });

        var wallet = await _db.Wallets.FirstAsync(w => w.UserId == exchange.UserId);
        var fromBalance = await _db.WalletBalances.FirstOrDefaultAsync(b => b.UserId == exchange.UserId && b.Currency == exchange.FromCurrency);
        var toBalance = await _db.WalletBalances.FirstOrDefaultAsync(b => b.UserId == exchange.UserId && b.Currency == exchange.ToCurrency);

        var refundAmount = exchange.Amount + exchange.Fee;
        var deductAmount = exchange.ConvertedAmount;

        if (toBalance != null && toBalance.Balance < deductAmount)
            return BadRequest(new { error = "Insufficient destination balance to reverse." });

        if (exchange.FromCurrency == "ZAR") wallet.Balance += refundAmount;
        if (fromBalance != null) { fromBalance.Balance += refundAmount; fromBalance.UpdatedAt = DateTime.UtcNow; }
        if (toBalance != null) { toBalance.Balance -= deductAmount; toBalance.UpdatedAt = DateTime.UtcNow; }

        var refSeq = await _db.Transactions.CountAsync() + 1;
        var reversalRef = $"REV-{DateTime.UtcNow:yyyyMMdd}-{refSeq:D5}";

        _db.Transactions.Add(new Transaction
        {
            UserId = exchange.UserId,
            Type = "exchange",
            Amount = refundAmount,
            Currency = exchange.FromCurrency,
            Status = "completed",
            Description = $"Reversal: {exchange.Reference} - {request.Reason}",
            Reference = reversalRef,
            CreatedAt = DateTime.UtcNow,
            CompletedAt = DateTime.UtcNow,
        });

        _db.Transactions.Add(new Transaction
        {
            UserId = exchange.UserId,
            Type = "exchange",
            Amount = deductAmount,
            Currency = exchange.ToCurrency,
            Status = "completed",
            Description = $"Reversal debit: {exchange.Reference} - {request.Reason}",
            Reference = reversalRef,
            CreatedAt = DateTime.UtcNow,
            CompletedAt = DateTime.UtcNow,
        });

        exchange.Status = "reversed";
        exchange.ReversedById = adminId;
        exchange.ReversedAt = DateTime.UtcNow;
        exchange.ReversalReason = request.Reason;

        await _db.SaveChangesAsync();

        return Ok(new { message = "Exchange reversed successfully.", reference = exchange.Reference });
    }

    private static ExchangeResponse MapExchange(CurrencyExchange e) => new()
    {
        Id = e.Id,
        Reference = e.Reference,
        FromCurrency = e.FromCurrency,
        ToCurrency = e.ToCurrency,
        Amount = e.Amount,
        ConvertedAmount = e.ConvertedAmount,
        Rate = e.Rate,
        Fee = e.Fee,
        FxMargin = e.FxMargin,
        Status = e.Status,
        SourceBalanceBefore = e.SourceWalletBalanceBefore,
        SourceBalanceAfter = e.SourceWalletBalanceAfter,
        DestBalanceBefore = e.DestWalletBalanceBefore,
        DestBalanceAfter = e.DestWalletBalanceAfter,
        Notes = e.Notes,
        CreatedAt = e.CreatedAt,
        CompletedAt = e.CompletedAt,
    };

    private Guid GetUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.Parse(claim!);
    }
}
