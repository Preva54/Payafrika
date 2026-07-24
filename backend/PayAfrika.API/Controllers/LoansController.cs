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

    [HttpGet("overview")]
    public async Task<ActionResult<LoanOverviewResponse>> GetOverview()
    {
        var userId = GetUserId();
        var overview = await _loanService.GetOverviewAsync(userId);
        return Ok(overview);
    }

    [HttpGet("{id}/repayment-schedule")]
    public async Task<ActionResult<List<RepaymentScheduleItem>>> GetRepaymentSchedule(Guid id)
    {
        try
        {
            var schedule = await _loanService.GetRepaymentScheduleAsync(id);
            return Ok(schedule);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    [HttpGet("credit-score")]
    public async Task<ActionResult<CreditScoreResponse>> GetCreditScore()
    {
        var userId = GetUserId();
        var score = await _loanService.GetCreditScoreAsync(userId);
        return Ok(score);
    }

    [HttpPost("eligibility")]
    [AllowAnonymous]
    public async Task<ActionResult<EligibilityResponse>> CheckEligibility([FromBody] EligibilityRequest request)
    {
        var result = await _loanService.CheckEligibilityAsync(request);
        return Ok(result);
    }

    [HttpPost("calculator")]
    [AllowAnonymous]
    public async Task<ActionResult<CalculatorResponse>> Calculate([FromBody] CalculatorRequest request)
    {
        var result = await _loanService.CalculateLoanAsync(request);
        return Ok(result);
    }

    [HttpPost("payment")]
    public async Task<ActionResult<LoanResponse>> MakePayment([FromBody] LoanPaymentRequest request)
    {
        var userId = GetUserId();
        try
        {
            var result = await _loanService.MakePaymentAsync(userId, request);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("notifications")]
    public async Task<ActionResult<List<LoanNotificationResponse>>> GetNotifications()
    {
        var userId = GetUserId();
        var notifications = await _loanService.GetNotificationsAsync(userId);
        return Ok(notifications);
    }

    [HttpGet("analytics")]
    public async Task<ActionResult<LoanAnalyticsResponse>> GetAnalytics()
    {
        var userId = GetUserId();
        var analytics = await _loanService.GetAnalyticsAsync(userId);
        return Ok(analytics);
    }

    [HttpGet("documents")]
    public async Task<ActionResult<List<LoanDocumentResponse>>> GetDocuments()
    {
        var userId = GetUserId();
        var documents = await _loanService.GetDocumentsAsync(userId);
        return Ok(documents);
    }

    private Guid GetUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.Parse(claim!);
    }
}