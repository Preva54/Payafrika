using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PayAfrika.API.Data;
using PayAfrika.API.DTOs;
using PayAfrika.API.Models;
using PayAfrika.API.Services.Payment;

namespace PayAfrika.API.Services;

public interface ITransferService
{
    Task<TransferQuoteResponse> QuoteAsync(string countryCode, string currency, decimal amount);
    Task<BankTransferResponse> InitiateAsync(Guid userId, InitiateBankTransferRequest request);
    Task<List<BankTransferResponse>> GetHistoryAsync(Guid userId);
    Task<BankTransferResponse?> GetAsync(Guid userId, Guid id);
    Task<BankTransferResponse?> ReverseAsync(Guid userId, Guid id, string? reason, bool isAdmin);
    Task<ReceiveAccountResponse> GetReceiveAccountAsync(Guid userId);
    Task<bool> HasPinAsync(Guid userId);
    Task SetPinAsync(Guid userId, string pin);
}

public class TransferService : ITransferService
{
    private const string SettingsCategory = "transfers";
    private const string PinKey = "transaction_pin";

    private readonly AppDbContext _db;
    private readonly IBankVerificationService _verificationService;
    private readonly IEnumerable<ITransferProvider> _providers;
    private readonly IAuditService _auditService;
    private readonly ILogger<TransferService> _logger;

    public TransferService(
        AppDbContext db,
        IBankVerificationService verificationService,
        IEnumerable<ITransferProvider> providers,
        IAuditService auditService,
        ILogger<TransferService> logger)
    {
        _db = db;
        _verificationService = verificationService;
        _providers = providers;
        _auditService = auditService;
        _logger = logger;
    }

    // ─────────────────────────────── Quoting ───────────────────────────────

    public async Task<TransferQuoteResponse> QuoteAsync(string countryCode, string currency, decimal amount)
    {
        var (fee, vat) = await CalculateFees(countryCode, currency, amount);
        return new TransferQuoteResponse
        {
            Amount = amount,
            Fee = Math.Round(fee, 2),
            Vat = Math.Round(vat, 2),
            TotalDebit = Math.Round(amount + fee + vat, 2),
            Currency = currency.ToUpper(),
            EstimatedArrival = GetEstimatedArrival(countryCode),
        };
    }

    // ─────────────────────────────── Initiate ──────────────────────────────

