using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PayAfrika.API.Data;
using PayAfrika.API.DTOs;
using PayAfrika.API.Models;

namespace PayAfrika.API.Services.Security;

public interface ISecurityService
{
    Task<SecurityToken> CreateAndSendOtpAsync(Guid userId, string purpose, string channel, string? metadata = null, string? email = null, string? phone = null);
    Task<SecurityToken> ResendOtpAsync(Guid userId, string purpose, string? challengeId = null);
    Task<SecurityToken> ValidateOtpAsync(Guid userId, string purpose, string code);
    string HashCode(string code);
    string RandomOtp(int digits = 6);
    Task<TwoFactorSetupResponse> SetupTwoFactorAsync(Guid userId, string method);
    Task EnableTwoFactorAsync(Guid userId, TwoFactorEnableRequest request);
    Task DisableTwoFactorAsync(Guid userId, TwoFactorDisableRequest request);
    Task<List<string>> RegenerateRecoveryCodesAsync(Guid userId);
    bool ValidateRecoveryCode(User user, string code);
    Task<SecurityOverviewResponse> GetOverviewAsync(Guid userId);
    Task<Guid> CreateNotificationAsync(Guid userId, string type, string title, string message);
    Task MarkNotificationsReadAsync(Guid userId, Guid? id = null);
    Task<List<SecurityNotification>> GetNotificationsAsync(Guid userId);
    string EncryptSecret(string plaintext);
    string DecryptSecret(string ciphertext);
}

public class SecurityService : ISecurityService
{
    private readonly AppDbContext _db;
    private readonly ITotpService _totp;
    private readonly ISmsService _sms;
    private readonly IEmailService _email;
    private readonly IAuditService _audit;
    private readonly IJwtService _jwt;

    private const int OtpTtlMinutes = 5;
    private const int OtpMaxAttempts = 5;
    private const int OtpMaxResends = 3;

    public SecurityService(
        AppDbContext db,
        ITotpService totp,
        ISmsService sms,
        IEmailService email,
        IAuditService audit,
        IJwtService jwt)
    {
        _db = db;
        _totp = totp;
        _sms = sms;
        _email = email;
        _audit = audit;
        _jwt = jwt;
    }

    public async Task<SecurityToken> CreateAndSendOtpAsync(
        Guid userId, string purpose, string channel, string? metadata = null, string? email = null, string? phone = null)
    {
        var user = await _db.Users.FindAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");

        var existing = await _db.SecurityTokens
            .Where(t => t.UserId == userId && t.Purpose == purpose && !t.IsConsumed && t.ExpiresAt > DateTime.UtcNow)
            .OrderByDescending(t => t.CreatedAt)
            .FirstOrDefaultAsync();

        if (existing != null)
        {
            if (existing.ResentCount >= OtpMaxResends)
                throw new InvalidOperationException("Too many resend requests. Please wait for the current code to expire.");

            var newCode = RandomOtp();
            existing.ResentCount++;
            existing.Attempts = 0;
            existing.CodeHash = HashCode(newCode);
            existing.ExpiresAt = DateTime.UtcNow.AddMinutes(OtpTtlMinutes);
            await _db.SaveChangesAsync();
            await SendOtpAsync(user, purpose, newCode, channel, email, phone);
            return existing;
        }

        var code = RandomOtp();
        var token = new SecurityToken
        {
            UserId = userId,
            Purpose = purpose,
            Channel = channel,
            CodeHash = HashCode(code),
            ExpiresAt = DateTime.UtcNow.AddMinutes(OtpTtlMinutes),
            MaxAttempts = OtpMaxAttempts,
            Metadata = metadata ?? "{}",
        };

        _db.SecurityTokens.Add(token);
        await _db.SaveChangesAsync();
        await SendOtpAsync(user, purpose, code, channel, email, phone);
        return token;
    }

