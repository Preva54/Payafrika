using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PayAfrika.API.Models;

public class KycReview
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid KycApplicationId { get; set; }

    public Guid ReviewerId { get; set; }

    [MaxLength(20)]
    public string Action { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(KycApplicationId))]
    public KycApplication KycApplication { get; set; } = null!;

    [ForeignKey(nameof(ReviewerId))]
    public User Reviewer { get; set; } = null!;
}