using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PayAfrika.API.Data;
using PayAfrika.API.Models;

namespace PayAfrika.API.Controllers;

[ApiController]
[Route("api/admin/users")]
[Authorize(Roles = "admin")]
public class AdminUsersController : ControllerBase
{
    private readonly AppDbContext _db;

    public AdminUsersController(AppDbContext db) { _db = db; }

    [HttpGet("dashboard")]
    public async Task<ActionResult> GetDashboard()
    {
        var now = DateTime.UtcNow;
        var todayStart = now.Date;
        var total = await _db.Users.CountAsync();
        var active = await _db.Users.CountAsync(u => u.UpdatedAt >= now.AddDays(-30));
        var newToday = await _db.Users.CountAsync(u => u.CreatedAt >= todayStart);
        var suspended = await _db.Users.CountAsync(u => u.Role == "suspended");
        var pendingKyc = await _db.Users.CountAsync(u => u.KYCStatus == "pending" || u.KYCStatus == "not_started");
        var verified = await _db.Users.CountAsync(u => u.KYCStatus == "verified");
        var deleted = await _db.Users.IgnoreQueryFilters().CountAsync(u => u.Role == "deleted");

        var dailyReg = await _db.Users
            .Where(u => u.CreatedAt >= now.AddDays(-30))
            .GroupBy(u => u.CreatedAt.Date)
            .Select(g => new { date = g.Key.ToString("yyyy-MM-dd"), count = g.Count() })
            .OrderBy(p => p.date)
            .ToListAsync();

        var roleDist = await _db.Users
            .GroupBy(u => u.Role)
            .Select(g => new { label = g.Key, value = g.Count() })
            .ToListAsync();

        return Ok(new { total, active, newToday, suspended, pendingKyc, verified, deleted, dailyReg, roleDist });
    }

    [HttpGet]
    public async Task<ActionResult> GetUsers(
        [FromQuery] string? search = null,
        [FromQuery] string? role = null,
        [FromQuery] string? status = null,
        [FromQuery] string? kycStatus = null,
        [FromQuery] string? country = null,
        [FromQuery] string? sort = "createdAt_desc",
        [FromQuery] int page = 1,
        [FromQuery] int limit = 50)
    {
        var query = _db.Users.AsQueryable();

        if (!string.IsNullOrEmpty(search))
        {
            var s = search.ToLower();
            query = query.Where(u => u.FullName.ToLower().Contains(s) || u.Email.ToLower().Contains(s) || (u.PhoneNumber != null && u.PhoneNumber.Contains(s)));
        }
        if (!string.IsNullOrEmpty(role)) query = query.Where(u => u.Role == role);
        if (!string.IsNullOrEmpty(status)) query = query.Where(u => status == "active" ? u.UpdatedAt >= DateTime.UtcNow.AddDays(-30) : u.UpdatedAt < DateTime.UtcNow.AddDays(-30));
        if (!string.IsNullOrEmpty(kycStatus)) query = query.Where(u => u.KYCStatus == kycStatus);
        if (!string.IsNullOrEmpty(country)) query = query.Where(u => u.Country == country);

        query = sort switch
        {
            "createdAt_asc" => query.OrderBy(u => u.CreatedAt),
            "name_asc" => query.OrderBy(u => u.FullName),
            "name_desc" => query.OrderByDescending(u => u.FullName),
            _ => query.OrderByDescending(u => u.CreatedAt),
        };

        var total = await query.CountAsync();
        var users = await query
            .Skip((page - 1) * limit).Take(limit)
            .Select(u => new
            {
                u.Id,
                u.FullName,
                u.Email,
                u.PhoneNumber,
                u.Role,
                u.KYCStatus,
                u.Country,
                u.IsEmailVerified,
                u.TwoFactorEnabled,
                u.CreatedAt,
                u.UpdatedAt,
                WalletBalance = u.Wallet != null ? u.Wallet.Balance : 0m,
            })
            .ToListAsync();

        return Ok(new { users, total, page, limit, totalPages = (int)Math.Ceiling((double)total / limit) });
    }

    [HttpGet("{id}")]
    public async Task<ActionResult> GetUser(Guid id)
    {
        var user = await _db.Users
            .Include(u => u.Wallet)
            .Include(u => u.WalletBalances)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user == null) return NotFound();

