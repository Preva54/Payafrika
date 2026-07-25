using System.ComponentModel.DataAnnotations;

namespace PayAfrika.API.Models;

public class ContentPage
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required, MaxLength(300)] public string Title { get; set; } = string.Empty;
    [Required, MaxLength(500)] public string Slug { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    [MaxLength(50)] public string Status { get; set; } = "draft";
    public Guid? AuthorId { get; set; }
    public User? Author { get; set; }
    public string? Template { get; set; }
    public string? Metadata { get; set; }
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? PublishedAt { get; set; }
    public DateTime? ScheduledAt { get; set; }
}

public class BlogCategory
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required, MaxLength(200)] public string Name { get; set; } = string.Empty;
    [Required, MaxLength(500)] public string Slug { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<BlogPost> Posts { get; set; } = new List<BlogPost>();
}

public class BlogPost
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required, MaxLength(300)] public string Title { get; set; } = string.Empty;
    [Required, MaxLength(500)] public string Slug { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? Excerpt { get; set; }
    public string? FeaturedImage { get; set; }
    public Guid? CategoryId { get; set; }
    public BlogCategory? Category { get; set; }
    public string Tags { get; set; } = "";
    public Guid? AuthorId { get; set; }
    public User? Author { get; set; }
    [MaxLength(50)] public string Status { get; set; } = "draft";
    public bool IsFeatured { get; set; }
    public int ViewCount { get; set; }
    public int ReadingTime { get; set; }
    public string? SeoTitle { get; set; }
    public string? SeoDescription { get; set; }
    public string? OpenGraphImage { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? PublishedAt { get; set; }
    public DateTime? ScheduledAt { get; set; }
}

public class Service
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required, MaxLength(200)] public string Name { get; set; } = string.Empty;
    [Required, MaxLength(500)] public string Slug { get; set; } = string.Empty;
    public string? Icon { get; set; }
    public string? HeroImage { get; set; }
    public string Description { get; set; } = string.Empty;
    public string Features { get; set; } = "[]";
    public string? Pricing { get; set; }
    public string? Faq { get; set; }
    public string? CtaText { get; set; }
    public string? CtaUrl { get; set; }
    public string? SeoTitle { get; set; }
    public string? SeoDescription { get; set; }
    [MaxLength(50)] public string Status { get; set; } = "draft";
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class Product
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required, MaxLength(200)] public string Name { get; set; } = string.Empty;
    [Required, MaxLength(500)] public string Slug { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Images { get; set; } = "[]";
    public string? Videos { get; set; }
    public string Features { get; set; } = "[]";
    public string? Pricing { get; set; }
    public string? Documentation { get; set; }
    public string? DownloadLinks { get; set; }
    public string? SeoTitle { get; set; }
    public string? SeoDescription { get; set; }
    [MaxLength(50)] public string Status { get; set; } = "draft";
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class Testimonial
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required, MaxLength(200)] public string CustomerName { get; set; } = string.Empty;
    public string? CustomerPhoto { get; set; }
    public string? CompanyLogo { get; set; }
    public string? CompanyName { get; set; }
    [Required] public string Content { get; set; } = string.Empty;
    public int Rating { get; set; } = 5;
    public string? VideoUrl { get; set; }
    [MaxLength(50)] public string Type { get; set; } = "customer";
    public bool IsFeatured { get; set; }
    public int SortOrder { get; set; }
    [MaxLength(20)] public string Status { get; set; } = "published";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class CmsTeamMember
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required, MaxLength(200)] public string Name { get; set; } = string.Empty;
    public string? Photo { get; set; }
    [Required, MaxLength(200)] public string Role { get; set; } = string.Empty;
    public string? Biography { get; set; }
    public string? LinkedIn { get; set; }
    public string? Twitter { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    [MaxLength(100)] public string Department { get; set; } = "";
    public int SortOrder { get; set; }
    [MaxLength(20)] public string Status { get; set; } = "published";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Partner
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required, MaxLength(200)] public string Name { get; set; } = string.Empty;
    public string? LogoUrl { get; set; }
    public string? Description { get; set; }
    public string? Website { get; set; }
    [MaxLength(50)] public string Type { get; set; } = "partner";
    public bool IsFeatured { get; set; }
    public int SortOrder { get; set; }
    [MaxLength(20)] public string Status { get; set; } = "published";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class JobPosition
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required, MaxLength(200)] public string Title { get; set; } = string.Empty;
    [Required, MaxLength(200)] public string Department { get; set; } = string.Empty;
    [Required, MaxLength(200)] public string Location { get; set; } = string.Empty;
    [MaxLength(50)] public string EmploymentType { get; set; } = "full-time";
    public decimal? SalaryMin { get; set; }
    public decimal? SalaryMax { get; set; }
    public string Description { get; set; } = string.Empty;
    public string Requirements { get; set; } = "[]";
    public string Benefits { get; set; } = "[]";
    public string? HiringManager { get; set; }
    public DateTime? ClosingDate { get; set; }
    public int SortOrder { get; set; }
    [MaxLength(20)] public string Status { get; set; } = "draft";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class JobApplication
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PositionId { get; set; }
    public JobPosition Position { get; set; } = null!;
    [Required, MaxLength(200)] public string ApplicantName { get; set; } = string.Empty;
    [Required, MaxLength(300)] public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? ResumeUrl { get; set; }
    public string? CoverLetter { get; set; }
    public string Data { get; set; } = "{}";
    [MaxLength(50)] public string Status { get; set; } = "new";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class FaqCategory
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required, MaxLength(200)] public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public ICollection<Faq> Faqs { get; set; } = new List<Faq>();
}

