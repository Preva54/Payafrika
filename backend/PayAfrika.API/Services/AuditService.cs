using System.Security.Claims;
using PayAfrika.API.Data;
using PayAfrika.API.Models;

namespace PayAfrika.API.Services;

public interface IAuditService
{
    Task LogAsync(AuditLogEntry entry);
    Task LogSecurityAlertAsync(AuditLogEntry entry);
}

public class AuditLogEntry
{
    public Guid? UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string UserRole { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string Module { get; set; } = string.Empty;
    public string Resource { get; set; } = string.Empty;
    public string ResourceId { get; set; } = string.Empty;
    public string? PreviousValue { get; set; }
    public string? NewValue { get; set; }
    public string? Metadata { get; set; }
    public string? IPAddress { get; set; }
    public string? UserAgent { get; set; }
    public string? Browser { get; set; }
    public string? OperatingSystem { get; set; }
    public string? DeviceType { get; set; }
    public string? SessionId { get; set; }
    public string? Location { get; set; }
    public string? Country { get; set; }
    public string? City { get; set; }
    public string? Endpoint { get; set; }
    public string? HttpMethod { get; set; }
    public int? HttpStatus { get; set; }
    public string Result { get; set; } = "success";
    public string Severity { get; set; } = "info";
    public long? ResponseTimeMs { get; set; }
    public string? Department { get; set; }
    public bool IsSecurityAlert { get; set; }
    public Guid? CorrelationId { get; set; }
}

public class AuditService : IAuditService
{
    private readonly AppDbContext _db;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public AuditService(AppDbContext db, IHttpContextAccessor httpContextAccessor)
    {
        _db = db;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task LogAsync(AuditLogEntry entry)
    {
        var httpContext = _httpContextAccessor.HttpContext;
        var userAgent = entry.UserAgent ?? httpContext?.Request.Headers.UserAgent.FirstOrDefault() ?? "";
        var userAgentInfo = ParseUserAgent(userAgent);
        var ip = entry.IPAddress ?? httpContext?.Connection.RemoteIpAddress?.ToString() ?? "";
        var userId = entry.UserId ?? TryGetUserId(httpContext);

        var log = new AuditLog
        {
            UserId = userId,
            UserName = entry.UserName ?? httpContext?.User.FindFirst(ClaimTypes.Name)?.Value ?? "",
            UserRole = entry.UserRole ?? httpContext?.User.FindFirst(ClaimTypes.Role)?.Value ?? "",
            Email = entry.Email ?? httpContext?.User.FindFirst(ClaimTypes.Email)?.Value ?? "",
            Action = entry.Action,
            Module = entry.Module,
            Resource = entry.Resource,
            ResourceId = entry.ResourceId,
            PreviousValue = entry.PreviousValue ?? "",
            NewValue = entry.NewValue ?? "",
            Metadata = entry.Metadata ?? "{}",
            IPAddress = ip,
            UserAgent = userAgent,
            Browser = entry.Browser ?? userAgentInfo.Browser,
            OperatingSystem = entry.OperatingSystem ?? userAgentInfo.OS,
            DeviceType = entry.DeviceType ?? userAgentInfo.DeviceType,
            SessionId = entry.SessionId ?? httpContext?.Session.Id ?? "",
            Location = entry.Location ?? "",
            Country = entry.Country ?? "",
            City = entry.City ?? "",
            Endpoint = entry.Endpoint ?? httpContext?.Request.Path ?? "",
            HttpMethod = entry.HttpMethod ?? httpContext?.Request.Method ?? "",
            HttpStatus = entry.HttpStatus,
            Result = entry.Result,
            Severity = entry.Severity,
            ResponseTimeMs = entry.ResponseTimeMs,
            Department = entry.Department ?? "",
            IsSecurityAlert = entry.IsSecurityAlert,
            CorrelationId = entry.CorrelationId ?? Guid.NewGuid(),
        };

        _db.AuditLogs.Add(log);
        await _db.SaveChangesAsync();
    }

    public async Task LogSecurityAlertAsync(AuditLogEntry entry)
    {
        entry.IsSecurityAlert = true;
        entry.Severity = "high";
        await LogAsync(entry);
    }

    private static Guid? TryGetUserId(HttpContext? httpContext)
    {
        if (httpContext?.User.Identity?.IsAuthenticated != true) return null;
        var sub = httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return sub != null && Guid.TryParse(sub, out var guid) ? guid : null;
    }

    private static (string Browser, string OS, string DeviceType) ParseUserAgent(string ua)
    {
        if (string.IsNullOrWhiteSpace(ua)) return ("Unknown", "Unknown", "Unknown");
        var browser = "Unknown";
        var os = "Unknown";
        var device = "Desktop";

        if (ua.Contains("Edg", StringComparison.OrdinalIgnoreCase)) browser = "Edge";
        else if (ua.Contains("Chrome", StringComparison.OrdinalIgnoreCase) && !ua.Contains("Edg", StringComparison.OrdinalIgnoreCase)) browser = "Chrome";
        else if (ua.Contains("Firefox", StringComparison.OrdinalIgnoreCase)) browser = "Firefox";
        else if (ua.Contains("Safari", StringComparison.OrdinalIgnoreCase)) browser = "Safari";

        if (ua.Contains("Windows", StringComparison.OrdinalIgnoreCase)) os = "Windows";
        else if (ua.Contains("Mac OS", StringComparison.OrdinalIgnoreCase)) os = "macOS";
        else if (ua.Contains("Linux", StringComparison.OrdinalIgnoreCase) && !ua.Contains("Android", StringComparison.OrdinalIgnoreCase)) os = "Linux";
        else if (ua.Contains("Android", StringComparison.OrdinalIgnoreCase)) os = "Android";
        else if (ua.Contains("iOS", StringComparison.OrdinalIgnoreCase) || ua.Contains("iPhone", StringComparison.OrdinalIgnoreCase) || ua.Contains("iPad", StringComparison.OrdinalIgnoreCase)) os = "iOS";

        if (ua.Contains("Mobile", StringComparison.OrdinalIgnoreCase)) device = "Mobile";
        else if (ua.Contains("Tablet", StringComparison.OrdinalIgnoreCase) || ua.Contains("iPad", StringComparison.OrdinalIgnoreCase)) device = "Tablet";

        return (browser, os, device);
    }
}
