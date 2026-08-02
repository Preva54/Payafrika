using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PayAfrika.API.Data;
using PayAfrika.API.DTOs;
using PayAfrika.API.Models;
using PayAfrika.API.Services;

namespace PayAfrika.API.Controllers;

[ApiController]
[Route("api/kyc")]
[Authorize]
public class KycController : ControllerBase
{
    private const string AdminRoles = "admin,super_admin,compliance_officer";

    private readonly AppDbContext _db;
    private readonly IKycService _kyc;

    public KycController(AppDbContext db, IKycService kyc)
    {
        _db = db;
        _kyc = kyc;
    }

    [HttpGet("status")]
    public async Task<ActionResult<KycStatusResponse>> GetStatus()
        => Ok(await _kyc.GetStatusAsync(GetUserId()));

    [HttpGet("country-config")]
    public async Task<ActionResult<KycCountryConfigResponse?>> GetCountryConfig([FromQuery] string? code)
    {
        var country = code ?? (await _db.Users.FindAsync(GetUserId()))?.Country;
        var config = await _kyc.GetCountryConfigAsync(country);
        if (config == null) return NotFound(new { error = "No verification rules configured for this country yet. Using defaults in the wizard." });
        return Ok(config);
    }

    [HttpPost("start")]
    public async Task<ActionResult<KycStatusResponse>> StartApplication([FromQuery] string type = "individual")
    {
        var userId = GetUserId();
        var existing = await _db.KycApplications.FirstOrDefaultAsync(a => a.UserId == userId);
        if (existing != null)
            return BadRequest(new { error = "KYC application already exists.", id = existing.Id });

        var app = new KycApplication
        {
            UserId = userId,
            Status = "pending",
            ApplicationType = type,
            CompletedSteps = "[]",
        };
        app.TimelineEvents.Add(new KycTimelineEvent
        {
            EventType = "started",
            Description = "KYC application started",
        });

        _db.KycApplications.Add(app);
        await _db.SaveChangesAsync();
        await LogKycActivity(userId, "Started KYC application", "kyc", $"KYC application started ({type})");

        return Ok(await _kyc.GetStatusAsync(userId));
    }