    public async Task<SecurityToken> ResendOtpAsync(Guid userId, string purpose, string? challengeId = null)
    {
        var query = _db.SecurityTokens.Where(t => t.UserId == userId && t.Purpose == purpose && !t.IsConsumed);
        if (!string.IsNullOrWhiteSpace(challengeId) && Guid.TryParse(challengeId, out var id))
            query = query.Where(t => t.Id == id);

        var token = await query.OrderByDescending(t => t.CreatedAt).FirstOrDefaultAsync()
            ?? throw new KeyNotFoundException("No active code found. Request a new one.");

        if (token.ResentCount >= OtpMaxResends)
            throw new InvalidOperationException("Too many resend requests. Please wait for the current code to expire.");

        if (token.ExpiresAt < DateTime.UtcNow)
            throw new InvalidOperationException("The current code has expired. Request a new one.");

        var newCode = RandomOtp();
        token.ResentCount++;
        token.Attempts = 0;
        token.CodeHash = HashCode(newCode);
        token.ExpiresAt = DateTime.UtcNow.AddMinutes(OtpTtlMinutes);
        await _db.SaveChangesAsync();

        var user = await _db.Users.FindAsync(userId)!;
        await SendOtpAsync(user!, token.Purpose, newCode, token.Channel, null, null);
        return token;
    }

    public async Task<SecurityToken> ValidateOtpAsync(Guid userId, string purpose, string code)
    {
        if (string.IsNullOrWhiteSpace(code))
            throw new InvalidOperationException("Verification code is required.");

        var token = await _db.SecurityTokens
            .Where(t => t.UserId == userId && t.Purpose == purpose && !t.IsConsumed)
            .OrderByDescending(t => t.CreatedAt)
            .FirstOrDefaultAsync()
            ?? throw new InvalidOperationException("No active code found. Request a new one.");

        if (token.Attempts >= token.MaxAttempts)
        {
            token.IsConsumed = true;
            await _db.SaveChangesAsync();
            throw new InvalidOperationException("Too many failed attempts. Request a new code.");
        }

        if (token.ExpiresAt < DateTime.UtcNow)
        {
            token.IsConsumed = true;
            await _db.SaveChangesAsync();
            throw new InvalidOperationException("Code has expired. Request a new one.");
        }

        token.Attempts++;
        await _db.SaveChangesAsync();

        if (token.Channel == "authenticator" && token.Purpose == "login")
        {
            var user = await _db.Users.FindAsync(userId);
            if (user?.TotpSecretEncrypted != null &&
                _totp.ValidateCode(DecryptSecret(user.TotpSecretEncrypted), code))
            {
                token.IsConsumed = true;
                token.VerifiedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();
                return token;
            }

            await _audit.LogAsync(new AuditLogEntry
            {
                UserId = userId,
                Action = "otp_verify_failed",
                Module = "otp",
                Resource = "otp",
                ResourceId = token.Id.ToString(),
                Metadata = $"{{\"purpose\":\"{purpose}\",\"channel\":\"authenticator\"}}",
                Result = "error",
                Severity = "warning",
                IsSecurityAlert = true
            });
            throw new InvalidOperationException($"Invalid code. {token.MaxAttempts - token.Attempts} attempts remaining.");
        }

        if (FixedTimeEquals(token.CodeHash, HashCode(code)))
        {
            token.IsConsumed = true;
            token.VerifiedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return token;
        }

        await _audit.LogAsync(new AuditLogEntry
        {
            UserId = userId,
            Action = "otp_verify_failed",
            Module = "otp",
            Resource = "otp",
            ResourceId = token.Id.ToString(),
            Metadata = $"{{\"purpose\":\"{purpose}\",\"channel\":\"{token.Channel}\"}}",
            Result = "error",
            Severity = "warning",
            IsSecurityAlert = true
        });
        throw new InvalidOperationException($"Invalid code. {token.MaxAttempts - token.Attempts} attempts remaining.");
    }

    public async Task<TwoFactorSetupResponse> SetupTwoFactorAsync(Guid userId, string method)
    {
        var user = await _db.Users.FindAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");

        if (user.TwoFactorEnabled)
            throw new InvalidOperationException("Two-factor authentication is already enabled.");

        var secret = _totp.GenerateSecret();
        user.TotpSecretEncrypted = EncryptSecret(secret);
        user.TwoFactorMethod = method;

        var recoveryCodes = GenerateRecoveryCodes(10);
        user.BackupCodesHash = HashRecoveryCodes(recoveryCodes);

        await _db.SaveChangesAsync();

        await _audit.LogAsync(new AuditLogEntry
        {
            UserId = userId,
            Action = "two_factor_setup_started",
            Module = "security",
            Resource = "user",
            ResourceId = userId.ToString(),
            Metadata = $"{{\"method\":\"{method}\"}}"
        });

        return new TwoFactorSetupResponse
        {
            SecretKey = secret,
            QrCodeUrl = _totp.BuildOtpAuthUrl(user.Email, secret, "PayAfrika"),
            RecoveryCodes = recoveryCodes
        };
    }

