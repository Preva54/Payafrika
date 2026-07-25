using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PayAfrika.API.Data;
using PayAfrika.API.DTOs;
using PayAfrika.API.Models;

namespace PayAfrika.API.Controllers;

[ApiController]
[Route("api/kyc")]
[Authorize]
public class KycController : ControllerBase
{
    private readonly AppDbContext _db;

    public KycController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("status")]
    public async Task<ActionResult<KycStatusResponse>> GetStatus()
    {
        var userId = GetUserId();
        var app = await _db.KycApplications
            .Include(a => a.TimelineEvents)
            .FirstOrDefaultAsync(a => a.UserId == userId);

        if (app == null)
        {
            return Ok(new KycStatusResponse
            {
                Status = "not_started", OverallProgress = 0,
                IdentityStatus = new() { Status = "pending" },
                AddressStatus = new() { Status = "pending" },
                PhoneStatus = new() { Status = "pending" },
                EmailStatus = new() { Status = "pending" },
                SelfieStatus = new() { Status = "pending" },
                BusinessStatus = new() { Status = "pending" },
                BankStatus = new() { Status = "pending" },
                TaxStatus = new() { Status = "pending" },
            });
        }

        var steps = JsonSerializer.Deserialize<List<string>>(app.CompletedSteps ?? "[]") ?? new();

        return Ok(new KycStatusResponse
        {
            Id = app.Id,
            Status = app.Status,
            ApplicationType = app.ApplicationType,
            OverallProgress = CalcProgress(app.Status, steps.Count),
            CompletedSteps = steps,
            IdentityStatus = CreateStepStatus(steps, "personal_info", app.UpdatedAt),
            AddressStatus = CreateStepStatus(steps, "address", app.UpdatedAt),
            PhoneStatus = CreateStepStatus(steps, "contact", app.UpdatedAt),
            EmailStatus = new() { Status = "verified", UpdatedAt = app.CreatedAt },
            SelfieStatus = CreateStepStatus(steps, "selfie", app.UpdatedAt),
            BusinessStatus = CreateStepStatus(steps, "business", app.UpdatedAt),
            BankStatus = CreateStepStatus(steps, "bank", app.UpdatedAt),
            TaxStatus = new() { Status = "pending" },
            SubmittedAt = app.SubmittedAt,
            Timeline = app.TimelineEvents.OrderByDescending(t => t.CreatedAt).Select(t => new KycTimelineEventDto
            {
                EventType = t.EventType, Description = t.Description, CreatedAt = t.CreatedAt,
            }).ToList(),
        });
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

        return await GetStatus();
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
        var app = await GetOrCreateApp();
        if (file == null || file.Length == 0)
            return BadRequest(new { error = "No file provided." });

        using var ms = new MemoryStream();
        await file.CopyToAsync(ms);
        var fileData = Convert.ToBase64String(ms.ToArray());

        var doc = new KycDocument
        {
            KycApplicationId = app.Id,
            DocumentType = documentType,
            DocumentSide = documentSide,
            FileName = file.FileName,
            ContentType = file.ContentType,
            FileSize = file.Length,
            FileData = fileData,
            Status = "submitted",
            QualityScore = 85,
            OcrData = JsonSerializer.Serialize(new
            {
                extractedName = $"{app.FirstName} {app.LastName}",
                extractedDob = app.DateOfBirth?.ToString("yyyy-MM-dd"),
                extractedDocumentNumber = documentType switch
                {
                    "national_id" => app.NationalIdNumber,
                    "passport" => app.PassportNumber,
                    "drivers_license" => app.DriversLicenseNumber,
                    _ => null,
                },
            }),
        };

        _db.KycDocuments.Add(doc);
        app.UpdatedAt = DateTime.UtcNow;

        if (documentType == "selfie")
            await AddStep(app, "selfie", "Selfie uploaded");
        else if (documentType is "utility_bill" or "bank_statement" or "government_letter" or "lease_agreement")
            await AddStep(app, "address", "Address document uploaded");

        await _db.SaveChangesAsync();

        return Ok(new KycDocumentUploadResponse
        {
            Id = doc.Id, DocumentType = doc.DocumentType, FileName = doc.FileName,
            FileSize = doc.FileSize, Status = doc.Status,
            OcrData = doc.OcrData, QualityScore = doc.QualityScore,
        });
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
        var userId = GetUserId();
        var app = await _db.KycApplications.FirstOrDefaultAsync(a => a.UserId == userId);
        if (app == null)
            return BadRequest(new { error = "No KYC application found. Start one first." });

        var steps = JsonSerializer.Deserialize<List<string>>(app.CompletedSteps ?? "[]") ?? new();
        var required = new[] { "personal_info", "contact" };
        var missing = required.Where(r => !steps.Contains(r)).ToList();
        if (missing.Any())
            return BadRequest(new { error = "Complete required steps first.", missing });

        app.Status = "under_review";
        app.SubmittedAt = DateTime.UtcNow;
        app.UpdatedAt = DateTime.UtcNow;
        app.CompletedSteps = JsonSerializer.Serialize(steps);

        app.TimelineEvents.Add(new KycTimelineEvent
        {
            EventType = "submitted",
            Description = "Application submitted for review",
        });

        var user = await _db.Users.FindAsync(userId);
        if (user != null)
        {
            user.KYCStatus = "pending";
            user.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        await LogKycActivity(userId, "Submitted KYC for review", "kyc", "Application submitted for compliance review");

        return Ok(new KycSubmitResponse
        {
            Status = "under_review", Message = "Your application has been submitted for review. We'll notify you once it's processed.",
            SubmittedAt = app.SubmittedAt,
        });
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

        return Ok(docs.Select(d => new KycDocumentUploadResponse
        {
            Id = d.Id, DocumentType = d.DocumentType, FileName = d.FileName,
            FileSize = d.FileSize, Status = d.Status,
            OcrData = d.OcrData, QualityScore = d.QualityScore,
        }).ToList());
    }

    // ── Admin endpoints ──────────────────────────────────

    [HttpGet("admin/applications")]
    [Authorize(Roles = "admin")]
    public async Task<ActionResult<List<KycAdminApplicationResponse>>> GetApplications(
        [FromQuery] string? status, [FromQuery] string? country)
    {
        var query = _db.KycApplications
            .Include(a => a.User)
            .AsQueryable();

        if (!string.IsNullOrEmpty(status)) query = query.Where(a => a.Status == status);
        if (!string.IsNullOrEmpty(country)) query = query.Where(a => a.CountryOfResidence == country);

        var apps = await query.OrderByDescending(a => a.CreatedAt).ToListAsync();

        return Ok(apps.Select(a => new KycAdminApplicationResponse
        {
            Id = a.Id, UserId = a.UserId.ToString(),
            FullName = $"{a.FirstName} {a.LastName}".Trim(),
            Email = a.User.Email, Status = a.Status,
            ApplicationType = a.ApplicationType,
            RiskScore = a.RiskScore, FraudScore = a.FraudScore,
            AiConfidenceScore = a.AiConfidenceScore,
            Country = a.CountryOfResidence,
            SubmittedAt = a.SubmittedAt, CreatedAt = a.CreatedAt,
        }).ToList());
    }

    [HttpGet("admin/applications/{id}")]
    [Authorize(Roles = "admin")]
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
            RiskScore = app.RiskScore, FraudScore = app.FraudScore, AiConfidenceScore = app.AiConfidenceScore,
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
            Documents = app.Documents.Select(d => new KycDocumentUploadResponse
            {
                Id = d.Id, DocumentType = d.DocumentType, FileName = d.FileName,
                FileSize = d.FileSize, Status = d.Status,
                OcrData = d.OcrData, QualityScore = d.QualityScore,
            }).ToList(),
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
    [Authorize(Roles = "admin")]
    public async Task<ActionResult> ReviewApplication(Guid id, [FromBody] KycReviewRequest request)
    {
        var app = await _db.KycApplications.Include(a => a.User).FirstOrDefaultAsync(a => a.Id == id);
        if (app == null) return NotFound();

        var adminId = GetUserId();
        var review = new KycReview
        {
            KycApplicationId = id, ReviewerId = adminId,
            Action = request.Action, Notes = request.Notes,
        };
        _db.KycReviews.Add(review);

        app.Status = request.Action switch
        {
            "approve" => "approved",
            "reject" => "rejected",
            "request_info" => "additional_info",
            _ => app.Status,
        };
        app.ReviewedAt = DateTime.UtcNow;
        app.UpdatedAt = DateTime.UtcNow;

        if (request.Action == "approve") app.CompletedAt = DateTime.UtcNow;

        app.TimelineEvents.Add(new KycTimelineEvent
        {
            EventType = request.Action switch
            {
                "approve" => "approved",
                "reject" => "rejected",
                "request_info" => "info_requested",
                _ => "reviewed",
            },
            Description = request.Action switch
            {
                "approve" => "Application approved",
                "reject" => $"Application rejected: {request.Notes}",
                "request_info" => $"Additional information requested: {request.Notes}",
                _ => $"Review action: {request.Action}",
            },
        });

        if (app.User != null)
        {
            app.User.KYCStatus = request.Action switch
            {
                "approve" => "verified",
                "reject" => "rejected",
                _ => "pending",
            };
            app.User.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        await LogKycActivity(adminId, $"Reviewed KYC application", "kyc_admin",
            $"{request.Action} application {id}");

        return Ok(new { message = $"Application {request.Action}d.", status = app.Status });
    }

    [HttpDelete("admin/applications/{id}")]
    [Authorize(Roles = "admin")]
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
    [Authorize(Roles = "admin")]
    public async Task<ActionResult<KycAnalyticsResponse>> GetAnalytics()
    {
        var apps = await _db.KycApplications.ToListAsync();

        return Ok(new KycAnalyticsResponse
        {
            TotalApplications = apps.Count,
            PendingReview = apps.Count(a => a.Status is "under_review" or "pending"),
            Approved = apps.Count(a => a.Status == "approved"),
            Rejected = apps.Count(a => a.Status == "rejected"),
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

        app.TimelineEvents.Add(new KycTimelineEvent
        {
            EventType = $"step_{step}",
            Description = description,
        });
        await Task.CompletedTask;
    }

    private static int CalcProgress(string status, int stepsDone)
    {
        if (status == "approved" || status == "verified") return 100;
        if (status == "rejected") return 100;
        return Math.Min(stepsDone * 14, 99);
    }

    private static KycStepStatus CreateStepStatus(List<string> steps, string step, DateTime updated)
    {
        if (steps.Contains(step))
            return new KycStepStatus { Status = "completed", UpdatedAt = updated };
        return new KycStepStatus { Status = "pending" };
    }

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