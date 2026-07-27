namespace PayAfrika.API.Services;

public interface IFxAuditService
{
    Task LogAsync(Guid? userId, string userName, string action, string entityType, string? entityId,
        string? previousValue = null, string? newValue = null, string? ipAddress = null, string? userAgent = null);
    Task<List<Models.FxAuditLog>> GetLogsAsync(string? entityType = null, string? action = null,
        DateTime? from = null, DateTime? to = null, int page = 1, int pageSize = 50);
    Task<int> GetTotalCountAsync(string? entityType = null, string? action = null,
        DateTime? from = null, DateTime? to = null);
}
