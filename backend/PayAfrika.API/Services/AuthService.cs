using Microsoft.EntityFrameworkCore;
using PayAfrika.API.Data;
using PayAfrika.API.DTOs;
using PayAfrika.API.Models;

namespace PayAfrika.API.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly IJwtService _jwt;

    public AuthService(AppDbContext db, IJwtService jwt)
    {
        _db = db;
        _jwt = jwt;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        if (await _db.Users.AnyAsync(u => u.Email == request.Email))
            throw new InvalidOperationException("Email already registered.");

        var user = new User
        {
            FullName = request.FullName,
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            PhoneNumber = request.PhoneNumber,
            Country = request.Country,
            Role = request.Role,
        };

        _db.Users.Add(user);

        var wallet = new Wallet
        {
            UserId = user.Id,
            Currency = "ZAR",
            Balance = 0,
        };

        _db.Wallets.Add(wallet);
        await _db.SaveChangesAsync();

        var (token, expiresAt) = _jwt.GenerateToken(user);

        return new AuthResponse
        {
            Token = token,
            RefreshToken = _jwt.GenerateRefreshToken(),
            ExpiresAt = expiresAt,
            User = MapUserInfo(user),
        };
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == request.Email)
            ?? throw new UnauthorizedAccessException("Invalid email or password.");

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            throw new UnauthorizedAccessException("Invalid email or password.");

        var (token, expiresAt) = _jwt.GenerateToken(user);

        return new AuthResponse
        {
            Token = token,
            RefreshToken = _jwt.GenerateRefreshToken(),
            ExpiresAt = expiresAt,
            User = MapUserInfo(user),
        };
    }

    public async Task<UserInfo> GetUserByIdAsync(Guid userId)
    {
        var user = await _db.Users.FindAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");
        return MapUserInfo(user);
    }

    public Task<bool> VerifyEmailAsync(string email, string code)
    {
        return Task.FromResult(true);
    }

    public Task<bool> ForgotPasswordAsync(string email)
    {
        return Task.FromResult(true);
    }

    public Task<bool> ResetPasswordAsync(string token, string newPassword)
    {
        return Task.FromResult(true);
    }

    private static UserInfo MapUserInfo(User user) => new()
    {
        Id = user.Id,
        FullName = user.FullName,
        Email = user.Email,
        Role = user.Role,
        KYCStatus = user.KYCStatus,
        AvatarUrl = user.AvatarUrl,
        IsEmailVerified = user.IsEmailVerified,
    };
}
