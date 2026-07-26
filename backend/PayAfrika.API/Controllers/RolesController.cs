using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PayAfrika.API.Data;
using PayAfrika.API.Models;
using PayAfrika.API.Services;

namespace PayAfrika.API.Controllers;

[Route("api/admin/roles")]
[ApiController]
[Authorize(Roles = "admin")]
public class RolesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IPermissionService _perms;
    private readonly IAuditService _audit;

    public RolesController(AppDbContext db, IPermissionService perms, IAuditService audit)
    {
        _db = db;
        _perms = perms;
        _audit = audit;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "");

    // ─── Dashboard ─────────────────────────────────────────────

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard()
    {
        var totalRoles = await _db.RoleDefinitions.CountAsync();
        var customRoles = await _db.RoleDefinitions.CountAsync(r => !r.IsSystem);
        var activeAdmins = await _db.UserRoleAssignments.CountAsync(a => a.Status == "active");
        var pendingInvites = await _db.Invitations.CountAsync(i => i.Status == "pending");
        var systemRoles = await _db.RoleDefinitions.CountAsync(r => r.IsSystem);
        var recentlyModified = await _db.RoleDefinitions.CountAsync(r => r.UpdatedAt != null && r.UpdatedAt > DateTime.UtcNow.AddDays(-7));
        var privileged = await _db.UserRoleAssignments
            .CountAsync(a => a.Role.Name == "super_admin" || a.Role.Name == "admin" && a.Status == "active");
        var inactiveUsers = await _db.Users.CountAsync(u => u.UpdatedAt == null || u.UpdatedAt < DateTime.UtcNow.AddDays(-90));

        return Ok(new
        {
            totalRoles, customRoles, activeAdmins, pendingInvites,
            systemRoles, recentlyModified, privileged, inactiveUsers,
        });
    }

    // ─── Roles CRUD ────────────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var roles = await _db.RoleDefinitions
            .Include(r => r.RolePermissions)
                .ThenInclude(rp => rp.Permission)
            .Include(r => r.UserAssignments.Where(a => a.Status == "active"))
            .OrderBy(r => r.Priority)
            .ToListAsync();

        return Ok(roles.Select(r => new
        {
            r.Id, r.Name, r.Description, r.Department, r.Color, r.Icon,
            r.Priority, r.IsSystem, r.IsActive, r.ParentRoleId, r.Restrictions,
            r.CreatedAt, r.UpdatedAt,
            Permissions = r.RolePermissions.Select(rp => new
            {
                rp.Permission.Module, rp.Permission.Action,
            }).ToList(),
            UserCount = r.UserAssignments.Count,
        }));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var role = await _db.RoleDefinitions
            .Include(r => r.RolePermissions).ThenInclude(rp => rp.Permission)
            .Include(r => r.UserAssignments.Where(a => a.Status == "active")).ThenInclude(a => a.User)
            .FirstOrDefaultAsync(r => r.Id == id);
        if (role == null) return NotFound();
        return Ok(role);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRoleRequest data)
    {
        var role = new RoleDefinition
        {
            Name = data.Name,
            Description = data.Description ?? "",
            Department = data.Department ?? "",
            Color = data.Color ?? "#0057FF",
            Icon = data.Icon ?? "Shield",
            Priority = data.Priority,
            IsSystem = false,
            IsActive = true,
            ParentRoleId = data.ParentRoleId,
            Restrictions = data.Restrictions ?? "{}",
        };

        _db.RoleDefinitions.Add(role);
        await _db.SaveChangesAsync();

        await SyncPermissions(role.Id, data.Permissions);

        await _audit.LogAsync(new AuditLogEntry
        {
            Action = "Role Created",
            Module = "Roles & Permissions",
            Resource = "RoleDefinition",
            ResourceId = role.Id.ToString(),
            NewValue = role.Name,
            Severity = "info",
        });

        return CreatedAtAction(nameof(GetById), new { id = role.Id }, role);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreateRoleRequest data)
    {
        var role = await _db.RoleDefinitions
            .Include(r => r.RolePermissions)
            .FirstOrDefaultAsync(r => r.Id == id);
        if (role == null) return NotFound();
        if (role.IsSystem) return BadRequest("Cannot edit system roles");

        role.Name = data.Name;
        role.Description = data.Description ?? "";
        role.Department = data.Department ?? "";
        role.Color = data.Color ?? "#0057FF";
        role.Icon = data.Icon ?? "Shield";
        role.Priority = data.Priority;
        role.ParentRoleId = data.ParentRoleId;
        role.Restrictions = data.Restrictions ?? "{}";
        role.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await SyncPermissions(role.Id, data.Permissions);

        PermissionService.InvalidateAllCache();

        await _audit.LogAsync(new AuditLogEntry
        {
            Action = "Role Updated",
            Module = "Roles & Permissions",
            Resource = "RoleDefinition",
            ResourceId = role.Id.ToString(),
            NewValue = role.Name,
            Severity = "info",
        });

        return Ok(role);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var role = await _db.RoleDefinitions.FindAsync(id);
        if (role == null) return NotFound();
        if (role.IsSystem) return BadRequest("Cannot delete system roles");

        _db.RoleDefinitions.Remove(role);
        await _db.SaveChangesAsync();

        PermissionService.InvalidateAllCache();

        return NoContent();
    }

    [HttpPost("{id}/clone")]
    public async Task<IActionResult> Clone(Guid id)
    {
        var source = await _db.RoleDefinitions
            .Include(r => r.RolePermissions)
            .FirstOrDefaultAsync(r => r.Id == id);
        if (source == null) return NotFound();

        var clone = new RoleDefinition
        {
            Name = $"{source.Name} (Copy)",
            Description = source.Description,
            Department = source.Department,
            Color = source.Color,
            Icon = source.Icon,
            Priority = source.Priority + 1,
            IsSystem = false,
            IsActive = true,
            ParentRoleId = source.ParentRoleId,
            Restrictions = source.Restrictions,
        };

        _db.RoleDefinitions.Add(clone);
        await _db.SaveChangesAsync();

        foreach (var rp in source.RolePermissions)
        {
            _db.RolePermissions.Add(new RolePermission { RoleId = clone.Id, PermissionId = rp.PermissionId });
        }
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = clone.Id }, clone);
    }

    // ─── Permissions ───────────────────────────────────────────

    [HttpGet("permissions")]
    public async Task<IActionResult> GetAllPermissions()
    {
        var permissions = await _db.Permissions.OrderBy(p => p.SortOrder).ToListAsync();
        return Ok(permissions);
    }

    [HttpPost("seed-permissions")]
    public async Task<IActionResult> SeedPermissions()
    {
        var existing = await _db.Permissions.CountAsync();
        if (existing > 0) return BadRequest("Permissions already seeded");

        var sortOrder = 0;
        foreach (var (module, actions) in DefaultPermissions.Modules)
        {
            foreach (var action in actions)
            {
                _db.Permissions.Add(new Permission
                {
                    Module = module,
                    Action = action,
                    Description = $"{action} in {module}",
                    GroupName = module,
                    SortOrder = sortOrder++,
                });
            }
        }
        await _db.SaveChangesAsync();

        var allPerms = await _db.Permissions.ToListAsync();

        foreach (var (roleName, perms) in new Dictionary<string, Dictionary<string, string[]>>())
        {
            foreach (var (module, actions) in DefaultPermissions.GetRolePermissions(roleName))
            {
                foreach (var action in actions)
                {
                    var perm = allPerms.FirstOrDefault(p => p.Module == module && p.Action == action);
                    if (perm != null)
                    {
                        var role = await _db.RoleDefinitions.FirstOrDefaultAsync(r => r.Name == roleName);
                        if (role != null)
                        {
                            _db.RolePermissions.Add(new RolePermission { RoleId = role.Id, PermissionId = perm.Id });
                        }
                    }
                }
            }
        }
        await _db.SaveChangesAsync();

        return Ok(new { count = allPerms.Count });
    }

    // ─── User Assignment ───────────────────────────────────────

    [HttpPost("assign")]
    public async Task<IActionResult> AssignRole([FromBody] AssignRoleRequest data)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == data.Email || u.Id == data.UserId);
        if (user == null) return NotFound("User not found");

        var role = await _db.RoleDefinitions.FindAsync(data.RoleId);
        if (role == null) return NotFound("Role not found");

        var existing = await _db.UserRoleAssignments
            .FirstOrDefaultAsync(a => a.UserId == user.Id && a.RoleId == data.RoleId && a.Status == "active");
        if (existing != null) return BadRequest("User already has this role");

        var now = DateTime.UtcNow;
        var assignment = new UserRoleAssignment
        {
            UserId = user.Id,
            RoleId = data.RoleId,
            Department = data.Department ?? "",
            Region = data.Region ?? "",
            ExpiresAt = data.ExpiresAt,
            Status = "active",
            AssignedById = GetUserId(),
            Notes = data.Notes ?? "",
        };

        _db.UserRoleAssignments.Add(assignment);
        user.Role = role.Name;

        await _db.SaveChangesAsync();
        PermissionService.InvalidateCache(user.Id);

        await _audit.LogAsync(new AuditLogEntry
        {
            Action = "Role Assigned",
            Module = "Roles & Permissions",
            Resource = "UserRoleAssignment",
            ResourceId = assignment.Id.ToString(),
            NewValue = $"{user.Email} -> {role.Name}",
            Severity = "info",
        });

        return Ok(assignment);
    }

    [HttpDelete("assign/{assignmentId}")]
    public async Task<IActionResult> RemoveAssignment(Guid assignmentId)
    {
        var assignment = await _db.UserRoleAssignments
            .Include(a => a.User)
            .Include(a => a.Role)
            .FirstOrDefaultAsync(a => a.Id == assignmentId);
        if (assignment == null) return NotFound();

        _db.UserRoleAssignments.Remove(assignment);
        await _db.SaveChangesAsync();

        PermissionService.InvalidateCache(assignment.UserId);

        await _audit.LogAsync(new AuditLogEntry
        {
            Action = "Role Removed",
            Module = "Roles & Permissions",
            Resource = "UserRoleAssignment",
            ResourceId = assignmentId.ToString(),
            PreviousValue = $"{assignment.User.Email} -> {assignment.Role.Name}",
            Severity = "info",
        });

        return NoContent();
    }

    [HttpGet("assignments")]
    public async Task<IActionResult> GetAssignments([FromQuery] Guid? roleId)
    {
        var query = _db.UserRoleAssignments
            .Include(a => a.User)
            .Include(a => a.Role)
            .Include(a => a.AssignedBy)
            .AsQueryable();

        if (roleId.HasValue) query = query.Where(a => a.RoleId == roleId.Value);

        var items = await query.OrderByDescending(a => a.CreatedAt).ToListAsync();
        return Ok(items.Select(a => new
        {
            a.Id, a.UserId, a.RoleId, a.Department, a.Region, a.ExpiresAt,
            a.Status, a.Notes, a.CreatedAt,
            User = new { a.User.Id, a.User.FullName, a.User.Email, a.User.Role },
            Role = new { a.Role.Id, a.Role.Name, a.Role.Color },
            AssignedBy = a.AssignedBy == null ? null : new { a.AssignedBy.Id, a.AssignedBy.FullName },
        }));
    }

    // ─── Invitations ───────────────────────────────────────────

    [HttpPost("invite")]
    public async Task<IActionResult> InviteUser([FromBody] InviteRequest data)
    {
        var existingInvite = await _db.Invitations
            .FirstOrDefaultAsync(i => i.Email == data.Email && i.Status == "pending");
        if (existingInvite != null) return BadRequest("Invitation already sent");

        var invite = new Invitation
        {
            Email = data.Email,
            RoleId = data.RoleId.ToString(),
            Department = data.Department ?? "",
            Status = "pending",
            InvitedById = GetUserId(),
            ExpiresAt = DateTime.UtcNow.AddDays(7),
        };

        _db.Invitations.Add(invite);
        await _db.SaveChangesAsync();

        await _audit.LogAsync(new AuditLogEntry
        {
            Action = "User Invited",
            Module = "Roles & Permissions",
            Resource = "Invitation",
            ResourceId = invite.Id.ToString(),
            NewValue = $"{data.Email} -> role {data.RoleId}",
            Severity = "info",
        });

        return Ok(invite);
    }

    [HttpGet("invitations")]
    public async Task<IActionResult> GetInvitations()
    {
        var invites = await _db.Invitations.OrderByDescending(i => i.CreatedAt).ToListAsync();
        return Ok(invites);
    }

    [HttpDelete("invitations/{id}")]
    public async Task<IActionResult> CancelInvitation(Guid id)
    {
        var invite = await _db.Invitations.FindAsync(id);
        if (invite == null) return NotFound();
        _db.Invitations.Remove(invite);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ─── Helpers ───────────────────────────────────────────────

    private async Task SyncPermissions(Guid roleId, List<PermissionItem>? permissions)
    {
        if (permissions == null) return;

        var existing = await _db.RolePermissions.Where(rp => rp.RoleId == roleId).ToListAsync();
        _db.RolePermissions.RemoveRange(existing);

        foreach (var p in permissions)
        {
            var perm = await _db.Permissions
                .FirstOrDefaultAsync(x => x.Module == p.Module && x.Action == p.Action);
            if (perm != null)
            {
                _db.RolePermissions.Add(new RolePermission { RoleId = roleId, PermissionId = perm.Id });
            }
        }
        await _db.SaveChangesAsync();
    }
}

public class CreateRoleRequest
{
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public string? Department { get; set; }
    public string? Color { get; set; }
    public string? Icon { get; set; }
    public int Priority { get; set; }
    public Guid? ParentRoleId { get; set; }
    public string? Restrictions { get; set; }
    public List<PermissionItem> Permissions { get; set; } = new();
}

public class PermissionItem
{
    public string Module { get; set; } = "";
    public string Action { get; set; } = "";
}

public class AssignRoleRequest
{
    public Guid? UserId { get; set; }
    public string? Email { get; set; }
    public Guid RoleId { get; set; }
    public string? Department { get; set; }
    public string? Region { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public string? Notes { get; set; }
}

public class InviteRequest
{
    public string Email { get; set; } = "";
    public Guid RoleId { get; set; }
    public string? Department { get; set; }
}