    [HttpPut("personal-info")]
    public async Task<ActionResult> UpdatePersonalInfo([FromBody] KycPersonalInfoRequest request)
    {
        var app = await GetOrCreateApp();
        app.FirstName = request.FirstName;
        app.MiddleName = request.MiddleName;
        app.LastName = request.LastName;
        app.DateOfBirth = request.DateOfBirth;
        app.Gender = request.Gender;
        app.Nationality = request.Nationality;
        app.CountryOfResidence = request.CountryOfResidence;
        app.NationalIdNumber = request.NationalIdNumber;
        app.PassportNumber = request.PassportNumber;
        app.DriversLicenseNumber = request.DriversLicenseNumber;
        app.TaxNumber = request.TaxNumber;
        await AddStep(app, "personal_info", "Personal information submitted");

        var user = await _db.Users.FindAsync(GetUserId());
        if (user != null)
        {
            user.FullName = $"{request.FirstName} {request.LastName}";
            user.Country = request.CountryOfResidence;
            user.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        return Ok(new { message = "Personal information saved." });
    }

    [HttpPut("contact")]
    public async Task<ActionResult> UpdateContact([FromBody] KycContactRequest request)
    {
        var app = await GetOrCreateApp();
        app.PhoneCountryCode = request.PhoneCountryCode;
        app.ResidentialAddress = request.ResidentialAddress;
        app.Province = request.Province;
        app.City = request.City;
        app.PostalCode = request.PostalCode;
        await AddStep(app, "contact", "Contact details submitted");

        var user = await _db.Users.FindAsync(GetUserId());
        if (user != null && request.PhoneCountryCode != null)
        {
            user.PhoneNumber = request.PhoneCountryCode;
            user.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        return Ok(new { message = "Contact details saved." });
    }

    [HttpPost("documents")]
    public async Task<ActionResult<KycDocumentUploadResponse>> UploadDocument(
        [FromForm] string documentType,
        [FromForm] string documentSide,
        [FromForm] IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { error = "No file provided." });

        try
        {
            using var stream = file.OpenReadStream();
            var doc = await _kyc.UploadDocumentAsync(GetUserId(), documentType, documentSide,
                file.FileName, file.ContentType, file.Length, stream);
            return Ok(doc);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPut("bank")]
    public async Task<ActionResult> UpdateBank([FromBody] KycBankRequest request)
    {
        var app = await GetOrCreateApp();
        app.BankName = request.BankName;
        app.BankAccountNumber = request.AccountNumber;
        app.BranchCode = request.BranchCode;
        app.AccountHolderName = request.AccountHolderName;
        await AddStep(app, "bank", "Bank details submitted");
        await _db.SaveChangesAsync();
        return Ok(new { message = "Bank details saved." });
    }

    [HttpPut("business")]
    [Authorize(Roles = "business")]
    public async Task<ActionResult> UpdateBusiness([FromBody] KycBusinessRequest request)
    {
        var app = await GetOrCreateApp();
        app.ApplicationType = "business";
        app.BusinessName = request.BusinessName;
        app.BusinessRegistrationNumber = request.RegistrationNumber;
        app.BusinessTaxNumber = request.TaxNumber;
        app.BusinessVatNumber = request.VatNumber;
        app.BusinessIndustry = request.Industry;
        app.BusinessWebsite = request.Website;
        app.YearsInOperation = request.YearsInOperation;
        await AddStep(app, "business", "Business information submitted");
        await _db.SaveChangesAsync();
        return Ok(new { message = "Business information saved." });
    }

    [HttpPost("submit")]
    public async Task<ActionResult<KycSubmitResponse>> SubmitForReview()
    {
        try
        {
            return Ok(await _kyc.SubmitForReviewAsync(GetUserId()));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("documents")]
    public async Task<ActionResult<List<KycDocumentUploadResponse>>> GetDocuments()
    {
        var userId = GetUserId();
        var app = await _db.KycApplications.FirstOrDefaultAsync(a => a.UserId == userId);
        if (app == null) return Ok(new List<KycDocumentUploadResponse>());

        var docs = await _db.KycDocuments
            .Where(d => d.KycApplicationId == app.Id)
            .OrderByDescending(d => d.CreatedAt)
            .ToListAsync();

        return Ok(docs.Select(MapDocument).ToList());
    }

    // ── Admin endpoints ──────────────────────────────────

    [HttpGet("admin/applications")]
    [Authorize(Roles = AdminRoles)]
    public async Task<ActionResult<List<KycAdminApplicationResponse>>> GetApplications(
        [FromQuery] string? status, [FromQuery] string? country, [FromQuery] bool? escalated)
    {
        var query = _db.KycApplications
            .Include(a => a.User)
            .AsQueryable();

        if (!string.IsNullOrEmpty(status)) query = query.Where(a => a.Status == status);
        if (!string.IsNullOrEmpty(country)) query = query.Where(a => a.CountryOfResidence == country);
        if (escalated == true) query = query.Where(a => a.Escalated);

        var apps = await query.OrderByDescending(a => a.CreatedAt).ToListAsync();

        return Ok(apps.Select(a => new KycAdminApplicationResponse
        {
            Id = a.Id, UserId = a.UserId.ToString(),
            FullName = $"{a.FirstName} {a.LastName}".Trim(),
            Email = a.User.Email, Status = a.Status,
            ApplicationType = a.ApplicationType,
            Level = a.Level,
            RiskScore = a.RiskScore, FraudScore = a.FraudScore,
            AiConfidenceScore = a.AiConfidenceScore,
            Escalated = a.Escalated,
            Country = a.CountryOfResidence,
            SubmittedAt = a.SubmittedAt, CreatedAt = a.CreatedAt,
        }).ToList());
    }

    [HttpGet("admin/applications/{id}")]
    [Authorize(Roles = AdminRoles)]
    public async Task<ActionResult<KycAdminDetailResponse>> GetApplicationDetail(Guid id)
    {
        var app = await _db.KycApplications
            .Include(a => a.User)
            .Include(a => a.Documents)
            .Include(a => a.Reviews).ThenInclude(r => r.Reviewer)
            .Include(a => a.TimelineEvents)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (app == null) return NotFound();

        return Ok(new KycAdminDetailResponse
        {
            Id = app.Id, Status = app.Status, ApplicationType = app.ApplicationType,
            Level = app.Level,
            RiskScore = app.RiskScore, FraudScore = app.FraudScore, AiConfidenceScore = app.AiConfidenceScore,
            Escalated = app.Escalated, EscalationReason = app.EscalationReason,
            PersonalInfo = new KycPersonalInfoRequest
            {
                FirstName = app.FirstName ?? "", MiddleName = app.MiddleName,
                LastName = app.LastName ?? "", DateOfBirth = app.DateOfBirth ?? DateTime.MinValue,
                Gender = app.Gender ?? "", Nationality = app.Nationality ?? "",
                CountryOfResidence = app.CountryOfResidence ?? "",
                NationalIdNumber = app.NationalIdNumber, PassportNumber = app.PassportNumber,
                DriversLicenseNumber = app.DriversLicenseNumber, TaxNumber = app.TaxNumber,
            },
            Contact = new KycContactRequest
            {
                PhoneCountryCode = app.PhoneCountryCode, ResidentialAddress = app.ResidentialAddress,
                Province = app.Province, City = app.City, PostalCode = app.PostalCode,
            },
            Bank = new KycBankRequest
            {
                BankName = app.BankName ?? "", AccountNumber = app.BankAccountNumber ?? "",
                BranchCode = app.BranchCode, AccountHolderName = app.AccountHolderName ?? "",
            },
            Business = app.ApplicationType == "business" ? new KycBusinessRequest
            {
                BusinessName = app.BusinessName ?? "", RegistrationNumber = app.BusinessRegistrationNumber ?? "",
                TaxNumber = app.BusinessTaxNumber, VatNumber = app.BusinessVatNumber,
                Industry = app.BusinessIndustry, Website = app.BusinessWebsite,
                YearsInOperation = app.YearsInOperation,
            } : null,
            Documents = app.Documents.Select(MapDocument).ToList(),
            Reviews = app.Reviews.Select(r => new KycReviewDto
            {
                Id = r.Id, ReviewerName = r.Reviewer.FullName, Action = r.Action,
                Notes = r.Notes, CreatedAt = r.CreatedAt,
            }).ToList(),
            Timeline = app.TimelineEvents.OrderByDescending(t => t.CreatedAt).Select(t => new KycTimelineEventDto
            {
                EventType = t.EventType, Description = t.Description, CreatedAt = t.CreatedAt,
            }).ToList(),
            UserName = app.User.FullName, UserEmail = app.User.Email,
            SubmittedAt = app.SubmittedAt, ReviewedAt = app.ReviewedAt,
        });
    }

    [HttpPost("admin/applications/{id}/review")]
    [Authorize(Roles = AdminRoles)]
    public async Task<ActionResult> ReviewApplication(Guid id, [FromBody] KycReviewRequest request)
    {
        try
        {
            var result = await _kyc.ReviewAsync(GetUserId(), id, request);
            await LogKycActivity(GetUserId(), "Reviewed KYC application", "kyc_admin",
                $"{request.Action} application {id}");
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("admin/applications/{id}/escalate")]
    [Authorize(Roles = AdminRoles)]
    public async Task<ActionResult> EscalateApplication(Guid id, [FromBody] KycEscalateRequest request)
    {
        try
        {
            await _kyc.EscalateAsync(GetUserId(), id, request.Reason);
            await LogKycActivity(GetUserId(), "Escalated KYC application", "kyc_admin",
                $"Escalated application {id} for compliance review");
            return Ok(new { message = "Application escalated for compliance review.", escalated = true });
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("admin/applications/{id}/documents/{documentId}/image")]
    [Authorize(Roles = AdminRoles)]
    public async Task<IActionResult> GetDocumentImage(Guid id, Guid documentId)
    {
        var doc = await _kyc.GetDocumentAsync(GetUserId(), id, documentId);
        if (doc == null) return NotFound();
        return File(doc.Value.Data, doc.Value.ContentType, doc.Value.FileName);
    }

    [HttpDelete("admin/applications/{id}")]
    [Authorize(Roles = AdminRoles)]
    public async Task<ActionResult> DeleteApplication(Guid id)
    {
        var app = await _db.KycApplications
            .Include(a => a.Documents)
            .Include(a => a.Reviews)
            .Include(a => a.TimelineEvents)
            .FirstOrDefaultAsync(a => a.Id == id);
        if (app == null) return NotFound();

        _db.KycTimelineEvents.RemoveRange(app.TimelineEvents);
        _db.KycReviews.RemoveRange(app.Reviews);
        _db.KycDocuments.RemoveRange(app.Documents);
        _db.KycApplications.Remove(app);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    [HttpGet("admin/analytics")]
    [Authorize(Roles = AdminRoles)]
    public async Task<ActionResult<KycAnalyticsResponse>> GetAnalytics()
    {
        var apps = await _db.KycApplications.ToListAsync();

        return Ok(new KycAnalyticsResponse
        {
            TotalApplications = apps.Count,
            PendingReview = apps.Count(a => a.Status is "under_review" or "pending"),
            Approved = apps.Count(a => a.Status == "approved"),
            Rejected = apps.Count(a => a.Status == "rejected"),
            Escalated = apps.Count(a => a.Escalated),
            AverageReviewTimeHours = apps.Where(a => a.ReviewedAt.HasValue && a.SubmittedAt.HasValue)
                .Select(a => (a.ReviewedAt!.Value - a.SubmittedAt!.Value).TotalHours)
                .DefaultIfEmpty(0).Average(),
            FraudDetectionRate = apps.Any() ? (double)apps.Count(a => a.FraudScore > 50) / apps.Count * 100 : 0,
            AiSuccessRate = apps.Any() ? (double)apps.Count(a => a.AiConfidenceScore > 70) / apps.Count * 100 : 0,
            CountryDistribution = apps.GroupBy(a => a.CountryOfResidence ?? "Unknown")
                .ToDictionary(g => g.Key, g => g.Count()),
            DailyVolume = apps.GroupBy(a => a.CreatedAt.Date)
                .OrderBy(g => g.Key).Take(30)
                .Select(g => new KycDailyVolume { Date = g.Key.ToString("yyyy-MM-dd"), Count = g.Count() })
                .ToList(),
        });
    }

    // ── Helpers ──────────────────────────────────────────

    private async Task<KycApplication> GetOrCreateApp()
    {
        var userId = GetUserId();
        var app = await _db.KycApplications.FirstOrDefaultAsync(a => a.UserId == userId);
        if (app != null) return app;

        app = new KycApplication
        {
            UserId = userId, Status = "pending", CompletedSteps = "[]",
        };
        app.TimelineEvents.Add(new KycTimelineEvent { EventType = "started", Description = "KYC application started" });
        _db.KycApplications.Add(app);
        return app;
    }

    private async Task AddStep(KycApplication app, string step, string description)
    {
        var steps = JsonSerializer.Deserialize<List<string>>(app.CompletedSteps ?? "[]") ?? new();
        if (!steps.Contains(step)) steps.Add(step);
        app.CompletedSteps = JsonSerializer.Serialize(steps);
        app.UpdatedAt = DateTime.UtcNow;

        _db.KycTimelineEvents.Add(new KycTimelineEvent
        {
            KycApplicationId = app.Id,
            EventType = $"step_{step}",
            Description = description,
        });
        await Task.CompletedTask;
    }

    private static KycDocumentUploadResponse MapDocument(KycDocument d) => new()
    {
        Id = d.Id,
        DocumentType = d.DocumentType,
        FileName = d.FileName,
        FileSize = d.FileSize,
        Status = d.Status,
        OcrData = d.OcrData,
        DocumentNumber = d.DocumentNumber,
        ExpiryDate = d.ExpiryDate,
        RejectionReason = d.RejectionReason,
        QualityScore = d.QualityScore,
    };

    private async Task LogKycActivity(Guid userId, string action, string category, string details)
    {
        _db.ActivityLogs.Add(new ActivityLog
        {
            UserId = userId,
            Action = action,
            Category = category,
            Details = JsonSerializer.Serialize(new { message = details, timestamp = DateTime.UtcNow }),
            IPAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
            UserAgent = Request.Headers.UserAgent.ToString(),
        });
        await Task.CompletedTask;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
}
