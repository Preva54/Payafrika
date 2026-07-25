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
    }
}
