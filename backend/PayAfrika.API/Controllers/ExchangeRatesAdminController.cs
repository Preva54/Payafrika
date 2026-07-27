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
[Route("api/admin/exchange-rates")]
[Authorize]
public class ExchangeRatesAdminController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IFxAuditService _audit;
    private readonly IExchangeRateService _rateService;

    public ExchangeRatesAdminController(AppDbContext db, IFxAuditService audit, IExchangeRateService rateService)
    {
        _db = db;
        _audit = audit;
        _rateService = rateService;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
    private string GetUserName() => User.FindFirst(ClaimTypes.Name)?.Value ?? User.FindFirst("name")?.Value ?? "Unknown";

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ExchangeRate>>> GetAll()
    {
        var rates = await _db.ExchangeRates.Include(r => r.Provider).OrderBy(r => r.BaseCurrency).ToListAsync();
        return Ok(rates);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ExchangeRate>> Get(Guid id)
    {
        var rate = await _db.ExchangeRates.Include(r => r.Provider).FirstOrDefaultAsync(r => r.Id == id);
        if (rate == null) return NotFound();
        return Ok(rate);
    }

    [HttpPost]
    public async Task<ActionResult<ExchangeRate>> Create([FromBody] ExchangeRateRequest request)
    {
        var rate = new ExchangeRate
        {
            BaseCurrency = request.BaseCurrency.ToUpper(),
            QuoteCurrency = request.QuoteCurrency.ToUpper(),
            BuyRate = request.BuyRate,
            SellRate = request.SellRate,
            MidMarketRate = request.MidMarketRate > 0 ? request.MidMarketRate : (request.BuyRate + request.SellRate) / 2,
            Spread = request.Spread > 0 ? request.Spread : request.SellRate - request.BuyRate,
            ProviderId = request.ProviderId,
            Source = request.Source,
            LockedUntil = request.LockedUntil,
        };

        _db.ExchangeRates.Add(rate);
        await _db.SaveChangesAsync();

        await _audit.LogAsync(GetUserId(), GetUserName(), "Exchange Rate Created", "ExchangeRate", rate.Id.ToString(),
            null, System.Text.Json.JsonSerializer.Serialize(request));

        return CreatedAtAction(nameof(Get), new { id = rate.Id }, rate);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ExchangeRate>> Update(Guid id, [FromBody] ExchangeRateRequest request)
    {
        var rate = await _db.ExchangeRates.FindAsync(id);
        if (rate == null) return NotFound();

        var prev = System.Text.Json.JsonSerializer.Serialize(new { rate.BuyRate, rate.SellRate, rate.Spread });

        rate.BaseCurrency = request.BaseCurrency.ToUpper();
        rate.QuoteCurrency = request.QuoteCurrency.ToUpper();
        rate.BuyRate = request.BuyRate;
        rate.SellRate = request.SellRate;
        rate.MidMarketRate = request.MidMarketRate > 0 ? request.MidMarketRate : (request.BuyRate + request.SellRate) / 2;
        rate.Spread = request.Spread > 0 ? request.Spread : request.SellRate - request.BuyRate;
        rate.ProviderId = request.ProviderId;
        rate.Source = request.Source;
        rate.LockedUntil = request.LockedUntil;
        rate.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        await _audit.LogAsync(GetUserId(), GetUserName(), "Rate Updated", "ExchangeRate", id.ToString(),
            prev, System.Text.Json.JsonSerializer.Serialize(new { request.BuyRate, request.SellRate }));

        return Ok(rate);
    }

    [HttpPatch("{id:guid}/lock")]
    public async Task<ActionResult> Lock(Guid id, [FromQuery] DateTime? until)
    {
        var rate = await _db.ExchangeRates.FindAsync(id);
        if (rate == null) return NotFound();

        rate.LockedUntil = until ?? DateTime.UtcNow.AddHours(1);
        rate.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        await _audit.LogAsync(GetUserId(), GetUserName(), "Rate Locked", "ExchangeRate", id.ToString());

        return Ok(new { rate.LockedUntil });
    }

    [HttpPatch("{id:guid}/unlock")]
    public async Task<ActionResult> Unlock(Guid id)
    {
        var rate = await _db.ExchangeRates.FindAsync(id);
        if (rate == null) return NotFound();

        rate.LockedUntil = null;
        rate.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Rate unlocked" });
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var rate = await _db.ExchangeRates.FindAsync(id);
        if (rate == null) return NotFound();

        rate.IsActive = false;
        rate.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Rate deactivated" });
    }

    [HttpPost("sync/{providerId:guid}")]
    public async Task<ActionResult> SyncFromProvider(Guid providerId)
    {
        var updated = await _rateService.SyncRatesFromProviderAsync(providerId);
        await _audit.LogAsync(GetUserId(), GetUserName(), "Rates Synced", "ExchangeRate", providerId.ToString(),
            null, System.Text.Json.JsonSerializer.Serialize(new { updated }));
        return Ok(new { updated });
    }
}
