using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PayAfrika.API.Data;

namespace PayAfrika.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "admin")]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _db;

    public AdminController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("dashboard")]
    public async Task<ActionResult> GetDashboard()
    {
        var totalUsers = await _db.Users.CountAsync();
        var totalLoans = await _db.Loans.CountAsync();
        var pendingLoans = await _db.Loans.CountAsync(l => l.Status == "pending");
        var totalTransactions = await _db.Transactions.CountAsync();
        var totalRevenue = await _db.Transactions
            .Where(t => t.Type == "deposit")
            .SumAsync(t => (decimal?)t.Amount) ?? 0;

        return Ok(new
        {
            totalUsers,
            totalLoans,
            pendingLoans,
            totalTransactions,
            totalRevenue,
        });
    }

    [HttpGet("users")]
    public async Task<ActionResult> GetUsers()
    {
        var users = await _db.Users
            .OrderByDescending(u => u.CreatedAt)
            .Select(u => new
            {
                u.Id,
                u.FullName,
                u.Email,
                u.Role,
                u.KYCStatus,
                u.CreatedAt,
            })
            .ToListAsync();

        return Ok(users);
    }

    [HttpGet("loans")]
    public async Task<ActionResult> GetLoans()
    {
        var loans = await _db.Loans
            .Include(l => l.User)
            .OrderByDescending(l => l.CreatedAt)
            .Select(l => new
            {
                l.Id,
                UserName = l.User.FullName,
                UserEmail = l.User.Email,
                l.Amount,
                l.Status,
                l.CreatedAt,
            })
            .ToListAsync();

        return Ok(loans);
    }

    [HttpGet("payments")]
    public async Task<ActionResult> GetPayments()
    {
        var payments = await _db.Transactions
            .Include(t => t.User)
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new
            {
                t.Id,
                UserName = t.User.FullName,
                UserEmail = t.User.Email,
                t.Amount,
                t.Type,
                t.Status,
                t.Description,
                t.CreatedAt,
            })
            .ToListAsync();

        return Ok(payments);
    }

    [HttpGet("kyc")]
    public async Task<ActionResult> GetKyc()
    {
        var applications = await _db.Users
            .Where(u => u.KYCStatus != null)
            .OrderByDescending(u => u.UpdatedAt)
            .Select(u => new
            {
                u.Id,
                u.FullName,
                u.Email,
                u.KYCStatus,
                u.Country,
                u.UpdatedAt,
            })
            .ToListAsync();

        return Ok(applications);
    }

    [HttpGet("roles")]
    public async Task<ActionResult> GetRoles()
    {
        var roles = await _db.Users
            .GroupBy(u => u.Role)
            .Select(g => new
            {
                Role = g.Key,
                Count = g.Count(),
                Users = g.Select(u => new
                {
                    u.Id,
                    u.FullName,
                    u.Email,
                }).ToList(),
            })
            .ToListAsync();

        return Ok(roles);
    }

    [HttpGet("reports")]
    public async Task<ActionResult> GetReports()
    {
        var totalUsers = await _db.Users.CountAsync();
        var totalLoans = await _db.Loans.CountAsync();
        var activeLoans = await _db.Loans.CountAsync(l => l.Status == "active");
        var totalDeposits = await _db.Transactions
            .Where(t => t.Type == "deposit")
            .SumAsync(t => (decimal?)t.Amount) ?? 0;
        var totalWithdrawals = await _db.Transactions
            .Where(t => t.Type == "withdrawal")
            .SumAsync(t => (decimal?)t.Amount) ?? 0;
        var loanVolume = await _db.Loans
            .SumAsync(l => (decimal?)l.Amount) ?? 0;

        return Ok(new
        {
            totalUsers,
            totalLoans,
            activeLoans,
            totalDeposits,
            totalWithdrawals,
            loanVolume,
        });
    }

    [HttpGet("affiliates")]
    public async Task<ActionResult> GetAffiliates()
    {
        var affiliates = await _db.Users
            .Where(u => u.Role == "affiliate" || u.Role == "business")
            .OrderByDescending(u => u.CreatedAt)
            .Select(u => new
            {
                u.Id,
                u.FullName,
                u.Email,
                u.Country,
                u.CreatedAt,
            })
            .ToListAsync();

        return Ok(affiliates);
    }

    [HttpGet("audit-logs")]
    public ActionResult GetAuditLogs()
    {
        return Ok(Array.Empty<object>());
    }

    [HttpGet("tickets")]
    public ActionResult GetTickets()
    {
        return Ok(Array.Empty<object>());
    }

    [HttpGet("cms")]
    public ActionResult GetCms()
    {
        return Ok(new
        {
            pages = Array.Empty<object>(),
            blogPosts = Array.Empty<object>(),
        });
    }
}
