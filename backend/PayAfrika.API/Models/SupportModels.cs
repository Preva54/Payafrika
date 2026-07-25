using System.ComponentModel.DataAnnotations;

namespace PayAfrika.API.Models;

public class SupportTicket
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(300)]
    public string Subject { get; set; } = string.Empty;

    [Required, MaxLength(10000)]
    public string Description { get; set; } = string.Empty;

    [Required, MaxLength(50)]
    public string Status { get; set; } = "open"; // open, in_progress, waiting_customer, resolved, closed

    [Required, MaxLength(20)]
    public string Priority { get; set; } = "medium"; // low, medium, high, urgent

    [Required, MaxLength(100)]
    public string Category { get; set; } = "general";

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public Guid? AssignedToId { get; set; }
    public User? AssignedTo { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ResolvedAt { get; set; }
    public DateTime? ClosedAt { get; set; }

    public ICollection<ChatMessage> Messages { get; set; } = new List<ChatMessage>();
    public ICollection<TicketAttachment> Attachments { get; set; } = new List<TicketAttachment>();
    public ICollection<TicketSatisfaction> Satisfactions { get; set; } = new List<TicketSatisfaction>();
}

public class ChatMessage
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid TicketId { get; set; }
    public SupportTicket Ticket { get; set; } = null!;

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    [Required, MaxLength(10000)]
    public string Content { get; set; } = string.Empty;

    public bool IsFromAgent { get; set; }
    public bool IsInternalNote { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReadAt { get; set; }

    public ICollection<ChatAttachment> Attachments { get; set; } = new List<ChatAttachment>();
}

public class ChatAttachment
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid MessageId { get; set; }
    public ChatMessage Message { get; set; } = null!;

    [Required, MaxLength(300)]
    public string FileName { get; set; } = string.Empty;

    [Required, MaxLength(500)]
    public string FileUrl { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string MimeType { get; set; } = string.Empty;

    public long FileSize { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class TicketAttachment
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid TicketId { get; set; }
    public SupportTicket Ticket { get; set; } = null!;

    [Required, MaxLength(300)]
    public string FileName { get; set; } = string.Empty;

    [Required, MaxLength(500)]
    public string FileUrl { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string MimeType { get; set; } = string.Empty;

    public long FileSize { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class TicketSatisfaction
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid TicketId { get; set; }
    public SupportTicket Ticket { get; set; } = null!;

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    [Range(1, 5)]
    public int Rating { get; set; }

    [MaxLength(2000)]
    public string? Comment { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class KnowledgeBaseArticle
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(300)]
    public string Title { get; set; } = string.Empty;

    [Required, MaxLength(500)]
    public string Slug { get; set; } = string.Empty;

    [Required]
    public string Content { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string Excerpt { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string Category { get; set; } = "general";

    [Required, MaxLength(20)]
    public string Status { get; set; } = "draft"; // draft, published, archived

    public bool IsFeatured { get; set; } = false;
    public int ViewCount { get; set; } = 0;
    public int HelpfulCount { get; set; } = 0;
    public int NotHelpfulCount { get; set; } = 0;

    public Guid? AuthorId { get; set; }
    public User? Author { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? PublishedAt { get; set; }
}

public class SupportCategory
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(50)]
    public string Key { get; set; } = string.Empty;

    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Icon { get; set; } = "HelpCircle";

    [MaxLength(10)]
    public string Color { get; set; } = "#0057FF";

    public int DisplayOrder { get; set; } = 0;
    public bool IsActive { get; set; } = true;
}