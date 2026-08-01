using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PayAfrika.API.Data;
using PayAfrika.API.DTOs;
using PayAfrika.API.Services;
using PayAfrika.API.Services.Security;

namespace PayAfrika.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TransfersController : ControllerBase
{
    private readonly ITransferService _transferService;
    private readonly ISecurityService _security;
    private readonly AppDbContext _db;

    private const decimal HighRiskThreshold = 50000m;

    public TransfersController(ITransferService transferService, ISecurityService security, AppDbContext db)
    {
        _transferService = transferService;
        _security = security;
        _db = db;
    }

    private Guid GetUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.Parse(claim!);
    }

    [HttpPost("quote")]
    public async Task<ActionResult<TransferQuoteResponse>> Quote([FromBody] TransferQuoteRequest request)
    {
        return Ok(await _transferService.QuoteAsync(request.CountryCode, request.Currency, request.Amount));
    }

    [HttpPost("otp")]
    public async Task<ActionResult> SendOtp([FromBody] OtpSendRequest request)
    {
        var userId = GetUserId();
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return NotFound();

        var channel = user.TwoFactorEnabled && user.TwoFactorMethod != "none" ? user.TwoFactorMethod : "email";
        await _security.CreateAndSendOtpAsync(userId, "transaction", channel);
        return Ok(new { message = "Verification code sent.", expiresInSeconds = 300 });
    }

    [HttpPost("otp/verify")]
    public async Task<ActionResult<TransactionOtpVerifyResponse>> VerifyOtp([FromBody] OtpVerifyRequest request)
    {
        var userId = GetUserId();
        try
        {
            var token = await _security.ValidateOtpAsync(userId, "transaction", request.Code);
            return Ok(new TransactionOtpVerifyResponse
            {
                Success = true,
                ChallengeId = token.Id.ToString(),
                AttemptsRemaining = token.MaxAttempts - token.Attempts,
                Message = "Code verified. You can now complete your transfer.",
            });
        }
        catch (InvalidOperationException ex)
        {
            var pending = await _db.SecurityTokens
                .Where(t => t.UserId == userId && t.Purpose == "transaction" && !t.IsConsumed)
                .OrderByDescending(t => t.CreatedAt)
                .FirstOrDefaultAsync();

            return BadRequest(new TransactionOtpVerifyResponse
            {
                Success = false,
                AttemptsRemaining = pending != null ? pending.MaxAttempts - pending.Attempts : 0,
                Message = ex.Message,
            });
        }
    }

    [HttpPost]
    public async Task<ActionResult<BankTransferResponse>> Initiate([FromBody] InitiateBankTransferRequest request)
    {
        try
        {
            var userId = GetUserId();
            var user = await _db.Users.FindAsync(userId);
            if (user == null) return Unauthorized();

            var requiresOtp = user.TwoFactorEnabled || request.Amount >= HighRiskThreshold;

            if (requiresOtp)
            {
                var otpProvided = !string.IsNullOrWhiteSpace(request.OtpCode);
                var challengeProvided = !string.IsNullOrWhiteSpace(request.OtpChallengeId);

                if (!challengeProvided && !otpProvided)
                    return BadRequest(new { error = "Transaction verification is required for this transfer.", requiresOtp = true });

                if (otpProvided)
                {
                    var validated = await _security.ValidateOtpAsync(userId, "transaction", request.OtpCode!);
                    request.OtpChallengeId = validated.Id.ToString();
                }
                else if (Guid.TryParse(request.OtpChallengeId, out var challengeId))
                {
                    var challenge = await _db.SecurityTokens
                        .FirstOrDefaultAsync(t => t.Id == challengeId && t.UserId == userId &&
                            t.Purpose == "transaction" && t.IsConsumed && t.VerifiedAt.HasValue);
                    if (challenge == null)
                        return BadRequest(new { error = "Transaction verification is invalid or expired.", requiresOtp = true });
                }
                else
                {
                    return BadRequest(new { error = "Transaction verification is invalid.", requiresOtp = true });
                }
            }

            var result = await _transferService.InitiateAsync(userId, request);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet]
    public async Task<ActionResult<List<BankTransferResponse>>> GetHistory()
    {
        return Ok(await _transferService.GetHistoryAsync(GetUserId()));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<BankTransferResponse>> Get(Guid id)
    {
        var transfer = await _transferService.GetAsync(GetUserId(), id);
        if (transfer == null) return NotFound(new { error = "Transfer not found." });
        return Ok(transfer);
    }

    [HttpPost("{id}/reverse")]
    public async Task<ActionResult<BankTransferResponse>> Reverse(Guid id, [FromBody] ReverseTransferRequest request)
    {
        try
        {
            var transfer = await _transferService.ReverseAsync(GetUserId(), id, request?.Reason, isAdmin: false);
            if (transfer == null) return NotFound(new { error = "Transfer not found." });
            return Ok(transfer);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("receive-account")]
    public async Task<ActionResult<ReceiveAccountResponse>> GetReceiveAccount()
    {
        try
        {
            return Ok(await _transferService.GetReceiveAccountAsync(GetUserId()));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("pin/status")]
    public async Task<ActionResult<object>> GetPinStatus()
    {
        return Ok(new { hasPin = await _transferService.HasPinAsync(GetUserId()) });
    }

    [HttpPut("pin")]
    public async Task<ActionResult> SetPin([FromBody] SetTransferPinRequest request)
    {
        try
        {
            await _transferService.SetPinAsync(GetUserId(), request.Pin);
            return Ok(new { message = "Transaction PIN set successfully." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}