    public async Task<BankTransferResponse> InitiateAsync(Guid userId, InitiateBankTransferRequest request)
    {
        var cc = request.CountryCode.ToUpper();
        var currency = request.Currency.ToUpper();

        var bank = await _db.Banks.FirstOrDefaultAsync(b => b.CountryCode == cc && b.Code == request.BankCode.ToUpper());
        if (bank == null)
            throw new InvalidOperationException("Unsupported bank. Please select a bank from the list.");

        if (!bank.IsEnabled)
            throw new InvalidOperationException("This bank is temporarily unavailable for transfers.");

        var settings = await GetSettingsAsync();
        if (request.Amount < settings.MinAmount)
            throw new InvalidOperationException($"Minimum transfer amount is {FormatAmount(settings.MinAmount, currency)}.");
        if (request.Amount > settings.MaxAmount)
            throw new InvalidOperationException($"Maximum transfer amount is {FormatAmount(settings.MaxAmount, currency)}.");

        if (IsBlacklisted(settings, request.AccountNumber))
            throw new InvalidOperationException("This account cannot receive transfers.");

        if (!await HasPinAsync(userId))
            throw new InvalidOperationException("Set your transaction PIN before making transfers.");

        var pinOk = await VerifyPinAsync(userId, request.Pin);
        if (!pinOk)
        {
            await _auditService.LogSecurityAlertAsync(new AuditLogEntry
            {
                UserId = userId,
                Action = "transfer_pin_failed",
                Module = "transfers",
                Resource = "BankTransfer",
                Result = "failed",
                Metadata = "{\"reason\":\"incorrect transaction PIN\"}",
            });
            throw new InvalidOperationException("Incorrect transaction PIN. Please try again.");
        }

        // Re-verify the account through the provider rail and enforce the verified name.
        var verification = await _verificationService.VerifyAccountAsync(userId, cc, request.BankCode, request.AccountNumber);
        if (!verification.Success || string.IsNullOrWhiteSpace(verification.AccountName))
            throw new InvalidOperationException("Unable to verify this account. Please check the bank and account number.");

        if (!string.Equals(verification.AccountName.Trim(), request.AccountName.Trim(), StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Account name does not match the verified name for this account.");

        // Velocity check: number of transfers today.
        var today = DateTime.UtcNow.Date;
        var todaysTransfers = await _db.BankTransfers.CountAsync(t =>
            t.UserId == userId && t.CreatedAt >= today && t.Status != "failed" && t.Status != "reversed");
        if (todaysTransfers >= settings.MaxDailyTransfers)
            throw new InvalidOperationException("You have reached the maximum number of transfers for today.");

        // Daily limit check (sum of amount for today, including this one).
        var todaysTotal = await _db.BankTransfers
            .Where(t => t.UserId == userId && t.CreatedAt >= today && t.Status != "failed" && t.Status != "reversed")
            .SumAsync(t => (decimal?)t.Amount) ?? 0;
        if (todaysTotal + request.Amount > settings.DailyLimit)
            throw new InvalidOperationException("This transfer exceeds your daily transfer limit.");

        var (fee, vat) = await CalculateFees(cc, currency, request.Amount);
        var totalDebit = request.Amount + fee + vat;

        var reference = await GenerateReferenceAsync(cc);
        var transactionId = Guid.NewGuid();

        var transfer = new BankTransfer
        {
            Id = transactionId,
            UserId = userId,
            Reference = reference,
            CountryCode = cc,
            BankCode = bank.Code,
            BankName = bank.Name,
            AccountNumber = request.AccountNumber,
            AccountName = verification.AccountName,
            Amount = request.Amount,
            Currency = currency,
            Fee = fee,
            Vat = vat,
            TotalDebit = totalDebit,
            Narration = request.Narration,
            Status = "processing",
            Provider = null,
            CreatedAt = DateTime.UtcNow,
        };

        _db.BankTransfers.Add(transfer);
        _db.Transactions.Add(new Transaction
        {
            UserId = userId,
            Type = "bank_transfer",
            Amount = request.Amount,
            Currency = currency,
            Status = "processing",
            Description = $"Transfer to {verification.AccountName} ({bank.Name})",
            Reference = reference,
            CreatedAt = DateTime.UtcNow,
        });

        var debited = await DebitWalletAsync(userId, currency, totalDebit);
        if (!debited)
            throw new InvalidOperationException("Insufficient balance to cover the amount and transfer fees.");

        await _db.SaveChangesAsync();

        // Execute on the payment rail (provider abstraction layer).
        var provider = _providers.FirstOrDefault(p => p.IsCountrySupported(cc));
        if (provider == null)
        {
            await FailTransferAsync(transfer, "Bank transfer is not available for this country yet. Your funds have been refunded.");
            return ToResponse(transfer);
        }

        try
        {
            var result = await provider.ExecuteAsync(new ProviderTransferRequest
            {
                CountryCode = cc,
                BankCode = bank.Code!,
                AccountNumber = request.AccountNumber,
                AccountName = verification.AccountName,
                Amount = request.Amount,
                Currency = currency,
                Narration = request.Narration,
                Reference = reference,
            });

            if (result.Success)
            {
                transfer.Status = "successful";
                transfer.Provider = provider.ProviderName;
                transfer.ProviderRequestId = result.RequestId;
                transfer.CompletedAt = DateTime.UtcNow;

                var beneficiary = await _db.Beneficiaries
                    .Where(b => b.UserId == userId && b.AccountNumber == request.AccountNumber)
                    .FirstOrDefaultAsync();
                if (beneficiary != null)
                {
                    beneficiary.LastUsedAt = DateTime.UtcNow;
                    beneficiary.IsVerified = true;
                }
            }
            else
            {
                await FailTransferAsync(transfer, result.ErrorMessage ?? "The transfer could not be completed.");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Transfer execution failed for {Reference}", reference);
            await FailTransferAsync(transfer, "The transfer service is temporarily unavailable. Your funds have been refunded.");
        }

        await _db.SaveChangesAsync();

        await _auditService.LogAsync(new AuditLogEntry
        {
            UserId = userId,
            Action = "bank_transfer_initiated",
            Module = "transfers",
            Resource = "BankTransfer",
            ResourceId = transfer.Id.ToString(),
            Result = transfer.Status == "successful" ? "success" : "failed",
            Metadata = JsonSerializer.Serialize(new { transfer.Reference, transfer.Amount, transfer.Fee, transfer.Vat, transfer.TotalDebit, transfer.Currency, Bank = transfer.BankName, transfer.Status }),
        });

        return ToResponse(transfer);
    }

    // ─────────────────────────────── History / Detail ──────────────────────

    public async Task<List<BankTransferResponse>> GetHistoryAsync(Guid userId)
    {
        var transfers = await _db.BankTransfers
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.CreatedAt)
            .Take(100)
            .ToListAsync();

        return transfers.Select(ToResponse).ToList();
    }

    public async Task<BankTransferResponse?> GetAsync(Guid userId, Guid id)
    {
        var transfer = await _db.BankTransfers.FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);
        return transfer == null ? null : ToResponse(transfer);
    }

    // ─────────────────────────────── Reverse ───────────────────────────────

    public async Task<BankTransferResponse?> ReverseAsync(Guid userId, Guid id, string? reason, bool isAdmin)
    {
        var transfer = await _db.BankTransfers.FirstOrDefaultAsync(t => t.Id == id && (isAdmin || t.UserId == userId));
        if (transfer == null) return null;

        if (transfer.Status is "failed" or "reversed")
            throw new InvalidOperationException("Only successful transfers can be reversed.");

        var age = DateTime.UtcNow - (transfer.CompletedAt ?? transfer.CreatedAt);
        if (!isAdmin && age > TimeSpan.FromMinutes(10))
            throw new InvalidOperationException("Reversal window has expired. Please contact support.");

        var provider = _providers.FirstOrDefault(p => p.IsCountrySupported(transfer.CountryCode));
        if (provider != null)
        {
            var result = await provider.ReverseAsync(transfer.ProviderRequestId ?? string.Empty, transfer.Amount, transfer.Currency);
            if (!result.Success)
                throw new InvalidOperationException(result.ErrorMessage ?? "Reversal failed at the payment rail.");
        }

        transfer.Status = "reversed";
        transfer.ReversalReason = reason;
        transfer.ReversedById = isAdmin ? userId : null;
        transfer.ReversedAt = DateTime.UtcNow;

        // Restore full debit (amount + fee + VAT).
        var credited = await CreditWalletAsync(transfer.UserId, transfer.Currency, transfer.TotalDebit);
        if (!credited)
            _logger.LogWarning("Reversal {Reference}: wallet credit failed", transfer.Reference);

        await _db.SaveChangesAsync();

        await _auditService.LogAsync(new AuditLogEntry
        {
            UserId = isAdmin ? userId : transfer.UserId,
            Action = "bank_transfer_reversed",
            Module = "transfers",
            Resource = "BankTransfer",
            ResourceId = transfer.Id.ToString(),
            Result = "success",
            NewValue = reason,
            Metadata = JsonSerializer.Serialize(new { transfer.Reference, transfer.Amount, Reason = reason }),
        });

        return ToResponse(transfer);
    }

    // ─────────────────────────────── Receive account ───────────────────────

    public async Task<ReceiveAccountResponse> GetReceiveAccountAsync(Guid userId)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null) throw new InvalidOperationException("User not found.");

