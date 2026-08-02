using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PayAfrika.API.Data;
using PayAfrika.API.DTOs;
using PayAfrika.API.Models;
using PayAfrika.API.Services;

namespace PayAfrika.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ExchangeController : ControllerBase
{
    private readonly AppDbContext _db;

    public ExchangeController(AppDbContext db)
    {
        _db = db;
    }

    [HttpPost("quote")]
    public async Task<ActionResult<ExchangeQuoteResponse>> GetQuote([FromBody] ExchangeSubmitRequest request)
    {
        if (request.FromCurrency == request.ToCurrency)
            return BadRequest(new { error = "From and To currencies must be different." });

        var amount = request.Amount;
        var rate = ExchangeRateService.Convert(1, request.FromCurrency, request.ToCurrency);
        var convertedAmount = amount * rate;
        var fee = amount * 0.005m;
        var fxMargin = amount * 0.005m;

        return Ok(new ExchangeQuoteResponse
        {
            Amount = amount,
            ConvertedAmount = Math.Round(convertedAmount, 2),
            Rate = Math.Round(rate, 8),
            Fee = Math.Round(fee, 2),
            FxMargin = Math.Round(fxMargin, 2),
            FromCurrency = request.FromCurrency,
            ToCurrency = request.ToCurrency,
            RateTimestamp = ExchangeRateService.LastUpdated,
        });
    }

    [HttpPost]
    public async Task<ActionResult<ExchangeResponse>> ExecuteExchange([FromBody] ExchangeSubmitRequest request)
    {
        var userId = GetUserId();

        if (request.FromCurrency == request.ToCurrency)
            return BadRequest(new { error = "From and To currencies must be different." });

        var user = await _db.Users.FirstAsync(u => u.Id == userId);
        if (!KycPolicy.CanUseExchange(user))
            return BadRequest(new { error = KycPolicy.RequirementMessage(KycPolicy.LevelBasic) });

        var wallet = await _db.Wallets.FirstAsync(w => w.UserId == userId);
        var fromBalance = await _db.WalletBalances.FirstOrDefaultAsync(b => b.UserId == userId && b.Currency == request.FromCurrency);
        var toBalance = await _db.WalletBalances.FirstOrDefaultAsync(b => b.UserId == userId && b.Currency == request.ToCurrency);

        if (toBalance == null)
        {
            toBalance = new WalletBalance
            {
                UserId = userId,
                Currency = request.ToCurrency,
                Balance = 0,
                ReservedBalance = 0,
            };
            _db.WalletBalances.Add(toBalance);
        }

        var rate = ExchangeRateService.Convert(1, request.FromCurrency, request.ToCurrency);
        var convertedAmount = request.Amount * rate;
        var fee = request.Amount * 0.005m;
        var fxMargin = request.Amount * 0.005m;
        var totalDeduction = request.Amount + fee;

        if (request.FromCurrency == "ZAR" && wallet.Balance < totalDeduction)
            return BadRequest(new { error = "Insufficient balance." });
        if (fromBalance != null && fromBalance.Balance < totalDeduction)
            return BadRequest(new { error = "Insufficient balance in source currency." });

        var pair = await _db.CurrencyPairs.FirstOrDefaultAsync(p =>
            p.BaseCurrency == request.FromCurrency && p.QuoteCurrency == request.ToCurrency);
        if (pair != null)
        {
            if (pair.DailySellLimit > 0)
            {
                var todayStart = DateTime.UtcNow.Date;
                var todayVolume = await _db.CurrencyExchanges
                    .Where(e => e.UserId == userId && e.FromCurrency == request.FromCurrency
                        && e.CreatedAt >= todayStart && e.Status == "completed")
                    .SumAsync(e => e.Amount);
                if (todayVolume + request.Amount > pair.DailySellLimit)
                    return BadRequest(new { error = "Daily exchange limit exceeded." });
            }
            if (pair.DailyBuyLimit > 0)
            {
                var todayStart = DateTime.UtcNow.Date;
                var todayBuyVolume = await _db.CurrencyExchanges
                    .Where(e => e.UserId == userId && e.ToCurrency == request.FromCurrency
                        && e.CreatedAt >= todayStart && e.Status == "completed")
                    .SumAsync(e => e.Amount);
                if (todayBuyVolume + request.Amount > pair.DailyBuyLimit)
                    return BadRequest(new { error = "Daily buy limit exceeded." });
            }
        }

        var refSeq = await _db.Transactions.CountAsync() + 1;
        var reference = $"EXC-{DateTime.UtcNow:yyyyMMdd}-{refSeq:D5}";

        var sourceBalanceBefore = fromBalance?.Balance ?? (request.FromCurrency == "ZAR" ? wallet.Balance : 0);
        var destBalanceBefore = toBalance.Balance;

        if (request.FromCurrency == "ZAR") wallet.Balance -= totalDeduction;
        if (fromBalance != null) { fromBalance.Balance -= totalDeduction; fromBalance.UpdatedAt = DateTime.UtcNow; }

        toBalance.Balance += convertedAmount;
        toBalance.UpdatedAt = DateTime.UtcNow;

        var sourceTransaction = new Transaction
        {
            UserId = userId,
            Type = "exchange",
            Amount = totalDeduction,
            Currency = request.FromCurrency,
            Status = "completed",
            Description = $"Exchanged {request.Amount} {request.FromCurrency} to {Math.Round(convertedAmount, 2)} {request.ToCurrency}",
            Reference = reference,
            CreatedAt = DateTime.UtcNow,
            CompletedAt = DateTime.UtcNow,
        };
        _db.Transactions.Add(sourceTransaction);

        var destTransaction = new Transaction
        {
            UserId = userId,
            Type = "exchange",
            Amount = Math.Round(convertedAmount, 2),
            Currency = request.ToCurrency,
            Status = "completed",
            Description = $"Received {Math.Round(convertedAmount, 2)} {request.ToCurrency} from exchange",
            Reference = reference,
            CreatedAt = DateTime.UtcNow,
            CompletedAt = DateTime.UtcNow,
        };
        _db.Transactions.Add(destTransaction);

        var exchange = new CurrencyExchange
        {
            UserId = userId,
            Reference = reference,
            FromCurrency = request.FromCurrency,
            ToCurrency = request.ToCurrency,
            Amount = request.Amount,
            ConvertedAmount = Math.Round(convertedAmount, 2),
            Rate = Math.Round(rate, 8),
            Fee = Math.Round(fee, 2),
            FeeCurrency = request.FromCurrency,
            FxMargin = Math.Round(fxMargin, 2),
            Status = "completed",
            SourceWalletBalanceBefore = sourceBalanceBefore,
            SourceWalletBalanceAfter = fromBalance?.Balance ?? (request.FromCurrency == "ZAR" ? wallet.Balance : 0),
            DestWalletBalanceBefore = destBalanceBefore,
            DestWalletBalanceAfter = toBalance.Balance,
            SourceTransaction = sourceTransaction,
            DestTransaction = destTransaction,
            CreatedAt = DateTime.UtcNow,
            CompletedAt = DateTime.UtcNow,
        };
        _db.CurrencyExchanges.Add(exchange);

        await _db.SaveChangesAsync();

        return Ok(new ExchangeResponse
        {
            Id = exchange.Id,
            Reference = exchange.Reference,
            FromCurrency = exchange.FromCurrency,
            ToCurrency = exchange.ToCurrency,
            Amount = exchange.Amount,
            ConvertedAmount = exchange.ConvertedAmount,
            Rate = exchange.Rate,
            Fee = exchange.Fee,
            FxMargin = exchange.FxMargin,
            Status = exchange.Status,
            SourceBalanceBefore = exchange.SourceWalletBalanceBefore,
            SourceBalanceAfter = exchange.SourceWalletBalanceAfter,
            DestBalanceBefore = exchange.DestWalletBalanceBefore,
            DestBalanceAfter = exchange.DestWalletBalanceAfter,
            Notes = exchange.Notes,
            CreatedAt = exchange.CreatedAt,
            CompletedAt = exchange.CompletedAt,
        });
    }

