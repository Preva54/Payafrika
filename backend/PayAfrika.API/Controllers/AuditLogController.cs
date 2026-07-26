using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PayAfrika.API.Data;
using PayAfrika.API.Models;
using PayAfrika.API.Services;

namespace PayAfrika.API.Controllers;

[Route("api/audit-logs")]
[ApiController]
[Authorize(Roles = "admin")]
public class AuditLogController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IAuditService _audit;

    public AuditLogController(AppDbContext db, IAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    // ─── Dashboard Aggregates ─────────────────────────────────

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard()
    {
        var now = DateTime.UtcNow;
        var todayStart = now.Date;
        var yesterdayStart = todayStart.AddDays(-1);

        var todayLogs = _db.AuditLogs.Where(x => x.CreatedAt >= todayStart);
        var recentLogs = _db.AuditLogs.Where(x => x.CreatedAt >= yesterdayStart);

        var totalToday = await todayLogs.CountAsync();
        var criticalToday = await todayLogs.CountAsync(x => x.Severity == "critical");
        var failedLogins = await todayLogs.CountAsync(x => x.Action == "Login" && x.Result == "failed");
        var adminActions = await todayLogs.CountAsync(x => x.Module == "Admin");
        var apiRequests = await todayLogs.CountAsync(x => x.Module == "API");
        var fraudAlerts = await todayLogs.CountAsync(x => x.IsSecurityAlert);
        var kycReviews = await todayLogs.CountAsync(x => x.Module == "KYC");
        var systemErrors = await todayLogs.CountAsync(x => x.Severity == "critical");

        var errorsByHour = await todayLogs
            .Where(x => x.Severity == "critical" || x.Severity == "high")
            .GroupBy(x => x.CreatedAt.Hour)
            .Select(g => new { Hour = g.Key, Count = g.Count() })
            .ToListAsync();

        var topUsers = await recentLogs
            .GroupBy(x => new { x.UserId, x.UserName, x.Email })
            .Select(g => new { g.Key.UserId, g.Key.UserName, g.Key.Email, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .Take(10)
            .ToListAsync();

        var actionsByModule = await recentLogs
            .GroupBy(x => x.Module)
            .Select(g => new { Module = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .ToListAsync();

        var severityDistribution = await recentLogs
            .GroupBy(x => x.Severity)
            .Select(g => new { Severity = g.Key, Count = g.Count() })
            .ToListAsync();

        return Ok(new
        {
            totalToday,
            criticalToday,
            failedLogins,
            adminActions,
            apiRequests,
            fraudAlerts,
            kycReviews,
            systemErrors,
            errorsByHour,
            topUsers,
            actionsByModule,
            severityDistribution,
        });
    }

    // ─── List with Advanced Filters ────────────────────────────

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? search = null,
        [FromQuery] string? userId = null,
        [FromQuery] string? action = null,
        [FromQuery] string? module = null,
        [FromQuery] string? severity = null,
        [FromQuery] string? result = null,
        [FromQuery] string? department = null,
        [FromQuery] string? resource = null,
        [FromQuery] string? ipAddress = null,
        [FromQuery] string? country = null,
        [FromQuery] string? deviceType = null,
        [FromQuery] string? browser = null,
        [FromQuery] string? os = null,
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        [FromQuery] bool? isSecurityAlert = null,
        [FromQuery] string? sortBy = "createdAt",
        [FromQuery] string? sortDir = "desc")
    {
        var query = _db.AuditLogs.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.ToLowerInvariant();
            query = query.Where(x =>
                x.UserName.ToLower().Contains(term) ||
                x.Email.ToLower().Contains(term) ||
                x.Action.ToLower().Contains(term) ||
                x.Module.ToLower().Contains(term) ||
                x.Resource.ToLower().Contains(term) ||
                x.ResourceId.ToLower().Contains(term) ||
                x.IPAddress.Contains(term) ||
                x.SessionId.ToLower().Contains(term) ||
                x.Location.ToLower().Contains(term) ||
                x.Country.ToLower().Contains(term));
        }

        if (!string.IsNullOrWhiteSpace(userId) && Guid.TryParse(userId, out var uid))
            query = query.Where(x => x.UserId == uid);
        if (!string.IsNullOrWhiteSpace(action))
            query = query.Where(x => x.Action == action);
        if (!string.IsNullOrWhiteSpace(module))
            query = query.Where(x => x.Module == module);
        if (!string.IsNullOrWhiteSpace(severity))
            query = query.Where(x => x.Severity == severity);
        if (!string.IsNullOrWhiteSpace(result))
            query = query.Where(x => x.Result == result);
        if (!string.IsNullOrWhiteSpace(department))
            query = query.Where(x => x.Department == department);
        if (!string.IsNullOrWhiteSpace(resource))
            query = query.Where(x => x.Resource.Contains(resource));
        if (!string.IsNullOrWhiteSpace(ipAddress))
            query = query.Where(x => x.IPAddress.Contains(ipAddress));
        if (!string.IsNullOrWhiteSpace(country))
            query = query.Where(x => x.Country == country);
        if (!string.IsNullOrWhiteSpace(deviceType))
            query = query.Where(x => x.DeviceType == deviceType);
        if (!string.IsNullOrWhiteSpace(browser))
            query = query.Where(x => x.Browser == browser);
        if (!string.IsNullOrWhiteSpace(os))
            query = query.Where(x => x.OperatingSystem == os);
        if (from.HasValue)
            query = query.Where(x => x.CreatedAt >= from.Value);
        if (to.HasValue)
            query = query.Where(x => x.CreatedAt <= to.Value);
        if (isSecurityAlert.HasValue)
            query = query.Where(x => x.IsSecurityAlert == isSecurityAlert.Value);

        var total = await query.CountAsync();

        query = (sortBy?.ToLower(), sortDir?.ToLower()) switch
        {
            ("createdat", "asc") => query.OrderBy(x => x.CreatedAt),
            ("createdat", "desc") => query.OrderByDescending(x => x.CreatedAt),
            ("severity", "asc") => query.OrderBy(x => x.Severity).ThenByDescending(x => x.CreatedAt),
            ("severity", "desc") => query.OrderByDescending(x => x.Severity).ThenByDescending(x => x.CreatedAt),
            ("user", "asc") => query.OrderBy(x => x.UserName).ThenByDescending(x => x.CreatedAt),
            ("user", "desc") => query.OrderByDescending(x => x.UserName).ThenByDescending(x => x.CreatedAt),
            ("module", "asc") => query.OrderBy(x => x.Module).ThenByDescending(x => x.CreatedAt),
            ("module", "desc") => query.OrderByDescending(x => x.Module).ThenByDescending(x => x.CreatedAt),
            _ => query.OrderByDescending(x => x.CreatedAt),
        };

        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var severityCounts = new Dictionary<string, int>
        {
            ["critical"] = await _db.AuditLogs.CountAsync(x => x.Severity == "critical"),
            ["high"] = await _db.AuditLogs.CountAsync(x => x.Severity == "high"),
            ["medium"] = await _db.AuditLogs.CountAsync(x => x.Severity == "medium"),
            ["low"] = await _db.AuditLogs.CountAsync(x => x.Severity == "low"),
            ["info"] = await _db.AuditLogs.CountAsync(x => x.Severity == "info"),
        };

        return Ok(new
        {
            items,
            total,
            page,
            pageSize,
            totalPages = (int)Math.Ceiling(total / (double)pageSize),
            severityCounts,
        });
    }

    // ─── Get Single ────────────────────────────────────────────

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var log = await _db.AuditLogs.FindAsync(id);
        if (log == null) return NotFound();
        return Ok(log);
    }

    // ─── Export ────────────────────────────────────────────────

    [HttpGet("export")]
    public async Task<IActionResult> Export(
        [FromQuery] string format = "json",
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        [FromQuery] string? module = null,
        [FromQuery] string? severity = null)
    {
        var query = _db.AuditLogs.AsQueryable();

        if (from.HasValue) query = query.Where(x => x.CreatedAt >= from.Value);
        if (to.HasValue) query = query.Where(x => x.CreatedAt <= to.Value);
        if (!string.IsNullOrWhiteSpace(module)) query = query.Where(x => x.Module == module);
        if (!string.IsNullOrWhiteSpace(severity)) query = query.Where(x => x.Severity == severity);

        var logs = await query.OrderByDescending(x => x.CreatedAt).ToListAsync();

        switch (format.ToLower())
        {
            case "csv":
                var csv = "Id,Timestamp,User,Email,Role,Action,Module,Resource,ResourceId,Result,Severity,IP,Country,Browser,OS,Device,Endpoint,Method,Status,ResponseTime\n" +
                          string.Join("\n", logs.Select(l =>
                              $"\"{l.Id}\",\"{l.CreatedAt:O}\",\"{l.UserName}\",\"{l.Email}\",\"{l.UserRole}\",\"{l.Action}\",\"{l.Module}\",\"{l.Resource}\",\"{l.ResourceId}\",\"{l.Result}\",\"{l.Severity}\",\"{l.IPAddress}\",\"{l.Country}\",\"{l.Browser}\",\"{l.OperatingSystem}\",\"{l.DeviceType}\",\"{l.Endpoint}\",\"{l.HttpMethod}\",\"{l.HttpStatus}\",\"{l.ResponseTimeMs}\""));
                return Content(csv, "text/csv", System.Text.Encoding.UTF8);

            case "json":
            default:
                return Ok(logs);
        }
    }

    // ─── Security Alerts ───────────────────────────────────────

    [HttpGet("security-alerts")]
    public async Task<IActionResult> GetSecurityAlerts(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] bool? acknowledged = null)
    {
        var query = _db.AuditLogs.Where(x => x.IsSecurityAlert);
        if (acknowledged.HasValue)
            query = query.Where(x => x.IsAcknowledged == acknowledged.Value);

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(x => x.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new { items, total, page, pageSize });
    }

    [HttpPut("security-alerts/{id}/acknowledge")]
    public async Task<IActionResult> AcknowledgeAlert(Guid id)
    {
        var alert = await _db.AuditLogs.FindAsync(id);
        if (alert == null || !alert.IsSecurityAlert) return NotFound();

        alert.IsAcknowledged = true;
        alert.AcknowledgedAt = DateTime.UtcNow;

        var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (userIdStr != null && Guid.TryParse(userIdStr, out var uid))
            alert.AcknowledgedById = uid;

        await _db.SaveChangesAsync();
        return Ok(alert);
    }

    // ─── Retention Policy ──────────────────────────────────────

    [HttpPost("retention")]
    public async Task<IActionResult> ApplyRetention([FromBody] RetentionRequest request)
    {
        var cutoff = DateTime.UtcNow.AddDays(-request.RetentionDays);
        var oldLogs = await _db.AuditLogs.Where(x => x.CreatedAt < cutoff).ToListAsync();
        _db.AuditLogs.RemoveRange(oldLogs);
        await _db.SaveChangesAsync();

        await _audit.LogAsync(new AuditLogEntry
        {
            Action = "Retention Applied",
            Module = "System",
            Resource = "AuditLogs",
            ResourceId = "",
            NewValue = $"{oldLogs.Count} logs older than {request.RetentionDays} days archived",
            Severity = "info",
        });

        return Ok(new { archivedCount = oldLogs.Count, retentionDays = request.RetentionDays });
    }
}

public class RetentionRequest
{
    public int RetentionDays { get; set; } = 90;
}
