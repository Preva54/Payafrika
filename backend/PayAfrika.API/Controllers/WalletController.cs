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
public class WalletController : ControllerBase
{
    private readonly AppDbContext _db;

    public WalletController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<Wallet>> GetWallet()
    {
        var userId = GetUserId();
        var wallet = await _db.Wallets.FirstOrDefaultAsync(w => w.UserId == userId);
        if (wallet == null) return NotFound(new { error = "Wallet not found." });
        return Ok(wallet);
    }

    [HttpGet("overview")]
    public async Task<ActionResult<WalletOverviewResponse>> GetOverview()
    {
        var userId = GetUserId();
        var now = DateTime.UtcNow;
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var transactions = await _db.Transactions.Where(t => t.UserId == userId).ToListAsync();
        var balances = await _db.WalletBalances.Where(w => w.UserId == userId).ToListAsync();

        var totalBalance = balances.Sum(b => b.Balance) + (await _db.Wallets.Where(w => w.UserId == userId).SumAsync(w => w.Balance));
        var pendingTxns = transactions.Where(t => t.Status == "pending").Sum(t => t.Amount);
        var monthlyIncome = transactions.Where(t => t.CreatedAt >= monthStart && (t.Type == "deposit" || t.Type == "payment")).Sum(t => t.Amount);
        var monthlySpending = transactions.Where(t => t.CreatedAt >= monthStart && (t.Type == "withdrawal" || t.Type == "transfer" || t.Type == "exchange")).Sum(t => t.Amount);

        return Ok(new WalletOverviewResponse
        {
            TotalBalance = totalBalance,
            AvailableBalance = totalBalance - pendingTxns,
            PendingBalance = pendingTxns,
            MonthlyCashFlow = monthlyIncome - monthlySpending,
            MonthlyIncome = monthlyIncome,
            MonthlySpending = monthlySpending,
        });
    }

    [HttpGet("balances")]
    public async Task<ActionResult<List<CurrencyWalletResponse>>> GetBalances()
    {
        var userId = GetUserId();
        var balances = await _db.WalletBalances.Where(w => w.UserId == userId).ToListAsync();
        var transactions = await _db.Transactions
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();

        var results = balances.Select(b =>
        {
            var currencyTxns = transactions.Where(t => t.Currency == b.Currency).ToList();
            var recentTxns = currencyTxns.Where(t => t.CreatedAt >= DateTime.UtcNow.AddDays(-90)).ToList();
            var oldTxns = currencyTxns.Where(t => t.CreatedAt < DateTime.UtcNow.AddDays(-90)).ToList();

            var recentNet = recentTxns.Sum(t => t.Type is "deposit" or "payment" or "exchange" ? t.Amount : -t.Amount);
            var oldNet = oldTxns.Sum(t => t.Type is "deposit" or "payment" or "exchange" ? t.Amount : -t.Amount);
            var changePercent = oldNet != 0
                ? Math.Round(((recentNet - oldNet) / Math.Abs(oldNet)) * 100, 1)
                : 0m;

            var dailyBalances = Enumerable.Range(0, 7).Select(i =>
            {
                var day = DateTime.UtcNow.AddDays(-(6 - i));
                var dayTxns = currencyTxns.Where(t => t.CreatedAt.Date <= day.Date).ToList();
                var net = dayTxns.Sum(t => t.Type is "deposit" or "payment" ? t.Amount : -t.Amount);
                return b.Balance - net;
            }).ToList();

            return new CurrencyWalletResponse
            {
                Currency = b.Currency,
                Flag = ExchangeRateService.GetFlag(b.Currency),
                Balance = b.Balance,
                ZARValue = b.Balance * ExchangeRateService.GetZARRate(b.Currency),
                ChangePercent = changePercent,
                MiniGraph = dailyBalances,
            };
        }).ToList();

        if (!results.Any(r => r.Currency == "ZAR"))
        {
            var zar = await _db.Wallets.FirstOrDefaultAsync(w => w.UserId == userId);
            var zarTxns = transactions.Where(t => t.Currency == "ZAR").ToList();
            var zarDaily = Enumerable.Range(0, 7).Select(i =>
            {
                var day = DateTime.UtcNow.AddDays(-(6 - i));
                var dayTxns = zarTxns.Where(t => t.CreatedAt.Date <= day.Date).ToList();
                var net = dayTxns.Sum(t => t.Type is "deposit" or "payment" ? t.Amount : -t.Amount);
                return (zar?.Balance ?? 0) - net;
            }).ToList();

            results.Insert(0, new CurrencyWalletResponse
            {
                Currency = "ZAR", Flag = "🇿🇦", Balance = zar?.Balance ?? 0,
                ZARValue = zar?.Balance ?? 0, ChangePercent = 0.5m,
                MiniGraph = zarDaily,
            });
        }

        return Ok(results);
    }

