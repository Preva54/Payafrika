using System.ComponentModel.DataAnnotations;

namespace PayAfrika.API.DTOs;

public class TicketListQuery
{
    public int Page { get; set; } = 1;
    public int Limit { get; set; } = 20;
    public string? Status { get; set; }
    public string? Category { get; set; }
    public string? Priority { get; set; }
    public Guid? AssignedToId { get; set; }
    public string? Search { get; set; }
    public string SortBy { get; set; } = "createdAt";
    public string SortOrder { get; set; } = "desc";
}

public class CreateTicketRequest
{
    [Required, MaxLength(300)]
    public string Subject { get; set; } = string.Empty;

    [Required, MaxLength(10000)]
    public string Description { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Category { get; set; } = "general";

    [MaxLength(20)]
    public string Priority { get; set; } = "medium";
}

public class UpdateTicketRequest
{
    [MaxLength(300)]
    public string? Subject { get; set; }

    [MaxLength(50)]
    public string? Status { get; set; }

    [MaxLength(20)]
    public string? Priority { get; set; }

    [MaxLength(100)]
    public string? Category { get; set; }

    public Guid? AssignedToId { get; set; }
}

public class ChatMessageRequest
{
    [Required, MaxLength(10000)]
    public string Content { get; set; } = string.Empty;

    public bool IsInternalNote { get; set; } = false;
}

public class SubmitSatisfactionRequest
{
    [Required, Range(1, 5)]
    public int Rating { get; set; }

    [MaxLength(2000)]
    public string? Comment { get; set; }
}

public class KnowledgeBaseArticleRequest
{
    [Required, MaxLength(300)]
    public string Title { get; set; } = string.Empty;

    [Required, MaxLength(500)]
    public string Slug { get; set; } = string.Empty;

    [Required]
    public string Content { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string Excerpt { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Category { get; set; } = "general";

    [MaxLength(20)]
    public string Status { get; set; } = "draft";

    public bool IsFeatured { get; set; } = false;
}

public class KnowledgeBaseListQuery
{
    public int Page { get; set; } = 1;
    public int Limit { get; set; } = 20;
    public string? Category { get; set; }
    public string? Status { get; set; }
    public bool? IsFeatured { get; set; }
    public string? Search { get; set; }
}

public class TicketResponse
{
    public Guid Id { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string UserEmail { get; set; } = string.Empty;
    public Guid? AssignedToId { get; set; }
    public string? AssignedToName { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public DateTime? ClosedAt { get; set; }
    public int MessageCount { get; set; }
    public int UnreadCount { get; set; }
    public List<TicketAttachmentResponse> Attachments { get; set; } = new();
}

public class TicketAttachmentResponse
{
    public Guid Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string FileUrl { get; set; } = string.Empty;
    public string MimeType { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class TicketDetailResponse : TicketResponse
{
    public List<ChatMessageResponse> Messages { get; set; } = new();
}

public class ChatMessageResponse
{
    public Guid Id { get; set; }
    public Guid TicketId { get; set; }
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string UserEmail { get; set; } = string.Empty;
    public string UserAvatar { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public bool IsFromAgent { get; set; }
    public bool IsInternalNote { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ReadAt { get; set; }
    public List<ChatAttachmentResponse> Attachments { get; set; } = new();
}

public class ChatAttachmentResponse
{
    public Guid Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string FileUrl { get; set; } = string.Empty;
    public string MimeType { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class TicketSatisfactionResponse
{
    public Guid Id { get; set; }
    public Guid TicketId { get; set; }
    public Guid UserId { get; set; }
    public int Rating { get; set; }
    public string? Comment { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class SupportCategoryResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Key { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; }
}

public class CreateCategoryRequest
{
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
}

public class UpdateCategoryRequest
{
    [MaxLength(100)]
    public string? Name { get; set; }

    [MaxLength(500)]
    public string? Description { get; set; }

    [MaxLength(50)]
    public string? Icon { get; set; }

    [MaxLength(10)]
    public string? Color { get; set; }

    public int? DisplayOrder { get; set; }

    public bool? IsActive { get; set; }
}

public class KnowledgeBaseArticleResponse
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string Excerpt { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public bool IsFeatured { get; set; }
    public int ViewCount { get; set; }
    public int HelpfulCount { get; set; }
    public int NotHelpfulCount { get; set; }
    public Guid? AuthorId { get; set; }
    public string AuthorName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? PublishedAt { get; set; }
}

public class PaginatedResponse<T>
{
    public List<T> Data { get; set; } = new();
    public int Page { get; set; }
    public int Limit { get; set; }
    public int Total { get; set; }
    public int TotalPages { get; set; }
}

public class TicketStatsResponse
{
    public int TotalTickets { get; set; }
    public int OpenTickets { get; set; }
    public int InProgressTickets { get; set; }
    public int ResolvedTickets { get; set; }
    public int ClosedTickets { get; set; }
    public double AverageResolutionTimeHours { get; set; }
    public double SatisfactionScore { get; set; }
    public Dictionary<string, int> TicketsByCategory { get; set; } = new();
    public Dictionary<string, int> TicketsByPriority { get; set; } = new();
}