        var preferred = await _db.UserPreferences.FirstOrDefaultAsync(p =>
            p.UserId == userId && p.Category == "receiving" && p.Key == "currency");
        var currency = preferred?.Value ?? "NGN";

        return new ReceiveAccountResponse
        {
            BankName = "PayAfrika Microfinance Bank",
            AccountNumber = DeriveAccountNumber(userId),
            AccountName = user.FullName,
            Currency = currency,
            IsSponsorBank = false,
        };
    }

    // ─────────────────────────────── PIN ───────────────────────────────────

    public async Task<bool> HasPinAsync(Guid userId)
    {
        var pref = await _db.UserPreferences.FirstOrDefaultAsync(p =>
            p.UserId == userId && p.Category == "security" && p.Key == PinKey);
        return pref != null && !string.IsNullOrWhiteSpace(pref.Value);
    }

    public async Task SetPinAsync(Guid userId, string pin)
    {
        if (string.IsNullOrWhiteSpace(pin) || pin.Length < 4 || !pin.All(char.IsDigit))
            throw new InvalidOperationException("Transaction PIN must be at least 4 digits.");

        var pref = await _db.UserPreferences.FirstOrDefaultAsync(p =>
            p.UserId == userId && p.Category == "security" && p.Key == PinKey);

        if (pref == null)
        {
            pref = new UserPreference
            {
                UserId = userId,
                Category = "security",
                Key = PinKey,
                Value = HashPin(pin),
                UpdatedAt = DateTime.UtcNow,
            };
            _db.UserPreferences.Add(pref);
        }
        else
        {
            pref.Value = HashPin(pin);
            pref.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();

        await _auditService.LogAsync(new AuditLogEntry
        {
            UserId = userId,
            Action = "transaction_pin_set",
            Module = "transfers",
            Resource = "UserPreference",
            Result = "success",
        });
    }

    // ─────────────────────────────── Private helpers ───────────────────────

    private async Task<(decimal Fee, decimal Vat)> CalculateFees(string countryCode, string currency, decimal amount)
    {
        var settings = await GetSettingsAsync();

        var fee = settings.FeeType == "flat" ? settings.FeeFlat : amount * (settings.FeeRate / 100m);
        var vat = settings.VatRate > 0 ? fee * (settings.VatRate / 100m) : 0m;

        return (fee, vat);
    }

    private async Task<TransferSettingsResponse> GetSettingsAsync()
    {
        var values = await _db.PlatformSettings
            .Where(s => s.Category == SettingsCategory)
            .ToDictionaryAsync(s => s.Key, s => s.Value);

        return new TransferSettingsResponse
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
        };
    }

    private bool IsBlacklisted(TransferSettingsResponse settings, string accountNumber)
    {
        if (string.IsNullOrWhiteSpace(settings.BlacklistedAccounts)) return false;

        return settings.BlacklistedAccounts
            .Split(['\n', ',', ';'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Any(a => a == accountNumber);
    }

    private static decimal ParseDecimal(string? raw, decimal fallback)
        => decimal.TryParse(raw, System.Globalization.CultureInfo.InvariantCulture, out var value) ? value : fallback;

    private static string GetEstimatedArrival(string countryCode)
        => countryCode.ToUpper() switch
        {
            "NG" => "Instant",
            "ZA" or "GH" or "KE" => "Same day",
            _ => "1-3 business days",
        };

    private async Task<string> GenerateReferenceAsync(string countryCode)
    {
        var count = await _db.BankTransfers.CountAsync() + 1;
        var sequence = count % 1_000_000;
        return $"PAF-{countryCode.ToUpper()}-{sequence:D6}";
    }

    private async Task<bool> DebitWalletAsync(Guid userId, string currency, decimal amount)
    {
        var wallet = await _db.Wallets.FirstOrDefaultAsync(w => w.UserId == userId);
        var balance = await _db.WalletBalances.FirstOrDefaultAsync(b => b.UserId == userId && b.Currency == currency);

        if (currency == "ZAR")
        {
            if (wallet == null || wallet.Balance < amount) return false;
            wallet.Balance -= amount;
            wallet.UpdatedAt = DateTime.UtcNow;
            return true;
        }

        if (balance == null)
        {
            if (wallet == null || wallet.Balance < amount) return false;
            wallet.Balance -= amount;
            wallet.UpdatedAt = DateTime.UtcNow;
            return true;
        }

        if (balance.Balance < amount) return false;
        balance.Balance -= amount;
        balance.UpdatedAt = DateTime.UtcNow;
        return true;
    }

    private async Task<bool> CreditWalletAsync(Guid userId, string currency, decimal amount)
    {
        var balance = await _db.WalletBalances.FirstOrDefaultAsync(b => b.UserId == userId && b.Currency == currency);
        if (balance != null)
        {
            balance.Balance += amount;
            balance.UpdatedAt = DateTime.UtcNow;
            return true;
        }

        var wallet = await _db.Wallets.FirstOrDefaultAsync(w => w.UserId == userId);
        if (wallet == null) return false;
        wallet.Balance += amount;
        wallet.UpdatedAt = DateTime.UtcNow;
        return true;
    }

    private async Task FailTransferAsync(BankTransfer transfer, string reason)
    {
        transfer.Status = "failed";
        transfer.FailureReason = reason;
        await CreditWalletAsync(transfer.UserId, transfer.Currency, transfer.TotalDebit);
    }

    private async Task<bool> VerifyPinAsync(Guid userId, string pin)
    {
        var pref = await _db.UserPreferences.FirstOrDefaultAsync(p =>
            p.UserId == userId && p.Category == "security" && p.Key == PinKey);
        if (pref == null || string.IsNullOrWhiteSpace(pref.Value)) return false;

        return CryptographicOperations.FixedTimeEquals(
            Convert.FromHexString(pref.Value),
            SHA256.HashData(Encoding.UTF8.GetBytes(pin)));
    }

    private static string HashPin(string pin)
        => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(pin)));

    private static string DeriveAccountNumber(Guid userId)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(userId.ToString()));
        var digits = new StringBuilder();
        foreach (var b in hash)
        {
            digits.Append((b % 10).ToString());
            if (digits.Length == 10) break;
        }
        return digits.ToString();
    }

    private static string FormatAmount(decimal amount, string currency)
        => $"{currency} {amount:N2}";

    private static BankTransferResponse ToResponse(BankTransfer t)
    {
        var masked = t.AccountNumber.Length >= 4
            ? $"****{t.AccountNumber[^4..]}"
            : $"****{t.AccountNumber}";

        return new BankTransferResponse
        {
            Id = t.Id,
            Reference = t.Reference,
            CountryCode = t.CountryCode,
            BankName = t.BankName,
            AccountNumber = masked,
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
        };
    }
}
