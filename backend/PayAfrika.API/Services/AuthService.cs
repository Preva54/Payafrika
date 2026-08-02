using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using PayAfrika.API.Data;
using PayAfrika.API.DTOs;
using PayAfrika.API.Models;
using PayAfrika.API.Services.Security;

namespace PayAfrika.API.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly IJwtService _jwt;
    private readonly ISecurityService _security;
    private readonly IDeviceFingerprintService _fingerprints;
    private readonly ILoginRiskService _loginRisk;
    private readonly IAuditService _audit;
    private readonly IEmailService _email;
    private readonly IHttpContextAccessor _httpContextAccessor;

    private static readonly HashSet<string> ReservedUsernames = new(StringComparer.OrdinalIgnoreCase)
    {
        "payafrika.admin", "payafrika.support", "payafrika.payafrika",
        "payafrika.system", "payafrika.noreply", "payafrika.info",
        "payafrika.help", "payafrika.test", "payafrika.demo",
        "admin", "support", "system", "root", "superuser",
    };

    private const int MaxFailedLogins = 5;
    private static readonly TimeSpan LockoutDuration = TimeSpan.FromMinutes(15);

    public AuthService(
        AppDbContext db,
        IJwtService jwt,
        ISecurityService security,
        IDeviceFingerprintService fingerprints,
        ILoginRiskService loginRisk,
        IAuditService audit,
        IEmailService email,
        IHttpContextAccessor httpContextAccessor)
    {
        _db = db;
        _jwt = jwt;
        _security = security;
        _fingerprints = fingerprints;
        _loginRisk = loginRisk;
        _audit = audit;
        _email = email;
        _httpContextAccessor = httpContextAccessor;
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

        await _security.CreateNotificationAsync(user.Id, "security",
            "Welcome to PayAfrika",
            "Your account has been created. Complete your KYC to unlock your full limits.");

        if (!string.IsNullOrWhiteSpace(user.Email))
        {
            try
            {
                await _security.CreateAndSendOtpAsync(user.Id, "email_verify", "email");
            }
            catch
            {
                // Email delivery failures must not block registration
            }
        }

        await _audit.LogAsync(new AuditLogEntry
        {
            UserId = user.Id,
            UserName = user.Username ?? user.FullName,
            UserRole = user.Role,
            Email = user.Email,
            Action = "user_registered",
            Module = "auth",
            Resource = "user",
            ResourceId = user.Id.ToString(),
        });

        var (token, expiresAt) = _jwt.GenerateToken(user);

        return new AuthResponse
        {
            Token = token,
            RefreshToken = _jwt.GenerateRefreshToken(),
            ExpiresAt = expiresAt,
            User = MapUserInfo(user),
        };
    }

    public async Task<LoginResult> LoginAsync(LoginRequest request)
    {
        var httpContext = _httpContextAccessor.HttpContext;
        var fingerprint = httpContext != null ? _fingerprints.Capture(httpContext) : new DeviceFingerprint();
        var ip = httpContext?.Connection.RemoteIpAddress?.ToString() ?? "";
        var userAgent = httpContext?.Request.Headers.UserAgent.FirstOrDefault() ?? "";

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            if (user != null)
            {
                user.FailedLoginCount++;
                if (user.FailedLoginCount >= MaxFailedLogins)
                    user.LockedUntil = DateTime.UtcNow.Add(LockoutDuration);
                await _db.SaveChangesAsync();
            }

            await _audit.LogAsync(new AuditLogEntry
            {
                UserId = user?.Id,
                Email = request.Email,
                Action = "login_failed",
                Module = "auth",
                Resource = "login",
                IPAddress = ip,
                UserAgent = userAgent,
                Browser = _fingerprints.ResolveBrowser(userAgent),
                OperatingSystem = _fingerprints.ResolveOs(userAgent),
                DeviceType = _fingerprints.ResolveDeviceType(userAgent),
                Result = "error",
                Severity = "warning",
                IsSecurityAlert = true,
                Metadata = $"{{\"reason\":\"invalid_credentials\"}}",
            });
            throw new UnauthorizedAccessException("Invalid email or password.");
        }

        if (user.LockedUntil.HasValue && user.LockedUntil > DateTime.UtcNow)
        {
            var minutes = (int)Math.Ceiling((user.LockedUntil.Value - DateTime.UtcNow).TotalMinutes);
            throw new UnauthorizedAccessException($"Account temporarily locked. Try again in {minutes} minute(s).");
        }

        user.FailedLoginCount = 0;
        user.LockedUntil = null;
        await _db.SaveChangesAsync();

        var lastDevice = await _db.ConnectedDevices
            .Where(d => d.UserId == user.Id)
            .OrderByDescending(d => d.LastActiveAt)
            .FirstOrDefaultAsync();
        var lastIp = lastDevice?.IPAddress;
        var lastHash = lastDevice?.DeviceId;

        var risk = await _loginRisk.AssessAsync(_db, user.Id, fingerprint, ip, lastHash, lastIp);

        var requiresChallenge = user.TwoFactorEnabled || risk.RequiresChallenge || risk.IsNewDevice;

        if (!requiresChallenge)
        {
            await RecordSuccessfulLoginAsync(user, fingerprint, ip, userAgent, risk.RiskScore);
            var (token, expiresAt) = _jwt.GenerateToken(user);
            return new LoginResult
            {
                RequiresChallenge = false,
                Auth = new AuthResponse
                {
                    Token = token,
                    RefreshToken = _jwt.GenerateRefreshToken(),
                    ExpiresAt = expiresAt,
                    User = MapUserInfo(user),
                },
            };
        }

        var channel = user.TwoFactorEnabled && user.TwoFactorMethod != "none"
            ? user.TwoFactorMethod
            : risk.RiskScore >= 60
                ? "sms"
                : "email";

        SecurityToken otpToken;
        try
        {
            otpToken = await _security.CreateAndSendOtpAsync(user.Id, "login", channel);
        }
        catch
        {
            otpToken = await _security.CreateAndSendOtpAsync(user.Id, "login", "email");
        }

        var message = risk.IsNewDevice
            ? "We noticed a new device. Verify your identity to continue."
            : user.TwoFactorEnabled
                ? "Enter your two-factor authentication code."
                : "Enter the verification code to continue.";

        await _audit.LogAsync(new AuditLogEntry
        {
            UserId = user.Id,
            UserName = user.Username ?? user.FullName,
            UserRole = user.Role,
            Email = user.Email,
            Action = "login_challenge_issued",
            Module = "auth",
            Resource = "login",
            IPAddress = ip,
            UserAgent = userAgent,
            Browser = _fingerprints.ResolveBrowser(userAgent),
            OperatingSystem = _fingerprints.ResolveOs(userAgent),
            DeviceType = _fingerprints.ResolveDeviceType(userAgent),
            Metadata = $"{{\"channel\":\"{channel}\",\"risk_score\":{risk.RiskScore},\"flags\":[{string.Join(",", risk.Flags.Select(f => $"\"{f}\""))}]}}",
        });

        return new LoginResult
        {
            RequiresChallenge = true,
            Challenge = new LoginChallengeResponse
            {
                RequiresOtp = true,
                ChallengeId = otpToken.Id.ToString(),
                Channel = channel,
                ExpiresInSeconds = 300,
                MaxAttempts = otpToken.MaxAttempts,
                Message = message,
                RiskScore = risk.RiskScore,
                IsNewDevice = risk.IsNewDevice,
                NewDeviceDisplayName = fingerprint.DeviceName ?? "New device",
                RecoveryCodeHint = user.TwoFactorEnabled ? "Use a recovery code if you can't receive codes." : null,
            },
        };
    }

    public async Task<AuthResponse> VerifyLoginAsync(LoginVerifyRequest request)
    {
        var httpContext = _httpContextAccessor.HttpContext;
        var fingerprint = httpContext != null ? _fingerprints.Capture(httpContext) : new DeviceFingerprint();
        var ip = httpContext?.Connection.RemoteIpAddress?.ToString() ?? "";
        var userAgent = httpContext?.Request.Headers.UserAgent.FirstOrDefault() ?? "";

        if (!Guid.TryParse(request.ChallengeId, out var challengeId))
            throw new InvalidOperationException("Invalid challenge.");

        var token = await _db.SecurityTokens
            .Where(t => t.Id == challengeId && t.Purpose == "login" && !t.IsConsumed && t.ExpiresAt > DateTime.UtcNow)
            .FirstOrDefaultAsync()
            ?? throw new InvalidOperationException("Challenge expired. Sign in again.");

        var user = await _db.Users.FindAsync(token.UserId)
            ?? throw new UnauthorizedAccessException("Invalid email or password.");

        var isRecoveryCode = false;
        if (user.TwoFactorEnabled && _security.ValidateRecoveryCode(user, request.Code))
        {
            isRecoveryCode = true;
            await ConsumeRecoveryCodeAsync(user, request.Code);
        }
        else
        {
            var validated = await _security.ValidateOtpAsync(user.Id, "login", request.Code);
            token.Attempts = validated.Attempts;
            token.IsConsumed = validated.IsConsumed;
            token.VerifiedAt = validated.VerifiedAt;
            await _db.SaveChangesAsync();
        }

        if (!isRecoveryCode)
        {
            token.IsConsumed = true;
            token.VerifiedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }

        await RecordSuccessfulLoginAsync(user, fingerprint, ip, userAgent, 0);

        await _audit.LogAsync(new AuditLogEntry
        {
            UserId = user.Id,
            UserName = user.Username ?? user.FullName,
            UserRole = user.Role,
            Email = user.Email,
            Action = isRecoveryCode ? "login_with_recovery_code" : "login_otp_verified",
            Module = "auth",
            Resource = "login",
            IPAddress = ip,
            UserAgent = userAgent,
            Browser = _fingerprints.ResolveBrowser(userAgent),
            OperatingSystem = _fingerprints.ResolveOs(userAgent),
            DeviceType = _fingerprints.ResolveDeviceType(userAgent),
            Result = "success",
            IsSecurityAlert = isRecoveryCode,
            Metadata = $"{{\"channel\":\"{token.Channel}\",\"recovery_code\":{isRecoveryCode.ToString().ToLowerInvariant()}}}",
        });

        var (jwt, expiresAt) = _jwt.GenerateToken(user);
        return new AuthResponse
        {
            Token = jwt,
            RefreshToken = _jwt.GenerateRefreshToken(),
            ExpiresAt = expiresAt,
            User = MapUserInfo(user),
        };
    }

    public async Task<LoginChallengeResponse> ResendLoginCodeAsync(string challengeId)
    {
        if (!Guid.TryParse(challengeId, out var id))
            throw new InvalidOperationException("Invalid challenge.");

        var token = await _db.SecurityTokens
            .Where(t => t.Id == id && t.Purpose == "login" && !t.IsConsumed)
            .FirstOrDefaultAsync()
            ?? throw new InvalidOperationException("Challenge expired. Sign in again.");

        var user = await _db.Users.FindAsync(token.UserId)
            ?? throw new UnauthorizedAccessException("Invalid email or password.");

        var fresh = await _security.ResendOtpAsync(user.Id, "login", challengeId);

        return new LoginChallengeResponse
        {
            RequiresOtp = true,
            ChallengeId = fresh.Id.ToString(),
            Channel = fresh.Channel,
            ExpiresInSeconds = 300,
            MaxAttempts = fresh.MaxAttempts,
            Message = $"A new code has been sent to your {fresh.Channel}.",
            RecoveryCodeHint = user.TwoFactorEnabled ? "Use a recovery code if you can't receive codes." : null,
        };
    }

    public async Task<bool> VerifyEmailAsync(string email, string code)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email)
            ?? throw new UnauthorizedAccessException("Account not found.");

        await _security.ValidateOtpAsync(user.Id, "email_verify", code);

        user.IsEmailVerified = true;
        await _db.SaveChangesAsync();

        await _audit.LogAsync(new AuditLogEntry
        {
            UserId = user.Id,
            Email = user.Email,
            Action = "email_verified",
            Module = "auth",
            Resource = "email",
            ResourceId = user.Id.ToString(),
            Result = "success",
        });

        return true;
    }

    public async Task<bool> ForgotPasswordAsync(string email)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user == null)
        {
            // No user enumeration: still return success
            await _audit.LogAsync(new AuditLogEntry
            {
                Email = email,
                Action = "password_reset_requested",
                Module = "auth",
                Resource = "password",
                Result = "error",
                Metadata = $"{{\"reason\":\"no_account\"}}",
            });
            return true;
        }

        var token = new SecurityToken
        {
            UserId = user.Id,
            Purpose = "password_reset",
            Channel = "email",
            CodeHash = _security.HashCode(_security.RandomOtp()),
            ExpiresAt = DateTime.UtcNow.AddMinutes(30),
            MaxAttempts = 1,
        };
        _db.SecurityTokens.Add(token);
        await _db.SaveChangesAsync();

        await _email.SendPasswordResetAsync(user.Email, token.Id.ToString(), token.ExpiresAt);

        await _security.CreateNotificationAsync(user.Id, "security",
            "Password reset requested",
            "We sent a password reset link to your email. It expires in 30 minutes.");

        await _audit.LogAsync(new AuditLogEntry
        {
            UserId = user.Id,
            Email = user.Email,
            Action = "password_reset_requested",
            Module = "auth",
            Resource = "password",
            Result = "success",
            IsSecurityAlert = true,
        });

        return true;
    }

    public async Task<bool> ResetPasswordAsync(string token, string newPassword)
    {
        if (!Guid.TryParse(token, out var tokenId))
            throw new InvalidOperationException("Invalid reset token.");

        var securityToken = await _db.SecurityTokens
            .FirstOrDefaultAsync(t => t.Id == tokenId && t.Purpose == "password_reset" && !t.IsConsumed)
            ?? throw new InvalidOperationException("Invalid or expired reset token.");

        if (securityToken.ExpiresAt < DateTime.UtcNow)
            throw new InvalidOperationException("Reset link has expired. Request a new one.");

        var user = await _db.Users.FindAsync(securityToken.UserId)
            ?? throw new UnauthorizedAccessException("Account not found.");

        if (newPassword.Length < 8)
            throw new InvalidOperationException("Password must be at least 8 characters.");

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        user.FailedLoginCount = 0;
        user.LockedUntil = null;
        securityToken.IsConsumed = true;
        securityToken.VerifiedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        await _audit.LogAsync(new AuditLogEntry
        {
            UserId = user.Id,
            Email = user.Email,
            Action = "password_reset",
            Module = "auth",
            Resource = "password",
            Result = "success",
            IsSecurityAlert = true,
        });

        await _security.CreateNotificationAsync(user.Id, "security",
            "Password changed",
            "Your password was changed using a reset link. If this wasn't you, contact support immediately.");

        return true;
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

    private async Task RecordSuccessfulLoginAsync(User user, DeviceFingerprint fingerprint, string ip, string userAgent, int riskScore)
    {
        var now = DateTime.UtcNow;

        var device = fingerprint?.DeviceId != null
            ? await _db.ConnectedDevices.FirstOrDefaultAsync(d => d.UserId == user.Id && d.DeviceId == fingerprint.DeviceId)
            : null;

        var isNewDevice = device == null;

        if (device == null)
        {
            device = new ConnectedDevice
            {
                UserId = user.Id,
                DeviceName = fingerprint?.DeviceName ?? "Web browser",
                DeviceType = fingerprint?.DeviceType ?? "web",
                DeviceId = fingerprint?.DeviceId,
                Browser = fingerprint?.Browser ?? _fingerprints.ResolveBrowser(userAgent),
                OS = _fingerprints.ResolveOs(userAgent),
                IPAddress = ip,
                Location = _fingerprints.ResolveLocation(ip),
                ScreenResolution = fingerprint?.ScreenResolution,
                BrowserLanguage = fingerprint?.BrowserLanguage,
                TimeZone = fingerprint?.TimeZone,
                RiskScore = riskScore,
                IsCurrent = true,
            };
            _db.ConnectedDevices.Add(device);
        }
        else
        {
            device.Browser = fingerprint?.Browser ?? _fingerprints.ResolveBrowser(userAgent);
            device.OS = _fingerprints.ResolveOs(userAgent);
            device.IPAddress = ip;
            device.ScreenResolution = fingerprint?.ScreenResolution;
            device.BrowserLanguage = fingerprint?.BrowserLanguage;
            device.TimeZone = fingerprint?.TimeZone;
            device.LastLoginAt = now;
            device.LastActiveAt = now;
            device.IsCurrent = true;
        }

        var otherDevices = await _db.ConnectedDevices
            .Where(d => d.UserId == user.Id && d.Id != device.Id && d.IsCurrent)
            .ToListAsync();
        foreach (var other in otherDevices)
            other.IsCurrent = false;

        _db.ActivityLogs.Add(new ActivityLog
        {
            UserId = user.Id,
            Action = "login",
            Category = "security",
            Details = $"Signed in from {device.DeviceName}" + (isNewDevice ? " (new device)" : ""),
            IPAddress = ip,
            UserAgent = userAgent,
            DeviceId = device.DeviceId,
            RiskScore = riskScore,
        });

        if (isNewDevice)
        {
            await _security.CreateNotificationAsync(user.Id, "security",
                "New device signed in",
                $"{device.DeviceName} signed in from {_fingerprints.ResolveLocation(ip)}. Not you? Change your password immediately.");
        }

        await _db.SaveChangesAsync();
    }

    private async Task ConsumeRecoveryCodeAsync(User user, string code)
    {
        if (string.IsNullOrWhiteSpace(user.BackupCodesHash)) return;

        var normalized = code.Trim().Replace("-", "").Replace(" ", "").ToUpperInvariant();
        var hashes = user.BackupCodesHash.Split(';', StringSplitOptions.RemoveEmptyEntries).ToList();
        var target = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(
            System.Text.Encoding.UTF8.GetBytes(normalized))).ToLowerInvariant();

        var remaining = hashes.Where(h => h != target).ToList();
        user.BackupCodesHash = remaining.Count > 0 ? string.Join(";", remaining) : null;
        await _db.SaveChangesAsync();
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
        KycLevel = user.KycLevel,
        Country = user.Country,
        AvatarUrl = user.AvatarUrl,
        IsEmailVerified = user.IsEmailVerified,
    };
}
