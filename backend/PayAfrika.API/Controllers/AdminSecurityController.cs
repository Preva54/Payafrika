using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PayAfrika.API.Data;
using PayAfrika.API.DTOs;
using PayAfrika.API.Models;

namespace PayAfrika.API.Controllers;

[ApiController]
[Route("api/admin/security")]
[Authorize(Roles = "admin")]
public class AdminSecurityController : ControllerBase
{
    private readonly AppDbContext _db;

    public AdminSecurityController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("stats")]
    public async Task<ActionResult<AdminSecurityStatsResponse>> GetStats()
    {
        var now = DateTime.UtcNow;
        var last24h = now.AddHours(-24);

        var totalLogins = await _db.AuditLogs.CountAsync(a =>
            a.Action == "login" || a.Action == "login_otp_verified" || a.Action == "login_challenge_issued");
        var failedLogins = await _db.AuditLogs.CountAsync(a => a.Action == "login_failed" && a.CreatedAt >= last24h);
        var suspicious = await _db.AuditLogs.CountAsync(a => a.IsSecurityAlert && a.Severity == "warning" && a.CreatedAt >= last24h);
        var newDevices = await _db.AuditLogs.CountAsync(a => a.Action == "login_with_new_device" && a.CreatedAt >= last24h);
        var lockedAccounts = await _db.Users.CountAsync(u => u.LockedUntil.HasValue && u.LockedUntil > now);
        var otpSent = await _db.AuditLogs.CountAsync(a => a.Action == "otp_sent" && a.CreatedAt >= last24h);
        var otpFailed = await _db.AuditLogs.CountAsync(a => a.Action == "otp_verify_failed" && a.CreatedAt >= last24h);
        var twoFactorUsers = await _db.Users.CountAsync(u => u.TwoFactorEnabled);
        var fraudAlerts = await _db.AuditLogs.CountAsync(a => a.IsSecurityAlert && a.CreatedAt >= last24h);

        return Ok(new AdminSecurityStatsResponse
        {
            TotalLogins = totalLogins,
            FailedLogins = failedLogins,
            SuspiciousLogins = suspicious,
            NewDevices = newDevices,
            LockedAccounts = lockedAccounts,
            OtpSent = otpSent,
            OtpFailed = otpFailed,
            TwoFactorEnabledUsers = twoFactorUsers,
            FraudAlerts = fraudAlerts,
        });
    }

    [HttpGet("events")]
    public async Task<ActionResult<List<AdminSecurityEventResponse>>> GetEvents(
        [FromQuery] string? severity = null,
        [FromQuery] bool? securityAlert = null,
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int limit = 50)
    {
        var query = _db.AuditLogs.AsQueryable();

        if (securityAlert.HasValue)
            query = query.Where(a => a.IsSecurityAlert == securityAlert.Value);

        if (!string.IsNullOrWhiteSpace(severity))
            query = query.Where(a => a.Severity == severity);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var q = search.ToLower();
            query = query.Where(a => a.Email.ToLower().Contains(q) ||
                a.Action.ToLower().Contains(q) || a.UserName.ToLower().Contains(q));
        }

        var events = await query
            .OrderByDescending(a => a.CreatedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .Select(a => new AdminSecurityEventResponse
            {
                Id = a.Id,
                UserId = a.UserId,
                UserName = a.UserName,
                Email = a.Email,
                Action = a.Action,
                Module = a.Module,
                Result = a.Result,
                Severity = a.Severity,
                IPAddress = a.IPAddress,
                Browser = a.Browser,
                OperatingSystem = a.OperatingSystem,
                Location = a.Location,
                IsSecurityAlert = a.IsSecurityAlert,
                CreatedAt = a.CreatedAt,
            })
            .ToListAsync();

        var total = await query.CountAsync();

        return Ok(new { items = events, total });
    }

    [HttpGet("otp-attempts")]
    public async Task<ActionResult<List<AdminOtpAttemptResponse>>> GetOtpAttempts(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 50)
    {
        var attempts = await _db.SecurityTokens
            .OrderByDescending(t => t.CreatedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .Select(t => new AdminOtpAttemptResponse
            {
                Id = t.Id,
                UserId = t.UserId,
                UserName = t.User.Username ?? t.User.FullName,
                Email = t.User.Email,
                Purpose = t.Purpose,
                Channel = t.Channel,
                Attempts = t.Attempts,
                MaxAttempts = t.MaxAttempts,
                IsConsumed = t.IsConsumed,
                VerifiedAt = t.VerifiedAt,
                ExpiresAt = t.ExpiresAt,
                CreatedAt = t.CreatedAt,
            })
            .ToListAsync();

        var total = await _db.SecurityTokens.CountAsync();

        return Ok(new { items = attempts, total });
    }

    [HttpGet("devices")]
    public async Task<ActionResult<List<AdminDeviceResponse>>> GetDevices(
        [FromQuery] string? search = null,
        [FromQuery] bool? trusted = null,
        [FromQuery] int page = 1,
        [FromQuery] int limit = 50)
    {
        var query = _db.ConnectedDevices.AsQueryable();

        if (trusted.HasValue)
            query = query.Where(d => d.IsTrusted == trusted.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var q = search.ToLower();
            query = query.Where(d => d.DeviceName.ToLower().Contains(q) ||
                d.User.Email.ToLower().Contains(q) || d.IPAddress!.Contains(q));
        }

        var devices = await query
            .OrderByDescending(d => d.LastActiveAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .Select(d => new AdminDeviceResponse
            {
                Id = d.Id,
                UserId = d.UserId,
                UserName = d.User.Username ?? d.User.FullName,
                Email = d.User.Email,
                DeviceName = d.DeviceName,
                DeviceType = d.DeviceType,
                DeviceId = d.DeviceId,
                Browser = d.Browser,
                OS = d.OS,
                IPAddress = d.IPAddress,
                Location = d.Location,
                IsTrusted = d.IsTrusted,
                RiskScore = d.RiskScore,
                LastLoginAt = d.LastLoginAt,
                CreatedAt = d.CreatedAt,
            })
            .ToListAsync();

        var total = await query.CountAsync();

        return Ok(new { items = devices, total });
    }

    [HttpGet("locked-users")]
    public async Task<ActionResult> GetLockedUsers([FromQuery] int page = 1, [FromQuery] int limit = 50)
    {
        var now = DateTime.UtcNow;
        var users = await _db.Users
            .Where(u => u.LockedUntil.HasValue && u.LockedUntil > now)
            .OrderByDescending(u => u.LockedUntil)
            .Skip((page - 1) * limit)
            .Take(limit)
            .Select(u => new
            {
                u.Id,
                u.FullName,
                u.Email,
                u.Username,
                u.FailedLoginCount,
                u.LockedUntil,
                u.TwoFactorEnabled,
                u.IsEmailVerified,
            })
            .ToListAsync();

        var total = await _db.Users.CountAsync(u => u.LockedUntil.HasValue && u.LockedUntil > now);

        return Ok(new { items = users, total });
    }

    [HttpPost("unlock/{userId}")]
    public async Task<ActionResult> UnlockUser(Guid userId)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return NotFound();

        user.LockedUntil = null;
        user.FailedLoginCount = 0;
        await _db.SaveChangesAsync();

        _db.AuditLogs.Add(new AuditLog
        {
            UserId = user.Id,
            UserName = user.Username ?? user.FullName,
            UserRole = user.Role,
            Email = user.Email,
            Action = "account_unlocked_by_admin",
            Module = "security",
            Resource = "user",
            ResourceId = user.Id.ToString(),
            Result = "success",
            Severity = "info",
            IsSecurityAlert = true,
            CreatedAt = DateTime.UtcNow,
            Metadata = System.Text.Json.JsonSerializer.Serialize(new
            {
                admin = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
            }),
        });

        return Ok(new { message = "Account unlocked." });
    }

    [HttpDelete("devices/{deviceId}")]
    public async Task<ActionResult> RemoveDevice(Guid deviceId)
    {
        var device = await _db.ConnectedDevices.FindAsync(deviceId);
        if (device == null) return NotFound();

        _db.ConnectedDevices.Remove(device);
        await _db.SaveChangesAsync();

        _db.AuditLogs.Add(new AuditLog
        {
            UserId = device.UserId,
            Action = "device_removed_by_admin",
            Module = "security",
            Resource = "device",
            ResourceId = device.Id.ToString(),
            Result = "success",
            Severity = "info",
            IsSecurityAlert = true,
            CreatedAt = DateTime.UtcNow,
            Metadata = System.Text.Json.JsonSerializer.Serialize(new
            {
                admin = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
                device = device.DeviceName,
            }),
        });
        await _db.SaveChangesAsync();

        return Ok(new { message = "Device removed." });
    }
}
