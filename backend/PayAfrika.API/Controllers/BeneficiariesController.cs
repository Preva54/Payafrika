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
public class BeneficiariesController : ControllerBase
{
    private readonly AppDbContext _db;

    public BeneficiariesController(AppDbContext db) => _db = db;

    private Guid GetUserId() => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Beneficiary>>> GetAll()
    {
        var userId = GetUserId();
        return Ok(await _db.Beneficiaries.Where(b => b.UserId == userId).OrderByDescending(b => b.IsFavorite).ThenBy(b => b.Name).ToListAsync());
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Beneficiary>> Get(Guid id)
    {
        var userId = GetUserId();
        var beneficiary = await _db.Beneficiaries.FirstOrDefaultAsync(b => b.Id == id && b.UserId == userId);
        if (beneficiary == null) return NotFound();
        return Ok(beneficiary);
    }

    [HttpPost]
    public async Task<ActionResult<Beneficiary>> Create([FromBody] Beneficiary beneficiary)
    {
        beneficiary.Id = Guid.NewGuid();
        beneficiary.UserId = GetUserId();
        beneficiary.CreatedAt = DateTime.UtcNow;
        _db.Beneficiaries.Add(beneficiary);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = beneficiary.Id }, beneficiary);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<Beneficiary>> Update(Guid id, [FromBody] Beneficiary updated)
    {
        var userId = GetUserId();
        var beneficiary = await _db.Beneficiaries.FirstOrDefaultAsync(b => b.Id == id && b.UserId == userId);
        if (beneficiary == null) return NotFound();

        beneficiary.Name = updated.Name;
        beneficiary.BankName = updated.BankName;
        beneficiary.AccountNumber = updated.AccountNumber;
        beneficiary.Country = updated.Country;
        beneficiary.Currency = updated.Currency;
        beneficiary.IsVerified = updated.IsVerified;
        beneficiary.IsFavorite = updated.IsFavorite;
        await _db.SaveChangesAsync();
        return Ok(beneficiary);
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var userId = GetUserId();
        var beneficiary = await _db.Beneficiaries.FirstOrDefaultAsync(b => b.Id == id && b.UserId == userId);
        if (beneficiary == null) return NotFound();
        _db.Beneficiaries.Remove(beneficiary);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