    public async Task EnableTwoFactorAsync(Guid userId, TwoFactorEnableRequest request)
    {
        var user = await _db.Users.FindAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");

        if (string.IsNullOrWhiteSpace(user.TotpSecretEncrypted))
            throw new InvalidOperationException("No pending two-factor setup found. Start setup first.");

        var codeOk = request.Method == "authenticator"
            ? _totp.ValidateCode(DecryptSecret(user.TotpSecretEncrypted), request.Code)
            : await ValidateChannelOtpAsync(userId, "two_factor_setup", request.Code);

        if (!codeOk)
            throw new InvalidOperationException("Invalid verification code.");

        user.TwoFactorEnabled = true;
        user.TwoFactorMethod = request.Method;
        await _db.SaveChangesAsync();

        await _audit.LogAsync(new AuditLogEntry
        {
            UserId = userId,
            Action = "two_factor_enabled",
            Module = "security",
            Resource = "user",
            ResourceId = userId.ToString(),
            PreviousValue = "disabled",
            NewValue = $"enabled:{request.Method}",
            IsSecurityAlert = true
        });

        await CreateNotificationAsync(userId, "security",
            "Two-factor authentication enabled",
            $"2FA is now active via {request.Method}. Keep your recovery codes safe.");
    }

    public async Task DisableTwoFactorAsync(Guid userId, TwoFactorDisableRequest request)
    {
        var user = await _db.Users.FindAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            await _audit.LogAsync(new AuditLogEntry
            {
                UserId = userId,
                Action = "two_factor_disable_failed",
                Module = "security",
                Resource = "user",
                ResourceId = userId.ToString(),
                Result = "error",
                Severity = "warning",
                IsSecurityAlert = true
            });
            throw new UnauthorizedAccessException("Incorrect password.");
        }

        var codeOk = user.TwoFactorMethod == "authenticator"
            ? _totp.ValidateCode(DecryptSecret(user.TotpSecretEncrypted ?? ""), request.Code)
            : await ValidateChannelOtpAsync(userId, "two_factor_disable", request.Code);

        if (!codeOk)
            throw new InvalidOperationException("Invalid verification code.");

        user.TwoFactorEnabled = false;
        user.TwoFactorMethod = "none";
        user.TotpSecretEncrypted = null;
        user.BackupCodesHash = null;
        await _db.SaveChangesAsync();

        await _audit.LogAsync(new AuditLogEntry
        {
            UserId = userId,
            Action = "two_factor_disabled",
            Module = "security",
            Resource = "user",
            ResourceId = userId.ToString(),
            PreviousValue = "enabled",
            NewValue = "disabled",
            IsSecurityAlert = true
        });

