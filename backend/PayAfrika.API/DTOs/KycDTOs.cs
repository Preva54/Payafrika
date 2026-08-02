namespace PayAfrika.API.DTOs;

public class KycStatusResponse
{
    public Guid Id { get; set; }
    public string Status { get; set; } = "not_started";
    public string ApplicationType { get; set; } = "individual";
    public int Level { get; set; }
    public int OverallProgress { get; set; }
    public List<string> CompletedSteps { get; set; } = new();
    public string? Reason { get; set; }
    public bool Escalated { get; set; }
    public List<KycLevelStatus> Levels { get; set; } = new();
    public KycStepStatus IdentityStatus { get; set; } = new();
    public KycStepStatus AddressStatus { get; set; } = new();
    public KycStepStatus PhoneStatus { get; set; } = new();
    public KycStepStatus EmailStatus { get; set; } = new();
    public KycStepStatus SelfieStatus { get; set; } = new();
    public KycStepStatus BusinessStatus { get; set; } = new();
    public KycStepStatus BankStatus { get; set; } = new();
    public KycStepStatus TaxStatus { get; set; } = new();
    public DateTime? SubmittedAt { get; set; }
    public List<KycTimelineEventDto> Timeline { get; set; } = new();
}

public class KycLevelStatus
{
    public int Level { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Status { get; set; } = "locked"; // pending, completed, locked
}

public class KycStepStatus
{
    public string Status { get; set; } = "pending";
    public DateTime? UpdatedAt { get; set; }
}

public class KycTimelineEventDto
{
    public string EventType { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class KycPersonalInfoRequest
{
    public string FirstName { get; set; } = string.Empty;
    public string? MiddleName { get; set; }
    public string LastName { get; set; } = string.Empty;
    public DateTime DateOfBirth { get; set; }
    public string Gender { get; set; } = string.Empty;
    public string Nationality { get; set; } = string.Empty;
    public string CountryOfResidence { get; set; } = string.Empty;
    public string? NationalIdNumber { get; set; }
    public string? PassportNumber { get; set; }
    public string? DriversLicenseNumber { get; set; }
    public string? TaxNumber { get; set; }
}

public class KycContactRequest
{
    public string? PhoneCountryCode { get; set; }
    public string? ResidentialAddress { get; set; }
    public string? Province { get; set; }
    public string? City { get; set; }
    public string? PostalCode { get; set; }
}

public class KycDocumentUploadResponse
{
    public Guid Id { get; set; }
    public string DocumentType { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? OcrData { get; set; }
    public string? DocumentNumber { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public string? RejectionReason { get; set; }
    public int QualityScore { get; set; }
}

public class KycBankRequest
{
    public string BankName { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string? BranchCode { get; set; }
    public string AccountHolderName { get; set; } = string.Empty;
}

public class KycBusinessRequest
{
    public string BusinessName { get; set; } = string.Empty;
    public string RegistrationNumber { get; set; } = string.Empty;
    public string? TaxNumber { get; set; }
    public string? VatNumber { get; set; }
    public string? Industry { get; set; }
    public string? Website { get; set; }
    public string? YearsInOperation { get; set; }
}

public class KycSubmitResponse
{
    public string Status { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime? SubmittedAt { get; set; }
}

public class KycAdminApplicationResponse
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string ApplicationType { get; set; } = string.Empty;
    public int Level { get; set; }
    public int RiskScore { get; set; }
    public int FraudScore { get; set; }
    public int AiConfidenceScore { get; set; }
    public bool Escalated { get; set; }
    public string? Country { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class KycAdminDetailResponse
{
    public Guid Id { get; set; }
    public string Status { get; set; } = string.Empty;
    public string ApplicationType { get; set; } = string.Empty;
    public int Level { get; set; }
    public int RiskScore { get; set; }
    public int FraudScore { get; set; }
    public int AiConfidenceScore { get; set; }
    public bool Escalated { get; set; }
    public string? EscalationReason { get; set; }
    public KycPersonalInfoRequest? PersonalInfo { get; set; }
    public KycContactRequest? Contact { get; set; }
    public KycBankRequest? Bank { get; set; }
    public KycBusinessRequest? Business { get; set; }
    public List<KycDocumentUploadResponse> Documents { get; set; } = new();
    public List<KycReviewDto> Reviews { get; set; } = new();
    public List<KycTimelineEventDto> Timeline { get; set; } = new();
    public string UserName { get; set; } = string.Empty;
    public string UserEmail { get; set; } = string.Empty;
    public DateTime? SubmittedAt { get; set; }
    public DateTime? ReviewedAt { get; set; }
}

public class KycReviewDto
{
    public Guid Id { get; set; }
    public string ReviewerName { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class KycReviewRequest
{
    public string Action { get; set; } = string.Empty;
    public string? Notes { get; set; }
}

public class KycEscalateRequest
{
    public string Reason { get; set; } = string.Empty;
}

public class KycCountryConfigResponse
{
    public string CountryCode { get; set; } = string.Empty;
    public string CountryName { get; set; } = string.Empty;
    public List<string> IdentityDocumentTypes { get; set; } = new();
    public List<string> AddressDocumentTypes { get; set; } = new();
    public bool IdentityDocBackRequired { get; set; }
    public int AddressDocMaxAgeMonths { get; set; } = 3;
    public int RequiredLevel { get; set; } = 3;
}

public class KycAnalyticsResponse
{
    public int TotalApplications { get; set; }
    public int PendingReview { get; set; }
    public int Approved { get; set; }
    public int Rejected { get; set; }
    public int Escalated { get; set; }
    public double AverageReviewTimeHours { get; set; }
    public double FraudDetectionRate { get; set; }
    public double AiSuccessRate { get; set; }
    public Dictionary<string, int> CountryDistribution { get; set; } = new();
    public List<KycDailyVolume> DailyVolume { get; set; } = new();
}

public class KycDailyVolume
{
    public string Date { get; set; } = string.Empty;
    public int Count { get; set; }
}