        var roles = await _db.UserRoleAssignments
            .Where(a => a.UserId == id && a.Status == "active")
            .Include(a => a.Role)
            .Select(a => new { a.Role.Name, a.Role.Color, a.Role.Icon, a.Role.Description, a.Department, a.Region, a.ExpiresAt, a.CreatedAt })
            .ToListAsync();

        var business = await _db.BusinessProfiles.FirstOrDefaultAsync(b => b.UserId == id);
        var deviceCount = await _db.ConnectedDevices.CountAsync(d => d.UserId == id);
        var txCount = await _db.Transactions.CountAsync(t => t.UserId == id);
        var ticketCount = await _db.SupportTickets.CountAsync(t => t.UserId == id);

        return Ok(new
        {
            user.Id, user.FullName, user.Email, user.PhoneNumber, user.Role, user.KYCStatus,
            user.Country, user.IsEmailVerified, user.TwoFactorEnabled, user.AvatarUrl,
            user.CreatedAt, user.UpdatedAt,
            Wallet = user.Wallet != null ? new { user.Wallet.Balance, user.Wallet.Currency, user.Wallet.CreatedAt } : null,
            WalletBalances = user.WalletBalances.Select(w => new { w.Currency, w.Balance, w.ReservedBalance }),
            Roles = roles,
            Business = business != null ? new
            {
                business.BusinessName, business.RegistrationNumber, business.VATNumber,
                business.Industry, business.CompanyAddress, business.Website,
                business.SettlementPreference, business.BankAccountDetails,
            } : null,
            Stats = new { deviceCount, txCount, ticketCount },
        });
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> UpdateUser(Guid id, [FromBody] UpdateUserRequest request)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();

        if (request.FullName != null) user.FullName = request.FullName;
        if (request.PhoneNumber != null) user.PhoneNumber = request.PhoneNumber;
        if (request.Country != null) user.Country = request.Country;
        user.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await LogAction(id, "Updated user profile", "Admin edited user details");

