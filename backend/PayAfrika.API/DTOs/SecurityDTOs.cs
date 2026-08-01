using System.ComponentModel.DataAnnotations;

namespace PayAfrika.API.DTOs;

public class DeviceFingerprint
{
    [MaxLength(200)]
    public string? DeviceId { get; set; }

    [MaxLength(200)]
    public string? DeviceName { get; set; }

    [MaxLength(50)]
    public string? DeviceType { get; set; } // web, mobile, tablet, desktop

    [MaxLength(100)]
    public string? Browser { get; set; }

    [MaxLength(50)]
    public string? IPAddress { get; set; }

    [MaxLength(30)]
    public string? ScreenResolution { get; set; }

    [MaxLength(20)]
    public string? BrowserLanguage { get; set; }

    [MaxLength(100)]
    public string? TimeZone { get; set; }
}

public class LoginChallengeResponse
{
    public bool RequiresOtp { get; set; }
    public string? ChallengeId { get; set; }
    public string? Channel { get; set; }
    public int ExpiresInSeconds { get; set; } = 300;
    public int MaxAttempts { get; set; } = 5;
    public string Message { get; set; } = string.Empty;
    public int RiskScore { get; set; }
    public bool IsNewDevice { get; set; }
    public string? NewDeviceDisplayName { get; set; }
    public string? RecoveryCodeHint { get; set; }
}

public class LoginVerifyRequest
{
    [Required]
    public string ChallengeId { get; set; } = string.Empty;

    [Required, MaxLength(20)]
    public string Code { get; set; } = string.Empty;
}

public class OtpSendRequest
{
    [Required]
    public string Purpose { get; set; } = string.Empty; // transaction, withdrawal, password_reset, email_verify, phone_verify, settings, kyc, new_device

    [MaxLength(3)]
    public string? CountryCode { get; set; }
}

public class OtpVerifyRequest
{
    [Required]
    public string Purpose { get; set; } = string.Empty;

    [Required, MaxLength(20)]
    public string Code { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Metadata { get; set; }
}

public class OtpVerifyResponse
{
    public bool Success { get; set; }
    public string? ChallengeId { get; set; }
    public int AttemptsRemaining { get; set; }
    public string Message { get; set; } = string.Empty;
    public bool IsNewDevice { get; set; }
    public string? Token { get; set; }
    public UserInfo? User { get; set; }
}

public class OtpResendRequest
{
    [Required]
    public string Purpose { get; set; } = string.Empty;

    public string? ChallengeId { get; set; }
}

public class LoginResendRequest
{
    [Required]
    public string ChallengeId { get; set; } = string.Empty;
}

public class TwoFactorEnableRequest
{
    [Required, MaxLength(20)]
    public string Code { get; set; } = string.Empty;

    [Required]
    public string Method { get; set; } = "authenticator"; // authenticator, sms, email
}

public class TwoFactorDisableRequest
{
    [Required]
    public string Password { get; set; } = string.Empty;

    [Required, MaxLength(20)]
    public string Code { get; set; } = string.Empty;
}

public class SecurityOverviewResponse
{
    public bool TwoFactorEnabled { get; set; }
    public string TwoFactorMethod { get; set; } = "none";
    public bool IsPhoneVerified { get; set; }
    public bool IsEmailVerified { get; set; }
    public int SecurityScore { get; set; }
    public int TrustedDevicesCount { get; set; }
    public int ActiveSessionsCount { get; set; }
    public int UnreadSecurityAlerts { get; set; }
    public DateTime? LastLoginAt { get; set; }
    public string? LastLoginLocation { get; set; }
    public int FailedLoginCount { get; set; }
    public bool HasRecoveryCodes { get; set; }
}

public class RecoveryCodesResponse
{
    public List<string> RecoveryCodes { get; set; } = new();
}

public class TrustDeviceRequest
{
    [MaxLength(200)]
    public string? DeviceId { get; set; }
}

public class AdminSecurityStatsResponse
{
    public int TotalLogins { get; set; }
    public int FailedLogins { get; set; }
    public int SuspiciousLogins { get; set; }
    public int NewDevices { get; set; }
    public int LockedAccounts { get; set; }
    public int OtpSent { get; set; }
    public int OtpFailed { get; set; }
    public int TwoFactorEnabledUsers { get; set; }
    public int FraudAlerts { get; set; }
}

public class AdminSecurityEventResponse
{
    public Guid Id { get; set; }
    public Guid? UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string Module { get; set; } = string.Empty;
    public string Result { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public string? IPAddress { get; set; }
    public string? DeviceId { get; set; }
    public string? Browser { get; set; }
    public string? OperatingSystem { get; set; }
    public string? Location { get; set; }
    public int? RiskScore { get; set; }
    public bool IsSecurityAlert { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class AdminOtpAttemptResponse
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Purpose { get; set; } = string.Empty;
    public string Channel { get; set; } = string.Empty;
    public int Attempts { get; set; }
    public int MaxAttempts { get; set; }
    public bool IsConsumed { get; set; }
    public DateTime? VerifiedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class AdminDeviceResponse
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string DeviceName { get; set; } = string.Empty;
    public string DeviceType { get; set; } = string.Empty;
    public string? DeviceId { get; set; }
    public string? Browser { get; set; }
    public string? OS { get; set; }
    public string? IPAddress { get; set; }
    public string? Location { get; set; }
    public bool IsTrusted { get; set; }
    public int RiskScore { get; set; }
    public DateTime? LastLoginAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class SecurityNotification
{
    public Guid Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
}
