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

namespace PayAfrika.API.Tests.IntegrationTests;

public abstract class TestBase : IDisposable
{
    protected readonly AppDbContext Db;
    protected readonly IJwtService JwtService;
    protected readonly IAuthService AuthService;
    protected readonly ILoanService LoanService;

    protected TestBase()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        Db = new AppDbContext(options);
        JwtService = new TestJwtService();
        AuthService = new AuthService(Db, JwtService);
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
