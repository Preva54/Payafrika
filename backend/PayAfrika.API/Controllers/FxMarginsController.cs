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
[Route("api/admin/fx-margins")]
[Authorize]
public class FxMarginsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IFxAuditService _audit;

    public FxMarginsController(AppDbContext db, IFxAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
    private string GetUserName() => User.FindFirst(ClaimTypes.Name)?.Value ?? "Unknown";

    [HttpGet]
    public async Task<ActionResult<IEnumerable<FxMargin>>> GetAll()
    {
        return Ok(await _db.FxMargins.OrderBy(m => m.Priority).ToListAsync());
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<FxMargin>> Get(Guid id)
    {
        var margin = await _db.FxMargins.FindAsync(id);
        if (margin == null) return NotFound();
        return Ok(margin);
    }

    [HttpPost]
    public async Task<ActionResult<FxMargin>> Create([FromBody] FxMarginRequest request)
    {
        var margin = new FxMargin
        {
            Name = request.Name,
            Type = request.Type,
            EntityId = request.EntityId,
            MarginType = request.MarginType,
            Value = request.Value,
            MinValue = request.MinValue,
            MaxValue = request.MaxValue,
            IsActive = request.IsActive,
            Priority = request.Priority,
        };

        _db.FxMargins.Add(margin);
        await _db.SaveChangesAsync();

        await _audit.LogAsync(GetUserId(), GetUserName(), "FX Margin Created", "FxMargin", margin.Id.ToString());

        return CreatedAtAction(nameof(Get), new { id = margin.Id }, margin);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<FxMargin>> Update(Guid id, [FromBody] FxMarginRequest request)
    {
        var margin = await _db.FxMargins.FindAsync(id);
        if (margin == null) return NotFound();

        var prev = System.Text.Json.JsonSerializer.Serialize(new { margin.Value, margin.MarginType });

        margin.Name = request.Name;
        margin.Type = request.Type;
        margin.EntityId = request.EntityId;
        margin.MarginType = request.MarginType;
        margin.Value = request.Value;
        margin.MinValue = request.MinValue;
        margin.MaxValue = request.MaxValue;
        margin.IsActive = request.IsActive;
        margin.Priority = request.Priority;
        margin.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        await _audit.LogAsync(GetUserId(), GetUserName(), "FX Margin Updated", "FxMargin", id.ToString(),
            prev, System.Text.Json.JsonSerializer.Serialize(new { request.Value }));

        return Ok(margin);
    }

    [HttpPatch("{id:guid}/toggle")]
    public async Task<ActionResult> Toggle(Guid id)
    {
        var margin = await _db.FxMargins.FindAsync(id);
        if (margin == null) return NotFound();
        margin.IsActive = !margin.IsActive;
        margin.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { margin.IsActive });
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var margin = await _db.FxMargins.FindAsync(id);
        if (margin == null) return NotFound();
        _db.FxMargins.Remove(margin);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Margin deleted" });
    }
}
