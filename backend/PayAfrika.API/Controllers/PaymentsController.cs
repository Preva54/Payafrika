using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PayAfrika.API.Models.Payment;
using PayAfrika.API.Services.Payment;

namespace PayAfrika.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PaymentsController : ControllerBase
{
    private readonly IPaymentService _paymentService;

    public PaymentsController(IPaymentService paymentService)
    {
        _paymentService = paymentService;
    }

    [HttpPost("initiate")]
    [Authorize]
    public async Task<ActionResult<PaymentResult>> InitiatePayment([FromBody] PaymentRequest request)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        request.UserId = userId;

        try
        {
            var result = await _paymentService.InitiatePaymentAsync(request);
            if (!result.Success)
                return BadRequest(result);

            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("verify/{provider}/{transactionId}")]
    [Authorize]
    public async Task<ActionResult<PaymentVerificationResult>> VerifyPayment(string provider, string transactionId)
    {
        try
        {
            var result = await _paymentService.VerifyPaymentAsync(provider, transactionId);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("webhook/{provider}")]
    public async Task<ActionResult> HandleWebhook(string provider)
    {
        using var reader = new StreamReader(Request.Body);
        var payload = await reader.ReadToEndAsync();

        var signature = Request.Headers["X-Signature"].FirstOrDefault() ?? string.Empty;

        var isValid = await _paymentService.ProcessWebhookAsync(provider, payload, signature);

        if (!isValid)
            return Unauthorized();

        return Ok(new { status = "success" });
    }
}