    [HttpPost("deposit")]
    public async Task<ActionResult<Wallet>> Deposit([FromBody] WalletActionRequest request)
    {
        if (request.Amount <= 0) return BadRequest(new { error = "Amount must be positive." });
        var userId = GetUserId();

        var wallet = await _db.Wallets.FirstAsync(w => w.UserId == userId);
        wallet.Balance += request.Amount;
        wallet.UpdatedAt = DateTime.UtcNow;

        var balance = await _db.WalletBalances.FirstOrDefaultAsync(b => b.UserId == userId && b.Currency == request.Currency);
        if (balance != null) { balance.Balance += request.Amount; balance.UpdatedAt = DateTime.UtcNow; }

        var refSeq = await _db.Transactions.CountAsync(t => t.UserId == userId) + 1;
        _db.Transactions.Add(new Transaction
        {
            UserId = userId, Type = "deposit", Amount = request.Amount,
            Currency = request.Currency, Status = "completed",
            Description = request.Description ?? $"Deposit via {request.Method ?? "wallet"}",
            Reference = $"DEP-{DateTime.UtcNow:yyyyMMdd}-{refSeq:D5}",
        });

        await _db.SaveChangesAsync();
        return Ok(wallet);
    }

    [HttpPost("withdraw")]
    public async Task<ActionResult<Wallet>> Withdraw([FromBody] WalletActionRequest request)
    {
        if (request.Amount <= 0) return BadRequest(new { error = "Amount must be positive." });
        var userId = GetUserId();

        var wallet = await _db.Wallets.FirstAsync(w => w.UserId == userId);
        if (wallet.Balance < request.Amount) return BadRequest(new { error = "Insufficient balance." });

        wallet.Balance -= request.Amount;
        wallet.UpdatedAt = DateTime.UtcNow;

        var balance = await _db.WalletBalances.FirstOrDefaultAsync(b => b.UserId == userId && b.Currency == request.Currency);
        if (balance != null) { balance.Balance -= request.Amount; balance.UpdatedAt = DateTime.UtcNow; }

        var refSeq = await _db.Transactions.CountAsync(t => t.UserId == userId) + 1;
        _db.Transactions.Add(new Transaction
        {
            UserId = userId, Type = "withdrawal", Amount = request.Amount,
            Currency = request.Currency, Status = "completed",
            Description = request.Description ?? $"Withdraw to {request.Method ?? "bank"}",
            Reference = $"WTH-{DateTime.UtcNow:yyyyMMdd}-{refSeq:D5}",
        });

        await _db.SaveChangesAsync();
        return Ok(wallet);
    }

    [HttpPost("transfer")]
    public async Task<ActionResult> Transfer([FromBody] TransferRequest request)
    {
        var userId = GetUserId();
        var balance = await _db.WalletBalances.FirstOrDefaultAsync(b => b.UserId == userId && b.Currency == request.FromCurrency);
        var wallet = await _db.Wallets.FirstAsync(w => w.UserId == userId);

        if (request.FromCurrency == "ZAR" && wallet.Balance < request.Amount)
            return BadRequest(new { error = "Insufficient balance." });
        if (balance != null && balance.Balance < request.Amount)
            return BadRequest(new { error = "Insufficient balance." });

        var convertedAmount = ExchangeRateService.Convert(request.Amount, request.FromCurrency, request.ToCurrency);

        if (request.FromCurrency == "ZAR") wallet.Balance -= request.Amount;
        if (balance != null) { balance.Balance -= request.Amount; balance.UpdatedAt = DateTime.UtcNow; }

        var toBalance = await _db.WalletBalances.FirstOrDefaultAsync(b => b.UserId == userId && b.Currency == request.ToCurrency);
        if (toBalance != null) { toBalance.Balance += convertedAmount; toBalance.UpdatedAt = DateTime.UtcNow; }

        var refSeq = await _db.Transactions.CountAsync(t => t.UserId == userId) + 1;
        _db.Transactions.Add(new Transaction
        {
            UserId = userId, Type = "transfer", Amount = request.Amount,
            Currency = request.FromCurrency, Status = "completed",
            Description = $"Transferred {request.Amount} {request.FromCurrency} to {request.ToCurrency}",
            Reference = $"TRF-{DateTime.UtcNow:yyyyMMdd}-{refSeq:D5}",
        });

        await _db.SaveChangesAsync();
        return Ok(new { fromAmount = request.Amount, toAmount = Math.Round(convertedAmount, 2), fromCurrency = request.FromCurrency, toCurrency = request.ToCurrency });
    }

