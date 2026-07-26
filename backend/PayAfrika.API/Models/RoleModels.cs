using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PayAfrika.API.Models;

public class RoleDefinition
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Department { get; set; } = string.Empty;

    [MaxLength(20)]
    public string Color { get; set; } = "#0057FF";

    [MaxLength(50)]
    public string Icon { get; set; } = "Shield";

    public int Priority { get; set; }

    public bool IsSystem { get; set; }

    public bool IsActive { get; set; } = true;

    public Guid? ParentRoleId { get; set; }

    [MaxLength(200)]
    public string AllowedCountries { get; set; } = "[]";

    [MaxLength(200)]
    public string AllowedDepartments { get; set; } = "[]";

    [MaxLength(500)]
    public string Restrictions { get; set; } = "{}";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    [ForeignKey(nameof(ParentRoleId))]
    public RoleDefinition? ParentRole { get; set; }
    public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
    public ICollection<UserRoleAssignment> UserAssignments { get; set; } = new List<UserRoleAssignment>();
    public ICollection<RoleDefinition> ChildRoles { get; set; } = new List<RoleDefinition>();
}

public class Permission
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(100)]
    public string Module { get; set; } = string.Empty;

    [Required, MaxLength(50)]
    public string Action { get; set; } = string.Empty;

    [MaxLength(200)]
    public string Description { get; set; } = string.Empty;

    [MaxLength(100)]
    public string GroupName { get; set; } = string.Empty;

    public int SortOrder { get; set; }

    public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
}

public class RolePermission
{
    public Guid RoleId { get; set; }
    public Guid PermissionId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(RoleId))]
    public RoleDefinition Role { get; set; } = null!;
    [ForeignKey(nameof(PermissionId))]
    public Permission Permission { get; set; } = null!;
}

