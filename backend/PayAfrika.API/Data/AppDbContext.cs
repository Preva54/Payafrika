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
    }
}
