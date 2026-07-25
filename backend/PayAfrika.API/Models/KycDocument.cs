using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PayAfrika.API.Models;

public class KycDocument
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid KycApplicationId { get; set; }

    [MaxLength(50)]
    public string DocumentType { get; set; } = string.Empty;

    [MaxLength(10)]
    public string DocumentSide { get; set; } = "front";

    [MaxLength(255)]
    public string FileName { get; set; } = string.Empty;

    [MaxLength(100)]
    public string ContentType { get; set; } = string.Empty;

    public long FileSize { get; set; }

    public string FileData { get; set; } = string.Empty;

    [MaxLength(20)]
    public string Status { get; set; } = "pending";

    public string? OcrData { get; set; }

    [MaxLength(500)]
    public string? RejectionReason { get; set; }

    public int QualityScore { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(KycApplicationId))]
    public KycApplication KycApplication { get; set; } = null!;
}