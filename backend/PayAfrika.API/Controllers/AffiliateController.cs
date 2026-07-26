using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PayAfrika.API.Data;
using PayAfrika.API.Models;

namespace PayAfrika.API.Controllers;

[Route("api/affiliates")]
[ApiController]
[Authorize(Roles = "admin")]
public class AffiliateController : ControllerBase
{
    private readonly AppDbContext _db;
    public AffiliateController(AppDbContext db) { _db = db; }

    // ─── Helpers ─────────────────────────────────────────────────
    private Guid GetUserId() => Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? throw new UnauthorizedAccessException());
    private async Task<Affiliate> GetAffiliate() => await _db.Affiliates.FirstOrDefaultAsync(x => x.UserId == GetUserId()) ?? throw new UnauthorizedAccessException("Not an affiliate");

    // ─── Public / Mixed ──────────────────────────────────────────
    [AllowAnonymous]
    [HttpGet("referral/{code}")] public async Task<IActionResult> GetReferralLink(string code) { var aff = await _db.Affiliates.FirstOrDefaultAsync(x => x.ReferralCode == code); if (aff == null) return NotFound(); return Ok(new { aff.ReferralCode, aff.BusinessName, aff.Website, aff.Country }); }

    [AllowAnonymous]
    [HttpPost("register")] public async Task<IActionResult> Register([FromBody] Affiliate data) { var userId = GetUserId(); if (await _db.Affiliates.AnyAsync(x => x.UserId == userId)) return BadRequest("Already registered"); var aff = new Affiliate { Id = Guid.NewGuid(), UserId = userId, ReferralCode = GenerateCode(), Status = "pending", BusinessName = data.BusinessName, Website = data.Website, SocialLinks = data.SocialLinks, Country = data.Country, PreferredCurrency = data.PreferredCurrency, TaxInfo = data.TaxInfo, PaymentMethod = data.PaymentMethod, BankDetails = data.BankDetails, ApplicationNotes = data.ApplicationNotes, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }; _db.Affiliates.Add(aff); await _db.SaveChangesAsync(); return CreatedAtAction(nameof(GetProfile), new { }, aff); }

    // ─── Affiliate Own ───────────────────────────────────────────
    [AllowAnonymous]
    [HttpGet("profile")] public async Task<IActionResult> GetProfile() { try { return Ok(await GetAffiliate()); } catch { return Unauthorized(); } }

    [AllowAnonymous]
    [HttpPut("profile")] public async Task<IActionResult> UpdateProfile([FromBody] Affiliate data) { var aff = await GetAffiliate(); aff.BusinessName = data.BusinessName; aff.Website = data.Website; aff.SocialLinks = data.SocialLinks; aff.Country = data.Country; aff.PreferredCurrency = data.PreferredCurrency; aff.TaxInfo = data.TaxInfo; aff.PaymentMethod = data.PaymentMethod; aff.BankDetails = data.BankDetails; aff.UpdatedAt = DateTime.UtcNow; await _db.SaveChangesAsync(); return Ok(aff); }

    [AllowAnonymous]
    [HttpGet("referrals")] public async Task<IActionResult> GetReferrals() { try { var aff = await GetAffiliate(); return Ok(await _db.Referrals.Where(x => x.AffiliateId == aff.Id).OrderByDescending(x => x.CreatedAt).ToListAsync()); } catch { return Unauthorized(); } }

    [AllowAnonymous]
    [HttpGet("commissions")] public async Task<IActionResult> GetCommissions() { try { var aff = await GetAffiliate(); return Ok(await _db.Commissions.Where(x => x.AffiliateId == aff.Id).OrderByDescending(x => x.EarnedAt).ToListAsync()); } catch { return Unauthorized(); } }

    [AllowAnonymous]
    [HttpGet("campaigns")] public async Task<IActionResult> GetCampaigns() { try { var aff = await GetAffiliate(); return Ok(await _db.AffiliateCampaigns.Where(x => x.AffiliateId == aff.Id).OrderByDescending(x => x.CreatedAt).ToListAsync()); } catch { return Unauthorized(); } }

    [AllowAnonymous]
    [HttpPost("campaigns")] public async Task<IActionResult> CreateCampaign([FromBody] AffiliateCampaign data) { var aff = await GetAffiliate(); var c = new AffiliateCampaign { Id = Guid.NewGuid(), AffiliateId = aff.Id, Name = data.Name, Description = data.Description, ReferralLink = data.ReferralLink, TargetAudience = data.TargetAudience, MarketingChannel = data.MarketingChannel, Notes = data.Notes, Status = "active", StartDate = data.StartDate, EndDate = data.EndDate, CreatedAt = DateTime.UtcNow }; _db.AffiliateCampaigns.Add(c); await _db.SaveChangesAsync(); return CreatedAtAction(nameof(GetCampaigns), new { id = c.Id }, c); }

    [AllowAnonymous]
    [HttpPut("campaigns/{id}")] public async Task<IActionResult> UpdateCampaign(Guid id, [FromBody] AffiliateCampaign data) { var aff = await GetAffiliate(); var c = await _db.AffiliateCampaigns.FirstOrDefaultAsync(x => x.Id == id && x.AffiliateId == aff.Id); if (c == null) return NotFound(); c.Name = data.Name; c.Description = data.Description; c.ReferralLink = data.ReferralLink; c.TargetAudience = data.TargetAudience; c.MarketingChannel = data.MarketingChannel; c.Notes = data.Notes; c.Status = data.Status; c.StartDate = data.StartDate; c.EndDate = data.EndDate; await _db.SaveChangesAsync(); return Ok(c); }

    [AllowAnonymous]
    [HttpDelete("campaigns/{id}")] public async Task<IActionResult> DeleteCampaign(Guid id) { var aff = await GetAffiliate(); var c = await _db.AffiliateCampaigns.FirstOrDefaultAsync(x => x.Id == id && x.AffiliateId == aff.Id); if (c == null) return NotFound(); _db.AffiliateCampaigns.Remove(c); await _db.SaveChangesAsync(); return NoContent(); }

    [AllowAnonymous]
    [HttpGet("payouts")] public async Task<IActionResult> GetPayouts() { try { var aff = await GetAffiliate(); return Ok(await _db.Payouts.Where(x => x.AffiliateId == aff.Id).OrderByDescending(x => x.RequestedAt).ToListAsync()); } catch { return Unauthorized(); } }

    [AllowAnonymous]
    [HttpPost("payouts")] public async Task<IActionResult> RequestPayout([FromBody] Payout data) { var aff = await GetAffiliate(); if (aff.AvailableBalance <= 0) return BadRequest("No balance available"); var p = new Payout { Id = Guid.NewGuid(), AffiliateId = aff.Id, Amount = Math.Min(data.Amount, aff.AvailableBalance), Fee = 0, Method = data.Method, Status = "pending", Notes = data.Notes, RequestedAt = DateTime.UtcNow, CreatedAt = DateTime.UtcNow }; _db.Payouts.Add(p); aff.AvailableBalance -= p.Amount; aff.TotalPaid += p.Amount; aff.UpdatedAt = DateTime.UtcNow; await _db.SaveChangesAsync(); return CreatedAtAction(nameof(GetPayouts), new { id = p.Id }, p); }

    [AllowAnonymous]
    [HttpGet("notifications")] public async Task<IActionResult> GetNotifications() { try { var aff = await GetAffiliate(); return Ok(await _db.AffiliateNotifications.Where(x => x.AffiliateId == aff.Id).OrderByDescending(x => x.CreatedAt).ToListAsync()); } catch { return Unauthorized(); } }

    [AllowAnonymous]
    [HttpPut("notifications/{id}/read")] public async Task<IActionResult> MarkNotificationRead(Guid id) { var aff = await GetAffiliate(); var n = await _db.AffiliateNotifications.FirstOrDefaultAsync(x => x.Id == id && x.AffiliateId == aff.Id); if (n == null) return NotFound(); n.IsRead = true; n.ReadAt = DateTime.UtcNow; await _db.SaveChangesAsync(); return Ok(n); }

    [AllowAnonymous]
    [HttpGet("analytics")] public async Task<IActionResult> GetAnalytics() { try { var aff = await GetAffiliate(); var referrals = await _db.Referrals.Where(x => x.AffiliateId == aff.Id).ToListAsync(); var commissions = await _db.Commissions.Where(x => x.AffiliateId == aff.Id).ToListAsync(); var payouts = await _db.Payouts.Where(x => x.AffiliateId == aff.Id).ToListAsync(); return Ok(new { totalReferrals = referrals.Count, convertedReferrals = referrals.Count(x => x.Status == "converted"), totalCommission = commissions.Sum(x => x.Amount), pendingCommission = commissions.Where(x => x.Status == "pending").Sum(x => x.Amount), paidCommission = commissions.Where(x => x.Status == "paid").Sum(x => x.Amount), totalPayouts = payouts.Sum(x => x.Amount), referralsByMonth = referrals.GroupBy(x => x.CreatedAt.ToString("yyyy-MM", null)).ToDictionary(g => g.Key, g => g.Count()), commissionByMonth = commissions.Where(x => x.EarnedAt != null).GroupBy(x => x.EarnedAt.Value.ToString("yyyy-MM")).ToDictionary(g => g.Key, g => g.Sum(x => x.Amount)) }); } catch { return Unauthorized(); } }

    [AllowAnonymous]
    [HttpGet("leaderboard")] public async Task<IActionResult> GetLeaderboard() => Ok(await _db.LeaderboardEntries.OrderBy(x => x.Rank).ToListAsync());

    [AllowAnonymous]
    [HttpGet("bonuses")] public async Task<IActionResult> GetBonuses() { try { var aff = await GetAffiliate(); return Ok(await _db.BonusAwards.Where(x => x.AffiliateId == aff.Id).OrderByDescending(x => x.CreatedAt).ToListAsync()); } catch { return Unauthorized(); } }

    [AllowAnonymous]
    [HttpGet("dashboard")] public async Task<IActionResult> GetDashboard() { try { var aff = await GetAffiliate(); var referralsCount = await _db.Referrals.CountAsync(x => x.AffiliateId == aff.Id); var commissionsCount = await _db.Commissions.CountAsync(x => x.AffiliateId == aff.Id); var campaignsCount = await _db.AffiliateCampaigns.CountAsync(x => x.AffiliateId == aff.Id); var pendingPayouts = await _db.Payouts.Where(x => x.AffiliateId == aff.Id && x.Status == "pending").SumAsync(x => x.Amount); var unreadNotifications = await _db.AffiliateNotifications.CountAsync(x => x.AffiliateId == aff.Id && !x.IsRead); return Ok(new { aff.TotalEarnings, aff.AvailableBalance, aff.PendingCommissions, aff.TotalPaid, aff.LifetimeReferrals, aff.ConversionRate, aff.Tier, referralsCount, commissionsCount, campaignsCount, pendingPayouts, unreadNotifications }); } catch { return Unauthorized(); } }

    // ─── Admin: Dashboard ────────────────────────────────────────
    [HttpGet("admin/dashboard")] public async Task<IActionResult> AdminGetDashboard()
    {
        var totalAffiliates = await _db.Affiliates.CountAsync();
        var activeAffiliates = await _db.Affiliates.CountAsync(x => x.Status == "approved");
        var pendingApprovals = await _db.Affiliates.CountAsync(x => x.Status == "pending");
        var totalReferrals = await _db.Referrals.CountAsync();
        var totalConversions = await _db.Referrals.CountAsync(x => x.Status == "converted");
        var totalCommissions = await _db.Commissions.SumAsync(x => (decimal?)x.Amount) ?? 0;
        var pendingPayouts = await _db.Payouts.CountAsync(x => x.Status == "pending");
        var now = DateTime.UtcNow;
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var monthlyReferrals = await _db.Referrals.CountAsync(x => x.CreatedAt >= monthStart);
        var monthlyConversions = await _db.Referrals.CountAsync(x => x.Status == "converted" && x.ConvertedAt >= monthStart);
        var monthlyCommissions = await _db.Commissions.Where(x => x.EarnedAt >= monthStart).SumAsync(x => (decimal?)x.Amount) ?? 0;
        var openFraudFlags = await _db.FraudFlags.CountAsync(x => x.Status == "open");
        var recentReferrals = await _db.Referrals.OrderByDescending(x => x.CreatedAt).Take(10).ToListAsync();
        var topAffiliates = await _db.Affiliates.Where(x => x.Status == "approved").OrderByDescending(x => x.LifetimeReferrals).Take(10).Select(x => new { id = x.Id.ToString(), name = x.BusinessName, referrals = x.LifetimeReferrals, commissions = x.TotalEarnings }).ToListAsync();
        return Ok(new { totalAffiliates, activeAffiliates, pendingApprovals, totalReferrals, totalConversions, totalCommissions, pendingPayouts, monthlyReferrals, monthlyConversions, monthlyCommissions, openFraudFlags, recentReferrals, topAffiliates });
    }

    // ─── Admin: Affiliates ───────────────────────────────────────
    [HttpGet("admin/affiliates")] public async Task<IActionResult> AdminGetAffiliates() => Ok(await _db.Affiliates.OrderByDescending(x => x.CreatedAt).ToListAsync());

    [HttpGet("admin/affiliates/{id}")] public async Task<IActionResult> AdminGetAffiliate(Guid id) => Ok(await _db.Affiliates.FindAsync(id));

    [HttpPut("admin/affiliates/{id}")] public async Task<IActionResult> AdminUpdateAffiliate(Guid id, [FromBody] Affiliate data) { var aff = await _db.Affiliates.FindAsync(id); if (aff == null) return NotFound(); aff.Status = data.Status; aff.Tier = data.Tier; aff.ApplicationNotes = data.ApplicationNotes; aff.RejectedReason = data.RejectedReason; aff.ReviewedById = data.ReviewedById; aff.ReviewedAt = DateTime.UtcNow; aff.PreferredCurrency = data.PreferredCurrency; aff.UpdatedAt = DateTime.UtcNow; await _db.SaveChangesAsync(); return Ok(aff); }

    // ─── Admin: Commission Rules ─────────────────────────────────
    [HttpGet("admin/commission-rules")] public async Task<IActionResult> GetCommissionRules() => Ok(await _db.CommissionRules.OrderBy(x => x.SortOrder).ToListAsync());

    [HttpPost("admin/commission-rules")] public async Task<IActionResult> CreateCommissionRule([FromBody] CommissionRule data) { data.Id = Guid.NewGuid(); data.CreatedAt = DateTime.UtcNow; _db.CommissionRules.Add(data); await _db.SaveChangesAsync(); return CreatedAtAction(nameof(GetCommissionRules), new { id = data.Id }, data); }

    [HttpPut("admin/commission-rules/{id}")] public async Task<IActionResult> UpdateCommissionRule(Guid id, [FromBody] CommissionRule data) { var r = await _db.CommissionRules.FindAsync(id); if (r == null) return NotFound(); r.Name = data.Name; r.Description = data.Description; r.Type = data.Type; r.TargetEntity = data.TargetEntity; r.Amount = data.Amount; r.Percentage = data.Percentage; r.TierMin = data.TierMin; r.TierMax = data.TierMax; r.RecurringMonths = data.RecurringMonths; r.RecurringAmount = data.RecurringAmount; r.IsActive = data.IsActive; r.SortOrder = data.SortOrder; await _db.SaveChangesAsync(); return Ok(r); }

    [HttpDelete("admin/commission-rules/{id}")] public async Task<IActionResult> DeleteCommissionRule(Guid id) { var r = await _db.CommissionRules.FindAsync(id); if (r == null) return NotFound(); _db.CommissionRules.Remove(r); await _db.SaveChangesAsync(); return NoContent(); }

    // ─── Admin: Payouts ──────────────────────────────────────────
    [HttpGet("admin/payouts")] public async Task<IActionResult> AdminGetPayouts() => Ok(await _db.Payouts.OrderByDescending(x => x.RequestedAt).ToListAsync());

    [HttpPut("admin/payouts/{id}")] public async Task<IActionResult> AdminUpdatePayout(Guid id, [FromBody] Payout data) { var p = await _db.Payouts.FindAsync(id); if (p == null) return NotFound(); p.Status = data.Status; p.Fee = data.Fee; p.TransactionReference = data.TransactionReference; p.BankReference = data.BankReference; p.Notes = data.Notes; p.ProcessedById = data.ProcessedById; p.ProcessedAt = data.Status == "processed" || data.Status == "paid" ? DateTime.UtcNow : p.ProcessedAt; await _db.SaveChangesAsync(); return Ok(p); }

    // ─── Admin: Fraud Flags ──────────────────────────────────────
    [HttpGet("admin/fraud-flags")] public async Task<IActionResult> GetFraudFlags() => Ok(await _db.FraudFlags.OrderByDescending(x => x.CreatedAt).ToListAsync());

    [HttpPost("admin/fraud-flags")] public async Task<IActionResult> CreateFraudFlag([FromBody] FraudFlag data) { data.Id = Guid.NewGuid(); data.Status = "open"; data.CreatedAt = DateTime.UtcNow; _db.FraudFlags.Add(data); await _db.SaveChangesAsync(); return CreatedAtAction(nameof(GetFraudFlags), new { id = data.Id }, data); }

    [HttpPut("admin/fraud-flags/{id}")] public async Task<IActionResult> UpdateFraudFlag(Guid id, [FromBody] FraudFlag data) { var f = await _db.FraudFlags.FindAsync(id); if (f == null) return NotFound(); f.Status = data.Status; f.ResolvedById = data.ResolvedById; f.ResolvedAt = data.Status == "resolved" ? DateTime.UtcNow : f.ResolvedAt; await _db.SaveChangesAsync(); return Ok(f); }

    // ─── Admin: Analytics ────────────────────────────────────────
    [HttpGet("admin/analytics")] public async Task<IActionResult> AdminGetAnalytics() { var totalAffiliates = await _db.Affiliates.CountAsync(); var activeAffiliates = await _db.Affiliates.CountAsync(x => x.Status == "approved"); var pendingAffiliates = await _db.Affiliates.CountAsync(x => x.Status == "pending"); var totalReferrals = await _db.Referrals.CountAsync(); var convertedReferrals = await _db.Referrals.CountAsync(x => x.Status == "converted"); var totalCommissions = await _db.Commissions.SumAsync(x => x.Amount); var pendingCommissions = await _db.Commissions.Where(x => x.Status == "pending").SumAsync(x => x.Amount); var totalPayouts = await _db.Payouts.SumAsync(x => x.Amount); var totalEarnings = await _db.Affiliates.SumAsync(x => x.TotalEarnings); var fraudFlags = await _db.FraudFlags.CountAsync(x => x.Status == "open"); return Ok(new { totalAffiliates, activeAffiliates, pendingAffiliates, totalReferrals, convertedReferrals, conversionRate = totalReferrals > 0 ? (double)convertedReferrals / totalReferrals * 100 : 0, totalCommissions, pendingCommissions, totalPayouts, totalEarnings, fraudFlags }); }

    // ─── Admin: Marketing Assets ─────────────────────────────────
    [HttpGet("admin/marketing-assets")] public async Task<IActionResult> GetMarketingAssets() => Ok(await _db.MarketingAssets.OrderBy(x => x.SortOrder).ToListAsync());

    [HttpPost("admin/marketing-assets")] public async Task<IActionResult> CreateMarketingAsset([FromBody] MarketingAsset data) { data.Id = Guid.NewGuid(); data.CreatedAt = DateTime.UtcNow; _db.MarketingAssets.Add(data); await _db.SaveChangesAsync(); return CreatedAtAction(nameof(GetMarketingAssets), new { id = data.Id }, data); }

    [HttpPut("admin/marketing-assets/{id}")] public async Task<IActionResult> UpdateMarketingAsset(Guid id, [FromBody] MarketingAsset data) { var a = await _db.MarketingAssets.FindAsync(id); if (a == null) return NotFound(); a.Title = data.Title; a.Description = data.Description; a.Category = data.Category; a.Type = data.Type; a.FileUrl = data.FileUrl; a.PreviewUrl = data.PreviewUrl; a.DownloadUrl = data.DownloadUrl; a.FileSize = data.FileSize; a.MimeType = data.MimeType; a.IsActive = data.IsActive; a.SortOrder = data.SortOrder; await _db.SaveChangesAsync(); return Ok(a); }

    [HttpDelete("admin/marketing-assets/{id}")] public async Task<IActionResult> DeleteMarketingAsset(Guid id) { var a = await _db.MarketingAssets.FindAsync(id); if (a == null) return NotFound(); _db.MarketingAssets.Remove(a); await _db.SaveChangesAsync(); return NoContent(); }

    // ─── Admin: Bonuses ──────────────────────────────────────────
    [HttpGet("admin/bonuses")] public async Task<IActionResult> AdminGetBonuses() => Ok(await _db.BonusAwards.OrderByDescending(x => x.CreatedAt).ToListAsync());

    [HttpPost("admin/bonuses")] public async Task<IActionResult> CreateBonus([FromBody] BonusAward data) { data.Id = Guid.NewGuid(); data.AwardedAt = data.IsAwarded ? DateTime.UtcNow : null; data.CreatedAt = DateTime.UtcNow; _db.BonusAwards.Add(data); await _db.SaveChangesAsync(); return CreatedAtAction(nameof(AdminGetBonuses), new { id = data.Id }, data); }

    // ─── Admin: Leaderboard ──────────────────────────────────────
    [HttpGet("admin/leaderboard")] public async Task<IActionResult> AdminGetLeaderboard() => Ok(await _db.LeaderboardEntries.OrderBy(x => x.Rank).ToListAsync());

    [HttpPost("admin/leaderboard/generate")] public async Task<IActionResult> GenerateLeaderboard([FromBody] LeaderboardEntry data) { var existing = await _db.LeaderboardEntries.Where(x => x.Period == data.Period).ToListAsync(); _db.LeaderboardEntries.RemoveRange(existing); var affiliates = await _db.Affiliates.Where(x => x.Status == "approved").ToListAsync(); var entries = affiliates.Select((aff, i) => new LeaderboardEntry { Id = Guid.NewGuid(), AffiliateId = aff.Id, Period = data.Period, Rank = i + 1, Referrals = aff.LifetimeReferrals, Earnings = aff.TotalEarnings, Revenue = 0, PeriodStart = data.PeriodStart, PeriodEnd = data.PeriodEnd, UpdatedAt = DateTime.UtcNow }).OrderByDescending(x => x.Earnings).Select((x, i) => { x.Rank = i + 1; return x; }).ToList(); _db.LeaderboardEntries.AddRange(entries); await _db.SaveChangesAsync(); return Ok(entries); }

    // ─── Code Generator ──────────────────────────────────────────
    private static string GenerateCode() => "PAF-" + Guid.NewGuid().ToString("N")[..8].ToUpperInvariant();
}