    [HttpPost("exchange")]
    public async Task<ActionResult> Exchange([FromBody] ExchangeRequest request)
    {
        var userId = GetUserId();
        var fromBalance = await _db.WalletBalances.FirstOrDefaultAsync(b => b.UserId == userId && b.Currency == request.FromCurrency);
        var wallet = await _db.Wallets.FirstAsync(w => w.UserId == userId);

        var fee = request.Amount * 0.005m;
        var totalDeduction = request.Amount + fee;

        if (request.FromCurrency == "ZAR" && wallet.Balance < totalDeduction)
            return BadRequest(new { error = "Insufficient balance." });
        if (fromBalance != null && fromBalance.Balance < totalDeduction)
            return BadRequest(new { error = "Insufficient balance." });

        var converted = ExchangeRateService.Convert(request.Amount, request.FromCurrency, request.ToCurrency);
        var spread = request.Amount * (ExchangeRateService.GetZARRate(request.FromCurrency) / ExchangeRateService.GetZARRate(request.ToCurrency)) * 0.01m;

        if (request.FromCurrency == "ZAR") wallet.Balance -= totalDeduction;
        if (fromBalance != null) { fromBalance.Balance -= totalDeduction; fromBalance.UpdatedAt = DateTime.UtcNow; }

        var toBalance = await _db.WalletBalances.FirstOrDefaultAsync(b => b.UserId == userId && b.Currency == request.ToCurrency);
        if (toBalance != null) { toBalance.Balance += converted; toBalance.UpdatedAt = DateTime.UtcNow; }

        var refSeq = await _db.Transactions.CountAsync(t => t.UserId == userId) + 1;
        _db.Transactions.Add(new Transaction
        {
            UserId = userId, Type = "exchange", Amount = request.Amount,
            Currency = request.FromCurrency, Status = "completed",
            Description = $"Exchanged {request.Amount} {request.FromCurrency} to {Math.Round(converted, 2)} {request.ToCurrency}",
            Reference = $"EXC-{DateTime.UtcNow:yyyyMMdd}-{refSeq:D5}",
        });

        await _db.SaveChangesAsync();
        var rate = ExchangeRateService.GetZARRate(request.FromCurrency) / ExchangeRateService.GetZARRate(request.ToCurrency);
        return Ok(new { fromAmount = request.Amount, toAmount = Math.Round(converted, 2), fee = Math.Round(fee, 2), rate = Math.Round(rate, 4), fromCurrency = request.FromCurrency, toCurrency = request.ToCurrency });
    }

    [HttpGet("exchange-rates")]
    [AllowAnonymous]
    public ActionResult<List<ExchangeRateResponse>> GetExchangeRates()
    {
        var pairs = ExchangeRateService.GetExchangePairs();
        var lastUpdated = ExchangeRateService.LastUpdated.ToString("g");

        return Ok(pairs.Select(p =>
        {
            var rate = ExchangeRateService.GetZARRate(p.From) / ExchangeRateService.GetZARRate(p.To);
            return new ExchangeRateResponse { From = p.From, To = p.To, Rate = Math.Round(rate, 4), Spread = Math.Round(rate * 0.01m, 4), LastUpdated = lastUpdated };
        }).ToList());
    }

