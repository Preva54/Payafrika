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
[Route("api/admin/currencies")]
[Authorize]
public class CurrenciesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IFxAuditService _audit;

    public CurrenciesController(AppDbContext db, IFxAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
    private string GetUserName() => User.FindFirst(ClaimTypes.Name)?.Value ?? User.FindFirst("name")?.Value ?? "Unknown";

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Currency>>> GetAll()
    {
        var currencies = await _db.Currencies.OrderBy(c => c.SortOrder).ThenBy(c => c.Code).ToListAsync();
        return Ok(currencies);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<Currency>> Get(Guid id)
    {
        var currency = await _db.Currencies.FindAsync(id);
        if (currency == null) return NotFound();
        return Ok(currency);
    }

    [HttpPost]
    public async Task<ActionResult<Currency>> Create([FromBody] CurrencyRequest request)
    {
        if (await _db.Currencies.AnyAsync(c => c.Code == request.Code))
            return BadRequest(new { error = $"Currency {request.Code} already exists" });

        var currency = new Currency
        {
            Code = request.Code.ToUpper(),
            Name = request.Name,
            Symbol = request.Symbol,
            Country = request.Country,
            FlagEmoji = request.FlagEmoji,
            DecimalPlaces = request.DecimalPlaces,
            SortOrder = request.SortOrder,
        };

        _db.Currencies.Add(currency);
        await _db.SaveChangesAsync();

        await _audit.LogAsync(GetUserId(), GetUserName(), "Currency Added", "Currency", currency.Id.ToString(),
            null, System.Text.Json.JsonSerializer.Serialize(request));

        return CreatedAtAction(nameof(Get), new { id = currency.Id }, currency);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<Currency>> Update(Guid id, [FromBody] CurrencyRequest request)
    {
        var currency = await _db.Currencies.FindAsync(id);
        if (currency == null) return NotFound();

        var prev = System.Text.Json.JsonSerializer.Serialize(new { currency.Code, currency.Name, currency.IsActive });

        currency.Name = request.Name;
        currency.Symbol = request.Symbol;
        currency.Country = request.Country;
        currency.FlagEmoji = request.FlagEmoji;
        currency.DecimalPlaces = request.DecimalPlaces;
        currency.SortOrder = request.SortOrder;
        currency.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        await _audit.LogAsync(GetUserId(), GetUserName(), "Currency Updated", "Currency", id.ToString(),
            prev, System.Text.Json.JsonSerializer.Serialize(request));

        return Ok(currency);
    }

    [HttpPatch("{id:guid}/toggle")]
    public async Task<ActionResult> Toggle(Guid id)
    {
        var currency = await _db.Currencies.FindAsync(id);
        if (currency == null) return NotFound();

        currency.IsActive = !currency.IsActive;
        currency.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        await _audit.LogAsync(GetUserId(), GetUserName(),
            currency.IsActive ? "Currency Enabled" : "Currency Disabled",
            "Currency", id.ToString());

        return Ok(new { currency.IsActive });
    }

    [HttpPatch("{id:guid}/default")]
    public async Task<ActionResult> SetDefault(Guid id)
    {
        var currency = await _db.Currencies.FindAsync(id);
        if (currency == null) return NotFound();

        var currentDefault = await _db.Currencies.Where(c => c.IsDefault).ToListAsync();
        foreach (var c in currentDefault) c.IsDefault = false;

        currency.IsDefault = true;
        currency.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        await _audit.LogAsync(GetUserId(), GetUserName(), "Default Currency Changed", "Currency", id.ToString());

        return Ok(new { currency.Code, IsDefault = true });
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var currency = await _db.Currencies.FindAsync(id);
        if (currency == null) return NotFound();

        currency.IsArchived = true;
        currency.IsActive = false;
        currency.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Currency archived" });
    }
}
