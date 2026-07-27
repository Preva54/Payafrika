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
[Route("api/admin/currency-pairs")]
[Authorize]
public class CurrencyPairsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IFxAuditService _audit;

    public CurrencyPairsController(AppDbContext db, IFxAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
    private string GetUserName() => User.FindFirst(ClaimTypes.Name)?.Value ?? "Unknown";

    [HttpGet]
    public async Task<ActionResult<IEnumerable<CurrencyPair>>> GetAll()
    {
        return Ok(await _db.CurrencyPairs.OrderBy(p => p.SortOrder).ToListAsync());
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CurrencyPair>> Get(Guid id)
    {
        var pair = await _db.CurrencyPairs.FindAsync(id);
        if (pair == null) return NotFound();
        return Ok(pair);
    }

    [HttpPost]
    public async Task<ActionResult<CurrencyPair>> Create([FromBody] CurrencyPairRequest request)
    {
        var pair = new CurrencyPair
        {
            BaseCurrency = request.BaseCurrency.ToUpper(),
            QuoteCurrency = request.QuoteCurrency.ToUpper(),
            IsEnabled = request.IsEnabled,
            PreferredProviderId = request.PreferredProviderId,
            MinBuySpread = request.MinBuySpread,
            MaxBuySpread = request.MaxBuySpread,
            MinSellSpread = request.MinSellSpread,
            MaxSellSpread = request.MaxSellSpread,
            DailyBuyLimit = request.DailyBuyLimit,
            DailySellLimit = request.DailySellLimit,
            BuyFee = request.BuyFee,
            SellFee = request.SellFee,
            FeeType = request.FeeType,
            SortOrder = request.SortOrder,
        };

        _db.CurrencyPairs.Add(pair);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(Get), new { id = pair.Id }, pair);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<CurrencyPair>> Update(Guid id, [FromBody] CurrencyPairRequest request)
    {
        var pair = await _db.CurrencyPairs.FindAsync(id);
        if (pair == null) return NotFound();

        pair.BaseCurrency = request.BaseCurrency.ToUpper();
        pair.QuoteCurrency = request.QuoteCurrency.ToUpper();
        pair.IsEnabled = request.IsEnabled;
        pair.PreferredProviderId = request.PreferredProviderId;
        pair.MinBuySpread = request.MinBuySpread;
        pair.MaxBuySpread = request.MaxBuySpread;
        pair.MinSellSpread = request.MinSellSpread;
        pair.MaxSellSpread = request.MaxSellSpread;
        pair.DailyBuyLimit = request.DailyBuyLimit;
        pair.DailySellLimit = request.DailySellLimit;
        pair.BuyFee = request.BuyFee;
        pair.SellFee = request.SellFee;
        pair.FeeType = request.FeeType;
        pair.SortOrder = request.SortOrder;
        pair.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return Ok(pair);
    }

    [HttpPatch("{id:guid}/toggle")]
    public async Task<ActionResult> Toggle(Guid id)
    {
        var pair = await _db.CurrencyPairs.FindAsync(id);
        if (pair == null) return NotFound();
        pair.IsEnabled = !pair.IsEnabled;
        pair.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { pair.IsEnabled });
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var pair = await _db.CurrencyPairs.FindAsync(id);
        if (pair == null) return NotFound();
        _db.CurrencyPairs.Remove(pair);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Pair deleted" });
    }
}
