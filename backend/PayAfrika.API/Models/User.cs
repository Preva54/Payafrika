using System.ComponentModel.DataAnnotations;

namespace PayAfrika.API.Models;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(100)]
    public string FullName { get; set; } = string.Empty;

    [MaxLength(35)]
    public string? Username { get; set; }

    [Required, MaxLength(200)]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string PasswordHash { get; set; } = string.Empty;

    [MaxLength(20)]
    public string? PhoneNumber { get; set; }

    [MaxLength(100)]
    public string? Country { get; set; }

    public string Role { get; set; } = "customer"; // customer, business, admin
    public string? KYCStatus { get; set; } = "pending"; // pending, verified, rejected
    public int KycLevel { get; set; } // 0 none, 1 basic, 2 identity, 3 full
    public bool IsEmailVerified { get; set; }
    public bool IsPhoneVerified { get; set; }
    public bool TwoFactorEnabled { get; set; }

    [MaxLength(20)]
    public string TwoFactorMethod { get; set; } = "none"; // none, sms, email, authenticator

    [MaxLength(500)]
    public string? TotpSecretEncrypted { get; set; }

    [MaxLength(1000)]
    public string? BackupCodesHash { get; set; }

    public int FailedLoginCount { get; set; }

    public DateTime? LockedUntil { get; set; }

    public string? AvatarUrl { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public Wallet? Wallet { get; set; }
    public ICollection<Loan> Loans { get; set; } = new List<Loan>();
    public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
    public ICollection<Beneficiary> Beneficiaries { get; set; } = new List<Beneficiary>();
    public ICollection<ScheduledPayment> ScheduledPayments { get; set; } = new List<ScheduledPayment>();
    public ICollection<WalletBalance> WalletBalances { get; set; } = new List<WalletBalance>();
    public ICollection<LinkedBank> LinkedBanks { get; set; } = new List<LinkedBank>();
    public ICollection<BankVerification> BankVerifications { get; set; } = new List<BankVerification>();

    public ICollection<SupportTicket> SupportTickets { get; set; } = new List<SupportTicket>();
    public ICollection<SupportTicket> AssignedTickets { get; set; } = new List<SupportTicket>();
    public ICollection<ChatMessage> ChatMessages { get; set; } = new List<ChatMessage>();
    public ICollection<TicketSatisfaction> Satisfactions { get; set; } = new List<TicketSatisfaction>();
    public ICollection<KnowledgeBaseArticle> AuthoredArticles { get; set; } = new List<KnowledgeBaseArticle>();
    public ICollection<Card> Cards { get; set; } = new List<Card>();
}