    [HttpGet("analytics")]
    public async Task<ActionResult<WalletAnalyticsResponse>> GetAnalytics()
    {
        var userId = GetUserId();
        var txns = await _db.Transactions.Where(t => t.UserId == userId).OrderBy(t => t.CreatedAt).ToListAsync();
        var now = DateTime.UtcNow;

        return Ok(new WalletAnalyticsResponse
        {
            IncomeVsExpenses = Enumerable.Range(0, 6).Select(i => new ChartDataPoint
            {
                Label = now.AddMonths(-5 + i).ToString("MMM"),
                Value = txns.Where(t => t.CreatedAt.Month == now.AddMonths(-5 + i).Month && t.CreatedAt.Year == now.AddMonths(-5 + i).Year)
                    .Sum(t => t.Type is "deposit" or "payment" ? t.Amount : -t.Amount)
            }).ToList(),
            MonthlyBalance = Enumerable.Range(0, 6).Select(i => new ChartDataPoint
            {
                Label = now.AddMonths(-5 + i).ToString("MMM"),
                Value = txns.Where(t => t.CreatedAt <= now.AddMonths(-5 + i)).Sum(t => t.Type is "deposit" or "payment" ? t.Amount : -t.Amount)
            }).ToList(),
            SpendingCategories = txns.Where(t => t.Type is "withdrawal" or "transfer" or "exchange")
                .GroupBy(t => t.Type).Select(g => new ChartDataPoint { Label = g.Key, Value = g.Sum(t => t.Amount) }).ToList(),
            TopRecipients = txns.Where(t => t.Description != null).GroupBy(t => t.Description!.Split(' ').FirstOrDefault() ?? "Other")
                .Select(g => new ChartDataPoint { Label = g.Key, Value = g.Sum(t => t.Amount) }).OrderByDescending(x => x.Value).Take(5).ToList(),
            AverageTransaction = txns.Any() ? txns.Average(t => t.Amount) : 0,
            LargestTransaction = txns.Any() ? txns.Max(t => t.Amount) : 0,
            CashFlow = txns.Where(t => t.Type is "deposit" or "payment").Sum(t => t.Amount) - txns.Where(t => t.Type is "withdrawal" or "transfer").Sum(t => t.Amount),
        });
    }

    [HttpGet("notifications")]
    public async Task<ActionResult<List<WalletNotificationResponse>>> GetNotifications()
    {
        var userId = GetUserId();
        var txns = await _db.Transactions.Where(t => t.UserId == userId).OrderByDescending(t => t.CreatedAt).Take(20).ToListAsync();

        return Ok(txns.Select(t => new WalletNotificationResponse
        {
            Id = $"notif-{t.Id}",
            Title = t.Type switch { "deposit" => "Deposit Received", "withdrawal" => "Withdrawal Successful", "transfer" => "Transfer Completed", "exchange" => "Exchange Completed", "payment" => "Payment Sent", _ => "Transaction Updated" },
            Message = $"{t.Type switch { "deposit" => "Received", "withdrawal" => "Withdrew", _ => "Processed" }} R {t.Amount:N2}",
            Type = t.Status == "completed" ? "success" : t.Status == "pending" ? "info" : "warning",
            Read = false,
            CreatedAt = t.CreatedAt,
        }).ToList());
    }

    [HttpGet("linked-banks")]
    public async Task<ActionResult<List<LinkedBankResponse>>> GetLinkedBanks()
    {
        var userId = GetUserId();
        var banks = await _db.LinkedBanks.Where(lb => lb.UserId == userId).ToListAsync();
        return Ok(banks.Select(b => new LinkedBankResponse
        {
            Id = b.Id, BankName = b.BankName, AccountName = b.AccountName,
            AccountNumber = $"****{b.AccountNumber[^4..]}", IsVerified = b.IsVerified, IsPrimary = b.IsPrimary,
        }).ToList());
    }

    [HttpPost("linked-banks")]
    public async Task<ActionResult<LinkedBankResponse>> LinkBank([FromBody] LinkBankRequest request)
    {
        var userId = GetUserId();
        var bank = new LinkedBank
        {
            UserId = userId, BankName = request.BankName,
            AccountName = request.AccountName, AccountNumber = request.AccountNumber,
            IsVerified = false, IsPrimary = false,
        };
        _db.LinkedBanks.Add(bank);
        await _db.SaveChangesAsync();

        return Ok(new LinkedBankResponse
        {
            Id = bank.Id, BankName = bank.BankName, AccountName = bank.AccountName,
            AccountNumber = $"****{bank.AccountNumber[^4..]}", IsVerified = bank.IsVerified, IsPrimary = bank.IsPrimary,
        });
    }

    [HttpDelete("linked-banks/{id}")]
    public async Task<ActionResult> UnlinkBank(Guid id)
    {
        var userId = GetUserId();
        var bank = await _db.LinkedBanks.FirstOrDefaultAsync(lb => lb.Id == id && lb.UserId == userId);
        if (bank == null) return NotFound(new { error = "Bank not found." });
        _db.LinkedBanks.Remove(bank);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("security")]
    public async Task<ActionResult<SecurityInfoResponse>> GetSecurity()
    {
        var userId = GetUserId();
        var user = await _db.Users.FindAsync(userId);

        return Ok(new SecurityInfoResponse
        {
            LoginHistory = new List<LoginSession>
            {
                new() { Id = Guid.NewGuid().ToString(), Device = "Account Created", Location = user?.Country ?? "Unknown", Ip = "---", Time = user?.CreatedAt ?? DateTime.UtcNow, IsCurrent = false },
            },
            ActiveDevices = new List<ActiveDevice>(),
            BiometricEnabled = user?.TwoFactorEnabled ?? false,
            TwoFactorEnabled = user?.TwoFactorEnabled ?? false,
            SecurityScore = CalculateSecurityScore(user),
            TrustedDevices = new List<string>(),
        });
    }

