using Microsoft.EntityFrameworkCore;
using PayAfrika.API.Models;

namespace PayAfrika.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Wallet> Wallets => Set<Wallet>();
    public DbSet<Loan> Loans => Set<Loan>();
    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<Beneficiary> Beneficiaries => Set<Beneficiary>();
    public DbSet<ScheduledPayment> ScheduledPayments => Set<ScheduledPayment>();
    public DbSet<WalletBalance> WalletBalances => Set<WalletBalance>();
    public DbSet<LinkedBank> LinkedBanks => Set<LinkedBank>();

    public DbSet<SupportTicket> SupportTickets => Set<SupportTicket>();
    public DbSet<ChatMessage> ChatMessages => Set<ChatMessage>();
    public DbSet<ChatAttachment> ChatAttachments => Set<ChatAttachment>();
    public DbSet<TicketAttachment> TicketAttachments => Set<TicketAttachment>();
    public DbSet<TicketSatisfaction> TicketSatisfactions => Set<TicketSatisfaction>();
    public DbSet<KnowledgeBaseArticle> KnowledgeBaseArticles => Set<KnowledgeBaseArticle>();
    public DbSet<SupportCategory> SupportCategories => Set<SupportCategory>();
    public DbSet<Card> Cards => Set<Card>();
    public DbSet<BusinessProfile> BusinessProfiles => Set<BusinessProfile>();
    public DbSet<UserPreference> UserPreferences => Set<UserPreference>();
    public DbSet<ApiKey> ApiKeys => Set<ApiKey>();
    public DbSet<TeamMember> TeamMembers => Set<TeamMember>();
    public DbSet<ConnectedDevice> ConnectedDevices => Set<ConnectedDevice>();
    public DbSet<ActivityLog> ActivityLogs => Set<ActivityLog>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<Integration> Integrations => Set<Integration>();
    public DbSet<KycApplication> KycApplications => Set<KycApplication>();
    public DbSet<KycDocument> KycDocuments => Set<KycDocument>();
    public DbSet<KycReview> KycReviews => Set<KycReview>();
    public DbSet<KycTimelineEvent> KycTimelineEvents => Set<KycTimelineEvent>();

    public DbSet<ContentPage> ContentPages => Set<ContentPage>();
    public DbSet<BlogCategory> BlogCategories => Set<BlogCategory>();
    public DbSet<BlogPost> BlogPosts => Set<BlogPost>();
    public DbSet<Service> Services => Set<Service>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Testimonial> Testimonials => Set<Testimonial>();
    public DbSet<CmsTeamMember> CmsTeamMembers => Set<CmsTeamMember>();
    public DbSet<Partner> Partners => Set<Partner>();
    public DbSet<JobPosition> JobPositions => Set<JobPosition>();
    public DbSet<JobApplication> JobApplications => Set<JobApplication>();
    public DbSet<FaqCategory> FaqCategories => Set<FaqCategory>();
    public DbSet<Faq> Faqs => Set<Faq>();
    public DbSet<MediaFolder> MediaFolders => Set<MediaFolder>();
    public DbSet<MediaFile> MediaFiles => Set<MediaFile>();
    public DbSet<NavigationMenu> NavigationMenus => Set<NavigationMenu>();
    public DbSet<FooterConfig> FooterConfigs => Set<FooterConfig>();
    public DbSet<Popup> Popups => Set<Popup>();
    public DbSet<Announcement> Announcements => Set<Announcement>();
    public DbSet<CmsForm> CmsForms => Set<CmsForm>();
    public DbSet<FormSubmission> FormSubmissions => Set<FormSubmission>();
    public DbSet<LegalPage> LegalPages => Set<LegalPage>();
    public DbSet<ApiDoc> ApiDocs => Set<ApiDoc>();
    public DbSet<SupportContent> SupportContents => Set<SupportContent>();
    public DbSet<ContentVersion> ContentVersions => Set<ContentVersion>();
    public DbSet<ContentRevision> ContentRevisions => Set<ContentRevision>();
    public DbSet<Campaign> Campaigns => Set<Campaign>();
    public DbSet<Affiliate> Affiliates => Set<Affiliate>();
    public DbSet<CommissionRule> CommissionRules => Set<CommissionRule>();
    public DbSet<Referral> Referrals => Set<Referral>();
    public DbSet<AffiliateCampaign> AffiliateCampaigns => Set<AffiliateCampaign>();
    public DbSet<Payout> Payouts => Set<Payout>();
    public DbSet<BonusAward> BonusAwards => Set<BonusAward>();
    public DbSet<LeaderboardEntry> LeaderboardEntries => Set<LeaderboardEntry>();
    public DbSet<MarketingAsset> MarketingAssets => Set<MarketingAsset>();
    public DbSet<AffiliateNotification> AffiliateNotifications => Set<AffiliateNotification>();
    public DbSet<FraudFlag> FraudFlags => Set<FraudFlag>();
    public DbSet<Commission> Commissions => Set<Commission>();
    public DbSet<RoleDefinition> RoleDefinitions => Set<RoleDefinition>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<UserRoleAssignment> UserRoleAssignments => Set<UserRoleAssignment>();
    public DbSet<Invitation> Invitations => Set<Invitation>();
    public DbSet<ScheduledReport> ScheduledReports => Set<ScheduledReport>();
    public DbSet<ReportExportJob> ReportExportJobs => Set<ReportExportJob>();
    public DbSet<PlatformSetting> PlatformSettings => Set<PlatformSetting>();
    public DbSet<SettingChangeLog> SettingChangeLogs => Set<SettingChangeLog>();

    public DbSet<Currency> Currencies => Set<Currency>();
    public DbSet<ExchangeRate> ExchangeRates => Set<ExchangeRate>();
    public DbSet<ExchangeRateProvider> ExchangeRateProviders => Set<ExchangeRateProvider>();
    public DbSet<CurrencyPair> CurrencyPairs => Set<CurrencyPair>();
    public DbSet<FxMargin> FxMargins => Set<FxMargin>();
    public DbSet<ConversionRule> ConversionRules => Set<ConversionRule>();
    public DbSet<SettlementCurrency> SettlementCurrencies => Set<SettlementCurrency>();
    public DbSet<RegionalCurrencyRule> RegionalCurrencyRules => Set<RegionalCurrencyRule>();
    public DbSet<ExchangeAlert> ExchangeAlerts => Set<ExchangeAlert>();
    public DbSet<FxAuditLog> FxAuditLogs => Set<FxAuditLog>();
    public DbSet<Deposit> Deposits => Set<Deposit>();
    public DbSet<Withdrawal> Withdrawals => Set<Withdrawal>();
    public DbSet<CurrencyExchange> CurrencyExchanges => Set<CurrencyExchange>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(u => u.Email).IsUnique();
            entity.HasOne(u => u.Wallet)
                  .WithOne(w => w.User)
                  .HasForeignKey<Wallet>(w => w.UserId);
        });

        modelBuilder.Entity<Loan>(entity =>
        {
            entity.HasOne(l => l.User)
                  .WithMany(u => u.Loans)
                  .HasForeignKey(l => l.UserId);
        });

        modelBuilder.Entity<Transaction>(entity =>
        {
            entity.HasOne(t => t.User)
                  .WithMany(u => u.Transactions)
                  .HasForeignKey(t => t.UserId);
        });

        modelBuilder.Entity<Beneficiary>(entity =>
        {
            entity.HasOne(b => b.User)
                  .WithMany(u => u.Beneficiaries)
                  .HasForeignKey(b => b.UserId);
        });

        modelBuilder.Entity<ScheduledPayment>(entity =>
        {
            entity.HasOne(s => s.User)
                  .WithMany(u => u.ScheduledPayments)
                  .HasForeignKey(s => s.UserId);
        });

        modelBuilder.Entity<WalletBalance>(entity =>
        {
            entity.HasOne(wb => wb.User)
                  .WithMany(u => u.WalletBalances)
                  .HasForeignKey(wb => wb.UserId);
            entity.HasIndex(wb => new { wb.UserId, wb.Currency }).IsUnique();
        });

        modelBuilder.Entity<LinkedBank>(entity =>
        {
            entity.HasOne(lb => lb.User)
                  .WithMany(u => u.LinkedBanks)
                  .HasForeignKey(lb => lb.UserId);
        });

        modelBuilder.Entity<SupportTicket>(entity =>
        {
            entity.HasOne(t => t.User)
                  .WithMany(u => u.SupportTickets)
                  .HasForeignKey(t => t.UserId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(t => t.AssignedTo)
                  .WithMany(u => u.AssignedTickets)
                  .HasForeignKey(t => t.AssignedToId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(t => t.UserId);
            entity.HasIndex(t => t.Status);
            entity.HasIndex(t => t.Category);
            entity.HasIndex(t => t.CreatedAt);
        });

        modelBuilder.Entity<ChatMessage>(entity =>
        {
            entity.HasOne(m => m.Ticket)
                  .WithMany(t => t.Messages)
                  .HasForeignKey(m => m.TicketId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(m => m.User)
                  .WithMany(u => u.ChatMessages)
                  .HasForeignKey(m => m.UserId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(m => m.TicketId);
            entity.HasIndex(m => m.CreatedAt);
        });

        modelBuilder.Entity<ChatAttachment>(entity =>
        {
            entity.HasOne(a => a.Message)
                  .WithMany(m => m.Attachments)
                  .HasForeignKey(a => a.MessageId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<TicketAttachment>(entity =>
        {
            entity.HasOne(a => a.Ticket)
                  .WithMany(t => t.Attachments)
                  .HasForeignKey(a => a.TicketId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<TicketSatisfaction>(entity =>
        {
            entity.HasOne(s => s.Ticket)
                  .WithMany(t => t.Satisfactions)
                  .HasForeignKey(s => s.TicketId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(s => s.User)
                  .WithMany(u => u.Satisfactions)
                  .HasForeignKey(s => s.UserId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(s => new { s.TicketId, s.UserId }).IsUnique();
        });

        modelBuilder.Entity<KnowledgeBaseArticle>(entity =>
        {
            entity.HasOne(a => a.Author)
                  .WithMany(u => u.AuthoredArticles)
                  .HasForeignKey(a => a.AuthorId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(a => a.Slug).IsUnique();
            entity.HasIndex(a => a.Category);
            entity.HasIndex(a => a.Status);
            entity.HasIndex(a => a.IsFeatured);
        });

        modelBuilder.Entity<SupportCategory>(entity =>
        {
            entity.HasIndex(c => c.Key).IsUnique();
            entity.HasIndex(c => c.DisplayOrder);
        });

        modelBuilder.Entity<Card>(entity =>
        {
            entity.HasOne(c => c.User)
                  .WithMany(u => u.Cards)
                  .HasForeignKey(c => c.UserId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(c => c.UserId);
            entity.HasIndex(c => c.IsActive);
        });

        modelBuilder.Entity<BusinessProfile>(entity =>
        {
            entity.HasOne(bp => bp.User)
                  .WithOne()
                  .HasForeignKey<BusinessProfile>(bp => bp.UserId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(bp => bp.UserId).IsUnique();
        });

        modelBuilder.Entity<UserPreference>(entity =>
        {
            entity.HasOne(up => up.User)
                  .WithMany()
                  .HasForeignKey(up => up.UserId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(up => new { up.UserId, up.Category, up.Key }).IsUnique();
        });

        modelBuilder.Entity<ApiKey>(entity =>
        {
            entity.HasOne(ak => ak.User)
                  .WithMany()
                  .HasForeignKey(ak => ak.UserId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(ak => ak.UserId);
        });

        modelBuilder.Entity<TeamMember>(entity =>
        {
            entity.HasOne(tm => tm.BusinessUser)
                  .WithMany()
                  .HasForeignKey(tm => tm.BusinessUserId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(tm => new { tm.BusinessUserId, tm.MemberEmail }).IsUnique();
        });

        modelBuilder.Entity<ConnectedDevice>(entity =>
        {
            entity.HasOne(d => d.User)
                  .WithMany()
                  .HasForeignKey(d => d.UserId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(d => d.UserId);
            entity.HasIndex(d => d.LastActiveAt);
        });

        modelBuilder.Entity<ActivityLog>(entity =>
        {
            entity.HasOne(al => al.User)
                  .WithMany()
                  .HasForeignKey(al => al.UserId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(al => al.UserId);
            entity.HasIndex(al => al.CreatedAt);
            entity.HasIndex(al => al.Category);
        });

        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.HasOne(al => al.User)
                  .WithMany()
                  .HasForeignKey(al => al.UserId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(al => al.UserId);
            entity.HasIndex(al => al.CreatedAt);
            entity.HasIndex(al => al.Module);
            entity.HasIndex(al => al.Action);
            entity.HasIndex(al => al.Severity);
            entity.HasIndex(al => al.Result);
            entity.HasIndex(al => al.Email);
            entity.HasIndex(al => al.IPAddress);
            entity.HasIndex(al => al.Country);
            entity.HasIndex(al => al.IsSecurityAlert);
            entity.HasIndex(al => al.ResourceId);
            entity.HasIndex(al => al.CorrelationId);
        });

        modelBuilder.Entity<Integration>(entity =>
        {
            entity.HasOne(i => i.User)
                  .WithMany()
                  .HasForeignKey(i => i.UserId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(i => new { i.UserId, i.Provider }).IsUnique();
        });

        modelBuilder.Entity<KycApplication>(entity =>
        {
            entity.HasOne(a => a.User)
                  .WithMany()
                  .HasForeignKey(a => a.UserId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(a => a.UserId).IsUnique();
            entity.HasIndex(a => a.Status);
            entity.HasIndex(a => a.CreatedAt);
        });

        modelBuilder.Entity<KycDocument>(entity =>
        {
            entity.HasOne(d => d.KycApplication)
                  .WithMany(a => a.Documents)
                  .HasForeignKey(d => d.KycApplicationId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(d => d.KycApplicationId);
            entity.HasIndex(d => d.DocumentType);
        });

        modelBuilder.Entity<KycReview>(entity =>
        {
            entity.HasOne(r => r.KycApplication)
                  .WithMany(a => a.Reviews)
                  .HasForeignKey(r => r.KycApplicationId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(r => r.Reviewer)
                  .WithMany()
                  .HasForeignKey(r => r.ReviewerId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<KycTimelineEvent>(entity =>
        {
            entity.HasOne(t => t.KycApplication)
                  .WithMany(a => a.TimelineEvents)
                  .HasForeignKey(t => t.KycApplicationId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(t => t.KycApplicationId);
            entity.HasIndex(t => t.CreatedAt);
        });

        modelBuilder.Entity<ContentPage>(e => { e.HasIndex(x => x.Slug).IsUnique(); e.HasIndex(x => x.Status); });
        modelBuilder.Entity<BlogCategory>(e => { e.HasIndex(x => x.Slug).IsUnique(); });
        modelBuilder.Entity<BlogPost>(e => { e.HasIndex(x => x.Slug).IsUnique(); e.HasIndex(x => x.Status); e.HasIndex(x => x.CategoryId); });
        modelBuilder.Entity<Service>(e => { e.HasIndex(x => x.Slug).IsUnique(); e.HasIndex(x => x.Status); });
        modelBuilder.Entity<Product>(e => { e.HasIndex(x => x.Slug).IsUnique(); e.HasIndex(x => x.Status); });
        modelBuilder.Entity<FaqCategory>(e => { e.HasIndex(x => x.SortOrder); });
        modelBuilder.Entity<Faq>(e => { e.HasIndex(x => x.CategoryId); e.HasIndex(x => x.Priority); });
        modelBuilder.Entity<MediaFolder>(e => { e.HasOne(x => x.Parent).WithMany(x => x.Children).HasForeignKey(x => x.ParentId).OnDelete(DeleteBehavior.Restrict); });
        modelBuilder.Entity<CmsTeamMember>(e => { e.HasIndex(x => x.SortOrder); });
        modelBuilder.Entity<MediaFile>(e => { e.HasOne(x => x.Folder).WithMany(x => x.Files).HasForeignKey(x => x.FolderId).OnDelete(DeleteBehavior.SetNull); e.HasIndex(x => x.FolderId); });
        modelBuilder.Entity<JobApplication>(e => { e.HasOne(x => x.Position).WithMany().HasForeignKey(x => x.PositionId).OnDelete(DeleteBehavior.Cascade); e.HasIndex(x => x.PositionId); });
        modelBuilder.Entity<FormSubmission>(e => { e.HasOne(x => x.Form).WithMany().HasForeignKey(x => x.FormId).OnDelete(DeleteBehavior.Cascade); e.HasIndex(x => x.FormId); });
        modelBuilder.Entity<ContentVersion>(e => { e.HasIndex(x => new { x.EntityType, x.EntityId }); });
        modelBuilder.Entity<ContentRevision>(e => { e.HasIndex(x => new { x.EntityType, x.EntityId }); });

        modelBuilder.Entity<Affiliate>(e =>
        {
            e.HasIndex(x => x.UserId).IsUnique();
            e.HasIndex(x => x.ReferralCode).IsUnique();
            e.HasIndex(x => x.Status);
            e.HasIndex(x => x.Tier);
        });
        modelBuilder.Entity<CommissionRule>(e => { e.HasIndex(x => x.IsActive); });
        modelBuilder.Entity<Referral>(e =>
        {
            e.HasOne(x => x.Affiliate).WithMany(x => x.Referrals).HasForeignKey(x => x.AffiliateId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Campaign).WithMany().HasForeignKey(x => x.CampaignId).OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(x => x.AffiliateId);
            e.HasIndex(x => x.ReferralCode);
            e.HasIndex(x => x.Status);
            e.HasIndex(x => x.ReferredUserId);
            e.HasIndex(x => x.IsFraudSuspected);
        });
        modelBuilder.Entity<AffiliateCampaign>(e =>
        {
            e.HasOne(x => x.Affiliate).WithMany(x => x.Campaigns).HasForeignKey(x => x.AffiliateId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => x.AffiliateId);
            e.HasIndex(x => x.Status);
        });
        modelBuilder.Entity<Payout>(e =>
        {
            e.HasOne(x => x.Affiliate).WithMany(x => x.Payouts).HasForeignKey(x => x.AffiliateId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => x.AffiliateId);
            e.HasIndex(x => x.Status);
        });
        modelBuilder.Entity<BonusAward>(e =>
        {
            e.HasOne(x => x.Affiliate).WithMany(x => x.BonusAwards).HasForeignKey(x => x.AffiliateId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => x.AffiliateId);
        });
        modelBuilder.Entity<LeaderboardEntry>(e =>
        {
            e.HasOne(x => x.Affiliate).WithMany().HasForeignKey(x => x.AffiliateId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => new { x.Period, x.Rank });
        });
        modelBuilder.Entity<AffiliateNotification>(e =>
        {
            e.HasOne(x => x.Affiliate).WithMany(x => x.Notifications).HasForeignKey(x => x.AffiliateId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => x.AffiliateId);
            e.HasIndex(x => x.IsRead);
        });
        modelBuilder.Entity<FraudFlag>(e => { e.HasIndex(x => x.AffiliateId); e.HasIndex(x => x.Status); });
        modelBuilder.Entity<Commission>(e =>
        {
            e.HasOne(x => x.Affiliate).WithMany(x => x.Commissions).HasForeignKey(x => x.AffiliateId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => x.AffiliateId);
            e.HasIndex(x => x.Status);
        });

        modelBuilder.Entity<RoleDefinition>(e =>
        {
            e.HasIndex(x => x.Name).IsUnique();
            e.HasOne(x => x.ParentRole).WithMany(x => x.ChildRoles).HasForeignKey(x => x.ParentRoleId).OnDelete(DeleteBehavior.SetNull);
        });
        modelBuilder.Entity<Permission>(e =>
        {
            e.HasIndex(x => new { x.Module, x.Action }).IsUnique();
        });
        modelBuilder.Entity<RolePermission>(e =>
        {
            e.HasKey(x => new { x.RoleId, x.PermissionId });
            e.HasOne(x => x.Role).WithMany(x => x.RolePermissions).HasForeignKey(x => x.RoleId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Permission).WithMany(x => x.RolePermissions).HasForeignKey(x => x.PermissionId).OnDelete(DeleteBehavior.Cascade);
        });
        modelBuilder.Entity<UserRoleAssignment>(e =>
        {
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Role).WithMany(x => x.UserAssignments).HasForeignKey(x => x.RoleId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.AssignedBy).WithMany().HasForeignKey(x => x.AssignedById).OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(x => x.UserId);
            e.HasIndex(x => x.RoleId);
            e.HasIndex(x => x.Status);
        });

        modelBuilder.Entity<PlatformSetting>(e =>
        {
            e.HasIndex(x => new { x.Category, x.Key }).IsUnique();
            e.HasOne(x => x.UpdatedBy).WithMany().HasForeignKey(x => x.UpdatedById).OnDelete(DeleteBehavior.SetNull);
        });
        modelBuilder.Entity<SettingChangeLog>(e =>
        {
            e.HasIndex(x => new { x.Category, x.ChangedAt });
        });

        modelBuilder.Entity<Currency>(e =>
        {
            e.HasIndex(x => x.Code).IsUnique();
            e.HasIndex(x => x.IsActive);
        });

        modelBuilder.Entity<ExchangeRate>(e =>
        {
            e.HasOne(x => x.Provider).WithMany(x => x.ExchangeRates).HasForeignKey(x => x.ProviderId).OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(x => new { x.BaseCurrency, x.QuoteCurrency });
            e.HasIndex(x => x.IsActive);
        });

        modelBuilder.Entity<ExchangeRateProvider>(e =>
        {
            e.HasIndex(x => x.Name).IsUnique();
            e.HasIndex(x => x.IsPrimary);
            e.HasIndex(x => x.IsActive);
        });

        modelBuilder.Entity<CurrencyPair>(e =>
        {
            e.HasIndex(x => new { x.BaseCurrency, x.QuoteCurrency }).IsUnique();
            e.HasIndex(x => x.IsEnabled);
        });

        modelBuilder.Entity<FxMargin>(e =>
        {
            e.HasIndex(x => new { x.Type, x.IsActive });
        });

        modelBuilder.Entity<ConversionRule>(e =>
        {
            e.HasIndex(x => new { x.RuleType, x.IsActive });
        });

        modelBuilder.Entity<SettlementCurrency>(e =>
        {
            e.HasIndex(x => x.Currency).IsUnique();
            e.HasIndex(x => x.IsDefaultSettlement);
        });

        modelBuilder.Entity<RegionalCurrencyRule>(e =>
        {
            e.HasIndex(x => x.Country).IsUnique();
        });

        modelBuilder.Entity<ExchangeAlert>(e =>
        {
            e.HasIndex(x => x.AlertType);
        });

        modelBuilder.Entity<FxAuditLog>(e =>
        {
            e.HasIndex(x => x.CreatedAt);
            e.HasIndex(x => x.Action);
            e.HasIndex(x => x.EntityType);
        });

        modelBuilder.Entity<Deposit>(entity =>
        {
            entity.HasOne(d => d.User)
                  .WithMany()
                  .HasForeignKey(d => d.UserId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(d => d.ApprovedBy)
                  .WithMany()
                  .HasForeignKey(d => d.ApprovedById)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(d => d.Reference).IsUnique();
            entity.HasIndex(d => d.UserId);
            entity.HasIndex(d => d.Status);
            entity.HasIndex(d => d.CreatedAt);
        });

        modelBuilder.Entity<Withdrawal>(entity =>
        {
            entity.HasOne(w => w.User)
                  .WithMany()
                  .HasForeignKey(w => w.UserId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(w => w.ProcessedBy)
                  .WithMany()
                  .HasForeignKey(w => w.ProcessedById)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(w => w.Reference).IsUnique();
            entity.HasIndex(w => w.UserId);
            entity.HasIndex(w => w.Status);
            entity.HasIndex(w => w.CreatedAt);
        });

        modelBuilder.Entity<CurrencyExchange>(entity =>
        {
            entity.HasOne(e => e.User)
                  .WithMany()
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.ReversedBy)
                  .WithMany()
                  .HasForeignKey(e => e.ReversedById)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.SourceTransaction)
                  .WithMany()
                  .HasForeignKey(e => e.SourceTransactionId)
                  .OnDelete(DeleteBehavior.NoAction);

            entity.HasOne(e => e.DestTransaction)
                  .WithMany()
                  .HasForeignKey(e => e.DestTransactionId)
                  .OnDelete(DeleteBehavior.NoAction);

            entity.HasIndex(e => e.Reference).IsUnique();
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => e.FromCurrency);
            entity.HasIndex(e => e.ToCurrency);
        });
    }
}
