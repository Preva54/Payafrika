using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PayAfrika.API.Data;
using PayAfrika.API.DTOs;
using PayAfrika.API.Models;
using PayAfrika.API.Services;

namespace PayAfrika.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class BankVerificationController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IBankVerificationService _verificationService;

    public BankVerificationController(AppDbContext db, IBankVerificationService verificationService)
    {
        _db = db;
        _verificationService = verificationService;
    }

    private Guid GetUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.Parse(claim!);
    }

    [HttpPost("verify")]
    public async Task<ActionResult<VerifyAccountResponse>> VerifyAccount([FromBody] VerifyAccountRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.CountryCode))
            return BadRequest(new { error = "Country code is required." });

        if (string.IsNullOrWhiteSpace(request.AccountNumber))
            return BadRequest(new { error = "Account number is required." });

        var result = await _verificationService.VerifyAccountAsync(GetUserId(), request.CountryCode, request.BankCode, request.AccountNumber);

        if (!result.Success)
            return BadRequest(new { error = result.Message });

        return Ok(result);
    }

    [HttpGet("banks/{countryCode}")]
    public async Task<ActionResult<List<BankListResponse>>> GetBanks(string countryCode)
    {
        if (string.IsNullOrWhiteSpace(countryCode))
            return BadRequest(new { error = "Country code is required." });

        var banks = await _verificationService.GetBanksForCountryAsync(countryCode);

        if (banks.Count == 0)
            return NotFound(new { error = "No banks found for this country." });

        return Ok(banks);
    }

    [HttpGet("history")]
    public async Task<ActionResult<IEnumerable<BankVerification>>> GetHistory()
    {
        var userId = GetUserId();
        var history = await _db.BankVerifications
            .Where(bv => bv.UserId == userId)
            .OrderByDescending(bv => bv.CreatedAt)
            .Take(20)
            .ToListAsync();

        return Ok(history);
    }
}