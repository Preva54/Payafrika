using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PayAfrika.API.Models;

public class TeamMember
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid BusinessUserId { get; set; }

    [MaxLength(200)]
    public string MemberEmail { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Role { get; set; } = "readonly";

    public string Permissions { get; set; } = "[]";

    [MaxLength(20)]
    public string Status { get; set; } = "invited";

    public DateTime InvitedAt { get; set; } = DateTime.UtcNow;
    public DateTime? AcceptedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    [ForeignKey(nameof(BusinessUserId))]
    public User BusinessUser { get; set; } = null!;
}