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
[Route("api/admin/regional-rules")]
[Authorize]
public class RegionalCurrencyRulesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IFxAuditService _audit;

    public RegionalCurrencyRulesController(AppDbContext db, IFxAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
    private string GetUserName() => User.FindFirst(ClaimTypes.Name)?.Value ?? "Unknown";

    [HttpGet]
    public async Task<ActionResult<IEnumerable<RegionalCurrencyRule>>> GetAll()
    {
        return Ok(await _db.RegionalCurrencyRules.OrderBy(r => r.Country).ToListAsync());
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<RegionalCurrencyRule>> Get(Guid id)
    {
        var rule = await _db.RegionalCurrencyRules.FindAsync(id);
        if (rule == null) return NotFound();
        return Ok(rule);
    }

    [HttpPost]
    public async Task<ActionResult<RegionalCurrencyRule>> Create([FromBody] RegionalRuleRequest request)
    {
        var rule = new RegionalCurrencyRule
        {
            Country = request.Country,
            DefaultCurrency = request.DefaultCurrency.ToUpper(),
            SupportedCurrenciesJson = request.SupportedCurrenciesJson,
            AllowedPairsJson = request.AllowedPairsJson,
            RestrictionsJson = request.RestrictionsJson,
            LocalPaymentMethodsJson = request.LocalPaymentMethodsJson,
        };

        _db.RegionalCurrencyRules.Add(rule);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(Get), new { id = rule.Id }, rule);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<RegionalCurrencyRule>> Update(Guid id, [FromBody] RegionalRuleRequest request)
    {
        var rule = await _db.RegionalCurrencyRules.FindAsync(id);
        if (rule == null) return NotFound();

        rule.Country = request.Country;
        rule.DefaultCurrency = request.DefaultCurrency.ToUpper();
        rule.SupportedCurrenciesJson = request.SupportedCurrenciesJson;
        rule.AllowedPairsJson = request.AllowedPairsJson;
        rule.RestrictionsJson = request.RestrictionsJson;
        rule.LocalPaymentMethodsJson = request.LocalPaymentMethodsJson;
        rule.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return Ok(rule);
    }

    [HttpPatch("{id:guid}/toggle")]
    public async Task<ActionResult> Toggle(Guid id)
    {
        var rule = await _db.RegionalCurrencyRules.FindAsync(id);
        if (rule == null) return NotFound();
        rule.IsActive = !rule.IsActive;
        rule.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { rule.IsActive });
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var rule = await _db.RegionalCurrencyRules.FindAsync(id);
        if (rule == null) return NotFound();
        _db.RegionalCurrencyRules.Remove(rule);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Rule deleted" });
    }
}
