using Microsoft.EntityFrameworkCore;
using PayAfrika.API.Data;
using PayAfrika.API.DTOs;
using PayAfrika.API.Models;

namespace PayAfrika.API.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly IJwtService _jwt;

    private static readonly HashSet<string> ReservedUsernames = new(StringComparer.OrdinalIgnoreCase)
    {
        "payafrika.admin", "payafrika.support", "payafrika.payafrika",
        "payafrika.system", "payafrika.noreply", "payafrika.info",
        "payafrika.help", "payafrika.test", "payafrika.demo",
        "admin", "support", "system", "root", "superuser",
    };

    public AuthService(AppDbContext db, IJwtService jwt)
    {
        _db = db;
        _jwt = jwt;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        if (await _db.Users.AnyAsync(u => u.Email == request.Email))
            throw new InvalidOperationException("Email already registered.");

        var nameParts = request.FullName.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var firstName = nameParts.Length > 0 ? nameParts[0] : "user";
        var lastName = nameParts.Length > 1 ? nameParts[^1] : "";

        var username = await GenerateUniqueUsernameAsync(firstName, lastName);

        var user = new User
        {
            FullName = request.FullName,
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            PhoneNumber = request.PhoneNumber,
            Country = request.Country,
            Role = request.Role,
            Username = username,
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

    public async Task<List<UsernameSearchResult>> SearchUsersAsync(string query, int limit = 10)
    {
        if (string.IsNullOrWhiteSpace(query) || query.Length < 2)
            return new List<UsernameSearchResult>();

        var q = query.ToLower().Trim();
        return await _db.Users
            .Where(u => (u.Username != null && u.Username.Contains(q)) ||
                        u.FullName.ToLower().Contains(q))
            .Take(limit)
            .Select(u => new UsernameSearchResult
            {
                Id = u.Id,
                FullName = u.FullName,
                Username = u.Username ?? "",
                AvatarUrl = u.AvatarUrl,
                Role = u.Role,
            })
            .ToListAsync();
    }

    public async Task<UsernameCheckResponse> CheckUsernameAsync(string username)
    {
        var normalized = NormalizeUsername(username);

        if (ReservedUsernames.Contains(normalized))
        {
            return new UsernameCheckResponse
            {
                IsAvailable = false,
                Username = normalized,
                Suggestion = await GenerateUniqueUsernameAsync("user", ""),
            };
        }

        var exists = await _db.Users.AnyAsync(u => u.Username == normalized);
        if (exists)
        {
            return new UsernameCheckResponse
            {
                IsAvailable = false,
                Username = normalized,
                Suggestion = await GenerateUniqueUsernameAsync("user", ""),
            };
        }

        return new UsernameCheckResponse
        {
            IsAvailable = true,
            Username = normalized,
        };
    }

    public async Task<string> GenerateUniqueUsernameAsync(string firstName, string lastName)
    {
        var baseName = SanitizeForUsername(firstName);
        if (string.IsNullOrEmpty(baseName))
            baseName = "user";

        var candidate = $"@payafrika.{baseName}";

        if (!ReservedUsernames.Contains(candidate) && !await _db.Users.AnyAsync(u => u.Username == candidate))
            return candidate;

        if (!string.IsNullOrEmpty(lastName))
        {
            var withLast = $"@payafrika.{baseName}.{SanitizeForUsername(lastName)}";
            if (!ReservedUsernames.Contains(withLast) && !await _db.Users.AnyAsync(u => u.Username == withLast))
                return withLast;
        }

        for (int i = 2; i <= 9999; i++)
        {
            var withNumber = $"@payafrika.{baseName}{i}";
            if (!ReservedUsernames.Contains(withNumber) && !await _db.Users.AnyAsync(u => u.Username == withNumber))
                return withNumber;
        }

        return $"@payafrika.{baseName}{Guid.NewGuid().ToString("N")[..6]}";
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

    private static string SanitizeForUsername(string input)
    {
        return new string(input.ToLower()
            .Where(c => char.IsLetter(c) || c == '_' || c == '.')
            .ToArray());
    }

    private static string NormalizeUsername(string username)
    {
        var trimmed = username.Trim().ToLower();
        if (!trimmed.StartsWith("@payafrika."))
            trimmed = $"@payafrika.{trimmed.Replace("@payafrika.", "")}";
        return trimmed;
    }

    private static UserInfo MapUserInfo(User user) => new()
    {
        Id = user.Id,
        FullName = user.FullName,
        Username = user.Username,
        Email = user.Email,
        Role = user.Role,
        KYCStatus = user.KYCStatus,
        AvatarUrl = user.AvatarUrl,
        IsEmailVerified = user.IsEmailVerified,
    };
}