    [HttpGet("insights")]
    public async Task<ActionResult<List<SpendingInsightResponse>>> GetInsights()
    {
        var userId = GetUserId();
        var txns = await _db.Transactions.Where(t => t.UserId == userId).ToListAsync();
        var lastMonth = txns.Where(t => t.CreatedAt >= DateTime.UtcNow.AddMonths(-1));
        var prevMonth = txns.Where(t => t.CreatedAt >= DateTime.UtcNow.AddMonths(-2) && t.CreatedAt < DateTime.UtcNow.AddMonths(-1));
        var lastTotal = lastMonth.Sum(t => t.Amount);
        var prevTotal = prevMonth.Sum(t => t.Amount);
        var change = prevTotal > 0 ? ((lastTotal - prevTotal) / prevTotal) * 100 : 0;

        var insights = new List<SpendingInsightResponse>();
        if (change < 0) insights.Add(new() { Message = $"You spent {Math.Abs((int)change)}% less this month.", Type = "positive", Recommendations = new() { new() { Title = "Great saving!", Description = "Keep up the good work", Action = "Invest surplus" } } });
        else insights.Add(new() { Message = $"Your spending increased by {(int)change}% this month.", Type = "warning", Recommendations = new() { new() { Title = "Review expenses", Description = "Consider cutting back", Action = "View breakdown" } } });

        var businessPayments = lastMonth.Where(t => t.Amount > 10000 && t.Type == "deposit").Sum(t => t.Amount);
        if (businessPayments > 0) insights.Add(new() { Message = $"You received R {businessPayments:N0} in payments.", Type = "positive", Recommendations = new() { new() { Title = "Business growth", Description = "Revenue is flowing in", Action = "View analytics" } } });

        return Ok(insights);
    }

    [HttpGet("qr")]
    public async Task<ActionResult<QRResponse>> GetQR([FromQuery] decimal? amount, [FromQuery] string currency = "ZAR", [FromQuery] string? description = null)
    {
        var userId = GetUserId();
        var wallet = await _db.Wallets.FirstOrDefaultAsync(w => w.UserId == userId);

        return Ok(new QRResponse
        {
            QrCode = $"payafrika://wallet/pay?amount={amount ?? 0}&currency={currency}",
            PaymentLink = $"https://payafrika.vercel.app/pay?amount={amount ?? 0}&currency={currency}",
            WalletAddress = wallet?.Id.ToString() ?? userId.ToString(),
            AccountNumber = $"PAYA{wallet?.Id.ToString()[..8].ToUpper() ?? userId.ToString()[..8].ToUpper()}",
        });
    }

    [HttpGet("cards")]
    public async Task<ActionResult<List<CardResponse>>> GetCards()
    {
        var userId = GetUserId();
        var cards = await _db.Cards.Where(c => c.UserId == userId && c.IsActive).ToListAsync();

        if (!cards.Any())
        {
            return Ok(new List<CardResponse>());
        }

        return Ok(cards.Select(c => new CardResponse
        {
            Id = c.Id.ToString(),
            Type = c.Type,
            LastFour = c.LastFour,
            Expiry = c.Expiry,
            IsFrozen = c.IsFrozen,
            IsVirtual = c.IsVirtual,
            Limit = c.Limit,
        }).ToList());
    }

    [HttpGet("transactions")]
    public async Task<ActionResult<IEnumerable<Transaction>>> GetTransactions([FromQuery] int page = 1, [FromQuery] int limit = 20)
    {
        var userId = GetUserId();
        var transactions = await _db.Transactions
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.CreatedAt)
            .Skip((page - 1) * limit).Take(limit)
            .ToListAsync();
        return Ok(transactions);
    }

    private int CalculateSecurityScore(User? user)
    {
        if (user == null) return 0;
        var score = 30;
        if (user.IsEmailVerified) score += 20;
        if (user.TwoFactorEnabled) score += 25;
        if (user.KYCStatus == "verified") score += 15;
        if (!string.IsNullOrEmpty(user.PhoneNumber)) score += 10;
        return Math.Min(score, 100);
    }

    private Guid GetUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.Parse(claim!);
    }
}