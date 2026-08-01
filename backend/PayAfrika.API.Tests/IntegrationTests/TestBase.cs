using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using PayAfrika.API.Data;
using PayAfrika.API.Middleware;
using PayAfrika.API.Models;
using PayAfrika.API.Services;
using PayAfrika.API.Services.Security;

namespace PayAfrika.API.Tests.IntegrationTests;

public abstract class TestBase : IDisposable
{
    protected readonly AppDbContext Db;
    protected readonly IJwtService JwtService;
    protected readonly IAuthService AuthService;
    protected readonly ILoanService LoanService;
    protected readonly ISecurityService SecurityService;

    protected TestBase()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        Db = new AppDbContext(options);
        JwtService = new TestJwtService();
        SecurityService = new SecurityService(Db, new TotpService(), new NoopSmsService(), new NoopEmailService(), new TestAuditService(), JwtService);
        AuthService = new AuthService(Db, JwtService, SecurityService, new DeviceFingerprintService(), new LoginRiskService(), new TestAuditService(), new NoopEmailService(), new TestHttpContextAccessor());
        LoanService = new LoanService(Db);
    }

    protected void SeedUser(User user)
    {
        Db.Users.Add(user);
        Db.SaveChanges();
    }

    protected void SeedWallet(Wallet wallet)
    {
        Db.Wallets.Add(wallet);
        Db.SaveChanges();
    }

    protected void SetAuthHeader(ControllerBase controller, string userId, string role = "customer")
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId),
            new Claim(ClaimTypes.Role, role),
        };
        var identity = new ClaimsIdentity(claims, "test");
        var principal = new ClaimsPrincipal(identity);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = principal },
        };
    }

    protected ExceptionMiddleware CreateExceptionMiddleware(ILogger<ExceptionMiddleware>? logger = null)
    {
        logger ??= LoggerFactory.Create(b => { }).CreateLogger<ExceptionMiddleware>();
        return new ExceptionMiddleware(_ => throw new InvalidOperationException("Test exception"), logger);
    }

    protected SecurityHeadersMiddleware CreateSecurityHeadersMiddleware()
    {
        return new SecurityHeadersMiddleware(_ => Task.CompletedTask);
    }

    public void Dispose()
    {
        Db.Dispose();
        GC.SuppressFinalize(this);
    }
}

public class TestJwtService : IJwtService
{
    public (string token, DateTime expiresAt) GenerateToken(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes("test-key-at-least-32-characters-long-for-hmac!"));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expiresAt = DateTime.UtcNow.AddHours(1);

        var token = new JwtSecurityToken(
            issuer: "PayAfrika",
            audience: "PayAfrika",
            claims: new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Role, user.Role),
            },
            expires: expiresAt,
            signingCredentials: creds
        );

        return (new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
    }

    public string GenerateRefreshToken() => Guid.NewGuid().ToString("N");

    public Guid? ValidateToken(string token)
    {
        try
        {
            var handler = new JwtSecurityTokenHandler();
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes("test-key-at-least-32-characters-long-for-hmac!"));
            handler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = key,
                ValidateIssuer = true,
                ValidIssuer = "PayAfrika",
                ValidateAudience = true,
                ValidAudience = "PayAfrika",
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero,
            }, out _);
            return Guid.NewGuid();
        }
        catch
        {
            return null;
        }
    }
}

public class TestHttpContextAccessor : IHttpContextAccessor
{
    public HttpContext? HttpContext { get; set; } = BuildContext();

    private static HttpContext BuildContext()
    {
        var context = new DefaultHttpContext();
        context.Request.Headers["X-Device-Id"] = "test-device-1";
        context.Request.Headers["X-Screen-Resolution"] = "1920x1080";
        context.Request.Headers.AcceptLanguage = "en-NG";
        context.Request.Headers["X-Timezone"] = "Africa/Lagos";
        context.Request.Headers.UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0 Safari/537.36";
        return context;
    }
}

public class TestAuditService : IAuditService
{
    public List<AuditLogEntry> Entries { get; } = new();

    public Task LogAsync(AuditLogEntry entry)
    {
        Entries.Add(entry);
        return Task.CompletedTask;
    }

    public Task LogSecurityAlertAsync(AuditLogEntry entry)
    {
        Entries.Add(entry);
        return Task.CompletedTask;
    }
}

public class NoopSmsService : ISmsService
{
    public Task SendOtpAsync(string phoneNumber, string otp, string purpose, string? countryCode = null)
        => Task.CompletedTask;

    public Task SendGenericAsync(string phoneNumber, string message)
        => Task.CompletedTask;
}

public class NoopEmailService : IEmailService
{
    public Task SendOtpAsync(string to, string otp, string purpose, string? otpHint = null)
        => Task.CompletedTask;

    public Task SendPasswordResetAsync(string to, string resetToken, DateTime expiresAt)
        => Task.CompletedTask;

    public Task SendEmailVerificationAsync(string to, string otp)
        => Task.CompletedTask;

    public Task SendNewDeviceLoginAsync(string to, string deviceName, string location, string browser, DateTime loggedInAt)
        => Task.CompletedTask;

    public Task SendSecurityAlertAsync(string to, string subject, string message)
        => Task.CompletedTask;

    public Task SendGenericEmailAsync(string to, string subject, string title, string body, string ctaText = "", string ctaUrl = "")
        => Task.CompletedTask;
}
