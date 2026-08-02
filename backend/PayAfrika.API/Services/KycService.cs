using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PayAfrika.API.Data;
using PayAfrika.API.DTOs;
using PayAfrika.API.Models;

namespace PayAfrika.API.Services;

public interface IKycService
{
    Task<KycCountryConfigResponse?> GetCountryConfigAsync(string? countryCode);
    Task<KycStatusResponse> GetStatusAsync(Guid userId);
    Task<KycDocumentUploadResponse> UploadDocumentAsync(Guid userId, string documentType, string documentSide, string fileName, string contentType, long fileSize, Stream content);
    Task<KycSubmitResponse> SubmitForReviewAsync(Guid userId);
    Task<KycReviewResponse> ReviewAsync(Guid adminId, Guid applicationId, KycReviewRequest request);
    Task EscalateAsync(Guid adminId, Guid applicationId, string reason);
    Task<(byte[] Data, string ContentType, string FileName)?> GetDocumentAsync(Guid adminId, Guid applicationId, Guid documentId);
}

public class KycReviewResponse
{
    public string Status { get; set; } = string.Empty;
    public int Level { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class KycService : IKycService
{
    private const long MaxFileSize = 10 * 1024 * 1024;
    private static readonly string[] AllowedTypes = { "image/jpeg", "image/png", "image/webp", "application/pdf" };
    private static readonly string[] AllowedExtensions = { ".jpg", ".jpeg", ".png", ".webp", ".pdf" };
    private static readonly string[] IdentityDocTypes = { "national_id", "passport", "drivers_license", "residence_permit" };
    private static readonly string[] AddressDocTypes = { "utility_bill", "bank_statement", "government_letter", "municipal_statement" };

    private readonly AppDbContext _db;
    private readonly IAuditService _audit;

    public KycService(AppDbContext db, IAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    // ── Country compliance config ──────────────────────

    public async Task<KycCountryConfigResponse?> GetCountryConfigAsync(string? countryCode)
    {
        if (string.IsNullOrWhiteSpace(countryCode)) return null;

        var config = await _db.KycCountryConfigs.FirstOrDefaultAsync(c =>
            c.CountryCode == countryCode.ToUpperInvariant() || c.CountryName == countryCode);
        if (config == null) return null;

        return MapCountryConfig(config);
    }

    private static KycCountryConfigResponse MapCountryConfig(KycCountryConfig c) => new()
    {
        CountryCode = c.CountryCode,
        CountryName = c.CountryName,
        IdentityDocumentTypes = JsonSerializer.Deserialize<List<string>>(c.IdentityDocumentTypes) ?? new(),
        AddressDocumentTypes = JsonSerializer.Deserialize<List<string>>(c.AddressDocumentTypes) ?? new(),
        IdentityDocBackRequired = c.IdentityDocBackRequired,
        AddressDocMaxAgeMonths = c.AddressDocMaxAgeMonths,
        RequiredLevel = c.RequiredLevel,
    };

    private async Task<KycCountryConfig> ResolveCountryConfigAsync(string? country)
    {
        if (!string.IsNullOrWhiteSpace(country))
        {
            var code = await _db.KycCountryConfigs.FirstOrDefaultAsync(c =>
                c.CountryCode == country.ToUpperInvariant() || c.CountryName == country);
            if (code != null) return code;
        }

        return new KycCountryConfig
        {
            CountryCode = "DEFAULT",
            CountryName = "Default",
            IdentityDocumentTypes = "[\"national_id\",\"passport\",\"drivers_license\"]",
            AddressDocumentTypes = "[\"utility_bill\",\"bank_statement\",\"government_letter\"]",
            AddressDocMaxAgeMonths = 3,
            RequiredLevel = 3,
        };
    }

    // ── Status ─────────────────────────────────────────

    public async Task<KycStatusResponse> GetStatusAsync(Guid userId)
    {
        var app = await _db.KycApplications
            .Include(a => a.TimelineEvents)
            .FirstOrDefaultAsync(a => a.UserId == userId);

        if (app == null)
        {
            return new KycStatusResponse
            {
                Status = "not_started",
                OverallProgress = 0,
                Levels = BuildLevelStatuses(0, null),
                IdentityStatus = new() { Status = "pending" },
                AddressStatus = new() { Status = "pending" },
                PhoneStatus = new() { Status = "pending" },
                EmailStatus = new() { Status = "pending" },
                SelfieStatus = new() { Status = "pending" },
                BusinessStatus = new() { Status = "pending" },
                BankStatus = new() { Status = "pending" },
                TaxStatus = new() { Status = "pending" },
            };
        }

        var steps = JsonSerializer.Deserialize<List<string>>(app.CompletedSteps ?? "[]") ?? new();
        var latestReview = await _db.KycReviews
            .Where(r => r.KycApplicationId == app.Id)
            .OrderByDescending(r => r.CreatedAt)
            .FirstOrDefaultAsync();

        return new KycStatusResponse
        {
            Id = app.Id,
            Status = app.Status,
            ApplicationType = app.ApplicationType,
            Level = app.Level,
            OverallProgress = CalcProgress(app, steps),
            CompletedSteps = steps,
            Reason = latestReview?.Notes,
            Escalated = app.Escalated,
            Levels = BuildLevelStatuses(app.Level, steps),
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
        };
    }

    private static List<KycLevelStatus> BuildLevelStatuses(int achieved, List<string>? steps)
    {
        steps ??= new();
        var levels = new (int Level, string Name, string Description)[]
        {
            (1, "Basic Verification", "Personal information and contact details"),
            (2, "Identity Verification", "Government ID document and selfie"),
            (3, "Address Verification", "Proof of residence document"),
        };

        return levels.Select(l => new KycLevelStatus
        {
            Level = l.Level,
            Name = l.Name,
            Description = l.Description,
            Status = achieved >= l.Level ? "completed" : (achieved + 1 == l.Level && steps.Count > 0 ? "pending" : "locked"),
        }).ToList();
    }

    // ── Document upload ────────────────────────────────

    public async Task<KycDocumentUploadResponse> UploadDocumentAsync(
        Guid userId, string documentType, string documentSide,
        string fileName, string contentType, long fileSize, Stream content)
    {
        var app = await GetOrCreateAppAsync(userId);
        if (documentType is not ("selfie" or "national_id" or "passport" or "drivers_license" or "residence_permit"
            or "utility_bill" or "bank_statement" or "government_letter" or "municipal_statement"))
            throw new InvalidOperationException("Unsupported document type.");

        if (fileSize <= 0 || fileSize > MaxFileSize)
            throw new InvalidOperationException("File must be between 1 byte and 10 MB.");

        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        if (!AllowedTypes.Contains(contentType) || !AllowedExtensions.Contains(ext))
            throw new InvalidOperationException("Only JPG, PNG, WEBP and PDF files are accepted.");

        if (documentType != "selfie")
        {
            var country = await ResolveCountryConfigAsync(app.CountryOfResidence);
            if (IdentityDocTypes.Contains(documentType))
            {
                var allowed = JsonSerializer.Deserialize<List<string>>(country.IdentityDocumentTypes) ?? new();
                if (!allowed.Contains(documentType))
                    throw new InvalidOperationException($"{documentType} is not accepted for {app.CountryOfResidence}. Accepted: {string.Join(", ", allowed)}.");
                if (country.IdentityDocBackRequired && documentSide == "front")
                    throw new InvalidOperationException("This country requires the back of the ID document too.");
            }
            else if (AddressDocTypes.Contains(documentType))
            {
                var allowed = JsonSerializer.Deserialize<List<string>>(country.AddressDocumentTypes) ?? new();
                if (!allowed.Contains(documentType))
                    throw new InvalidOperationException($"{documentType} is not accepted for {app.CountryOfResidence}. Accepted: {string.Join(", ", allowed)}.");
            }
        }

        using var ms = new MemoryStream();
        await content.CopyToAsync(ms);
        var raw = ms.ToArray();

        var (quality, issues) = SimulateQualityCheck(raw);
        var (ocrData, docNumber, expiry) = SimulateOcr(app, documentType);

        var doc = new KycDocument
        {
            KycApplicationId = app.Id,
            DocumentType = documentType,
            DocumentSide = documentSide,
            FileName = fileName,
            ContentType = contentType,
            FileSize = raw.Length,
            FileData = EncryptFileData(Convert.ToBase64String(raw)),
            Status = issues.Count == 0 ? "submitted" : "rejected",
            QualityScore = quality,
            OcrData = JsonSerializer.Serialize(ocrData),
            DocumentNumber = docNumber,
            ExpiryDate = expiry,
            RejectionReason = issues.Count > 0 ? string.Join("; ", issues) : null,
        };

        _db.KycDocuments.Add(doc);
        app.UpdatedAt = DateTime.UtcNow;

        if (documentType == "selfie")
            await AddStepAsync(app, "selfie", "Selfie uploaded");
        else if (AddressDocTypes.Contains(documentType))
            await AddStepAsync(app, "address", "Address document uploaded");
        else if (IdentityDocTypes.Contains(documentType))
            await AddStepAsync(app, "identity", "Identity document uploaded");

        await _db.SaveChangesAsync();

        await _audit.LogAsync(new AuditLogEntry
        {
            UserId = userId,
            Action = "kyc_document_uploaded",
            Module = "kyc",
            Resource = "kyc_document",
            ResourceId = doc.Id.ToString(),
            Metadata = $"{{\"type\":\"{documentType}\",\"side\":\"{documentSide}\",\"size\":{raw.Length},\"quality\":{quality}}}",
        });

        return MapDocument(doc);
    }

    private (int Quality, List<string> Issues) SimulateQualityCheck(byte[] data)
    {
        var seed = data.Length % 97;
        var quality = 72 + seed % 24; // 72-95
        var issues = new List<string>();
        if (data.Length < 20_000) issues.Add("Image may be too small or blurry. Please retake in good lighting.");
        if (seed == 0) issues.Add("Image quality insufficient. Please retake the photo.");
        return (quality, issues);
    }

    private (Dictionary<string, object?> Ocr, string? DocNumber, DateTime? Expiry) SimulateOcr(KycApplication app, string documentType)
    {
        var docNumber = documentType switch
        {
            "national_id" => app.NationalIdNumber ?? RandomDigits(9),
            "passport" => app.PassportNumber ?? "P" + RandomDigits(7),
            "drivers_license" => app.DriversLicenseNumber ?? RandomDigits(10),
            "residence_permit" => "RP" + RandomDigits(6),
            _ => null,
        };

        DateTime? expiry = documentType switch
        {
            "passport" => DateTime.UtcNow.AddYears(5),
            "residence_permit" => DateTime.UtcNow.AddYears(2),
            "national_id" => DateTime.UtcNow.AddYears(4),
            "drivers_license" => DateTime.UtcNow.AddYears(3),
            _ => null,
        };

        return (new Dictionary<string, object?>
        {
            ["extractedName"] = $"{app.FirstName} {app.LastName}".Trim(),
            ["extractedDob"] = app.DateOfBirth?.ToString("yyyy-MM-dd"),
            ["extractedDocumentNumber"] = docNumber,
            ["expiryDate"] = expiry?.ToString("yyyy-MM-dd"),
            ["isExpired"] = expiry.HasValue && expiry < DateTime.UtcNow,
            ["ocrConfidence"] = 0.78 + (dataSeed(app.FirstName) % 17) / 100.0,
        }, docNumber, expiry);
    }

    private static int dataSeed(string? s) => (s ?? "x").GetHashCode() & 0x7fffffff;

    private static string RandomDigits(int len)
    {
        var bytes = RandomNumberGenerator.GetBytes(len);
        var sb = new StringBuilder(len);
        foreach (var b in bytes) sb.Append((char)('0' + b % 10));
        return sb.ToString();
    }

    // ── Submit / review / escalate ─────────────────────

    public async Task<KycSubmitResponse> SubmitForReviewAsync(Guid userId)
    {
        var app = await _db.KycApplications.FirstOrDefaultAsync(a => a.UserId == userId)
            ?? throw new InvalidOperationException("No KYC application found. Start one first.");

        var steps = JsonSerializer.Deserialize<List<string>>(app.CompletedSteps ?? "[]") ?? new();
        var requiredSteps = new[] { "personal_info", "contact" };
        var missing = requiredSteps.Where(r => !steps.Contains(r)).ToList();
        if (missing.Any())
            throw new InvalidOperationException($"Complete required steps first: {string.Join(", ", missing)}.");

        var country = await ResolveCountryConfigAsync(app.CountryOfResidence);
        var docs = await _db.KycDocuments.Where(d => d.KycApplicationId == app.Id).ToListAsync();
        var validDocs = docs.Where(d => d.Status != "rejected").ToList();

        var identityDoc = validDocs.Any(d => IdentityDocTypes.Contains(d.DocumentType));
        var selfie = validDocs.Any(d => d.DocumentType == "selfie");
        var addressDoc = validDocs.Any(d => AddressDocTypes.Contains(d.DocumentType));

        var level = 1;
        if (identityDoc && selfie) level = 2;
        if (identityDoc && selfie && addressDoc) level = 3;

        if (level < country.RequiredLevel)
            throw new InvalidOperationException(
                $"This jurisdiction requires Level {country.RequiredLevel} verification. Upload your identity document, selfie and address proof.");

        app.Status = "under_review";
        app.Level = level;
        app.SubmittedAt = DateTime.UtcNow;
        app.UpdatedAt = DateTime.UtcNow;
        app.Escalated = false;
        app.CompletedSteps = JsonSerializer.Serialize(steps);

        _db.KycTimelineEvents.Add(new KycTimelineEvent
        {
            KycApplicationId = app.Id,
            EventType = "submitted",
            Description = $"Application submitted for review (Level {level})",
        });

        var user = await _db.Users.FindAsync(userId);
        if (user != null)
        {
            user.KYCStatus = "pending";
            user.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();

        await NotifyAsync(user, "kyc_submitted", "KYC verification submitted",
            "Your documents have been received and are now under review. Estimated review time: 24-48 hours.");
        await _audit.LogAsync(new AuditLogEntry
        {
            UserId = userId,
            Action = "kyc_submitted",
            Module = "kyc",
            Resource = "kyc_application",
            ResourceId = app.Id.ToString(),
            Metadata = $"{{\"level\":{level},\"country\":\"{app.CountryOfResidence}\"}}",
        });

        return new KycSubmitResponse
        {
            Status = "under_review",
            Message = "Your application has been submitted for review. We'll notify you once it's processed.",
            SubmittedAt = app.SubmittedAt,
        };
    }

    public async Task<KycReviewResponse> ReviewAsync(Guid adminId, Guid applicationId, KycReviewRequest request)
    {
        var app = await _db.KycApplications.Include(a => a.User).FirstOrDefaultAsync(a => a.Id == applicationId)
            ?? throw new KeyNotFoundException("Application not found.");

        var action = request.Action.ToLowerInvariant();
        if (action is not ("approve" or "reject" or "request_info"))
            throw new InvalidOperationException("Invalid review action.");

        _db.KycReviews.Add(new KycReview
        {
            KycApplicationId = applicationId,
            ReviewerId = adminId,
            Action = action,
            Notes = request.Notes,
        });

        app.Status = action switch
        {
            "approve" => "approved",
            "reject" => "rejected",
            _ => "additional_info",
        };
        app.ReviewedAt = DateTime.UtcNow;
        app.UpdatedAt = DateTime.UtcNow;

        _db.KycTimelineEvents.Add(new KycTimelineEvent
        {
            KycApplicationId = app.Id,
            EventType = action switch { "approve" => "approved", "reject" => "rejected", _ => "info_requested" },
            Description = action switch
            {
                "approve" => "Application approved",
                "reject" => $"Application rejected: {request.Notes}",
                _ => $"Additional information requested: {request.Notes}",
            },
        });

        if (action == "approve")
        {
            app.CompletedAt = DateTime.UtcNow;
            if (app.User != null)
            {
                app.User.KYCStatus = "verified";
                app.User.KycLevel = Math.Max(app.User.KycLevel, app.Level);
            }
        }
        else if (action == "reject")
        {
            if (app.User != null) app.User.KYCStatus = "rejected";
        }

        await _db.SaveChangesAsync();

        if (app.User != null)
        {
            await NotifyAsync(app.User, action == "approve" ? "kyc_approved" : action == "reject" ? "kyc_rejected" : "kyc_info_requested",
                action == "approve" ? "KYC verification approved" : action == "reject" ? "KYC verification rejected" : "Additional information required",
                action == "approve"
                    ? "Congratulations! Your identity has been verified and all PayAfrika features are now unlocked."
                    : action == "reject"
                        ? $"Your KYC verification was not approved. Reason: {request.Notes ?? "Please contact support."}"
                        : $"We need more information to complete your verification: {request.Notes ?? "Please re-upload the affected document."}");
        }

        await _audit.LogAsync(new AuditLogEntry
        {
            UserId = adminId,
            Action = $"kyc_review_{action}",
            Module = "kyc",
            Resource = "kyc_application",
            ResourceId = applicationId.ToString(),
            PreviousValue = "pending",
            NewValue = app.Status,
            Metadata = $"{{\"level\":{app.Level},\"notes\":\"{EscapeJson(request.Notes ?? "")}\"}}",
            IsSecurityAlert = action == "approve",
        });

        return new KycReviewResponse
        {
            Status = app.Status,
            Level = app.Level,
            Message = $"Application {action}d.",
        };
    }

    public async Task EscalateAsync(Guid adminId, Guid applicationId, string reason)
    {
        var app = await _db.KycApplications.Include(a => a.User).FirstOrDefaultAsync(a => a.Id == applicationId)
            ?? throw new KeyNotFoundException("Application not found.");

        if (string.IsNullOrWhiteSpace(reason))
            throw new InvalidOperationException("An escalation reason is required.");

        app.Escalated = true;
        app.EscalationReason = reason;
        app.UpdatedAt = DateTime.UtcNow;

        _db.KycTimelineEvents.Add(new KycTimelineEvent
        {
            KycApplicationId = app.Id,
            EventType = "escalated",
            Description = $"Escalated for compliance review: {reason}",
        });

        await _db.SaveChangesAsync();

        await _audit.LogAsync(new AuditLogEntry
        {
            UserId = adminId,
            Action = "kyc_escalated",
            Module = "kyc",
            Resource = "kyc_application",
            ResourceId = applicationId.ToString(),
            NewValue = "escalated",
            Metadata = $"{{\"reason\":\"{EscapeJson(reason)}\"}}",
            IsSecurityAlert = true,
        });
    }

    // ── Admin document access (restricted, watermarked meta) ──

    public async Task<(byte[] Data, string ContentType, string FileName)?> GetDocumentAsync(Guid adminId, Guid applicationId, Guid documentId)
    {
        var app = await _db.KycApplications.FirstOrDefaultAsync(a => a.Id == applicationId);
        if (app == null) return null;

        var doc = await _db.KycDocuments.FirstOrDefaultAsync(d => d.Id == documentId && d.KycApplicationId == applicationId);
        if (doc == null || string.IsNullOrWhiteSpace(doc.FileData)) return null;

        var raw = Convert.FromBase64String(DecryptFileData(doc.FileData));

        await _audit.LogAsync(new AuditLogEntry
        {
            UserId = adminId,
            Action = "kyc_document_viewed",
            Module = "kyc",
            Resource = "kyc_document",
            ResourceId = doc.Id.ToString(),
            Metadata = $"{{\"application\":\"{applicationId}\",\"type\":\"{doc.DocumentType}\"}}",
        });

        return (raw, doc.ContentType, doc.FileName);
    }

    // ── Helpers ────────────────────────────────────────

    private async Task<KycApplication> GetOrCreateAppAsync(Guid userId)
    {
        var app = await _db.KycApplications.FirstOrDefaultAsync(a => a.UserId == userId);
        if (app != null) return app;

        app = new KycApplication
        {
            UserId = userId, Status = "pending", CompletedSteps = "[]",
        };
        _db.KycTimelineEvents.Add(new KycTimelineEvent
        {
            KycApplicationId = app.Id,
            EventType = "started",
            Description = "KYC application started",
        });
        _db.KycApplications.Add(app);
        return app;
    }

    private async Task AddStepAsync(KycApplication app, string step, string description)
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

    private static int CalcProgress(KycApplication app, List<string> steps)
    {
        if (app.Status is "approved" or "verified") return 100;
        if (app.Status == "rejected") return 100;
        if (app.Status == "under_review") return 90;
        var max = 100;
        return Math.Min(steps.Count * 10 + (app.Status == "additional_info" ? 5 : 0), max - 1);
    }

    private static KycStepStatus CreateStepStatus(List<string> steps, string step, DateTime updated)
        => steps.Contains(step) ? new KycStepStatus { Status = "completed", UpdatedAt = updated } : new KycStepStatus { Status = "pending" };

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

    private async Task NotifyAsync(User? user, string type, string title, string message)
    {
        if (user == null) return;

        _db.InAppNotifications.Add(new InAppNotification
        {
            UserId = user.Id,
            Type = "kyc",
            Title = title,
            Message = message,
        });
        await _db.SaveChangesAsync();
    }

    private static string EncryptFileData(string plaintext)
    {
        var key = Encoding.UTF8.GetBytes(GetKey());
        using var aes = Aes.Create();
        aes.Key = key;
        aes.GenerateIV();
        using var encryptor = aes.CreateEncryptor(aes.Key, aes.IV);
        var plainBytes = Encoding.UTF8.GetBytes(plaintext);
        var cipherBytes = encryptor.TransformFinalBlock(plainBytes, 0, plainBytes.Length);
        var result = new byte[aes.IV.Length + cipherBytes.Length];
        Buffer.BlockCopy(aes.IV, 0, result, 0, aes.IV.Length);
        Buffer.BlockCopy(cipherBytes, 0, result, aes.IV.Length, cipherBytes.Length);
        return "enc:" + Convert.ToBase64String(result);
    }

    private static string DecryptFileData(string stored)
    {
        if (!stored.StartsWith("enc:")) return stored; // legacy plain data
        var allBytes = Convert.FromBase64String(stored[4..]);
        var iv = allBytes.Take(16).ToArray();
        var cipherBytes = allBytes.Skip(16).ToArray();
        var key = Encoding.UTF8.GetBytes(GetKey());
        using var aes = Aes.Create();
        aes.Key = key;
        aes.IV = iv;
        using var decryptor = aes.CreateDecryptor(aes.Key, aes.IV);
        var plainBytes = decryptor.TransformFinalBlock(cipherBytes, 0, cipherBytes.Length);
        return Encoding.UTF8.GetString(plainBytes);
    }

    private static string GetKey()
    {
        var env = Environment.GetEnvironmentVariable("PAYAFRIKA_SECURITY_KEY");
        if (!string.IsNullOrWhiteSpace(env) && env.Length >= 32)
            return env[..32];

        var fallback = "PayAfrika-2026-Security-Key-Change-Me!";
        return fallback.PadRight(32, '!')[..32];
    }

    private static string EscapeJson(string value)
        => value.Replace("\\", "\\\\").Replace("\"", "\\\"");
}
