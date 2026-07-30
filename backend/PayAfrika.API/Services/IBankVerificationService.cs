using PayAfrika.API.DTOs;

namespace PayAfrika.API.Services;

public interface IBankVerificationService
{
    Task<VerifyAccountResponse> VerifyAccountAsync(Guid userId, string countryCode, string bankCode, string accountNumber);
    Task<List<BankListResponse>> GetBanksForCountryAsync(string countryCode);
}