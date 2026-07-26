using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using PayAfrika.API.Data;
using PayAfrika.API.Models;

namespace PayAfrika.API.Services;

public interface IPermissionService
{
    Task<bool> HasPermissionAsync(Guid userId, string module, string action);
    Task<List<string>> GetUserPermissionsAsync(Guid userId);
    Task<List<string>> GetUserModulesAsync(Guid userId);
    Task<HashSet<string>> GetUserPermissionSetAsync(Guid userId);
    Task<bool> IsSuperAdminAsync(Guid userId);
    void CheckPermission(string module, string action);
}

public class PermissionService : IPermissionService
{
    private readonly AppDbContext _db;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private static readonly Dictionary<string, HashSet<string>> SuperAdminPermissions = new();
    private static readonly Dictionary<Guid, CachedPermissions> _cache = new();
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(5);

    public PermissionService(AppDbContext db, IHttpContextAccessor httpContextAccessor)
    {
        _db = db;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task<bool> HasPermissionAsync(Guid userId, string module, string action)
    {
        var perms = await GetUserPermissionSetAsync(userId);
        return perms.Contains($"*:*") || perms.Contains($"{module}:{action}") || perms.Contains($"{module}:*");
    }

    public async Task<List<string>> GetUserPermissionsAsync(Guid userId)
    {
        var set = await GetUserPermissionSetAsync(userId);
        return set.ToList();
    }

    public async Task<List<string>> GetUserModulesAsync(Guid userId)
    {
        var set = await GetUserPermissionSetAsync(userId);
        return set
            .Select(p => p.Split(':')[0])
            .Where(m => m != "*")
            .Distinct()
            .ToList();
    }

    public async Task<HashSet<string>> GetUserPermissionSetAsync(Guid userId)
    {
        if (_cache.TryGetValue(userId, out var cached) && DateTime.UtcNow - cached.FetchedAt < CacheDuration)
            return cached.Permissions;

        var permissions = new HashSet<string>();

        var roleAssignments = await _db.UserRoleAssignments
            .Include(a => a.Role)
                .ThenInclude(r => r.RolePermissions)
                    .ThenInclude(rp => rp.Permission)
            .Where(a => a.UserId == userId && a.Status == "active")
            .ToListAsync();

        foreach (var assignment in roleAssignments)
        {
            if (assignment.Role.Name == "super_admin")
            {
                permissions.Add("*:*");
                _cache[userId] = new CachedPermissions { Permissions = permissions, FetchedAt = DateTime.UtcNow };
                return permissions;
            }

            foreach (var rp in assignment.Role.RolePermissions)
            {
                permissions.Add($"{rp.Permission.Module}:{rp.Permission.Action}");
            }

            if (assignment.ExpiresAt.HasValue && assignment.ExpiresAt < DateTime.UtcNow)
            {
                assignment.Status = "expired";
            }
        }

        var user = await _db.Users.FindAsync(userId);
        if (user?.Role == "admin") permissions.Add("*:*");

        await _db.SaveChangesAsync();
        _cache[userId] = new CachedPermissions { Permissions = permissions, FetchedAt = DateTime.UtcNow };
        return permissions;
    }

    public async Task<bool> IsSuperAdminAsync(Guid userId)
    {
        var perms = await GetUserPermissionSetAsync(userId);
        return perms.Contains("*:*");
    }

    public void CheckPermission(string module, string action)
    {
        var userId = _httpContextAccessor.HttpContext?.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null) throw new UnauthorizedAccessException();
        var guid = Guid.Parse(userId);
        var task = HasPermissionAsync(guid, module, action);
        task.Wait();
        if (!task.Result) throw new UnauthorizedAccessException($"Missing permission: {module}:{action}");
    }

    public static void InvalidateCache(Guid userId)
    {
        _cache.Remove(userId);
    }

    public static void InvalidateAllCache()
    {
        _cache.Clear();
    }

    private class CachedPermissions
    {
        public HashSet<string> Permissions { get; set; } = new();
        public DateTime FetchedAt { get; set; }
    }
}

public class PermissionMiddleware
{
    private readonly RequestDelegate _next;

    public PermissionMiddleware(RequestDelegate next) { _next = next; }

    public async Task InvokeAsync(HttpContext context, IPermissionService permissionService)
    {
        if (context.User.Identity?.IsAuthenticated == true)
        {
            var userIdClaim = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim != null && Guid.TryParse(userIdClaim, out var userId))
            {
                context.Items["UserId"] = userId;
                context.Items["Permissions"] = await permissionService.GetUserPermissionSetAsync(userId);
            }
        }
        await _next(context);
    }
}

public static class PermissionPolicies
{
    public const string SuperAdmin = "super_admin";
    public const string ViewUsers = "User Management:View";
    public const string CreateUsers = "User Management:Create";
    public const string EditUsers = "User Management:Edit";
    public const string DeleteUsers = "User Management:Delete";
    public const string ViewTransactions = "Transactions:View";
    public const string RefundTransactions = "Transactions:Refund";
    public const string ViewKYC = "KYC & Compliance:ReviewDocuments";
    public const string ApproveKYC = "KYC & Compliance:Approve";
    public const string ViewAuditLogs = "Audit Logs:ViewLogs";
    public const string ViewAffiliates = "Affiliate:ViewAffiliates";
    public const string ViewReports = "Reports:View";
    public const string ManageCMS = "CMS:CreateContent";
    public const string PublishCMS = "CMS:Publish";
    public const string ManageSettings = "Settings:Edit";
    public const string ManageAPI = "API:GenerateKeys";
    public const string ManageRoles = "Roles & Permissions:Edit";
}
