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
[Route("api/admin/conversion-rules")]
[Authorize]
public class ConversionRulesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IFxAuditService _audit;

    public ConversionRulesController(AppDbContext db, IFxAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
    private string GetUserName() => User.FindFirst(ClaimTypes.Name)?.Value ?? "Unknown";

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ConversionRule>>> GetAll()
    {
        return Ok(await _db.ConversionRules.OrderBy(r => r.Priority).ToListAsync());
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ConversionRule>> Get(Guid id)
    {
        var rule = await _db.ConversionRules.FindAsync(id);
        if (rule == null) return NotFound();
        return Ok(rule);
    }

    [HttpPost]
    public async Task<ActionResult<ConversionRule>> Create([FromBody] ConversionRuleRequest request)
    {
        var rule = new ConversionRule
        {
            Name = request.Name,
            RuleType = request.RuleType,
            RoundingRule = request.RoundingRule,
            DecimalPrecision = request.DecimalPrecision,
            MinAmount = request.MinAmount,
            MaxAmount = request.MaxAmount,
            IsActive = request.IsActive,
            Priority = request.Priority,
        };

        _db.ConversionRules.Add(rule);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(Get), new { id = rule.Id }, rule);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ConversionRule>> Update(Guid id, [FromBody] ConversionRuleRequest request)
    {
        var rule = await _db.ConversionRules.FindAsync(id);
        if (rule == null) return NotFound();

        rule.Name = request.Name;
        rule.RuleType = request.RuleType;
        rule.RoundingRule = request.RoundingRule;
        rule.DecimalPrecision = request.DecimalPrecision;
        rule.MinAmount = request.MinAmount;
        rule.MaxAmount = request.MaxAmount;
        rule.IsActive = request.IsActive;
        rule.Priority = request.Priority;
        rule.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return Ok(rule);
    }

    [HttpPatch("{id:guid}/toggle")]
    public async Task<ActionResult> Toggle(Guid id)
    {
        var rule = await _db.ConversionRules.FindAsync(id);
        if (rule == null) return NotFound();
        rule.IsActive = !rule.IsActive;
        rule.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { rule.IsActive });
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var rule = await _db.ConversionRules.FindAsync(id);
        if (rule == null) return NotFound();
        _db.ConversionRules.Remove(rule);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Rule deleted" });
    }
}
