using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PayAfrika.API.Models;

public class KycTimelineEvent
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid KycApplicationId { get; set; }

    [MaxLength(50)]
    public string EventType { get; set; } = string.Empty;

    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(KycApplicationId))]
    public KycApplication KycApplication { get; set; } = null!;
}