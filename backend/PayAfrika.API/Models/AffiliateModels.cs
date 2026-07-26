using System.ComponentModel.DataAnnotations;

namespace PayAfrika.API.Models;

public class Affiliate
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    [MaxLength(50)] public string ReferralCode { get; set; } = string.Empty;
    [MaxLength(50)] public string Status { get; set; } = "pending";
    [MaxLength(300)] public string BusinessName { get; set; } = string.Empty;
    [MaxLength(500)] public string Website { get; set; } = string.Empty;
    public string SocialLinks { get; set; } = string.Empty;
    [MaxLength(100)] public string Country { get; set; } = string.Empty;
    [MaxLength(10)] public string PreferredCurrency { get; set; } = "ZAR";
    public string TaxInfo { get; set; } = string.Empty;
    [MaxLength(100)] public string PaymentMethod { get; set; } = string.Empty;
    public string BankDetails { get; set; } = string.Empty;
    public decimal TotalEarnings { get; set; }
    public decimal AvailableBalance { get; set; }
    public decimal PendingCommissions { get; set; }
    public decimal TotalPaid { get; set; }
    public int LifetimeReferrals { get; set; }
    public decimal ConversionRate { get; set; }
    [MaxLength(50)] public string Tier { get; set; } = "Bronze";
    public string ApplicationNotes { get; set; } = string.Empty;
    public string RejectedReason { get; set; } = string.Empty;
    public Guid? ReviewedById { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<Referral> Referrals { get; set; } = new List<Referral>();
    public ICollection<Commission> Commissions { get; set; } = new List<Commission>();
    public ICollection<AffiliateCampaign> Campaigns { get; set; } = new List<AffiliateCampaign>();
    public ICollection<Payout> Payouts { get; set; } = new List<Payout>();
    public ICollection<BonusAward> BonusAwards { get; set; } = new List<BonusAward>();
    public ICollection<AffiliateNotification> Notifications { get; set; } = new List<AffiliateNotification>();
}

public class CommissionRule
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required, MaxLength(300)] public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    [MaxLength(50)] public string Type { get; set; } = "percentage";
    [MaxLength(100)] public string TargetEntity { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public decimal Percentage { get; set; }
    public int TierMin { get; set; }
    public int TierMax { get; set; }
    public int RecurringMonths { get; set; }
    public decimal RecurringAmount { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Referral
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid AffiliateId { get; set; }
    [MaxLength(100)] public string ReferralCode { get; set; } = string.Empty;
    public Guid? CampaignId { get; set; }
    [MaxLength(300)] public string ReferredEmail { get; set; } = string.Empty;
    public Guid? ReferredUserId { get; set; }
    [MaxLength(300)] public string ReferredName { get; set; } = string.Empty;
    [MaxLength(50)] public string Status { get; set; } = "clicked";
    public decimal RevenueGenerated { get; set; }
    public decimal CommissionEarned { get; set; }
    [MaxLength(100)] public string Source { get; set; } = string.Empty;
    [MaxLength(50)] public string DeviceType { get; set; } = string.Empty;
    [MaxLength(50)] public string IPAddress { get; set; } = string.Empty;
    public string UserAgent { get; set; } = string.Empty;
    [MaxLength(10)] public string CountryCode { get; set; } = string.Empty;
    public bool IsFraudSuspected { get; set; }
    public string FraudReason { get; set; } = string.Empty;
    public DateTime? ClickedAt { get; set; }
    public DateTime? RegisteredAt { get; set; }
    public DateTime? VerifiedAt { get; set; }
    public DateTime? ConvertedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public Affiliate? Affiliate { get; set; }
    public AffiliateCampaign? Campaign { get; set; }
}

public class AffiliateCampaign
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid AffiliateId { get; set; }
    [Required, MaxLength(300)] public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    [MaxLength(1000)] public string ReferralLink { get; set; } = string.Empty;
    [MaxLength(500)] public string TargetAudience { get; set; } = string.Empty;
    [MaxLength(200)] public string MarketingChannel { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
    public int Clicks { get; set; }
    public int Signups { get; set; }
    public int Conversions { get; set; }
    public decimal Revenue { get; set; }
    public decimal Commission { get; set; }
    public decimal ROI { get; set; }
    [MaxLength(50)] public string Status { get; set; } = "active";
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public Affiliate? Affiliate { get; set; }
}

public class Payout
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid AffiliateId { get; set; }
    public decimal Amount { get; set; }
    public decimal Fee { get; set; }
    [MaxLength(100)] public string Method { get; set; } = "bank_transfer";
    [MaxLength(50)] public string Status { get; set; } = "pending";
    [MaxLength(500)] public string TransactionReference { get; set; } = string.Empty;
    [MaxLength(500)] public string BankReference { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
    public Guid? ProcessedById { get; set; }
    public DateTime? RequestedAt { get; set; }
    public DateTime? ProcessedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public Affiliate? Affiliate { get; set; }
}

public class BonusAward
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid AffiliateId { get; set; }
    [Required, MaxLength(100)] public string Type { get; set; } = string.Empty;
    [Required, MaxLength(300)] public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal RewardAmount { get; set; }
    public string Requirements { get; set; } = string.Empty;
    public bool IsAwarded { get; set; }
    public DateTime? AwardedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public Affiliate? Affiliate { get; set; }
}

public class LeaderboardEntry
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid AffiliateId { get; set; }
    [MaxLength(50)] public string Period { get; set; } = "all-time";
    public int Rank { get; set; }
    public int Referrals { get; set; }
    public decimal Earnings { get; set; }
    public decimal Revenue { get; set; }
    public DateTime? PeriodStart { get; set; }
    public DateTime? PeriodEnd { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public Affiliate? Affiliate { get; set; }
}

public class MarketingAsset
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required, MaxLength(300)] public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    [MaxLength(100)] public string Category { get; set; } = string.Empty;
    [MaxLength(50)] public string Type { get; set; } = "image";
    [MaxLength(2000)] public string FileUrl { get; set; } = string.Empty;
    [MaxLength(2000)] public string PreviewUrl { get; set; } = string.Empty;
    [MaxLength(2000)] public string DownloadUrl { get; set; } = string.Empty;
    public long FileSize { get; set; }
    [MaxLength(100)] public string MimeType { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class AffiliateNotification
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid AffiliateId { get; set; }
    [MaxLength(100)] public string Type { get; set; } = string.Empty;
    [Required, MaxLength(300)] public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public bool IsRead { get; set; }
    public DateTime? ReadAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public Affiliate? Affiliate { get; set; }
}

public class FraudFlag
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid AffiliateId { get; set; }
    public Guid? ReferralId { get; set; }
    [Required, MaxLength(500)] public string Reason { get; set; } = string.Empty;
    public string Evidence { get; set; } = string.Empty;
    [MaxLength(50)] public string Status { get; set; } = "open";
    public Guid? ResolvedById { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Commission
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid AffiliateId { get; set; }
    public Guid? ReferralId { get; set; }
    public Guid? CommissionRuleId { get; set; }
    public decimal Amount { get; set; }
    [MaxLength(50)] public string Type { get; set; } = "flat";
    [MaxLength(50)] public string Status { get; set; } = "pending";
    public string Description { get; set; } = string.Empty;
    public DateTime? EarnedAt { get; set; }
    public DateTime? PaidAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public Affiliate? Affiliate { get; set; }
}
