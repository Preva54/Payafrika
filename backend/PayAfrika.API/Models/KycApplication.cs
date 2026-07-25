using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PayAfrika.API.Models;

public class KycApplication
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }

    [MaxLength(20)]
    public string Status { get; set; } = "not_started";

    [MaxLength(20)]
    public string ApplicationType { get; set; } = "individual";

    public int RiskScore { get; set; }
    public int FraudScore { get; set; }
    public int AiConfidenceScore { get; set; }

    [MaxLength(100)]
    public string? FirstName { get; set; }

    [MaxLength(100)]
    public string? MiddleName { get; set; }

    [MaxLength(100)]
    public string? LastName { get; set; }

    public DateTime? DateOfBirth { get; set; }

    [MaxLength(20)]
    public string? Gender { get; set; }

    [MaxLength(100)]
    public string? Nationality { get; set; }

    [MaxLength(100)]
    public string? CountryOfResidence { get; set; }

    [MaxLength(100)]
    public string? NationalIdNumber { get; set; }

    [MaxLength(100)]
    public string? PassportNumber { get; set; }

    [MaxLength(100)]
    public string? DriversLicenseNumber { get; set; }

    [MaxLength(100)]
    public string? TaxNumber { get; set; }

    [MaxLength(20)]
    public string? PhoneCountryCode { get; set; }

    [MaxLength(500)]
    public string? ResidentialAddress { get; set; }

    [MaxLength(100)]
    public string? Province { get; set; }

    [MaxLength(100)]
    public string? City { get; set; }

    [MaxLength(20)]
    public string? PostalCode { get; set; }

    [MaxLength(200)]
    public string? BankName { get; set; }

    [MaxLength(50)]
    public string? BankAccountNumber { get; set; }

    [MaxLength(20)]
    public string? BranchCode { get; set; }

    [MaxLength(200)]
    public string? AccountHolderName { get; set; }

    // KYB fields
    [MaxLength(200)]
    public string? BusinessName { get; set; }

    [MaxLength(100)]
    public string? BusinessRegistrationNumber { get; set; }

    [MaxLength(100)]
    public string? BusinessTaxNumber { get; set; }

    [MaxLength(50)]
    public string? BusinessVatNumber { get; set; }

    [MaxLength(100)]
    public string? BusinessIndustry { get; set; }

    [MaxLength(200)]
    public string? BusinessWebsite { get; set; }

    [MaxLength(10)]
    public string? YearsInOperation { get; set; }

    public string? CompletedSteps { get; set; } = "[]";

    public string? Metadata { get; set; } = "{}";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? SubmittedAt { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;

    public ICollection<KycDocument> Documents { get; set; } = new List<KycDocument>();
    public ICollection<KycReview> Reviews { get; set; } = new List<KycReview>();
    public ICollection<KycTimelineEvent> TimelineEvents { get; set; } = new List<KycTimelineEvent>();
}