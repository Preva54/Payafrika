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
public class ScheduledPaymentsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ScheduledPaymentsController(AppDbContext db) => _db = db;

    private Guid GetUserId() => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ScheduledPayment>>> GetAll()
    {
        var userId = GetUserId();
        return Ok(await _db.ScheduledPayments.Where(s => s.UserId == userId).OrderBy(s => s.NextDate).ToListAsync());
    }

    [HttpPost]
    public async Task<ActionResult<ScheduledPayment>> Create([FromBody] ScheduledPayment payment)
    {
        payment.Id = Guid.NewGuid();
        payment.UserId = GetUserId();
        payment.CreatedAt = DateTime.UtcNow;
        _db.ScheduledPayments.Add(payment);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), new { id = payment.Id }, payment);
    }

    [HttpPut("{id}/pause")]
    public async Task<ActionResult> Pause(Guid id)
    {
        var userId = GetUserId();
        var payment = await _db.ScheduledPayments.FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId);
        if (payment == null) return NotFound();
        payment.Status = "paused";
        await _db.SaveChangesAsync();
        return Ok(payment);
    }

    [HttpPut("{id}/resume")]
    public async Task<ActionResult> Resume(Guid id)
    {
        var userId = GetUserId();
        var payment = await _db.ScheduledPayments.FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId);
        if (payment == null) return NotFound();
        payment.Status = "active";
        await _db.SaveChangesAsync();
        return Ok(payment);
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var userId = GetUserId();
        var payment = await _db.ScheduledPayments.FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId);
        if (payment == null) return NotFound();
        _db.ScheduledPayments.Remove(payment);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
