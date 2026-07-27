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
[Route("api/admin/exchange-alerts")]
[Authorize]
public class ExchangeAlertsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IFxAuditService _audit;

    public ExchangeAlertsController(AppDbContext db, IFxAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
    private string GetUserName() => User.FindFirst(ClaimTypes.Name)?.Value ?? "Unknown";

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ExchangeAlert>>> GetAll()
    {
        return Ok(await _db.ExchangeAlerts.OrderBy(a => a.AlertType).ToListAsync());
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ExchangeAlert>> Get(Guid id)
    {
        var alert = await _db.ExchangeAlerts.FindAsync(id);
        if (alert == null) return NotFound();
        return Ok(alert);
    }

    [HttpPost]
    public async Task<ActionResult<ExchangeAlert>> Create([FromBody] ExchangeAlertRequest request)
    {
        var alert = new ExchangeAlert
        {
            AlertType = request.AlertType,
            Channel = request.Channel,
            Threshold = request.Threshold,
            IsEnabled = request.IsEnabled,
        };

        _db.ExchangeAlerts.Add(alert);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(Get), new { id = alert.Id }, alert);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ExchangeAlert>> Update(Guid id, [FromBody] ExchangeAlertRequest request)
    {
        var alert = await _db.ExchangeAlerts.FindAsync(id);
        if (alert == null) return NotFound();

        alert.AlertType = request.AlertType;
        alert.Channel = request.Channel;
        alert.Threshold = request.Threshold;
        alert.IsEnabled = request.IsEnabled;
        alert.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return Ok(alert);
    }

    [HttpPatch("{id:guid}/toggle")]
    public async Task<ActionResult> Toggle(Guid id)
    {
        var alert = await _db.ExchangeAlerts.FindAsync(id);
        if (alert == null) return NotFound();
        alert.IsEnabled = !alert.IsEnabled;
        alert.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { alert.IsEnabled });
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var alert = await _db.ExchangeAlerts.FindAsync(id);
        if (alert == null) return NotFound();
        _db.ExchangeAlerts.Remove(alert);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Alert deleted" });
    }
}
