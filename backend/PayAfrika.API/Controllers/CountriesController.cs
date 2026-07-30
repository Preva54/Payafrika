using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PayAfrika.API.Data;
using PayAfrika.API.DTOs;
using PayAfrika.API.Models;

namespace PayAfrika.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CountriesController : ControllerBase
{
    private readonly AppDbContext _db;

    public CountriesController(AppDbContext db) => _db = db;

    [HttpGet]
    [Authorize]
    public async Task<ActionResult<List<CountryListResponse>>> GetAll()
    {
        var countries = await _db.Countries.OrderBy(c => c.SortOrder).ToListAsync();
        return Ok(countries.Select(c => new CountryListResponse
        {
            Id = c.Id,
            Name = c.Name,
            Code = c.Code,
            CurrencyCode = c.CurrencyCode,
            CurrencySymbol = c.CurrencySymbol,
            IsEnabled = c.IsEnabled,
        }).ToList());
    }

    [HttpPost]
    [Authorize(Roles = "admin")]
    public async Task<ActionResult<Country>> Create([FromBody] Country country)
    {
        country.Id = Guid.NewGuid();
        country.CreatedAt = DateTime.UtcNow;
        _db.Countries.Add(country);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), new { id = country.Id }, country);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "admin")]
    public async Task<ActionResult> Update(Guid id, [FromBody] Country updated)
    {
        var country = await _db.Countries.FindAsync(id);
        if (country == null) return NotFound();

        country.Name = updated.Name;
        country.Code = updated.Code;
        country.CurrencyCode = updated.CurrencyCode;
        country.CurrencySymbol = updated.CurrencySymbol;
        country.IsEnabled = updated.IsEnabled;
        country.SortOrder = updated.SortOrder;
        country.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "admin")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var country = await _db.Countries.FindAsync(id);
        if (country == null) return NotFound();

        _db.Countries.Remove(country);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}