using Microsoft.EntityFrameworkCore;
using PayAfrika.API.Data;
using PayAfrika.API.DTOs;
using PayAfrika.API.Models;

namespace PayAfrika.API.Services;

public class BankVerificationService : IBankVerificationService
{
    private readonly AppDbContext _db;
    private readonly IEnumerable<IBankVerificationProvider> _providers;
    private readonly ILogger<BankVerificationService> _logger;

    public BankVerificationService(AppDbContext db, IEnumerable<IBankVerificationProvider> providers, ILogger<BankVerificationService> logger)
    {
        _db = db;
        _providers = providers;
        _logger = logger;
    }

    public async Task<VerifyAccountResponse> VerifyAccountAsync(Guid userId, string countryCode, string bankCode, string accountNumber)
    {
        try
        {
            var cc = countryCode.ToUpper();

            if (string.IsNullOrWhiteSpace(cc))
                return new VerifyAccountResponse { Success = false, Status = "failed", Message = "Country code is required." };

            if (string.IsNullOrWhiteSpace(accountNumber))
                return new VerifyAccountResponse { Success = false, Status = "failed", Message = "Account number is required." };

            var bank = await _db.Banks
                .FirstOrDefaultAsync(b => b.CountryCode == cc && b.Code == bankCode.ToUpper());

            if (bank == null)
                return new VerifyAccountResponse { Success = false, Status = "failed", Message = "Unsupported bank." };

            var provider = _providers.FirstOrDefault(p => p.IsCountrySupported(cc));
            if (provider == null)
            {
                _logger.LogWarning("No bank verification provider available for {CountryCode}", cc);
                return new VerifyAccountResponse
                {
                    Success = false,
                    Status = "unsupported",
                    Message = "Bank account verification is not available for this country yet. Please contact support.",
                };
            }

            var result = await provider.VerifyAsync(cc, bankCode, accountNumber);
            if (!result.Success)
                return new VerifyAccountResponse
                {
                    Success = false,
                    Status = "failed",
                    Message = result.ErrorMessage ?? "Unable to verify this bank account.",
                };

            var verification = new BankVerification
            {
                UserId = userId,
                CountryCode = cc,
                BankCode = bankCode.ToUpper(),
                BankName = bank.Name,
                AccountNumber = accountNumber,
                Status = "verified",
                Provider = provider.ProviderName,
                ProviderRequestId = result.RequestId,
                AccountName = result.AccountName,
                VerifiedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
            };

            _db.BankVerifications.Add(verification);
            await _db.SaveChangesAsync();

            return new VerifyAccountResponse
            {
                Success = true,
                Status = "verified",
                AccountName = verification.AccountName,
                BankName = bank.Name,
                CountryCode = cc,
                VerificationId = result.RequestId,
                Message = "Account verified successfully.",
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Bank verification failed for {CountryCode}/{BankCode}/{AccountNumber}", countryCode, bankCode, accountNumber);
            return new VerifyAccountResponse { Success = false, Status = "failed", Message = "Verification service is temporarily unavailable." };
        }
    }

    public async Task<List<BankListResponse>> GetBanksForCountryAsync(string countryCode)
    {
        var banks = await _db.Banks
            .Where(b => b.CountryCode == countryCode.ToUpper() && b.IsEnabled)
            .OrderBy(b => b.SortOrder)
            .ToListAsync();

        return banks.Select(b => new BankListResponse
        {
            Id = b.Id,
            CountryCode = b.CountryCode,
            Name = b.Name,
            Code = b.Code,
        }).ToList();
    }
}
