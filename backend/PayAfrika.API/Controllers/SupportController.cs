using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PayAfrika.API.Data;
using PayAfrika.API.DTOs;
using PayAfrika.API.Models;

namespace PayAfrika.API.Controllers;

[ApiController]
[Route("api/support")]
[Authorize]
public class SupportController : ControllerBase
{
    private readonly AppDbContext _db;

    public SupportController(AppDbContext db)
    {
        _db = db;
    }

    private Guid GetUserId()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                  ?? User.FindFirst("sub")?.Value
                  ?? User.FindFirst("userId")?.Value;
        return Guid.Parse(userId!);
    }

    private bool IsAdminOrAgent()
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value
                ?? User.FindFirst("role")?.Value;
        return role == "admin" || role == "support_agent";
    }

    [HttpGet("tickets")]
    public async Task<ActionResult<PaginatedResponse<TicketResponse>>> GetTickets([FromQuery] TicketListQuery query)
    {
        var userId = GetUserId();
        var isAdmin = IsAdminOrAgent();

        var q = _db.SupportTickets
            .Include(t => t.User)
            .Include(t => t.AssignedTo)
            .Include(t => t.Attachments)
            .Include(t => t.Messages)
            .AsQueryable();

        if (!isAdmin)
        {
            q = q.Where(t => t.UserId == userId);
        }

        if (!string.IsNullOrEmpty(query.Status))
            q = q.Where(t => t.Status == query.Status);

        if (!string.IsNullOrEmpty(query.Category))
            q = q.Where(t => t.Category == query.Category);

        if (!string.IsNullOrEmpty(query.Priority))
            q = q.Where(t => t.Priority == query.Priority);

        if (query.AssignedToId.HasValue)
            q = q.Where(t => t.AssignedToId == query.AssignedToId);

        if (!string.IsNullOrEmpty(query.Search))
        {
            var search = query.Search.ToLower();
            q = q.Where(t => t.Subject.ToLower().Contains(search) || t.Description.ToLower().Contains(search));
        }

        var total = await q.CountAsync();

        q = query.SortBy switch
        {
            "subject" => query.SortOrder == "asc" ? q.OrderBy(t => t.Subject) : q.OrderByDescending(t => t.Subject),
            "priority" => query.SortOrder == "asc" ? q.OrderBy(t => t.Priority) : q.OrderByDescending(t => t.Priority),
            "status" => query.SortOrder == "asc" ? q.OrderBy(t => t.Status) : q.OrderByDescending(t => t.Status),
            "updatedAt" => query.SortOrder == "asc" ? q.OrderBy(t => t.UpdatedAt) : q.OrderByDescending(t => t.UpdatedAt),
            _ => query.SortOrder == "asc" ? q.OrderBy(t => t.CreatedAt) : q.OrderByDescending(t => t.CreatedAt),
        };

        var tickets = await q
            .Skip((query.Page - 1) * query.Limit)
            .Take(query.Limit)
            .ToListAsync();

        var response = tickets.Select(t => new TicketResponse
        {
            Id = t.Id,
            Subject = t.Subject,
            Description = t.Description,
            Status = t.Status,
            Priority = t.Priority,
            Category = t.Category,
            UserId = t.UserId,
            UserName = t.User?.FullName ?? "Unknown",
            UserEmail = t.User?.Email ?? "",
            AssignedToId = t.AssignedToId,
            AssignedToName = t.AssignedTo?.FullName,
            CreatedAt = t.CreatedAt,
            UpdatedAt = t.UpdatedAt,
            ResolvedAt = t.ResolvedAt,
            ClosedAt = t.ClosedAt,
            MessageCount = t.Messages.Count,
            UnreadCount = t.Messages.Count(m => !m.IsFromAgent && m.ReadAt == null && m.UserId != userId),
            Attachments = t.Attachments.Select(a => new TicketAttachmentResponse
            {
                Id = a.Id,
                FileName = a.FileName,
                FileUrl = a.FileUrl,
                MimeType = a.MimeType,
                FileSize = a.FileSize,
                CreatedAt = a.CreatedAt
            }).ToList()
        }).ToList();

        return Ok(new PaginatedResponse<TicketResponse>
        {
            Data = response,
            Page = query.Page,
            Limit = query.Limit,
            Total = total,
            TotalPages = (int)Math.Ceiling((double)total / query.Limit)
        });
    }

    [HttpGet("tickets/{id}")]
    public async Task<ActionResult<TicketDetailResponse>> GetTicket(Guid id)
    {
        var userId = GetUserId();
        var isAdmin = IsAdminOrAgent();

        var ticket = await _db.SupportTickets
            .Include(t => t.User)
            .Include(t => t.AssignedTo)
            .Include(t => t.Attachments)
            .Include(t => t.Messages.OrderBy(m => m.CreatedAt))
                .ThenInclude(m => m.User)
            .Include(t => t.Messages)
                .ThenInclude(m => m.Attachments)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (ticket == null)
            return NotFound(new { error = "Ticket not found." });

        if (!isAdmin && ticket.UserId != userId)
            return Forbid();

        return Ok(new TicketDetailResponse
        {
            Id = ticket.Id,
            Subject = ticket.Subject,
            Description = ticket.Description,
            Status = ticket.Status,
            Priority = ticket.Priority,
            Category = ticket.Category,
            UserId = ticket.UserId,
            UserName = ticket.User?.FullName ?? "Unknown",
            UserEmail = ticket.User?.Email ?? "",
            AssignedToId = ticket.AssignedToId,
            AssignedToName = ticket.AssignedTo?.FullName,
            CreatedAt = ticket.CreatedAt,
            UpdatedAt = ticket.UpdatedAt,
            ResolvedAt = ticket.ResolvedAt,
            ClosedAt = ticket.ClosedAt,
            MessageCount = ticket.Messages.Count,
            UnreadCount = ticket.Messages.Count(m => !m.IsFromAgent && m.ReadAt == null && m.UserId != userId),
            Attachments = ticket.Attachments.Select(a => new TicketAttachmentResponse
            {
                Id = a.Id,
                FileName = a.FileName,
                FileUrl = a.FileUrl,
                MimeType = a.MimeType,
                FileSize = a.FileSize,
                CreatedAt = a.CreatedAt
            }).ToList(),
            Messages = ticket.Messages.Select(m => new ChatMessageResponse
            {
                Id = m.Id,
                TicketId = m.TicketId,
                UserId = m.UserId,
                UserName = m.User?.FullName ?? "Unknown",
                UserEmail = m.User?.Email ?? "",
                UserAvatar = m.User?.AvatarUrl ?? "",
                Content = m.Content,
                IsFromAgent = m.IsFromAgent,
                IsInternalNote = m.IsInternalNote,
                CreatedAt = m.CreatedAt,
                ReadAt = m.ReadAt,
                Attachments = m.Attachments.Select(a => new ChatAttachmentResponse
                {
                    Id = a.Id,
                    FileName = a.FileName,
                    FileUrl = a.FileUrl,
                    MimeType = a.MimeType,
                    FileSize = a.FileSize,
                    CreatedAt = a.CreatedAt
                }).ToList()
            }).ToList()
        });
    }

    [HttpPost("tickets")]
    public async Task<ActionResult<TicketResponse>> CreateTicket([FromBody] CreateTicketRequest request)
    {
        var userId = GetUserId();
        var user = await _db.Users.FindAsync(userId);

        var ticket = new SupportTicket
        {
            Subject = request.Subject,
            Description = request.Description,
            Category = request.Category,
            Priority = request.Priority,
            UserId = userId,
            Status = "open"
        };

        _db.SupportTickets.Add(ticket);
        await _db.SaveChangesAsync();

        await _db.Entry(ticket).Reference(t => t.User).LoadAsync();

        return CreatedAtAction(nameof(GetTicket), new { id = ticket.Id }, new TicketResponse
        {
            Id = ticket.Id,
            Subject = ticket.Subject,
            Description = ticket.Description,
            Status = ticket.Status,
            Priority = ticket.Priority,
            Category = ticket.Category,
            UserId = ticket.UserId,
            UserName = ticket.User?.FullName ?? "Unknown",
            UserEmail = ticket.User?.Email ?? "",
            CreatedAt = ticket.CreatedAt,
            UpdatedAt = ticket.UpdatedAt
        });
    }

    [HttpPatch("tickets/{id}")]
    [Authorize(Roles = "admin,support_agent")]
    public async Task<ActionResult<TicketResponse>> UpdateTicket(Guid id, [FromBody] UpdateTicketRequest request)
    {
        var ticket = await _db.SupportTickets
            .Include(t => t.User)
            .Include(t => t.AssignedTo)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (ticket == null)
            return NotFound(new { error = "Ticket not found." });

        if (request.Subject != null) ticket.Subject = request.Subject;
        if (request.Status != null)
        {
            var oldStatus = ticket.Status;
            ticket.Status = request.Status;
            if (request.Status == "resolved" && oldStatus != "resolved")
                ticket.ResolvedAt = DateTime.UtcNow;
            if (request.Status == "closed" && oldStatus != "closed")
                ticket.ClosedAt = DateTime.UtcNow;
        }
        if (request.Priority != null) ticket.Priority = request.Priority;
        if (request.Category != null) ticket.Category = request.Category;
        if (request.AssignedToId.HasValue)
        {
            var assignee = await _db.Users.FindAsync(request.AssignedToId.Value);
            if (assignee == null)
                return BadRequest(new { error = "Assignee not found." });
            ticket.AssignedToId = request.AssignedToId;
        }

        ticket.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        await _db.Entry(ticket).Reference(t => t.User).LoadAsync();
        if (ticket.AssignedToId.HasValue)
            await _db.Entry(ticket).Reference(t => t.AssignedTo).LoadAsync();

        return Ok(new TicketResponse
        {
            Id = ticket.Id,
            Subject = ticket.Subject,
            Description = ticket.Description,
            Status = ticket.Status,
            Priority = ticket.Priority,
            Category = ticket.Category,
            UserId = ticket.UserId,
            UserName = ticket.User?.FullName ?? "Unknown",
            UserEmail = ticket.User?.Email ?? "",
            AssignedToId = ticket.AssignedToId,
            AssignedToName = ticket.AssignedTo?.FullName,
            CreatedAt = ticket.CreatedAt,
            UpdatedAt = ticket.UpdatedAt,
            ResolvedAt = ticket.ResolvedAt,
            ClosedAt = ticket.ClosedAt
        });
    }

    [HttpPost("tickets/{id}/messages")]
    public async Task<ActionResult<ChatMessageResponse>> AddMessage(Guid id, [FromBody] ChatMessageRequest request)
    {
        var userId = GetUserId();
        var isAdmin = IsAdminOrAgent();

        var ticket = await _db.SupportTickets.FindAsync(id);
        if (ticket == null)
            return NotFound(new { error = "Ticket not found." });

        if (!isAdmin && ticket.UserId != userId)
            return Forbid();

        if (ticket.Status == "closed")
            return BadRequest(new { error = "Cannot add messages to a closed ticket." });

        var user = await _db.Users.FindAsync(userId);

        var message = new ChatMessage
        {
            TicketId = id,
            UserId = userId,
            Content = request.Content,
            IsFromAgent = isAdmin,
            IsInternalNote = request.IsInternalNote && isAdmin
        };

        _db.ChatMessages.Add(message);

        if (!request.IsInternalNote)
        {
            ticket.UpdatedAt = DateTime.UtcNow;
            if (ticket.Status == "open" && isAdmin)
                ticket.Status = "in_progress";
            else if (ticket.Status == "waiting_customer" && !isAdmin)
                ticket.Status = "in_progress";
        }

        await _db.SaveChangesAsync();

        await _db.Entry(message).Reference(m => m.User).LoadAsync();

        return Ok(new ChatMessageResponse
        {
            Id = message.Id,
            TicketId = message.TicketId,
            UserId = message.UserId,
            UserName = user?.FullName ?? "Unknown",
            UserEmail = user?.Email ?? "",
            UserAvatar = user?.AvatarUrl ?? "",
            Content = message.Content,
            IsFromAgent = message.IsFromAgent,
            IsInternalNote = message.IsInternalNote,
            CreatedAt = message.CreatedAt,
            ReadAt = message.ReadAt
        });
    }

    [HttpPost("tickets/{id}/messages/{messageId}/read")]
    public async Task<ActionResult> MarkMessageAsRead(Guid id, Guid messageId)
    {
        var userId = GetUserId();
        var message = await _db.ChatMessages.FirstOrDefaultAsync(m => m.Id == messageId && m.TicketId == id);

        if (message == null)
            return NotFound(new { error = "Message not found." });

        if (message.UserId != userId && !IsAdminOrAgent())
            return Forbid();

        message.ReadAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok();
    }

    [HttpGet("tickets/{id}/satisfaction")]
    public async Task<ActionResult<TicketSatisfactionResponse>> GetSatisfaction(Guid id)
    {
        var userId = GetUserId();
        var satisfaction = await _db.TicketSatisfactions
            .Include(s => s.User)
            .FirstOrDefaultAsync(s => s.TicketId == id && s.UserId == userId);

        if (satisfaction == null)
            return NotFound(new { error = "Satisfaction not found." });

        return Ok(new TicketSatisfactionResponse
        {
            Id = satisfaction.Id,
            TicketId = satisfaction.TicketId,
            UserId = satisfaction.UserId,
            Rating = satisfaction.Rating,
            Comment = satisfaction.Comment,
            CreatedAt = satisfaction.CreatedAt
        });
    }

    [HttpPost("tickets/{id}/satisfaction")]
    public async Task<ActionResult<TicketSatisfactionResponse>> SubmitSatisfaction(Guid id, [FromBody] SubmitSatisfactionRequest request)
    {
        var userId = GetUserId();

        var ticket = await _db.SupportTickets.FindAsync(id);
        if (ticket == null)
            return NotFound(new { error = "Ticket not found." });

        if (ticket.UserId != userId)
            return Forbid();

        if (ticket.Status != "resolved" && ticket.Status != "closed")
            return BadRequest(new { error = "Can only rate resolved or closed tickets." });

        var existing = await _db.TicketSatisfactions
            .FirstOrDefaultAsync(s => s.TicketId == id && s.UserId == userId);

        if (existing != null)
            return BadRequest(new { error = "Satisfaction already submitted." });

        var satisfaction = new TicketSatisfaction
        {
            TicketId = id,
            UserId = userId,
            Rating = request.Rating,
            Comment = request.Comment
        };

        _db.TicketSatisfactions.Add(satisfaction);
        await _db.SaveChangesAsync();

        return Ok(new TicketSatisfactionResponse
        {
            Id = satisfaction.Id,
            TicketId = satisfaction.TicketId,
            UserId = satisfaction.UserId,
            Rating = satisfaction.Rating,
            Comment = satisfaction.Comment,
            CreatedAt = satisfaction.CreatedAt
        });
    }

    [HttpGet("categories")]
    [AllowAnonymous]
    public async Task<ActionResult<List<SupportCategoryResponse>>> GetCategories()
    {
        var categories = await _db.SupportCategories
            .Where(c => c.IsActive)
            .OrderBy(c => c.DisplayOrder)
            .ToListAsync();

        return Ok(categories.Select(c => new SupportCategoryResponse
        {
            Id = c.Id,
            Name = c.Name,
            Key = c.Key,
            Description = c.Description,
            Icon = c.Icon,
            Color = c.Color,
            DisplayOrder = c.DisplayOrder,
            IsActive = c.IsActive
        }).ToList());
    }

    [HttpGet("knowledge-base")]
    [AllowAnonymous]
    public async Task<ActionResult<PaginatedResponse<KnowledgeBaseArticleResponse>>> GetKnowledgeBase([FromQuery] KnowledgeBaseListQuery query)
    {
        var q = _db.KnowledgeBaseArticles
            .Include(a => a.Author)
            .Where(a => a.Status == "published" || (User.Identity != null && User.Identity.IsAuthenticated && IsAdminOrAgent()))
            .AsQueryable();

        if (!string.IsNullOrEmpty(query.Category))
            q = q.Where(a => a.Category == query.Category);

        if (!string.IsNullOrEmpty(query.Status) && IsAdminOrAgent())
            q = q.Where(a => a.Status == query.Status);

        if (query.IsFeatured.HasValue)
            q = q.Where(a => a.IsFeatured == query.IsFeatured.Value);

        if (!string.IsNullOrEmpty(query.Search))
        {
            var search = query.Search.ToLower();
            q = q.Where(a => a.Title.ToLower().Contains(search) || a.Content.ToLower().Contains(search) || a.Excerpt.ToLower().Contains(search));
        }

        var total = await q.CountAsync();

        var articles = await q
            .OrderByDescending(a => a.IsFeatured)
            .ThenByDescending(a => a.PublishedAt)
            .Skip((query.Page - 1) * query.Limit)
            .Take(query.Limit)
            .ToListAsync();

        return Ok(new PaginatedResponse<KnowledgeBaseArticleResponse>
        {
            Data = articles.Select(a => new KnowledgeBaseArticleResponse
            {
                Id = a.Id,
                Title = a.Title,
                Slug = a.Slug,
                Content = a.Content,
                Excerpt = a.Excerpt,
                Category = a.Category,
                Status = a.Status,
                IsFeatured = a.IsFeatured,
                ViewCount = a.ViewCount,
                HelpfulCount = a.HelpfulCount,
                NotHelpfulCount = a.NotHelpfulCount,
                AuthorId = a.AuthorId,
                AuthorName = a.Author?.FullName ?? "Unknown",
                CreatedAt = a.CreatedAt,
                UpdatedAt = a.UpdatedAt,
                PublishedAt = a.PublishedAt
            }).ToList(),
            Page = query.Page,
            Limit = query.Limit,
            Total = total,
            TotalPages = (int)Math.Ceiling((double)total / query.Limit)
        });
    }

    [HttpGet("knowledge-base/{slug}")]
    [AllowAnonymous]
    public async Task<ActionResult<KnowledgeBaseArticleResponse>> GetKnowledgeBaseArticle(string slug)
    {
        var article = await _db.KnowledgeBaseArticles
            .Include(a => a.Author)
            .FirstOrDefaultAsync(a => a.Slug == slug && (a.Status == "published" || (User.Identity != null && User.Identity.IsAuthenticated && IsAdminOrAgent())));

        if (article == null)
            return NotFound(new { error = "Article not found." });

        article.ViewCount++;
        await _db.SaveChangesAsync();

        return Ok(new KnowledgeBaseArticleResponse
        {
            Id = article.Id,
            Title = article.Title,
            Slug = article.Slug,
            Content = article.Content,
            Excerpt = article.Excerpt,
            Category = article.Category,
            Status = article.Status,
            IsFeatured = article.IsFeatured,
            ViewCount = article.ViewCount,
            HelpfulCount = article.HelpfulCount,
            NotHelpfulCount = article.NotHelpfulCount,
            AuthorId = article.AuthorId,
            AuthorName = article.Author?.FullName ?? "Unknown",
            CreatedAt = article.CreatedAt,
            UpdatedAt = article.UpdatedAt,
            PublishedAt = article.PublishedAt
        });
    }

    [HttpPost("knowledge-base")]
    [Authorize(Roles = "admin,support_agent")]
    public async Task<ActionResult<KnowledgeBaseArticleResponse>> CreateKnowledgeBaseArticle([FromBody] KnowledgeBaseArticleRequest request)
    {
        var userId = GetUserId();

        var existing = await _db.KnowledgeBaseArticles.FirstOrDefaultAsync(a => a.Slug == request.Slug);
        if (existing != null)
            return BadRequest(new { error = "Article with this slug already exists." });

        var article = new KnowledgeBaseArticle
        {
            Title = request.Title,
            Slug = request.Slug,
            Content = request.Content,
            Excerpt = request.Excerpt,
            Category = request.Category,
            Status = request.Status,
            IsFeatured = request.IsFeatured,
            AuthorId = userId,
            PublishedAt = request.Status == "published" ? DateTime.UtcNow : null
        };

        _db.KnowledgeBaseArticles.Add(article);
        await _db.SaveChangesAsync();

        await _db.Entry(article).Reference(a => a.Author).LoadAsync();

        return Ok(new KnowledgeBaseArticleResponse
        {
            Id = article.Id,
            Title = article.Title,
            Slug = article.Slug,
            Content = article.Content,
            Excerpt = article.Excerpt,
            Category = article.Category,
            Status = article.Status,
            IsFeatured = article.IsFeatured,
            AuthorId = article.AuthorId,
            AuthorName = article.Author?.FullName ?? "Unknown",
            CreatedAt = article.CreatedAt,
            UpdatedAt = article.UpdatedAt,
            PublishedAt = article.PublishedAt
        });
    }

    [HttpPatch("knowledge-base/{id}")]
    [Authorize(Roles = "admin,support_agent")]
    public async Task<ActionResult<KnowledgeBaseArticleResponse>> UpdateKnowledgeBaseArticle(Guid id, [FromBody] KnowledgeBaseArticleRequest request)
    {
        var article = await _db.KnowledgeBaseArticles
            .Include(a => a.Author)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (article == null)
            return NotFound(new { error = "Article not found." });

        if (request.Slug != article.Slug)
        {
            var existing = await _db.KnowledgeBaseArticles.FirstOrDefaultAsync(a => a.Slug == request.Slug);
            if (existing != null)
                return BadRequest(new { error = "Article with this slug already exists." });
        }

        var wasPublished = article.Status == "published";
        article.Title = request.Title;
        article.Slug = request.Slug;
        article.Content = request.Content;
        article.Excerpt = request.Excerpt;
        article.Category = request.Category;
        article.Status = request.Status;
        article.IsFeatured = request.IsFeatured;
        article.UpdatedAt = DateTime.UtcNow;

        if (!wasPublished && request.Status == "published")
            article.PublishedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return Ok(new KnowledgeBaseArticleResponse
        {
            Id = article.Id,
            Title = article.Title,
            Slug = article.Slug,
            Content = article.Content,
            Excerpt = article.Excerpt,
            Category = article.Category,
            Status = article.Status,
            IsFeatured = article.IsFeatured,
            ViewCount = article.ViewCount,
            HelpfulCount = article.HelpfulCount,
            NotHelpfulCount = article.NotHelpfulCount,
            AuthorId = article.AuthorId,
            AuthorName = article.Author?.FullName ?? "Unknown",
            CreatedAt = article.CreatedAt,
            UpdatedAt = article.UpdatedAt,
            PublishedAt = article.PublishedAt
        });
    }

    [HttpDelete("knowledge-base/{id}")]
    [Authorize(Roles = "admin")]
    public async Task<ActionResult> DeleteKnowledgeBaseArticle(Guid id)
    {
        var article = await _db.KnowledgeBaseArticles.FindAsync(id);
        if (article == null)
            return NotFound(new { error = "Article not found." });

        _db.KnowledgeBaseArticles.Remove(article);
        await _db.SaveChangesAsync();

        return Ok();
    }

    [HttpGet("stats")]
    [Authorize(Roles = "admin,support_agent")]
    public async Task<ActionResult<TicketStatsResponse>> GetStats()
    {
        var tickets = await _db.SupportTickets.ToListAsync();
        var satisfactions = await _db.TicketSatisfactions.ToListAsync();

        var resolvedTickets = tickets.Where(t => t.Status == "resolved" || t.Status == "closed").ToList();
        var avgResolutionHours = resolvedTickets.Any()
            ? resolvedTickets.Average(t => (t.ResolvedAt ?? t.ClosedAt ?? t.UpdatedAt).Subtract(t.CreatedAt).TotalHours)
            : 0;

        var avgSatisfaction = satisfactions.Any()
            ? satisfactions.Average(s => s.Rating)
            : 0;

        return Ok(new TicketStatsResponse
        {
            TotalTickets = tickets.Count,
            OpenTickets = tickets.Count(t => t.Status == "open"),
            InProgressTickets = tickets.Count(t => t.Status == "in_progress"),
            ResolvedTickets = tickets.Count(t => t.Status == "resolved"),
            ClosedTickets = tickets.Count(t => t.Status == "closed"),
            AverageResolutionTimeHours = Math.Round(avgResolutionHours, 1),
            SatisfactionScore = Math.Round(avgSatisfaction, 1),
            TicketsByCategory = tickets.GroupBy(t => t.Category).ToDictionary(g => g.Key, g => g.Count()),
            TicketsByPriority = tickets.GroupBy(t => t.Priority).ToDictionary(g => g.Key, g => g.Count())
        });
    }
}