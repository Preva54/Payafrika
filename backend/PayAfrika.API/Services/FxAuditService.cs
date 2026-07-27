using Microsoft.EntityFrameworkCore;
using PayAfrika.API.Data;
using PayAfrika.API.Models;

namespace PayAfrika.API.Services;

public class FxAuditService : IFxAuditService
{
    private readonly AppDbContext _db;
    private readonly IHttpContextAccessor _httpContext;

    public FxAuditService(AppDbContext db, IHttpContextAccessor httpContext)
    {
        _db = db;
        _httpContext = httpContext;
    }

    public async Task LogAsync(Guid? userId, string userName, string action, string entityType,
        string? entityId, string? previousValue = null, string? newValue = null,
        string? ipAddress = null, string? userAgent = null)
    {
        ipAddress ??= _httpContext.HttpContext?.Connection.RemoteIpAddress?.ToString();
        userAgent ??= _httpContext.HttpContext?.Request.Headers.UserAgent.FirstOrDefault();

        var log = new FxAuditLog
        {
            UserId = userId,
            UserName = userName,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            PreviousValueJson = previousValue,
            NewValueJson = newValue,
            IpAddress = ipAddress,
            UserAgent = userAgent,
        };

        _db.FxAuditLogs.Add(log);
        await _db.SaveChangesAsync();
    }

    public async Task<List<FxAuditLog>> GetLogsAsync(string? entityType = null, string? action = null,
        DateTime? from = null, DateTime? to = null, int page = 1, int pageSize = 50)
    {
        var query = _db.FxAuditLogs.AsQueryable();

        if (!string.IsNullOrEmpty(entityType))
            query = query.Where(l => l.EntityType == entityType);
        if (!string.IsNullOrEmpty(action))
            query = query.Where(l => l.Action == action);
        if (from.HasValue)
            query = query.Where(l => l.CreatedAt >= from.Value);
        if (to.HasValue)
            query = query.Where(l => l.CreatedAt <= to.Value);

        return await query
            .OrderByDescending(l => l.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }

    public async Task<int> GetTotalCountAsync(string? entityType = null, string? action = null,
        DateTime? from = null, DateTime? to = null)
    {
        var query = _db.FxAuditLogs.AsQueryable();

        if (!string.IsNullOrEmpty(entityType))
            query = query.Where(l => l.EntityType == entityType);
        if (!string.IsNullOrEmpty(action))
            query = query.Where(l => l.Action == action);
        if (from.HasValue)
            query = query.Where(l => l.CreatedAt >= from.Value);
        if (to.HasValue)
            query = query.Where(l => l.CreatedAt <= to.Value);

        return await query.CountAsync();
    }
}
