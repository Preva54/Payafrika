using PayAfrika.API.Models;

namespace PayAfrika.API.Services;

public static class KycPolicy
{
    /// <summary>Transfers at or above this amount require Level 2 (identity verification).</summary>
    public const decimal HighValueThreshold = 50000m;

    public const int LevelNone = 0;
    public const int LevelBasic = 1;    // personal info + contact
    public const int LevelIdentity = 2; // + identity document + selfie
    public const int LevelFull = 3;     // + address document

    /// <summary>True when the user has reached the given verification level (legacy fully-verified users count as Level 3).</summary>
    public static bool HasLevel(User user, int level)
    {
        if (user.KycLevel >= level) return true;
        if (user.KYCStatus is "verified" or "approved") return true;
        return false;
    }

    public static bool CanWithdraw(User user) => HasLevel(user, LevelBasic);
    public static bool CanTransfer(User user) => HasLevel(user, LevelBasic);
    public static bool CanHighValueTransfer(User user) => HasLevel(user, LevelIdentity);
    public static bool CanInternationalTransfer(User user) => HasLevel(user, LevelFull);
    public static bool CanUseExchange(User user) => HasLevel(user, LevelBasic);
    public static bool CanLoan(User user) => HasLevel(user, LevelIdentity);
    public static bool CanAffiliatePayout(User user) => HasLevel(user, LevelFull);
    public static bool CanMerchant(User user) => HasLevel(user, LevelFull);

    public static string RequirementMessage(int level) => level switch
    {
        LevelBasic => "Complete Level 1 verification (personal information) to use this feature.",
        LevelIdentity => "Complete Level 2 verification (identity document and selfie) to use this feature.",
        _ => "Complete Level 3 verification (address proof) to use this feature.",
    };
}