public class Faq
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required] public string Question { get; set; } = string.Empty;
    [Required] public string Answer { get; set; } = string.Empty;
    public Guid? CategoryId { get; set; }
    public FaqCategory? Category { get; set; }
    public int Priority { get; set; }
    public string? RelatedFaqs { get; set; }
    [MaxLength(20)] public string Status { get; set; } = "published";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class MediaFolder
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required, MaxLength(200)] public string Name { get; set; } = string.Empty;
    public Guid? ParentId { get; set; }
    public MediaFolder? Parent { get; set; }
    public ICollection<MediaFolder> Children { get; set; } = new List<MediaFolder>();
    public ICollection<MediaFile> Files { get; set; } = new List<MediaFile>();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class MediaFile
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required, MaxLength(300)] public string Name { get; set; } = string.Empty;
    [Required, MaxLength(500)] public string FileName { get; set; } = string.Empty;
    [Required, MaxLength(500)] public string FileUrl { get; set; } = string.Empty;
    [MaxLength(50)] public string FileType { get; set; } = "image";
    [MaxLength(100)] public string MimeType { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public int? Width { get; set; }
    public int? Height { get; set; }
    public string? Alt { get; set; }
    public Guid? FolderId { get; set; }
    public MediaFolder? Folder { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class NavigationMenu
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required, MaxLength(200)] public string Name { get; set; } = string.Empty;
    [Required, MaxLength(50)] public string Location { get; set; } = "header";
    public string Items { get; set; } = "[]";
    [MaxLength(20)] public string Status { get; set; } = "published";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class FooterConfig
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string CompanyInfo { get; set; } = "{}";
    public string Links { get; set; } = "[]";
    public string SocialMedia { get; set; } = "[]";
    public string? Newsletter { get; set; }
    public string? ContactInfo { get; set; }
    public string Certifications { get; set; } = "[]";
    public string PaymentLogos { get; set; } = "[]";
    public string LegalLinks { get; set; } = "[]";
    public string? Copyright { get; set; }
    [MaxLength(20)] public string Status { get; set; } = "published";
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class Popup
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required, MaxLength(300)] public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    [MaxLength(50)] public string Type { get; set; } = "announcement";
    [MaxLength(20)] public string Status { get; set; } = "draft";
    public string? Scheduling { get; set; }
    public string? TargetAudience { get; set; }
    public string? DisplayRules { get; set; }
    public string? Animation { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class Announcement
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required, MaxLength(300)] public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    [MaxLength(50)] public string Type { get; set; } = "update";
    [MaxLength(20)] public string Status { get; set; } = "draft";
    public string TargetRoles { get; set; } = "[]";
    public DateTime? StartAt { get; set; }
    public DateTime? EndAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class CmsForm
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required, MaxLength(200)] public string Name { get; set; } = string.Empty;
    public string Fields { get; set; } = "[]";
    public string? SuccessMessage { get; set; }
    public string? EmailNotifications { get; set; }
    public string? ValidationRules { get; set; }
    [MaxLength(20)] public string Status { get; set; } = "draft";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class FormSubmission
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid FormId { get; set; }
    public CmsForm Form { get; set; } = null!;
    public string Data { get; set; } = "{}";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class LegalPage
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required, MaxLength(200)] public string Title { get; set; } = string.Empty;
    [Required, MaxLength(500)] public string Slug { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    [MaxLength(20)] public string Status { get; set; } = "published";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class ApiDoc
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required, MaxLength(300)] public string Title { get; set; } = string.Empty;
    [Required, MaxLength(500)] public string Slug { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    [MaxLength(100)] public string Category { get; set; } = "";
    public int SortOrder { get; set; }
    [MaxLength(20)] public string Status { get; set; } = "draft";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class SupportContent
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required, MaxLength(300)] public string Title { get; set; } = string.Empty;
    [Required, MaxLength(500)] public string Slug { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    [MaxLength(100)] public string Category { get; set; } = "";
    public int SortOrder { get; set; }
    [MaxLength(20)] public string Status { get; set; } = "draft";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class ContentVersion
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required, MaxLength(100)] public string EntityType { get; set; } = string.Empty;
    public Guid EntityId { get; set; }
    public string Content { get; set; } = "{}";
    public int Version { get; set; } = 1;
    public string? CreatedBy { get; set; }
    public string? ChangeNotes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class ContentRevision
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required, MaxLength(100)] public string EntityType { get; set; } = string.Empty;
    public Guid EntityId { get; set; }
    [MaxLength(50)] public string FromStatus { get; set; } = "";
    [MaxLength(50)] public string ToStatus { get; set; } = "";
    public string? Notes { get; set; }
    public string? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Campaign
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required, MaxLength(200)] public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    [MaxLength(50)] public string Type { get; set; } = "email";
    [MaxLength(20)] public string Status { get; set; } = "draft";
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? TargetAudience { get; set; }
    public string Content { get; set; } = "{}";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
