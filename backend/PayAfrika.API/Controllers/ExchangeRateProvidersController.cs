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
[Route("api/admin/exchange-providers")]
[Authorize]
public class ExchangeRateProvidersController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IFxAuditService _audit;
    private readonly IExchangeRateService _rateService;

    public ExchangeRateProvidersController(AppDbContext db, IFxAuditService audit, IExchangeRateService rateService)
    {
        _db = db;
        _audit = audit;
        _rateService = rateService;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
    private string GetUserName() => User.FindFirst(ClaimTypes.Name)?.Value ?? "Unknown";

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ExchangeRateProvider>>> GetAll()
    {
        return Ok(await _db.ExchangeRateProviders.OrderBy(p => p.Priority).ToListAsync());
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ExchangeRateProvider>> Get(Guid id)
    {
        var provider = await _db.ExchangeRateProviders.FindAsync(id);
        if (provider == null) return NotFound();
        return Ok(provider);
    }

    [HttpPost]
    public async Task<ActionResult<ExchangeRateProvider>> Create([FromBody] ProviderRequest request)
    {
        var provider = new ExchangeRateProvider
        {
            Name = request.Name,
            ApiEndpoint = request.ApiEndpoint,
            ApiKeyEncrypted = request.ApiKey,
            Priority = request.Priority,
            IsPrimary = request.IsPrimary,
            IsFallback = request.IsFallback,
            ConfigJson = request.ConfigJson,
        };

        _db.ExchangeRateProviders.Add(provider);

        if (request.IsPrimary)
        {
            var others = await _db.ExchangeRateProviders.Where(p => p.IsPrimary).ToListAsync();
            foreach (var o in others) o.IsPrimary = false;
        }

        await _db.SaveChangesAsync();

        await _audit.LogAsync(GetUserId(), GetUserName(), "Provider Added", "ExchangeRateProvider", provider.Id.ToString());

        return CreatedAtAction(nameof(Get), new { id = provider.Id }, provider);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ExchangeRateProvider>> Update(Guid id, [FromBody] ProviderRequest request)
    {
        var provider = await _db.ExchangeRateProviders.FindAsync(id);
        if (provider == null) return NotFound();

        var prev = System.Text.Json.JsonSerializer.Serialize(new { provider.Name, provider.IsPrimary, provider.IsActive });

        provider.Name = request.Name;
        provider.ApiEndpoint = request.ApiEndpoint;
        if (!string.IsNullOrEmpty(request.ApiKey)) provider.ApiKeyEncrypted = request.ApiKey;
        provider.Priority = request.Priority;
        provider.IsFallback = request.IsFallback;
        provider.ConfigJson = request.ConfigJson;
        provider.UpdatedAt = DateTime.UtcNow;

        if (request.IsPrimary && !provider.IsPrimary)
        {
            var others = await _db.ExchangeRateProviders.Where(p => p.IsPrimary && p.Id != id).ToListAsync();
            foreach (var o in others) o.IsPrimary = false;
            provider.IsPrimary = true;
        }

        await _db.SaveChangesAsync();

        await _audit.LogAsync(GetUserId(), GetUserName(), "Provider Updated", "ExchangeRateProvider", id.ToString(),
            prev, System.Text.Json.JsonSerializer.Serialize(request));

        return Ok(provider);
    }

    [HttpPatch("{id:guid}/toggle")]
    public async Task<ActionResult> Toggle(Guid id)
    {
        var provider = await _db.ExchangeRateProviders.FindAsync(id);
        if (provider == null) return NotFound();

        provider.IsActive = !provider.IsActive;
        provider.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { provider.IsActive });
    }

    [HttpPost("{id:guid}/check-health")]
    public async Task<ActionResult> CheckHealth(Guid id)
    {
        await _rateService.CheckProviderHealthAsync();
        var provider = await _db.ExchangeRateProviders.FindAsync(id);
        if (provider == null) return NotFound();
        return Ok(new { provider.HealthStatus, provider.LastHealthCheck });
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var provider = await _db.ExchangeRateProviders.FindAsync(id);
        if (provider == null) return NotFound();

        provider.IsActive = false;
        provider.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Provider deactivated" });
    }
}
