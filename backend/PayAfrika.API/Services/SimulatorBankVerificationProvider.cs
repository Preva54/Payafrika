using System.Text.RegularExpressions;

namespace PayAfrika.API.Services;

public partial class SimulatorBankVerificationProvider : IBankVerificationProvider
{
    private static readonly Dictionary<string, (int Min, int Max)> AccountLengths = new()
    {
        ["ZA"] = (6, 10), ["NG"] = (10, 10), ["KE"] = (10, 12), ["GH"] = (10, 13),
        ["GB"] = (8, 8), ["US"] = (8, 17), ["CA"] = (7, 12), ["AU"] = (6, 9),
        ["BW"] = (10, 12), ["ZM"] = (8, 13), ["TZ"] = (10, 13), ["UG"] = (10, 12),
        ["RW"] = (10, 12), ["NA"] = (6, 12), ["SZ"] = (10, 12), ["MW"] = (10, 13),
        ["ZW"] = (10, 13), ["ET"] = (6, 16), ["MZ"] = (9, 14), ["EG"] = (10, 14),
        ["MA"] = (20, 24),
    };

    public string ProviderName => "simulator";

    public bool IsCountrySupported(string countryCode) => AccountLengths.ContainsKey(countryCode.ToUpper());

    public Task<ProviderVerificationResult> VerifyAsync(string countryCode, string bankCode, string accountNumber)
    {
        var cc = countryCode.ToUpper();

        if (!AccountLengths.TryGetValue(cc, out var range))
            return Task.FromResult(new ProviderVerificationResult
            {
                Success = false,
                ErrorMessage = $"Bank account verification is not available for {cc} yet.",
            });

        if (!DigitsOnly().IsMatch(accountNumber))
            return Task.FromResult(new ProviderVerificationResult
            {
                Success = false,
                ErrorMessage = "Account number must contain only digits.",
            });

        if (accountNumber.Length < range.Min || accountNumber.Length > range.Max)
            return Task.FromResult(new ProviderVerificationResult
            {
                Success = false,
                ErrorMessage = $"Account number must be {range.Min} to {range.Max} digits for this country.",
            });

        var requestId = Guid.NewGuid().ToString();

        return Task.FromResult(new ProviderVerificationResult
        {
            Success = true,
            AccountName = GenerateAccountName(accountNumber),
            RequestId = requestId,
        });
    }

    private static string GenerateAccountName(string accountNumber)
    {
        var hashes = new Dictionary<string, string>
        {
            ["1234567890"] = "Peter Osakwe",
            ["0987654321"] = "Sarah Mabena",
            ["1111111111"] = "Kwame Asante",
            ["2222222222"] = "Grace Nkosi",
            ["3333333333"] = "David Kamau",
            ["4444444444"] = "Maria Santos",
            ["5555555555"] = "David Smith",
            ["6666666666"] = "Sarah Johnson",
            ["7777777777"] = "Robert Chen",
            ["8888888888"] = "Amina Diallo",
        };
        return hashes.GetValueOrDefault(accountNumber, $"Account Holder {accountNumber[^4..]}");
    }

    [GeneratedRegex("^[0-9]+$")]
    private static partial Regex DigitsOnly();
}
