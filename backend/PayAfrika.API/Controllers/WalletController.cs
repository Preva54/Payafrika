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

        var currencyInfo = new Dictionary<string, (string Flag, decimal ZARRate)>
        {
            ["ZAR"] = ("🇿🇦", 1m), ["USD"] = ("🇺🇸", 18.25m), ["EUR"] = ("🇪🇺", 20.00m),
            ["GBP"] = ("🇬🇧", 23.10m), ["NGN"] = ("🇳🇬", 0.013m), ["KES"] = ("🇰🇪", 0.14m),
            ["BTC"] = ("₿", 1200000m), ["ETH"] = ("⟠", 95000m), ["USDT"] = ("💵", 18.20m),
        };

        var rng = new Random();
        var results = balances.Select(b => new CurrencyWalletResponse
        {
            Currency = b.Currency,
            Flag = currencyInfo.ContainsKey(b.Currency) ? currencyInfo[b.Currency].Flag : "🏦",
            Balance = b.Balance,
            ZARValue = b.Balance * (currencyInfo.ContainsKey(b.Currency) ? currencyInfo[b.Currency].ZARRate : 1m),
            ChangePercent = Math.Round((decimal)(rng.NextDouble() * 12 - 6), 1),
            MiniGraph = Enumerable.Range(0, 7).Select(_ => b.Balance * (0.95m + (decimal)rng.NextDouble() * 0.1m)).ToList(),
        }).ToList();

        if (!results.Any(r => r.Currency == "ZAR"))
        {
            var zar = await _db.Wallets.FirstOrDefaultAsync(w => w.UserId == userId);
            results.Insert(0, new CurrencyWalletResponse
            {
                Currency = "ZAR", Flag = "🇿🇦", Balance = zar?.Balance ?? 0,
                ZARValue = zar?.Balance ?? 0, ChangePercent = 0.5m,
                MiniGraph = Enumerable.Range(0, 7).Select(i => (zar?.Balance ?? 0) * (0.95m + (decimal)new Random().NextDouble() * 0.1m)).ToList(),
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

        _db.Transactions.Add(new Transaction
        {
            UserId = userId, Type = "deposit", Amount = request.Amount,
            Currency = request.Currency, Status = "completed",
            Description = request.Description ?? $"Deposit via {request.Method ?? "wallet"}",
            Reference = $"DEP-{Guid.NewGuid().ToString()[..8].ToUpper()}",
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

        _db.Transactions.Add(new Transaction
        {
            UserId = userId, Type = "withdrawal", Amount = request.Amount,
            Currency = request.Currency, Status = "completed",
            Description = request.Description ?? $"Withdraw to {request.Method ?? "bank"}",
            Reference = $"WTH-{Guid.NewGuid().ToString()[..8].ToUpper()}",
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

        var rates = new Dictionary<string, decimal> { ["ZAR"] = 1m, ["USD"] = 18.25m, ["EUR"] = 20m, ["GBP"] = 23.1m, ["NGN"] = 0.013m, ["KES"] = 0.14m, ["BTC"] = 1200000m, ["ETH"] = 95000m, ["USDT"] = 18.2m };
        var fromRate = rates.GetValueOrDefault(request.FromCurrency, 1m);
        var toRate = rates.GetValueOrDefault(request.ToCurrency, 1m);
        var convertedAmount = request.Amount * (fromRate / toRate);

        if (request.FromCurrency == "ZAR") wallet.Balance -= request.Amount;
        if (balance != null) { balance.Balance -= request.Amount; balance.UpdatedAt = DateTime.UtcNow; }

        var toBalance = await _db.WalletBalances.FirstOrDefaultAsync(b => b.UserId == userId && b.Currency == request.ToCurrency);
        if (toBalance != null) { toBalance.Balance += convertedAmount; toBalance.UpdatedAt = DateTime.UtcNow; }

        _db.Transactions.Add(new Transaction
        {
            UserId = userId, Type = "transfer", Amount = request.Amount,
            Currency = request.FromCurrency, Status = "completed",
            Description = $"Transferred {request.Amount} {request.FromCurrency} to {request.ToCurrency}",
            Reference = $"TRF-{Guid.NewGuid().ToString()[..8].ToUpper()}",
        });

        await _db.SaveChangesAsync();
        return Ok(new { fromAmount = request.Amount, toAmount = Math.Round(convertedAmount, 2), fromCurrency = request.FromCurrency, toCurrency = request.ToCurrency });
    }

    [HttpPost("exchange")]
    public async Task<ActionResult> Exchange([FromBody] ExchangeRequest request)
    {
        var userId = GetUserId();
        var rates = new Dictionary<string, decimal> { ["ZAR"] = 1m, ["USD"] = 18.25m, ["EUR"] = 20m, ["GBP"] = 23.1m, ["NGN"] = 0.013m, ["KES"] = 0.14m, ["BTC"] = 1200000m, ["ETH"] = 95000m, ["USDT"] = 18.2m };
        var fromRate = rates.GetValueOrDefault(request.FromCurrency, 1m);
        var toRate = rates.GetValueOrDefault(request.ToCurrency, 1m);
        var converted = request.Amount * (fromRate / toRate);
        var fee = request.Amount * 0.005m;
        var spread = request.Amount * (fromRate / toRate) * 0.01m;

        var fromBalance = await _db.WalletBalances.FirstOrDefaultAsync(b => b.UserId == userId && b.Currency == request.FromCurrency);
        var wallet = await _db.Wallets.FirstAsync(w => w.UserId == userId);
        var totalDeduction = request.Amount + fee;
        if (request.FromCurrency == "ZAR" && wallet.Balance < totalDeduction)
            return BadRequest(new { error = "Insufficient balance." });
        if (fromBalance != null && fromBalance.Balance < totalDeduction)
            return BadRequest(new { error = "Insufficient balance." });

        if (request.FromCurrency == "ZAR") wallet.Balance -= totalDeduction;
        if (fromBalance != null) { fromBalance.Balance -= totalDeduction; fromBalance.UpdatedAt = DateTime.UtcNow; }

        var toBalance = await _db.WalletBalances.FirstOrDefaultAsync(b => b.UserId == userId && b.Currency == request.ToCurrency);
        if (toBalance != null) { toBalance.Balance += converted; toBalance.UpdatedAt = DateTime.UtcNow; }

        _db.Transactions.Add(new Transaction
        {
            UserId = userId, Type = "exchange", Amount = request.Amount,
            Currency = request.FromCurrency, Status = "completed",
            Description = $"Exchanged {request.Amount} {request.FromCurrency} to {Math.Round(converted, 2)} {request.ToCurrency}",
            Reference = $"EXC-{Guid.NewGuid().ToString()[..8].ToUpper()}",
        });

        await _db.SaveChangesAsync();
        return Ok(new { fromAmount = request.Amount, toAmount = Math.Round(converted, 2), fee = Math.Round(fee, 2), rate = Math.Round(fromRate / toRate, 4), fromCurrency = request.FromCurrency, toCurrency = request.ToCurrency });
    }

    [HttpGet("exchange-rates")]
    [AllowAnonymous]
    public ActionResult<List<ExchangeRateResponse>> GetExchangeRates()
    {
        var pairs = new[] { ("ZAR", "USD"), ("ZAR", "EUR"), ("ZAR", "GBP"), ("USD", "EUR"), ("USD", "GBP"), ("EUR", "GBP"), ("ZAR", "NGN"), ("ZAR", "KES"), ("USD", "NGN"), ("USD", "KES") };
        var rates = new Dictionary<string, decimal> { ["ZAR"] = 1m, ["USD"] = 18.25m, ["EUR"] = 20m, ["GBP"] = 23.1m, ["NGN"] = 0.013m, ["KES"] = 0.14m };

        return Ok(pairs.Select(p =>
        {
            var rate = rates[p.Item1] / rates[p.Item2];
            return new ExchangeRateResponse { From = p.Item1, To = p.Item2, Rate = Math.Round(rate, 4), Spread = Math.Round(rate * 0.01m, 4), LastUpdated = DateTime.UtcNow.ToString("g") };
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
    public ActionResult<SecurityInfoResponse> GetSecurity()
    {
        return Ok(new SecurityInfoResponse
        {
            LoginHistory = Enumerable.Range(0, 5).Select(i => new LoginSession
            {
                Id = Guid.NewGuid().ToString(), Device = new[] { "Chrome on Windows", "Safari on iPhone", "Firefox on macOS", "Edge on Windows", "Chrome on Android" }[i],
                Location = new[] { "Cape Town, ZA", "Johannesburg, ZA", "Remote", "Lagos, NG", "Nairobi, KE" }[i],
                Ip = $"192.168.{i}.{i * 10}",
                Time = DateTime.UtcNow.AddDays(-i * 3),
                IsCurrent = i == 0,
            }).ToList(),
            ActiveDevices = Enumerable.Range(0, 2).Select(i => new ActiveDevice
            {
                Id = Guid.NewGuid().ToString(), Name = i == 0 ? "Windows PC" : "iPhone 15",
                Type = i == 0 ? "Desktop" : "Mobile", LastActive = DateTime.UtcNow.AddHours(-i),
            }).ToList(),
            BiometricEnabled = true, TwoFactorEnabled = false, SecurityScore = 78,
            TrustedDevices = new List<string> { "Windows PC - Chrome", "iPhone 15 - Safari" },
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
    public ActionResult<QRResponse> GetQR([FromQuery] decimal? amount, [FromQuery] string currency = "ZAR", [FromQuery] string? description = null)
    {
        return Ok(new QRResponse
        {
            QrCode = $"payafrika://wallet/pay?amount={amount ?? 0}&currency={currency}",
            PaymentLink = $"https://payafrika.vercel.app/pay?amount={amount ?? 0}&currency={currency}",
            WalletAddress = Guid.NewGuid().ToString(),
            AccountNumber = $"PAYA{DateTime.UtcNow:yyyyMMdd}",
        });
    }

    [HttpGet("cards")]
    public ActionResult<List<CardResponse>> GetCards()
    {
        return Ok(new List<CardResponse>
        {
            new() { Id = Guid.NewGuid().ToString(), Type = "Debit", LastFour = "4582", Expiry = "08/28", IsFrozen = false, IsVirtual = false, Limit = 50000 },
            new() { Id = Guid.NewGuid().ToString(), Type = "Virtual", LastFour = "7731", Expiry = "12/27", IsFrozen = false, IsVirtual = true, Limit = 10000 },
            new() { Id = Guid.NewGuid().ToString(), Type = "Credit", LastFour = "9904", Expiry = "03/29", IsFrozen = true, IsVirtual = false, Limit = 100000 },
        });
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

    private Guid GetUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.Parse(claim!);
    }
}