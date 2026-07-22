using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PayAfrika.API.DTOs;
using PayAfrika.API.Services;

namespace PayAfrika.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class LoansController : ControllerBase
{
    private readonly ILoanService _loanService;

    public LoansController(ILoanService loanService)
    {
        _loanService = loanService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<LoanResponse>>> GetMyLoans()
    {
        var userId = GetUserId();
        var loans = await _loanService.GetUserLoansAsync(userId);
        return Ok(loans);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<LoanResponse>> GetLoan(Guid id)
    {
        try
        {
            var loan = await _loanService.GetByIdAsync(id);
            return Ok(loan);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    [HttpPost]
    public async Task<ActionResult<LoanResponse>> Apply([FromBody] LoanApplicationRequest request)
    {
        var userId = GetUserId();
        var loan = await _loanService.ApplyAsync(userId, request);
        return CreatedAtAction(nameof(GetLoan), new { id = loan.Id }, loan);
    }

    private Guid GetUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.Parse(claim!);
    }
}
