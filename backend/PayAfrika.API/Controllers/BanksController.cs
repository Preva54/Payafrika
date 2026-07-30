using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PayAfrika.API.Data;
using PayAfrika.API.DTOs;
using PayAfrika.API.Models;

namespace PayAfrika.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "admin")]
public class BanksController : ControllerBase
{
    private readonly AppDbContext _db;

    public BanksController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<List<BankListResponse>>> GetAll([FromQuery] string? countryCode)
    {
        var query = _db.Banks.AsQueryable();

        if (!string.IsNullOrWhiteSpace(countryCode))
            query = query.Where(b => b.CountryCode == countryCode.ToUpper());

        var banks = await query.OrderBy(b => b.SortOrder).ToListAsync();
        return Ok(banks.Select(b => new BankListResponse
        {
            Id = b.Id,
            CountryCode = b.CountryCode,
            Name = b.Name,
            Code = b.Code,
        }).ToList());
    }

    [HttpPost]
    public async Task<ActionResult<Bank>> Create([FromBody] Bank bank)
    {
        bank.Id = Guid.NewGuid();
        bank.CreatedAt = DateTime.UtcNow;
        _db.Banks.Add(bank);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), new { id = bank.Id }, bank);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> Update(Guid id, [FromBody] Bank updated)
    {
        var bank = await _db.Banks.FindAsync(id);
        if (bank == null) return NotFound();

        bank.CountryCode = updated.CountryCode;
        bank.Name = updated.Name;
        bank.Code = updated.Code;
        bank.IsEnabled = updated.IsEnabled;
        bank.SortOrder = updated.SortOrder;
        bank.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var bank = await _db.Banks.FindAsync(id);
        if (bank == null) return NotFound();

        _db.Banks.Remove(bank);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}