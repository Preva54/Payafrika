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
}