        return Ok(new { message = "User updated" });
    }

    [HttpPost("{id}/suspend")]
    public async Task<ActionResult> SuspendUser(Guid id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();
        user.Role = "suspended";
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await LogAction(id, "Suspended user", "Admin suspended account");
        return Ok(new { message = "User suspended" });
    }

    [HttpPost("{id}/reactivate")]
    public async Task<ActionResult> ReactivateUser(Guid id, [FromBody] ReactivateRequest? request = null)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();
        user.Role = request?.NewRole ?? "customer";
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await LogAction(id, "Reactivated user", $"Admin reactivated account as {user.Role}");
        return Ok(new { message = "User reactivated", role = user.Role });
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> SoftDeleteUser(Guid id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();
        user.Role = "deleted";
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await LogAction(id, "Deleted user", "Admin soft-deleted account");
        return Ok(new { message = "User deleted" });
    }

    [HttpPost("{id}/restore")]
    public async Task<ActionResult> RestoreUser(Guid id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();
        if (user.Role != "deleted") return BadRequest(new { error = "User is not deleted" });
        user.Role = "customer";
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await LogAction(id, "Restored user", "Admin restored deleted account");
        return Ok(new { message = "User restored" });
    }

    [HttpPost("{id}/reset-password")]
    public async Task<ActionResult> ResetPassword(Guid id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();
        var tempPassword = $"PayAfrika{Guid.NewGuid().ToString("N")[..8]}!";
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(tempPassword);
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await LogAction(id, "Password reset", "Admin triggered password reset");
        return Ok(new { message = "Password reset", temporaryPassword = tempPassword });
    }

    [HttpPost("{id}/verify-email")]
    public async Task<ActionResult> VerifyEmail(Guid id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();
        user.IsEmailVerified = true;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await LogAction(id, "Email verified", "Admin verified email address");
        return Ok(new { message = "Email verified" });
    }

    [HttpPost("{id}/lock")]
    public async Task<ActionResult> LockAccount(Guid id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();
        user.Role = "locked";
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await LogAction(id, "Account locked", "Admin locked account");
        return Ok(new { message = "Account locked" });
    }

    [HttpPost("{id}/unlock")]
    public async Task<ActionResult> UnlockAccount(Guid id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();
        if (user.Role != "locked") return BadRequest(new { error = "Account is not locked" });
        user.Role = "customer";
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await LogAction(id, "Account unlocked", "Admin unlocked account");
        return Ok(new { message = "Account unlocked" });
    }

    [HttpGet("{id}/transactions")]
    public async Task<ActionResult> GetUserTransactions(Guid id, [FromQuery] int page = 1, [FromQuery] int limit = 20)
    {
        var query = _db.Transactions.Where(t => t.UserId == id).OrderByDescending(t => t.CreatedAt);
        var total = await query.CountAsync();
        var txs = await query.Skip((page - 1) * limit).Take(limit)
            .Select(t => new { t.Id, t.Type, t.Amount, t.Currency, t.Status, t.Description, t.Reference, t.CreatedAt })
            .ToListAsync();
        return Ok(new { transactions = txs, total, page, limit });
    }

    [HttpGet("{id}/devices")]
    public async Task<ActionResult> GetUserDevices(Guid id)
    {
        var devices = await _db.ConnectedDevices
            .Where(d => d.UserId == id)
            .OrderByDescending(d => d.LastActiveAt)
            .Select(d => new { d.Id, d.DeviceName, d.DeviceType, d.Browser, d.OS, d.IPAddress, d.Location, d.IsTrusted, d.IsCurrent, d.LastActiveAt })
            .ToListAsync();
        return Ok(devices);
    }

    [HttpDelete("{id}/devices/{deviceId}")]
    public async Task<ActionResult> RemoveUserDevice(Guid id, Guid deviceId)
    {
        var device = await _db.ConnectedDevices.FirstOrDefaultAsync(d => d.Id == deviceId && d.UserId == id);
        if (device == null) return NotFound();
        _db.ConnectedDevices.Remove(device);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id}/logout-all")]
    public async Task<ActionResult> ForceLogout(Guid id)
    {
        var devices = await _db.ConnectedDevices.Where(d => d.UserId == id && !d.IsCurrent).ToListAsync();
        _db.ConnectedDevices.RemoveRange(devices);
        await _db.SaveChangesAsync();
        await LogAction(id, "Force logout", "Admin terminated all sessions");
        return Ok(new { message = "All sessions terminated", count = devices.Count });
    }

    [HttpGet("{id}/activity")]
    public async Task<ActionResult> GetUserActivity(Guid id, [FromQuery] int page = 1, [FromQuery] int limit = 50)
    {
        var query = _db.ActivityLogs.Where(a => a.UserId == id).OrderByDescending(a => a.CreatedAt);
        var total = await query.CountAsync();
        var logs = await query.Skip((page - 1) * limit).Take(limit)
            .Select(a => new { a.Id, a.Action, a.Category, a.Details, a.IPAddress, a.UserAgent, a.CreatedAt })
            .ToListAsync();
        return Ok(new { logs, total, page, limit });
    }

    [HttpGet("{id}/roles")]
    public async Task<ActionResult> GetUserRoles(Guid id)
    {
        var assignments = await _db.UserRoleAssignments
            .Where(a => a.UserId == id)
            .Include(a => a.Role)
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new
            {
                a.Id, a.UserId, a.RoleId,
                RoleName = a.Role.Name,
                RoleColor = a.Role.Color,
                RoleDescription = a.Role.Description,
                a.Department, a.Region, a.ExpiresAt, a.Status, a.CreatedAt,
            })
            .ToListAsync();
        var allRoles = await _db.RoleDefinitions.Where(r => r.IsActive).Select(r => new { r.Id, r.Name, r.Color, r.Department, r.Description }).ToListAsync();
        return Ok(new { assignments, availableRoles = allRoles });
    }

    [HttpPost("{id}/roles")]
    public async Task<ActionResult> AssignUserRole(Guid id, [FromBody] AssignRoleRequest request)
    {
        var userId = GetUserId();
        var existing = await _db.UserRoleAssignments.FirstOrDefaultAsync(a => a.UserId == id && a.RoleId == request.RoleId && a.Status == "active");
        if (existing != null) return BadRequest(new { error = "Role already assigned" });

        var assignment = new UserRoleAssignment
        {
            UserId = id,
            RoleId = request.RoleId,
            Department = request.Department ?? "",
            Region = request.Region ?? "",
            ExpiresAt = request.ExpiresAt,
            Status = "active",
            AssignedById = userId,
            Notes = request.Notes ?? "",
        };
        _db.UserRoleAssignments.Add(assignment);
        await _db.SaveChangesAsync();
        await LogAction(id, "Role assigned", $"Assigned role {request.RoleId}");
        return Ok(assignment);
    }

    [HttpDelete("{id}/roles/{assignmentId}")]
    public async Task<ActionResult> RemoveUserRole(Guid id, Guid assignmentId)
    {
        var assignment = await _db.UserRoleAssignments.FirstOrDefaultAsync(a => a.Id == assignmentId && a.UserId == id);
        if (assignment == null) return NotFound();
        assignment.Status = "removed";
        assignment.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("analytics")]
    public async Task<ActionResult> GetAnalytics()
    {
        var now = DateTime.UtcNow;
        var dau = await _db.Users.CountAsync(u => u.UpdatedAt >= now.AddDays(-1));
        var wau = await _db.Users.CountAsync(u => u.UpdatedAt >= now.AddDays(-7));
        var mau = await _db.Users.CountAsync(u => u.UpdatedAt >= now.AddDays(-30));
        var total = await _db.Users.CountAsync();

        var monthlyNew = await _db.Users
            .Where(u => u.CreatedAt >= now.AddYears(-1))
            .GroupBy(u => new { u.CreatedAt.Year, u.CreatedAt.Month })
            .Select(g => new { date = $"{g.Key.Year}-{g.Key.Month:D2}", count = g.Count() })
            .OrderBy(p => p.date)
            .ToListAsync();

        var countryDist = await _db.Users
            .Where(u => u.Country != null && u.Country != "")
            .GroupBy(u => u.Country!)
            .Select(g => new { label = g.Key, value = g.Count() })
            .OrderByDescending(p => p.value)
            .Take(10)
            .ToListAsync();

        return Ok(new { dau, wau, mau, total, monthlyNew, countryDist });
    }

    [HttpPost("bulk")]
    public async Task<ActionResult> BulkAction([FromBody] BulkActionRequest request)
    {
        if (request.UserIds == null || request.UserIds.Count == 0)
            return BadRequest(new { error = "No users specified" });

        var users = await _db.Users.Where(u => request.UserIds.Contains(u.Id)).ToListAsync();
        var count = 0;

        foreach (var user in users)
        {
            switch (request.Action)
            {
                case "suspend":
                    if (user.Role != "admin") { user.Role = "suspended"; count++; }
                    break;
                case "activate":
                    if (user.Role == "suspended") { user.Role = "customer"; count++; }
                    break;
                case "delete":
                    if (user.Role != "admin") { user.Role = "deleted"; count++; }
                    break;
                case "restore":
                    if (user.Role == "deleted") { user.Role = "customer"; count++; }
                    break;
                case "verify_kyc":
                    user.KYCStatus = "verified"; count++;
                    break;
                case "lock":
                    user.Role = "locked"; count++;
                    break;
            }
            user.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        await LogAction(null, $"Bulk {request.Action}", $"Applied to {count} users");
        return Ok(new { message = $"{request.Action} applied to {count} users", count });
    }

    [HttpPost("invite")]
    public async Task<ActionResult> InviteUser([FromBody] InviteUserRequest request)
    {
        var existing = await _db.Users.AnyAsync(u => u.Email == request.Email);
        if (existing) return BadRequest(new { error = "User already exists" });

        var tempPassword = $"PayAfrika{Guid.NewGuid().ToString("N")[..8]}!";
        var user = new User
        {
            FullName = request.FullName ?? request.Email.Split('@')[0],
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(tempPassword),
            Role = request.Role ?? "customer",
            Country = request.Country,
            PhoneNumber = request.PhoneNumber,
            IsEmailVerified = false,
            CreatedAt = DateTime.UtcNow,
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        await LogAction(user.Id, "User invited", $"Invited {request.Email} as {request.Role}");

        return Ok(new { message = "User invited", user.Id, tempPassword });
    }

    [NonAction]
    private async Task LogAction(Guid? userId, string action, string details)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        _db.ActivityLogs.Add(new ActivityLog
        {
            UserId = userId ?? Guid.Empty,
            Action = action,
            Category = "admin_users",
            Details = JsonSerializer.Serialize(new { message = details, adminId = GetUserId().ToString() }),
            IPAddress = ip,
            CreatedAt = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
}

public class UpdateUserRequest
{
    public string? FullName { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Country { get; set; }
}

public class ReactivateRequest
{
    public string? NewRole { get; set; }
}

public class BulkActionRequest
{
    public List<Guid> UserIds { get; set; } = new();
    public string Action { get; set; } = string.Empty;
}

public class InviteUserRequest
{
    public string Email { get; set; } = string.Empty;
    public string? FullName { get; set; }
    public string? Role { get; set; }
    public string? Country { get; set; }
    public string? PhoneNumber { get; set; }
}