        await CreateNotificationAsync(userId, "security",
            "Two-factor authentication disabled",
            "Your account is now protected only by your password. Consider re-enabling 2FA.");
    }

    public async Task<List<string>> RegenerateRecoveryCodesAsync(Guid userId)
    {
        var user = await _db.Users.FindAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");

        if (!user.TwoFactorEnabled)
            throw new InvalidOperationException("Enable two-factor authentication first.");

        var codes = GenerateRecoveryCodes(10);
        user.BackupCodesHash = HashRecoveryCodes(codes);
        await _db.SaveChangesAsync();

        await _audit.LogAsync(new AuditLogEntry
        {
            UserId = userId,
            Action = "recovery_codes_regenerated",
            Module = "security",
            Resource = "user",
            ResourceId = userId.ToString(),
            IsSecurityAlert = true
        });

        return codes;
    }

    public bool ValidateRecoveryCode(User user, string code)
    {
        if (string.IsNullOrWhiteSpace(user.BackupCodesHash) || string.IsNullOrWhiteSpace(code))
            return false;

        var normalized = code.Trim().Replace("-", "").Replace(" ", "").ToUpperInvariant();
        if (!IsValidRecoveryCodeFormat(normalized)) return false;

        var hashes = user.BackupCodesHash.Split(';', StringSplitOptions.RemoveEmptyEntries);
        var target = HashRecoveryCode(normalized);

        return hashes.Any(h => FixedTimeEquals(h, target));
    }

    public async Task<SecurityOverviewResponse> GetOverviewAsync(Guid userId)
    {
        var user = await _db.Users.FindAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");

        var devices = await _db.ConnectedDevices.Where(d => d.UserId == userId).ToListAsync();
        var recentLogs = await _db.ActivityLogs
            .Where(a => a.UserId == userId && a.Action == "login")
            .OrderByDescending(a => a.CreatedAt)
            .FirstOrDefaultAsync();

        var score = 40;
        if (user.TwoFactorEnabled) score += 30;
        if (user.IsEmailVerified) score += 10;
        if (user.IsPhoneVerified) score += 10;
        if (devices.Any(d => d.IsTrusted)) score += 5;
        if (user.PasswordHash.Length >= 60) score += 5;
        if (score > 100) score = 100;

        return new SecurityOverviewResponse
        {
            TwoFactorEnabled = user.TwoFactorEnabled,
            TwoFactorMethod = user.TwoFactorMethod,
            IsPhoneVerified = user.IsPhoneVerified,
            IsEmailVerified = user.IsEmailVerified,
            SecurityScore = score,
            TrustedDevicesCount = devices.Count(d => d.IsTrusted),
            ActiveSessionsCount = await _db.SecurityTokens
                .CountAsync(t => t.UserId == userId && t.Purpose == "login" && !t.IsConsumed && t.ExpiresAt > DateTime.UtcNow),
            UnreadSecurityAlerts = await _db.InAppNotifications
                .CountAsync(n => n.UserId == userId && n.Type == "security" && !n.IsRead),
            LastLoginAt = recentLogs?.CreatedAt,
            LastLoginLocation = recentLogs?.IPAddress is null ? null : "Recent device",
            FailedLoginCount = user.FailedLoginCount,
            HasRecoveryCodes = !string.IsNullOrWhiteSpace(user.BackupCodesHash),
        };
    }

    public async Task<Guid> CreateNotificationAsync(Guid userId, string type, string title, string message)
    {
        var notification = new InAppNotification
        {
            UserId = userId,
            Type = type,
            Title = title,
            Message = message,
        };

        _db.InAppNotifications.Add(notification);
        await _db.SaveChangesAsync();
        return notification.Id;
    }

    public async Task MarkNotificationsReadAsync(Guid userId, Guid? id = null)
    {
        var query = _db.InAppNotifications.Where(n => n.UserId == userId && !n.IsRead);
        if (id.HasValue)
            query = query.Where(n => n.Id == id.Value);

        var notifications = await query.ToListAsync();
        foreach (var n in notifications)
        {
            n.IsRead = true;
            n.ReadAt = DateTime.UtcNow;
        }
        await _db.SaveChangesAsync();
    }

    public async Task<List<SecurityNotification>> GetNotificationsAsync(Guid userId)
        => await _db.InAppNotifications
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .Take(50)
            .Select(n => new SecurityNotification
            {
                Id = n.Id,
                Type = n.Type,
                Title = n.Title,
                Message = n.Message,
                IsRead = n.IsRead,
                CreatedAt = n.CreatedAt,
            })
            .ToListAsync();

    public string EncryptSecret(string plaintext)
    {
        if (string.IsNullOrWhiteSpace(plaintext)) return plaintext;
        var key = Encoding.UTF8.GetBytes(GetKey());
        using var aes = Aes.Create();
        aes.Key = key;
        aes.GenerateIV();
        using var encryptor = aes.CreateEncryptor(aes.Key, aes.IV);
        var plainBytes = Encoding.UTF8.GetBytes(plaintext);
        var cipherBytes = encryptor.TransformFinalBlock(plainBytes, 0, plainBytes.Length);
        var result = new byte[aes.IV.Length + cipherBytes.Length];
        Buffer.BlockCopy(aes.IV, 0, result, 0, aes.IV.Length);
        Buffer.BlockCopy(cipherBytes, 0, result, aes.IV.Length, cipherBytes.Length);
        return Convert.ToBase64String(result);
    }

    public string DecryptSecret(string ciphertext)
    {
        if (string.IsNullOrWhiteSpace(ciphertext)) return ciphertext;
        var key = Encoding.UTF8.GetBytes(GetKey());
        var allBytes = Convert.FromBase64String(ciphertext);
        var iv = allBytes.Take(16).ToArray();
        var cipherBytes = allBytes.Skip(16).ToArray();
        using var aes = Aes.Create();
        aes.Key = key;
        aes.IV = iv;
        using var decryptor = aes.CreateDecryptor(aes.Key, aes.IV);
        var plainBytes = decryptor.TransformFinalBlock(cipherBytes, 0, cipherBytes.Length);
        return Encoding.UTF8.GetString(plainBytes);
    }

    public string HashCode(string code) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(code))).ToLowerInvariant();

    public string RandomOtp(int digits = 6)
    {
        var bytes = RandomNumberGenerator.GetBytes(4);
        var value = BitConverter.ToUInt32(bytes, 0) % 1000000;
        return value.ToString($"D{digits}");
    }

    private async Task SendOtpAsync(User user, string purpose, string code, string channel, string? email, string? phone)
    {
        var toEmail = email ?? user.Email;
        var toPhone = phone ?? user.PhoneNumber;

        if (channel == "email")
        {
            await _email.SendOtpAsync(toEmail, code, purpose);
            await _audit.LogAsync(new AuditLogEntry
            {
                UserId = user.Id,
                Action = "otp_sent",
                Module = "otp",
                Resource = "otp",
                ResourceId = "email",
                Metadata = $"{{\"purpose\":\"{purpose}\",\"channel\":\"email\"}}"
            });
        }
        else if (channel == "sms")
        {
            if (string.IsNullOrWhiteSpace(toPhone))
                throw new InvalidOperationException("No phone number on file. Use a different verification method.");

            await _sms.SendOtpAsync(toPhone, code, purpose);
            await _audit.LogAsync(new AuditLogEntry
            {
                UserId = user.Id,
                Action = "otp_sent",
                Module = "otp",
                Resource = "otp",
                ResourceId = "sms",
                Metadata = $"{{\"purpose\":\"{purpose}\",\"channel\":\"sms\"}}"
            });
        }
    }

    private async Task<bool> ValidateChannelOtpAsync(Guid userId, string purpose, string code)
    {
        try
        {
            await ValidateOtpAsync(userId, purpose, code);
            return true;
        }
        catch
        {
            return false;
        }
    }

    private static List<string> GenerateRecoveryCodes(int count)
    {
        var codes = new List<string>(count);
        var bytes = new byte[6];
        for (var i = 0; i < count; i++)
        {
            RandomNumberGenerator.Fill(bytes);
            var value = BitConverter.ToUInt32(bytes, 0) % 1_000_000;
            var raw = value.ToString("D6");
            codes.Add($"{raw[..3]}-{raw[3..]}");
        }
        return codes;
    }

    private static string HashRecoveryCodes(IEnumerable<string> codes)
        => string.Join(";", codes.Select(HashRecoveryCode));

    private static string HashRecoveryCode(string code)
    {
        var normalized = code.Replace("-", "").ToUpperInvariant();
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(normalized))).ToLowerInvariant();
    }

    private static bool IsValidRecoveryCodeFormat(string normalized)
        => normalized.Length == 6 && normalized.All(char.IsDigit);

    private static string GetKey()
    {
        var env = Environment.GetEnvironmentVariable("PAYAFRIKA_SECURITY_KEY");
        if (!string.IsNullOrWhiteSpace(env) && env.Length >= 32)
            return env[..32];

        var fallback = "PayAfrika-2026-Security-Key-Change-Me!";
        return fallback.PadRight(32, '!')[..32];
    }

    private static bool FixedTimeEquals(string a, string b)
    {
        if (a.Length != b.Length) return false;
        var result = 0;
        for (var i = 0; i < a.Length; i++)
            result |= a[i] ^ b[i];
        return result == 0;
    }
}
