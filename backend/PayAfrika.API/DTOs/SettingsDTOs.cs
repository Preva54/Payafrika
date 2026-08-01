namespace PayAfrika.API.DTOs;

public class ProfileUpdateRequest
{
    public string? FullName { get; set; }
    public string? DisplayName { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Country { get; set; }
    public string? City { get; set; }
    public string? Address { get; set; }
    public string? PostalCode { get; set; }
    public string? Occupation { get; set; }
    public DateTime? DateOfBirth { get; set; }
}

public class ProfileResponse
{
    public string Id { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? DisplayName { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Country { get; set; }
    public string? City { get; set; }
    public string? Address { get; set; }
    public string? PostalCode { get; set; }
    public string? Occupation { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? AvatarUrl { get; set; }
    public string Role { get; set; } = string.Empty;
    public string? KYCStatus { get; set; }
    public bool IsEmailVerified { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ChangePasswordRequest
{
    public string CurrentPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
    public string ConfirmPassword { get; set; } = string.Empty;
}

public class TwoFactorRequest
{
    public bool Enabled { get; set; }
    public string? Code { get; set; }
    public string? Password { get; set; }
}

public class TwoFactorSetupResponse
{
    public string SecretKey { get; set; } = string.Empty;
    public string QrCodeUrl { get; set; } = string.Empty;
    public List<string> RecoveryCodes { get; set; } = new();
}

public class SecuritySettingsResponse
{
    public bool TwoFactorEnabled { get; set; }
    public bool BiometricEnabled { get; set; }
    public bool HasPasskeys { get; set; }
    public List<string> RecoveryCodes { get; set; } = new();
    public bool LoginNotifications { get; set; }
    public int AutoLogoutMinutes { get; set; } = 30;
    public bool HasSecurityQuestions { get; set; }
}

public class NotificationPreferencesResponse
{
    public Dictionary<string, Dictionary<string, bool>> Channels { get; set; } = new();
}

public class NotificationPreferenceUpdateRequest
{
    public string Category { get; set; } = string.Empty;
    public string Channel { get; set; } = string.Empty;
    public bool Enabled { get; set; }
}

public class BusinessProfileRequest
{
    public string? BusinessName { get; set; }
    public string? RegistrationNumber { get; set; }
    public string? VATNumber { get; set; }
    public string? Industry { get; set; }
    public string? CompanyAddress { get; set; }
    public string? Website { get; set; }
    public string? BusinessDescription { get; set; }
    public string? LogoUrl { get; set; }
    public string? Directors { get; set; }
    public string? BankAccountDetails { get; set; }
    public string? SettlementPreference { get; set; }
}

public class BusinessProfileResponse
{
    public Guid Id { get; set; }
    public string? BusinessName { get; set; }
    public string? RegistrationNumber { get; set; }
    public string? VATNumber { get; set; }
    public string? Industry { get; set; }
    public string? CompanyAddress { get; set; }
    public string? Website { get; set; }
    public string? BusinessDescription { get; set; }
    public string? LogoUrl { get; set; }
    public string? Directors { get; set; }
    public string? BankAccountDetails { get; set; }
    public string? SettlementPreference { get; set; }
    public string? Documents { get; set; }
}

public class ApiKeyResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string KeyPreview { get; set; } = string.Empty;
    public string Environment { get; set; } = string.Empty;
    public List<string> Scopes { get; set; } = new();
    public List<string> AllowedDomains { get; set; } = new();
    public List<string> CallbackUrls { get; set; } = new();
    public string? WebhookUrl { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? LastUsedAt { get; set; }
}

public class CreateApiKeyRequest
{
    public string Name { get; set; } = string.Empty;
    public string Environment { get; set; } = "sandbox";
    public List<string> Scopes { get; set; } = new();
    public List<string> AllowedDomains { get; set; } = new();
    public List<string> CallbackUrls { get; set; } = new();
    public string? WebhookUrl { get; set; }
}

public class CreateApiKeyResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Key { get; set; } = string.Empty;
    public string Secret { get; set; } = string.Empty;
    public string Environment { get; set; } = string.Empty;
}

public class TeamMemberResponse
{
    public Guid Id { get; set; }
    public string MemberEmail { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public List<string> Permissions { get; set; } = new();
    public string Status { get; set; } = string.Empty;
    public DateTime InvitedAt { get; set; }
    public DateTime? AcceptedAt { get; set; }
}

public class InviteTeamMemberRequest
{
    public string MemberEmail { get; set; } = string.Empty;
    public string Role { get; set; } = "readonly";
    public List<string> Permissions { get; set; } = new();
}

public class UpdateTeamMemberRequest
{
    public string? Role { get; set; }
    public List<string>? Permissions { get; set; }
    public string? Status { get; set; }
}

public class ConnectedDeviceResponse
{
    public Guid Id { get; set; }
    public string DeviceName { get; set; } = string.Empty;
    public string DeviceType { get; set; } = string.Empty;
    public string? Browser { get; set; }
    public string? OS { get; set; }
    public string? IPAddress { get; set; }
    public string? Location { get; set; }
    public bool IsTrusted { get; set; }
    public bool IsCurrent { get; set; }
    public DateTime LastActiveAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ActivityLogResponse
{
    public Guid Id { get; set; }
    public string Action { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public Dictionary<string, object>? Details { get; set; }
    public string? IPAddress { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class IntegrationResponse
{
    public Guid Id { get; set; }
    public string Provider { get; set; } = string.Empty;
    public bool IsConnected { get; set; }
    public List<string> Permissions { get; set; } = new();
    public string SyncStatus { get; set; } = string.Empty;
    public DateTime? LastSyncedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class BillingInfoResponse
{
    public string Plan { get; set; } = "free";
    public string? BillingEmail { get; set; }
    public string? BillingAddress { get; set; }
    public string? TaxId { get; set; }
    public bool AutoRenew { get; set; } = true;
    public DateTime? NextBillingDate { get; set; }
    public List<InvoiceResponse> Invoices { get; set; } = new();
}

public class InvoiceResponse
{
    public string Id { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "ZAR";
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string? PdfUrl { get; set; }
}

public class UpdateBillingRequest
{
    public string? Plan { get; set; }
    public string? BillingEmail { get; set; }
    public string? BillingAddress { get; set; }
    public string? TaxId { get; set; }
    public bool? AutoRenew { get; set; }
}

public class AppearanceSettingsResponse
{
    public string Theme { get; set; } = "system";
    public string AccentColor { get; set; } = "blue";
    public string DashboardLayout { get; set; } = "default";
    public string SidebarStyle { get; set; } = "default";
    public bool CompactMode { get; set; }
    public string AnimationIntensity { get; set; } = "medium";
    public string FontSize { get; set; } = "medium";
}

public class LanguageRegionResponse
{
    public string Language { get; set; } = "en";
    public string Currency { get; set; } = "ZAR";
    public string DateFormat { get; set; } = "DD/MM/YYYY";
    public string TimeFormat { get; set; } = "24h";
    public string TimeZone { get; set; } = "Africa/Johannesburg";
    public string NumberFormat { get; set; } = "1,234.56";
}

public class PrivacySettingsResponse
{
    public bool DataSharing { get; set; } = true;
    public bool MarketingEmails { get; set; }
    public bool AnalyticsPermissions { get; set; } = true;
    public bool PersonalizedRecommendations { get; set; } = true;
    public bool ProfileVisibility { get; set; } = true;
}

public class DeleteAccountRequest
{
    public string Password { get; set; } = string.Empty;
    public string? TwoFactorCode { get; set; }
    public bool DownloadData { get; set; }
}

public class WalletSettingsResponse
{
    public string? DefaultCurrency { get; set; }
    public bool AutoCurrencyConversion { get; set; }
    public bool AutoSettlement { get; set; }
    public decimal? DailyLimit { get; set; }
    public decimal? MonthlyLimit { get; set; }
    public bool AutoTopUp { get; set; }
    public decimal? AutoTopUpThreshold { get; set; }
    public decimal? AutoTopUpAmount { get; set; }
}

public class PaymentMethodResponse
{
    public string Id { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string? LastFour { get; set; }
    public string? Expiry { get; set; }
    public string? CardholderName { get; set; }
    public bool IsDefault { get; set; }
    public bool IsVerified { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class AccountPreferencesResponse
{
    public string? DefaultLandingPage { get; set; }
    public string? StartupPage { get; set; }
    public string? PreferredPaymentMethod { get; set; }
    public string? DefaultWallet { get; set; }
    public string? FavoriteServices { get; set; }
}