    [HttpGet]
    public async Task<ActionResult<ExchangeListResponse>> GetExchanges([FromQuery] int page = 1, [FromQuery] int limit = 20)
    {
        var userId = GetUserId();

        var query = _db.CurrencyExchanges.Where(e => e.UserId == userId);

        var total = await query.CountAsync();
        var exchanges = await query
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
        var userId = GetUserId();
        var exchange = await _db.CurrencyExchanges.FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId);
        if (exchange == null) return NotFound(new { error = "Exchange not found." });

        return Ok(MapExchange(exchange));
    }

    [HttpGet("rates")]
    [AllowAnonymous]
    public async Task<ActionResult<List<ExchangeRateResponse>>> GetRates()
    {
        var dbRates = await _db.ExchangeRates.Where(r => r.IsActive).ToListAsync();

        if (dbRates.Count != 0)
        {
            return Ok(dbRates.Select(r => new ExchangeRateResponse
            {
                From = r.BaseCurrency,
                To = r.QuoteCurrency,
                Rate = r.MidMarketRate,
                Spread = r.Spread,
                LastUpdated = (r.UpdatedAt ?? r.CreatedAt).ToString("g"),
            }).ToList());
        }

        var pairs = ExchangeRateService.GetExchangePairs();
        var lastUpdated = ExchangeRateService.LastUpdated.ToString("g");

        return Ok(pairs.Select(p =>
        {
            var rate = ExchangeRateService.GetZARRate(p.From) / ExchangeRateService.GetZARRate(p.To);
            return new ExchangeRateResponse { From = p.From, To = p.To, Rate = Math.Round(rate, 4), Spread = Math.Round(rate * 0.01m, 4), LastUpdated = lastUpdated };
        }).ToList());
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
