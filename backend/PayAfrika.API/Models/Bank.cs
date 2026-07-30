using System.ComponentModel.DataAnnotations;

namespace PayAfrika.API.Models;

public class Bank
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [MaxLength(3)]
    public string CountryCode { get; set; } = string.Empty;

    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(50)]
    public string? Code { get; set; }

    public bool IsEnabled { get; set; } = true;
    public int SortOrder { get; set; } = 0;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}