using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PayAfrika.API.Data;
using PayAfrika.API.DTOs;
using PayAfrika.API.Models;
using PayAfrika.API.Services;
using System.Security.Claims;

namespace PayAfrika.API.Controllers;

[ApiController]
[Route("api/admin/settlement-currencies")]
[Authorize]
public class SettlementCurrenciesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IFxAuditService _audit;

    public SettlementCurrenciesController(AppDbContext db, IFxAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
    private string GetUserName() => User.FindFirst(ClaimTypes.Name)?.Value ?? "Unknown";

    [HttpGet]
    public async Task<ActionResult<IEnumerable<SettlementCurrency>>> GetAll()
    {
        return Ok(await _db.SettlementCurrencies.OrderBy(s => s.Currency).ToListAsync());
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<SettlementCurrency>> Get(Guid id)
    {
        var sc = await _db.SettlementCurrencies.FindAsync(id);
        if (sc == null) return NotFound();
        return Ok(sc);
    }

    [HttpPost]
    public async Task<ActionResult<SettlementCurrency>> Create([FromBody] SettlementCurrencyRequest request)
    {
        var sc = new SettlementCurrency
        {
            Currency = request.Currency.ToUpper(),
            IsDefaultSettlement = request.IsDefaultSettlement,
            AutoConversion = request.AutoConversion,
            SettlementFrequency = request.SettlementFrequency,
            MarginPercent = request.MarginPercent,
            FeePercent = request.FeePercent,
        };

        if (request.IsDefaultSettlement)
        {
            var others = await _db.SettlementCurrencies.Where(s => s.IsDefaultSettlement).ToListAsync();
            foreach (var o in others) o.IsDefaultSettlement = false;
        }

        _db.SettlementCurrencies.Add(sc);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(Get), new { id = sc.Id }, sc);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<SettlementCurrency>> Update(Guid id, [FromBody] SettlementCurrencyRequest request)
    {
        var sc = await _db.SettlementCurrencies.FindAsync(id);
        if (sc == null) return NotFound();

        sc.Currency = request.Currency.ToUpper();
        sc.AutoConversion = request.AutoConversion;
        sc.SettlementFrequency = request.SettlementFrequency;
        sc.MarginPercent = request.MarginPercent;
        sc.FeePercent = request.FeePercent;
        sc.UpdatedAt = DateTime.UtcNow;

        if (request.IsDefaultSettlement && !sc.IsDefaultSettlement)
        {
            var others = await _db.SettlementCurrencies.Where(s => s.IsDefaultSettlement && s.Id != id).ToListAsync();
            foreach (var o in others) o.IsDefaultSettlement = false;
            sc.IsDefaultSettlement = true;
        }

        await _db.SaveChangesAsync();

        return Ok(sc);
    }

    [HttpPatch("{id:guid}/toggle")]
    public async Task<ActionResult> Toggle(Guid id)
    {
        var sc = await _db.SettlementCurrencies.FindAsync(id);
        if (sc == null) return NotFound();
        sc.IsActive = !sc.IsActive;
        sc.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { sc.IsActive });
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var sc = await _db.SettlementCurrencies.FindAsync(id);
        if (sc == null) return NotFound();
        sc.IsActive = false;
        sc.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { message = "Settlement currency deactivated" });
    }
}