public class UserRoleAssignment
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }
    public Guid RoleId { get; set; }

    [MaxLength(100)]
    public string Department { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Region { get; set; } = string.Empty;

    public DateTime? ExpiresAt { get; set; }

    [MaxLength(50)]
    public string Status { get; set; } = "active";

    public Guid? AssignedById { get; set; }

    [MaxLength(500)]
    public string Notes { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;
    [ForeignKey(nameof(RoleId))]
    public RoleDefinition Role { get; set; } = null!;
    [ForeignKey(nameof(AssignedById))]
    public User? AssignedBy { get; set; }
}

public class Invitation
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(200)]
    public string Email { get; set; } = string.Empty;

    [MaxLength(100)]
    public string RoleId { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Department { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Status { get; set; } = "pending";

    public Guid? InvitedById { get; set; }

    public DateTime? ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? AcceptedAt { get; set; }
}

public static class DefaultPermissions
{
    public static readonly Dictionary<string, string[]> Modules = new()
    {
        ["Dashboard"] = new[] { "View" },
        ["User Management"] = new[] { "View", "Create", "Edit", "Delete", "Suspend", "Invite", "AssignRoles" },
        ["Merchant Management"] = new[] { "View", "Create", "Edit", "Suspend", "Delete", "Approve", "Reject", "ViewKYC" },
        ["Customer Management"] = new[] { "View", "Edit", "Suspend", "Delete", "ResetPassword", "VerifyIdentity" },
        ["Transactions"] = new[] { "View", "Export", "Refund", "Reverse", "Retry", "Approve", "Cancel" },
        ["Wallets"] = new[] { "View", "Credit", "Debit", "Freeze", "Unfreeze", "Withdraw", "ViewLedger" },
        ["Payments"] = new[] { "View", "ConfigureMethods", "EnableProviders", "ManageFees", "ConfigureLimits" },
        ["KYC & Compliance"] = new[] { "ReviewDocuments", "Approve", "Reject", "RequestInfo", "ExportKYC" },
        ["CMS"] = new[] { "CreateContent", "EditContent", "Publish", "Delete", "ManageMedia", "ManageSEO" },
        ["Support"] = new[] { "ViewTickets", "AssignTickets", "CloseTickets", "EscalateTickets", "RespondChats" },
        ["Affiliate"] = new[] { "ViewAffiliates", "Approve", "Reject", "EditCommissions", "ProcessPayouts" },
        ["Reports"] = new[] { "View", "ExportPDF", "ExportExcel", "ScheduleReports" },
        ["Settings"] = new[] { "View", "Edit", "Security", "PaymentConfig", "Branding", "Integrations" },
        ["Audit Logs"] = new[] { "ViewLogs", "ExportLogs", "DeleteArchived" },
        ["API"] = new[] { "GenerateKeys", "RevokeKeys", "ManageWebhooks", "ViewAnalytics" },
        ["Roles & Permissions"] = new[] { "View", "Create", "Edit", "Delete", "AssignUsers" },
    };

    public static Dictionary<string, string[]> GetRolePermissions(string roleName) => roleName switch
    {
        "super_admin" => Modules.ToDictionary(kv => kv.Key, kv => kv.Value),
        "admin" => Modules.Where(m => m.Key != "Settings").ToDictionary(kv => kv.Key, kv =>
            kv.Key == "Audit Logs" ? new[] { "ViewLogs", "ExportLogs" } :
            kv.Key == "Roles & Permissions" ? new[] { "View" } :
            kv.Value),
        "compliance_officer" => new Dictionary<string, string[]>
        {
            ["Dashboard"] = new[] { "View" },
            ["KYC & Compliance"] = new[] { "ReviewDocuments", "Approve", "Reject", "RequestInfo", "ExportKYC" },
            ["Audit Logs"] = new[] { "ViewLogs", "ExportLogs" },
            ["Customer Management"] = new[] { "View" },
            ["Reports"] = new[] { "View", "ExportPDF", "ExportExcel" },
        },
        "finance_admin" => new Dictionary<string, string[]>
        {
            ["Dashboard"] = new[] { "View" },
            ["Transactions"] = new[] { "View", "Export", "Refund", "Approve" },
            ["Wallets"] = new[] { "View", "ViewLedger" },
            ["Payments"] = new[] { "View", "ConfigureMethods", "ManageFees" },
            ["Reports"] = new[] { "View", "ExportPDF", "ExportExcel", "ScheduleReports" },
            ["Affiliate"] = new[] { "ViewAffiliates", "ProcessPayouts" },
        },
        "support_manager" => new Dictionary<string, string[]>
        {
            ["Dashboard"] = new[] { "View" },
            ["Support"] = new[] { "ViewTickets", "AssignTickets", "CloseTickets", "EscalateTickets", "RespondChats" },
            ["Customer Management"] = new[] { "View", "Edit" },
            ["Reports"] = new[] { "View" },
        },
        "support_agent" => new Dictionary<string, string[]>
        {
            ["Support"] = new[] { "ViewTickets", "RespondChats", "EscalateTickets" },
            ["Customer Management"] = new[] { "View" },
        },
        "marketing_manager" => new Dictionary<string, string[]>
        {
            ["Dashboard"] = new[] { "View" },
            ["CMS"] = new[] { "CreateContent", "EditContent", "Publish", "ManageMedia", "ManageSEO" },
            ["Affiliate"] = new[] { "ViewAffiliates" },
        },
        "content_editor" => new Dictionary<string, string[]>
        {
            ["CMS"] = new[] { "CreateContent", "EditContent", "ManageMedia" },
        },
        "affiliate_manager" => new Dictionary<string, string[]>
        {
            ["Dashboard"] = new[] { "View" },
            ["Affiliate"] = new[] { "ViewAffiliates", "Approve", "Reject", "EditCommissions", "ProcessPayouts" },
            ["Reports"] = new[] { "View", "ExportPDF", "ExportExcel" },
        },
        "api_developer" => new Dictionary<string, string[]>
        {
            ["Dashboard"] = new[] { "View" },
            ["API"] = new[] { "GenerateKeys", "RevokeKeys", "ManageWebhooks", "ViewAnalytics" },
            ["Audit Logs"] = new[] { "ViewLogs" },
        },
        "auditor" => new Dictionary<string, string[]>
        {
            ["Dashboard"] = new[] { "View" },
            ["Audit Logs"] = new[] { "ViewLogs", "ExportLogs" },
            ["Reports"] = new[] { "View", "ExportPDF", "ExportExcel" },
            ["KYC & Compliance"] = new[] { "ExportKYC" },
        },
        "read_only" => Modules.ToDictionary(kv => kv.Key, _ => new[] { "View" }),
        _ => new Dictionary<string, string[]>(),
    };
}
