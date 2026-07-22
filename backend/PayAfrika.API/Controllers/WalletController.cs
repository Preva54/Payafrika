using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PayAfrika.API.Data;
using PayAfrika.API.Models;

namespace PayAfrika.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class WalletController : ControllerBase
{
    private readonly AppDbContext _db;

    public WalletController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<Wallet>> GetWallet()
    {
        var userId = GetUserId();
        var wallet = await _db.Wallets.FirstOrDefaultAsync(w => w.UserId == userId);
        if (wallet == null)
            return NotFound(new { error = "Wallet not found." });

        return Ok(wallet);
    }

    [HttpPost("deposit")]
    public async Task<ActionResult<Wallet>> Deposit([FromBody] decimal amount)
    {
        if (amount <= 0)
            return BadRequest(new { error = "Amount must be positive." });

        var userId = GetUserId();
        var wallet = await _db.Wallets.FirstAsync(w => w.UserId == userId);

        wallet.Balance += amount;
        wallet.UpdatedAt = DateTime.UtcNow;

        _db.Transactions.Add(new Transaction
        {
            UserId = userId,
            Type = "deposit",
            Amount = amount,
            Currency = wallet.Currency,
            Status = "completed",
            Description = "Wallet deposit",
        });

        await _db.SaveChangesAsync();
        return Ok(wallet);
    }

    [HttpGet("transactions")]
    public async Task<ActionResult<IEnumerable<Transaction>>> GetTransactions()
    {
        var userId = GetUserId();
        var transactions = await _db.Transactions
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.CreatedAt)
            .Take(50)
            .ToListAsync();

        return Ok(transactions);
    }

    private Guid GetUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.Parse(claim!);
    }
}
