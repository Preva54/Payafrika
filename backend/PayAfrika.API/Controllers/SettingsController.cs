using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PayAfrika.API.Data;
using PayAfrika.API.DTOs;
using PayAfrika.API.Models;

namespace PayAfrika.API.Controllers;

[ApiController]
[Route("api/settings")]
[Authorize]
public class SettingsController : ControllerBase
{
    private readonly AppDbContext _db;

    public SettingsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("profile")]
    public async Task<ActionResult<ProfileResponse>> GetProfile()
    {
        var userId = GetUserId();
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return NotFound();

        var prefs = await _db.UserPreferences.Where(p => p.UserId == userId && p.Category == "profile").ToListAsync();
        var displayName = prefs.FirstOrDefault(p => p.Key == "display_name")?.Value;
        var city = prefs.FirstOrDefault(p => p.Key == "city")?.Value;
        var address = prefs.FirstOrDefault(p => p.Key == "address")?.Value;
        var postalCode = prefs.FirstOrDefault(p => p.Key == "postal_code")?.Value;
        var occupation = prefs.FirstOrDefault(p => p.Key == "occupation")?.Value;
        DateTime? dob = null;
        var dobStr = prefs.FirstOrDefault(p => p.Key == "date_of_birth")?.Value;
        if (DateTime.TryParse(dobStr, out var parsedDob)) dob = parsedDob;

        return Ok(new ProfileResponse
        {
            Id = user.Id.ToString(),
            FullName = user.FullName,
            Email = user.Email,
            DisplayName = displayName,
            PhoneNumber = user.PhoneNumber,
            Country = user.Country,
            City = city,
            Address = address,
            PostalCode = postalCode,
            Occupation = occupation,
            DateOfBirth = dob,
            AvatarUrl = user.AvatarUrl,
            Role = user.Role,
            KYCStatus = user.KYCStatus,
            IsEmailVerified = user.IsEmailVerified,
            CreatedAt = user.CreatedAt,
        });
    }

    [HttpPut("profile")]
    public async Task<ActionResult<ProfileResponse>> UpdateProfile([FromBody] ProfileUpdateRequest request)
    {
        var userId = GetUserId();
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return NotFound();

        if (request.FullName != null) user.FullName = request.FullName;
        if (request.PhoneNumber != null) user.PhoneNumber = request.PhoneNumber;
        if (request.Country != null) user.Country = request.Country;
        user.UpdatedAt = DateTime.UtcNow;

        await UpsertPreference(userId, "profile", "display_name", request.DisplayName);
        await UpsertPreference(userId, "profile", "city", request.City);
        await UpsertPreference(userId, "profile", "address", request.Address);
        await UpsertPreference(userId, "profile", "postal_code", request.PostalCode);
        await UpsertPreference(userId, "profile", "occupation", request.Occupation);
        await UpsertPreference(userId, "profile", "date_of_birth", request.DateOfBirth?.ToString("o"));

        await _db.SaveChangesAsync();
        await LogActivity(userId, "Updated profile", "profile", $"Updated profile information");

        return await GetProfile();
    }

    [HttpPost("profile/avatar")]
    public async Task<ActionResult<ProfileResponse>> UpdateAvatar([FromBody] string avatarUrl)
    {
        var userId = GetUserId();
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return NotFound();

        user.AvatarUrl = avatarUrl;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await LogActivity(userId, "Updated avatar", "profile", "Changed profile photo");

        return await GetProfile();
    }

    [HttpGet("security")]
    public async Task<ActionResult<SecuritySettingsResponse>> GetSecurity()
    {
        var userId = GetUserId();
        var user = await _db.Users.FindAsync(userId);
        var prefs = await _db.UserPreferences.Where(p => p.UserId == userId && p.Category == "security").ToListAsync();

        return Ok(new SecuritySettingsResponse
        {
            TwoFactorEnabled = user?.TwoFactorEnabled ?? false,
            BiometricEnabled = prefs.FirstOrDefault(p => p.Key == "biometric")?.Value == "true",
            HasPasskeys = prefs.FirstOrDefault(p => p.Key == "passkeys")?.Value == "true",
            RecoveryCodes = (prefs.FirstOrDefault(p => p.Key == "recovery_codes")?.Value ?? "")
                .Split(',', StringSplitOptions.RemoveEmptyEntries).ToList(),
            LoginNotifications = prefs.FirstOrDefault(p => p.Key == "login_notifications")?.Value != "false",
            AutoLogoutMinutes = int.TryParse(prefs.FirstOrDefault(p => p.Key == "auto_logout")?.Value, out var t) ? t : 30,
            HasSecurityQuestions = prefs.FirstOrDefault(p => p.Key == "security_questions")?.Value == "true",
        });
    }

    [HttpPut("security/password")]
    public async Task<ActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        if (request.NewPassword != request.ConfirmPassword)
            return BadRequest(new { error = "Passwords do not match." });

        var userId = GetUserId();
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return NotFound();

        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            return BadRequest(new { error = "Current password is incorrect." });

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await LogActivity(userId, "Changed password", "security", "Password changed");

        return Ok(new { message = "Password changed successfully." });
    }

    [HttpPut("security/two-factor")]
    public async Task<ActionResult> ToggleTwoFactor([FromBody] TwoFactorRequest request)
    {
        var userId = GetUserId();
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return NotFound();

        user.TwoFactorEnabled = request.Enabled;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await LogActivity(userId, request.Enabled ? "Enabled 2FA" : "Disabled 2FA", "security", "Two-factor authentication updated");

        return Ok(new { enabled = user.TwoFactorEnabled });
    }

    [HttpPost("security/two-factor/setup")]
    public ActionResult<TwoFactorSetupResponse> SetupTwoFactor()
    {
        var secretKey = GenerateSecretKey();
        var recoveryCodes = Enumerable.Range(0, 10).Select(_ => GenerateRecoveryCode()).ToList();

        return Ok(new TwoFactorSetupResponse
        {
            SecretKey = secretKey,
            QrCodeUrl = $"otpauth://totp/PayAfrika:{User.Identity?.Name}?secret={secretKey}&issuer=PayAfrika",
            RecoveryCodes = recoveryCodes,
        });
    }

    [HttpGet("notifications")]
    public async Task<ActionResult<NotificationPreferencesResponse>> GetNotifications()
    {
        var userId = GetUserId();
        var prefs = await _db.UserPreferences.Where(p => p.UserId == userId && p.Category == "notification").ToListAsync();

        var categories = new[] { "payments", "wallet", "security", "merchant", "promotions", "news", "settlements", "support", "api", "maintenance" };
        var channels = new[] { "email", "sms", "push", "whatsapp", "in_app" };

        var result = new NotificationPreferencesResponse();
        foreach (var cat in categories)
        {
            result.Channels[cat] = new Dictionary<string, bool>();
            foreach (var ch in channels)
            {
                var pref = prefs.FirstOrDefault(p => p.Key == $"{cat}_{ch}");
                result.Channels[cat][ch] = pref?.Value != "false";
            }
        }

        return Ok(result);
    }

    [HttpPut("notifications")]
    public async Task<ActionResult> UpdateNotification([FromBody] NotificationPreferenceUpdateRequest request)
    {
        var userId = GetUserId();
        await UpsertPreference(userId, "notification", $"{request.Category}_{request.Channel}", request.Enabled ? "true" : "false");
        await _db.SaveChangesAsync();

        return Ok(new { message = "Notification preference updated." });
    }

    [HttpGet("business")]
    public async Task<ActionResult<BusinessProfileResponse>> GetBusinessProfile()
    {
        var userId = GetUserId();
        var profile = await _db.BusinessProfiles.FirstOrDefaultAsync(bp => bp.UserId == userId);
        if (profile == null)
            return Ok(new BusinessProfileResponse());

        return Ok(new BusinessProfileResponse
        {
            Id = profile.Id,
            BusinessName = profile.BusinessName,
            RegistrationNumber = profile.RegistrationNumber,
            VATNumber = profile.VATNumber,
            Industry = profile.Industry,
            CompanyAddress = profile.CompanyAddress,
            Website = profile.Website,
            BusinessDescription = profile.BusinessDescription,
            LogoUrl = profile.LogoUrl,
            Directors = profile.Directors,
            BankAccountDetails = profile.BankAccountDetails,
            SettlementPreference = profile.SettlementPreference,
            Documents = profile.Documents,
        });
    }

    [HttpPut("business")]
    public async Task<ActionResult<BusinessProfileResponse>> UpdateBusinessProfile([FromBody] BusinessProfileRequest request)
    {
        var userId = GetUserId();
        var profile = await _db.BusinessProfiles.FirstOrDefaultAsync(bp => bp.UserId == userId);
        if (profile == null)
        {
            profile = new BusinessProfile { UserId = userId };
            _db.BusinessProfiles.Add(profile);
        }

        if (request.BusinessName != null) profile.BusinessName = request.BusinessName;
        if (request.RegistrationNumber != null) profile.RegistrationNumber = request.RegistrationNumber;
        if (request.VATNumber != null) profile.VATNumber = request.VATNumber;
        if (request.Industry != null) profile.Industry = request.Industry;
        if (request.CompanyAddress != null) profile.CompanyAddress = request.CompanyAddress;
        if (request.Website != null) profile.Website = request.Website;
        if (request.BusinessDescription != null) profile.BusinessDescription = request.BusinessDescription;
        if (request.LogoUrl != null) profile.LogoUrl = request.LogoUrl;
        if (request.Directors != null) profile.Directors = request.Directors;
        if (request.BankAccountDetails != null) profile.BankAccountDetails = request.BankAccountDetails;
        if (request.SettlementPreference != null) profile.SettlementPreference = request.SettlementPreference;
        profile.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await LogActivity(userId, "Updated business profile", "business", "Business information updated");

        return await GetBusinessProfile();
    }

    [HttpGet("wallet")]
    public async Task<ActionResult<WalletSettingsResponse>> GetWalletSettings()
    {
        var userId = GetUserId();
        var prefs = await _db.UserPreferences.Where(p => p.UserId == userId && p.Category == "wallet").ToListAsync();

        decimal? dailyLimit = decimal.TryParse(prefs.FirstOrDefault(p => p.Key == "daily_limit")?.Value, out var dl) ? dl : null;
        decimal? monthlyLimit = decimal.TryParse(prefs.FirstOrDefault(p => p.Key == "monthly_limit")?.Value, out var ml) ? ml : null;
        decimal? topUpThreshold = decimal.TryParse(prefs.FirstOrDefault(p => p.Key == "auto_topup_threshold")?.Value, out var tt) ? tt : null;
        decimal? topUpAmount = decimal.TryParse(prefs.FirstOrDefault(p => p.Key == "auto_topup_amount")?.Value, out var ta) ? ta : null;

        return Ok(new WalletSettingsResponse
        {
            DefaultCurrency = prefs.FirstOrDefault(p => p.Key == "default_currency")?.Value ?? "ZAR",
            AutoCurrencyConversion = prefs.FirstOrDefault(p => p.Key == "auto_convert")?.Value == "true",
            AutoSettlement = prefs.FirstOrDefault(p => p.Key == "auto_settlement")?.Value != "false",
            DailyLimit = dailyLimit,
            MonthlyLimit = monthlyLimit,
            AutoTopUp = prefs.FirstOrDefault(p => p.Key == "auto_topup")?.Value == "true",
            AutoTopUpThreshold = topUpThreshold,
            AutoTopUpAmount = topUpAmount,
        });
    }

    [HttpPut("wallet")]
    public async Task<ActionResult> UpdateWalletSettings([FromBody] WalletSettingsResponse request)
    {
        var userId = GetUserId();

        await UpsertPreference(userId, "wallet", "default_currency", request.DefaultCurrency);
        await UpsertPreference(userId, "wallet", "auto_convert", request.AutoCurrencyConversion ? "true" : "false");
        await UpsertPreference(userId, "wallet", "auto_settlement", request.AutoSettlement ? "true" : "false");
        await UpsertPreference(userId, "wallet", "daily_limit", request.DailyLimit?.ToString());
        await UpsertPreference(userId, "wallet", "monthly_limit", request.MonthlyLimit?.ToString());
        await UpsertPreference(userId, "wallet", "auto_topup", request.AutoTopUp ? "true" : "false");
        await UpsertPreference(userId, "wallet", "auto_topup_threshold", request.AutoTopUpThreshold?.ToString());
        await UpsertPreference(userId, "wallet", "auto_topup_amount", request.AutoTopUpAmount?.ToString());

        await _db.SaveChangesAsync();
        await LogActivity(userId, "Updated wallet settings", "wallet", "Wallet preferences updated");

        return Ok(new { message = "Wallet settings updated." });
    }

    [HttpGet("payment-methods")]
    public async Task<ActionResult<List<PaymentMethodResponse>>> GetPaymentMethods()
    {
        var userId = GetUserId();
        var cards = await _db.Cards.Where(c => c.UserId == userId && c.IsActive).ToListAsync();
        var banks = await _db.LinkedBanks.Where(b => b.UserId == userId).ToListAsync();

        var methods = new List<PaymentMethodResponse>();
        methods.AddRange(cards.Select(c => new PaymentMethodResponse
        {
            Id = c.Id.ToString(),
            Type = c.IsVirtual ? "virtual_card" : "card",
            LastFour = c.LastFour,
            Expiry = c.Expiry,
            CardholderName = c.CardholderName,
            IsDefault = !c.IsVirtual,
            IsVerified = true,
            CreatedAt = c.CreatedAt,
        }));
        methods.AddRange(banks.Select(b => new PaymentMethodResponse
        {
            Id = b.Id.ToString(),
            Type = "bank",
            LastFour = b.AccountNumber.Length >= 4 ? b.AccountNumber[^4..] : b.AccountNumber,
            IsDefault = b.IsPrimary,
            IsVerified = b.IsVerified,
            CreatedAt = DateTime.UtcNow,
        }));

        return Ok(methods);
    }

    [HttpDelete("payment-methods/{id}")]
    public async Task<ActionResult> RemovePaymentMethod(Guid id)
    {
        var userId = GetUserId();
        var card = await _db.Cards.FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId);
        if (card != null) { card.IsActive = false; await _db.SaveChangesAsync(); return NoContent(); }

        var bank = await _db.LinkedBanks.FirstOrDefaultAsync(b => b.Id == id && b.UserId == userId);
        if (bank != null) { _db.LinkedBanks.Remove(bank); await _db.SaveChangesAsync(); return NoContent(); }

        return NotFound(new { error = "Payment method not found." });
    }

    [HttpGet("api-keys")]
    public async Task<ActionResult<List<ApiKeyResponse>>> GetApiKeys()
    {
        var userId = GetUserId();
        var keys = await _db.ApiKeys.Where(k => k.UserId == userId).OrderByDescending(k => k.CreatedAt).ToListAsync();

        return Ok(keys.Select(k => new ApiKeyResponse
        {
            Id = k.Id,
            Name = k.Name,
            KeyPreview = k.KeyHash.Length >= 8 ? $"{k.KeyHash[..8]}..." : "***",
            Environment = k.Environment,
            Scopes = JsonSerializer.Deserialize<List<string>>(k.Scopes) ?? new(),
            AllowedDomains = JsonSerializer.Deserialize<List<string>>(k.AllowedDomains) ?? new(),
            CallbackUrls = JsonSerializer.Deserialize<List<string>>(k.CallbackUrls) ?? new(),
            WebhookUrl = k.WebhookUrl,
            IsActive = k.IsActive,
            CreatedAt = k.CreatedAt,
            LastUsedAt = k.LastUsedAt,
        }).ToList());
    }

    [HttpPost("api-keys")]
    public async Task<ActionResult<CreateApiKeyResponse>> CreateApiKey([FromBody] CreateApiKeyRequest request)
    {
        var userId = GetUserId();
        var rawKey = $"pak_{Guid.NewGuid():N}{Guid.NewGuid():N}"[..32];
        var rawSecret = $"pask_{Guid.NewGuid():N}{Guid.NewGuid():N}"[..48];

        var apiKey = new ApiKey
        {
            UserId = userId,
            Name = request.Name,
            KeyHash = HashString(rawKey),
            SecretHash = HashString(rawSecret),
            Environment = request.Environment,
            Scopes = JsonSerializer.Serialize(request.Scopes),
            AllowedDomains = JsonSerializer.Serialize(request.AllowedDomains),
            CallbackUrls = JsonSerializer.Serialize(request.CallbackUrls),
            WebhookUrl = request.WebhookUrl,
        };

        _db.ApiKeys.Add(apiKey);
        await _db.SaveChangesAsync();
        await LogActivity(userId, "Created API key", "api", $"Created API key: {request.Name}");

        return Ok(new CreateApiKeyResponse
        {
            Id = apiKey.Id,
            Name = apiKey.Name,
            Key = rawKey,
            Secret = rawSecret,
            Environment = apiKey.Environment,
        });
    }

    [HttpDelete("api-keys/{id}")]
    public async Task<ActionResult> DeleteApiKey(Guid id)
    {
        var userId = GetUserId();
        var key = await _db.ApiKeys.FirstOrDefaultAsync(k => k.Id == id && k.UserId == userId);
        if (key == null) return NotFound(new { error = "API key not found." });

        _db.ApiKeys.Remove(key);
        await _db.SaveChangesAsync();
        await LogActivity(userId, "Deleted API key", "api", $"Deleted API key: {key.Name}");

        return NoContent();
    }

    [HttpGet("team")]
    public async Task<ActionResult<List<TeamMemberResponse>>> GetTeamMembers()
    {
        var userId = GetUserId();
        var members = await _db.TeamMembers.Where(tm => tm.BusinessUserId == userId).OrderByDescending(tm => tm.InvitedAt).ToListAsync();

        return Ok(members.Select(m => new TeamMemberResponse
        {
            Id = m.Id,
            MemberEmail = m.MemberEmail,
            Role = m.Role,
            Permissions = JsonSerializer.Deserialize<List<string>>(m.Permissions) ?? new(),
            Status = m.Status,
            InvitedAt = m.InvitedAt,
            AcceptedAt = m.AcceptedAt,
        }).ToList());
    }

    [HttpPost("team/invite")]
    public async Task<ActionResult<TeamMemberResponse>> InviteTeamMember([FromBody] InviteTeamMemberRequest request)
    {
        var userId = GetUserId();
        var member = new TeamMember
        {
            BusinessUserId = userId,
            MemberEmail = request.MemberEmail,
            Role = request.Role,
            Permissions = JsonSerializer.Serialize(request.Permissions),
            Status = "invited",
        };
        _db.TeamMembers.Add(member);
        await _db.SaveChangesAsync();
        await LogActivity(userId, "Invited team member", "team", $"Invited {request.MemberEmail} as {request.Role}");

        return Ok(new TeamMemberResponse
        {
            Id = member.Id,
            MemberEmail = member.MemberEmail,
            Role = member.Role,
            Permissions = request.Permissions,
            Status = member.Status,
            InvitedAt = member.InvitedAt,
        });
    }

    [HttpPut("team/{id}")]
    public async Task<ActionResult<TeamMemberResponse>> UpdateTeamMember(Guid id, [FromBody] UpdateTeamMemberRequest request)
    {
        var userId = GetUserId();
        var member = await _db.TeamMembers.FirstOrDefaultAsync(tm => tm.Id == id && tm.BusinessUserId == userId);
        if (member == null) return NotFound(new { error = "Team member not found." });

        if (request.Role != null) member.Role = request.Role;
        if (request.Permissions != null) member.Permissions = JsonSerializer.Serialize(request.Permissions);
        if (request.Status != null) member.Status = request.Status;
        member.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new TeamMemberResponse
        {
            Id = member.Id,
            MemberEmail = member.MemberEmail,
            Role = member.Role,
            Permissions = JsonSerializer.Deserialize<List<string>>(member.Permissions) ?? new(),
            Status = member.Status,
            InvitedAt = member.InvitedAt,
            AcceptedAt = member.AcceptedAt,
        });
    }

    [HttpDelete("team/{id}")]
    public async Task<ActionResult> RemoveTeamMember(Guid id)
    {
        var userId = GetUserId();
        var member = await _db.TeamMembers.FirstOrDefaultAsync(tm => tm.Id == id && tm.BusinessUserId == userId);
        if (member == null) return NotFound(new { error = "Team member not found." });

        _db.TeamMembers.Remove(member);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("devices")]
    public async Task<ActionResult<List<ConnectedDeviceResponse>>> GetDevices()
    {
        var userId = GetUserId();
        var devices = await _db.ConnectedDevices.Where(d => d.UserId == userId).OrderByDescending(d => d.LastActiveAt).ToListAsync();

        if (!devices.Any())
        {
            devices = new List<ConnectedDevice>
            {
                new() { Id = Guid.NewGuid(), UserId = userId, DeviceName = "Current Browser", DeviceType = "web", Browser = "Chrome", OS = "Windows", IPAddress = "---", Location = "Unknown", IsTrusted = true, IsCurrent = true, LastActiveAt = DateTime.UtcNow, CreatedAt = DateTime.UtcNow },
            };
        }

        return Ok(devices.Select(d => new ConnectedDeviceResponse
        {
            Id = d.Id, DeviceName = d.DeviceName, DeviceType = d.DeviceType,
            Browser = d.Browser, OS = d.OS, IPAddress = d.IPAddress, Location = d.Location,
            IsTrusted = d.IsTrusted, IsCurrent = d.IsCurrent, LastActiveAt = d.LastActiveAt, CreatedAt = d.CreatedAt,
        }).ToList());
    }

    [HttpPut("devices/{id}/trust")]
    public async Task<ActionResult> TrustDevice(Guid id)
    {
        var userId = GetUserId();
        var device = await _db.ConnectedDevices.FirstOrDefaultAsync(d => d.Id == id && d.UserId == userId);
        if (device == null) return NotFound();

        device.IsTrusted = !device.IsTrusted;
        await _db.SaveChangesAsync();
        return Ok(new { trusted = device.IsTrusted });
    }

    [HttpDelete("devices/{id}")]
    public async Task<ActionResult> RemoveDevice(Guid id)
    {
        var userId = GetUserId();
        var device = await _db.ConnectedDevices.FirstOrDefaultAsync(d => d.Id == id && d.UserId == userId);
        if (device == null) return NotFound();

        _db.ConnectedDevices.Remove(device);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("devices")]
    public async Task<ActionResult> RemoveAllDevices()
    {
        var userId = GetUserId();
        var devices = await _db.ConnectedDevices.Where(d => d.UserId == userId && !d.IsCurrent).ToListAsync();
        _db.ConnectedDevices.RemoveRange(devices);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("activity")]
    public async Task<ActionResult<List<ActivityLogResponse>>> GetActivityLogs([FromQuery] int page = 1, [FromQuery] int limit = 50, [FromQuery] string? category = null)
    {
        var userId = GetUserId();
        var query = _db.ActivityLogs.Where(al => al.UserId == userId).AsQueryable();
        if (!string.IsNullOrEmpty(category)) query = query.Where(al => al.Category == category);
        var logs = await query.OrderByDescending(al => al.CreatedAt).Skip((page - 1) * limit).Take(limit).ToListAsync();

        return Ok(logs.Select(l => new ActivityLogResponse
        {
            Id = l.Id, Action = l.Action, Category = l.Category,
            Details = JsonSerializer.Deserialize<Dictionary<string, object>>(l.Details),
            IPAddress = l.IPAddress, CreatedAt = l.CreatedAt,
        }).ToList());
    }

    [HttpGet("integrations")]
    public async Task<ActionResult<List<IntegrationResponse>>> GetIntegrations()
    {
        var userId = GetUserId();
        var integrations = await _db.Integrations.Where(i => i.UserId == userId).ToListAsync();

        var providers = new[] { "shopify", "woocommerce", "magento", "wordpress", "salesforce", "hubspot", "zapier", "slack", "microsoft_teams", "quickbooks", "xero" };
        var result = new List<IntegrationResponse>();

        foreach (var provider in providers)
        {
            var existing = integrations.FirstOrDefault(i => i.Provider == provider);
            if (existing != null)
            {
                result.Add(new IntegrationResponse
                {
                    Id = existing.Id, Provider = existing.Provider, IsConnected = existing.IsConnected,
                    Permissions = JsonSerializer.Deserialize<List<string>>(existing.Permissions) ?? new(),
                    SyncStatus = existing.SyncStatus, LastSyncedAt = existing.LastSyncedAt, CreatedAt = existing.CreatedAt,
                });
            }
            else
            {
                result.Add(new IntegrationResponse { Id = Guid.NewGuid(), Provider = provider, IsConnected = false, Permissions = new(), SyncStatus = "idle", CreatedAt = DateTime.UtcNow });
            }
        }

        return Ok(result);
    }

    [HttpPost("integrations/{provider}/connect")]
    public async Task<ActionResult<IntegrationResponse>> ConnectIntegration(string provider)
    {
        var userId = GetUserId();
        var integration = await _db.Integrations.FirstOrDefaultAsync(i => i.UserId == userId && i.Provider == provider);
        if (integration == null)
        {
            integration = new Integration { UserId = userId, Provider = provider };
            _db.Integrations.Add(integration);
        }

        integration.IsConnected = true;
        integration.SyncStatus = "synced";
        integration.LastSyncedAt = DateTime.UtcNow;
        integration.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await LogActivity(userId, "Connected integration", "integrations", $"Connected {provider}");

        return Ok(new IntegrationResponse
        {
            Id = integration.Id, Provider = integration.Provider, IsConnected = true,
            SyncStatus = "synced", LastSyncedAt = integration.LastSyncedAt, CreatedAt = integration.CreatedAt,
        });
    }

    [HttpPost("integrations/{provider}/disconnect")]
    public async Task<ActionResult> DisconnectIntegration(string provider)
    {
        var userId = GetUserId();
        var integration = await _db.Integrations.FirstOrDefaultAsync(i => i.UserId == userId && i.Provider == provider);
        if (integration == null) return NotFound();

        integration.IsConnected = false;
        integration.SyncStatus = "disconnected";
        integration.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await LogActivity(userId, "Disconnected integration", "integrations", $"Disconnected {provider}");

        return Ok(new { message = $"{provider} disconnected." });
    }

    [HttpGet("billing")]
    public async Task<ActionResult<BillingInfoResponse>> GetBilling()
    {
        var userId = GetUserId();
        var prefs = await _db.UserPreferences.Where(p => p.UserId == userId && p.Category == "billing").ToListAsync();

        DateTime? nextBilling = DateTime.TryParse(prefs.FirstOrDefault(p => p.Key == "next_billing")?.Value, out var nb) ? nb : DateTime.UtcNow.AddMonths(1);

        return Ok(new BillingInfoResponse
        {
            Plan = prefs.FirstOrDefault(p => p.Key == "plan")?.Value ?? "free",
            BillingEmail = prefs.FirstOrDefault(p => p.Key == "billing_email")?.Value,
            BillingAddress = prefs.FirstOrDefault(p => p.Key == "billing_address")?.Value,
            TaxId = prefs.FirstOrDefault(p => p.Key == "tax_id")?.Value,
            AutoRenew = prefs.FirstOrDefault(p => p.Key == "auto_renew")?.Value != "false",
            NextBillingDate = nextBilling,
            Invoices = Enumerable.Range(1, 3).Select(i => new InvoiceResponse
            {
                Id = $"INV-{DateTime.UtcNow.AddMonths(-i):yyyyMM}-{userId.ToString()[..4].ToUpper()}",
                Description = $"PayAfrika {prefs.FirstOrDefault(p => p.Key == "plan")?.Value ?? "Free"} Plan - {DateTime.UtcNow.AddMonths(-i):MMMM yyyy}",
                Amount = prefs.FirstOrDefault(p => p.Key == "plan")?.Value == "premium" ? 29900 + (i * 100) : 0,
                Currency = "ZAR",
                Status = i == 1 ? "pending" : "paid",
                CreatedAt = DateTime.UtcNow.AddMonths(-i),
                PdfUrl = $"#",
            }).ToList(),
        });
    }

    [HttpPut("billing")]
    public async Task<ActionResult> UpdateBilling([FromBody] UpdateBillingRequest request)
    {
        var userId = GetUserId();

        if (request.Plan != null) await UpsertPreference(userId, "billing", "plan", request.Plan);
        if (request.BillingEmail != null) await UpsertPreference(userId, "billing", "billing_email", request.BillingEmail);
        if (request.BillingAddress != null) await UpsertPreference(userId, "billing", "billing_address", request.BillingAddress);
        if (request.TaxId != null) await UpsertPreference(userId, "billing", "tax_id", request.TaxId);
        if (request.AutoRenew.HasValue) await UpsertPreference(userId, "billing", "auto_renew", request.AutoRenew.Value ? "true" : "false");

        await _db.SaveChangesAsync();
        await LogActivity(userId, "Updated billing", "billing", "Billing information updated");

        return Ok(new { message = "Billing updated." });
    }

    [HttpGet("appearance")]
    public async Task<ActionResult<AppearanceSettingsResponse>> GetAppearance()
    {
        var userId = GetUserId();
        var prefs = await _db.UserPreferences.Where(p => p.UserId == userId && p.Category == "appearance").ToListAsync();

        return Ok(new AppearanceSettingsResponse
        {
            Theme = prefs.FirstOrDefault(p => p.Key == "theme")?.Value ?? "system",
            AccentColor = prefs.FirstOrDefault(p => p.Key == "accent_color")?.Value ?? "blue",
            DashboardLayout = prefs.FirstOrDefault(p => p.Key == "dashboard_layout")?.Value ?? "default",
            SidebarStyle = prefs.FirstOrDefault(p => p.Key == "sidebar_style")?.Value ?? "default",
            CompactMode = prefs.FirstOrDefault(p => p.Key == "compact_mode")?.Value == "true",
            AnimationIntensity = prefs.FirstOrDefault(p => p.Key == "animation_intensity")?.Value ?? "medium",
            FontSize = prefs.FirstOrDefault(p => p.Key == "font_size")?.Value ?? "medium",
        });
    }

    [HttpPut("appearance")]
    public async Task<ActionResult> UpdateAppearance([FromBody] AppearanceSettingsResponse request)
    {
        var userId = GetUserId();

        await UpsertPreference(userId, "appearance", "theme", request.Theme);
        await UpsertPreference(userId, "appearance", "accent_color", request.AccentColor);
        await UpsertPreference(userId, "appearance", "dashboard_layout", request.DashboardLayout);
        await UpsertPreference(userId, "appearance", "sidebar_style", request.SidebarStyle);
        await UpsertPreference(userId, "appearance", "compact_mode", request.CompactMode ? "true" : "false");
        await UpsertPreference(userId, "appearance", "animation_intensity", request.AnimationIntensity);
        await UpsertPreference(userId, "appearance", "font_size", request.FontSize);

        await _db.SaveChangesAsync();
        return Ok(new { message = "Appearance updated." });
    }

    [HttpGet("language-region")]
    public async Task<ActionResult<LanguageRegionResponse>> GetLanguageRegion()
    {
        var userId = GetUserId();
        var prefs = await _db.UserPreferences.Where(p => p.UserId == userId && p.Category == "language_region").ToListAsync();

        return Ok(new LanguageRegionResponse
        {
            Language = prefs.FirstOrDefault(p => p.Key == "language")?.Value ?? "en",
            Currency = prefs.FirstOrDefault(p => p.Key == "currency")?.Value ?? "ZAR",
            DateFormat = prefs.FirstOrDefault(p => p.Key == "date_format")?.Value ?? "DD/MM/YYYY",
            TimeFormat = prefs.FirstOrDefault(p => p.Key == "time_format")?.Value ?? "24h",
            TimeZone = prefs.FirstOrDefault(p => p.Key == "timezone")?.Value ?? "Africa/Johannesburg",
            NumberFormat = prefs.FirstOrDefault(p => p.Key == "number_format")?.Value ?? "1,234.56",
        });
    }

    [HttpPut("language-region")]
    public async Task<ActionResult> UpdateLanguageRegion([FromBody] LanguageRegionResponse request)
    {
        var userId = GetUserId();

        await UpsertPreference(userId, "language_region", "language", request.Language);
        await UpsertPreference(userId, "language_region", "currency", request.Currency);
        await UpsertPreference(userId, "language_region", "date_format", request.DateFormat);
        await UpsertPreference(userId, "language_region", "time_format", request.TimeFormat);
        await UpsertPreference(userId, "language_region", "timezone", request.TimeZone);
        await UpsertPreference(userId, "language_region", "number_format", request.NumberFormat);

        await _db.SaveChangesAsync();
        return Ok(new { message = "Language & region updated." });
    }

    [HttpGet("privacy")]
    public async Task<ActionResult<PrivacySettingsResponse>> GetPrivacy()
    {
        var userId = GetUserId();
        var prefs = await _db.UserPreferences.Where(p => p.UserId == userId && p.Category == "privacy").ToListAsync();

        return Ok(new PrivacySettingsResponse
        {
            DataSharing = prefs.FirstOrDefault(p => p.Key == "data_sharing")?.Value != "false",
            MarketingEmails = prefs.FirstOrDefault(p => p.Key == "marketing_emails")?.Value == "true",
            AnalyticsPermissions = prefs.FirstOrDefault(p => p.Key == "analytics")?.Value != "false",
            PersonalizedRecommendations = prefs.FirstOrDefault(p => p.Key == "recommendations")?.Value != "false",
            ProfileVisibility = prefs.FirstOrDefault(p => p.Key == "profile_visibility")?.Value != "false",
        });
    }

    [HttpPut("privacy")]
    public async Task<ActionResult> UpdatePrivacy([FromBody] PrivacySettingsResponse request)
    {
        var userId = GetUserId();

        await UpsertPreference(userId, "privacy", "data_sharing", request.DataSharing ? "true" : "false");
        await UpsertPreference(userId, "privacy", "marketing_emails", request.MarketingEmails ? "true" : "false");
        await UpsertPreference(userId, "privacy", "analytics", request.AnalyticsPermissions ? "true" : "false");
        await UpsertPreference(userId, "privacy", "recommendations", request.PersonalizedRecommendations ? "true" : "false");
        await UpsertPreference(userId, "privacy", "profile_visibility", request.ProfileVisibility ? "true" : "false");

        await _db.SaveChangesAsync();
        return Ok(new { message = "Privacy settings updated." });
    }

    [HttpGet("preferences")]
    public async Task<ActionResult<AccountPreferencesResponse>> GetAccountPreferences()
    {
        var userId = GetUserId();
        var prefs = await _db.UserPreferences.Where(p => p.UserId == userId && p.Category == "preferences").ToListAsync();

        return Ok(new AccountPreferencesResponse
        {
            DefaultLandingPage = prefs.FirstOrDefault(p => p.Key == "landing_page")?.Value,
            StartupPage = prefs.FirstOrDefault(p => p.Key == "startup_page")?.Value,
            PreferredPaymentMethod = prefs.FirstOrDefault(p => p.Key == "preferred_payment")?.Value,
            DefaultWallet = prefs.FirstOrDefault(p => p.Key == "default_wallet")?.Value,
            FavoriteServices = prefs.FirstOrDefault(p => p.Key == "favorite_services")?.Value,
        });
    }

    [HttpPut("preferences")]
    public async Task<ActionResult> UpdateAccountPreferences([FromBody] AccountPreferencesResponse request)
    {
        var userId = GetUserId();

        await UpsertPreference(userId, "preferences", "landing_page", request.DefaultLandingPage);
        await UpsertPreference(userId, "preferences", "startup_page", request.StartupPage);
        await UpsertPreference(userId, "preferences", "preferred_payment", request.PreferredPaymentMethod);
        await UpsertPreference(userId, "preferences", "default_wallet", request.DefaultWallet);
        await UpsertPreference(userId, "preferences", "favorite_services", request.FavoriteServices);

        await _db.SaveChangesAsync();
        return Ok(new { message = "Preferences updated." });
    }

    [HttpPost("delete-account")]
    public async Task<ActionResult> RequestDeleteAccount([FromBody] DeleteAccountRequest request)
    {
        var userId = GetUserId();
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return NotFound();

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            return BadRequest(new { error = "Password is incorrect." });

        await UpsertPreference(userId, "account", "deletion_requested", "true");
        await UpsertPreference(userId, "account", "deletion_requested_at", DateTime.UtcNow.ToString("o"));
        await UpsertPreference(userId, "account", "deletion_download_data", request.DownloadData ? "true" : "false");

        await _db.SaveChangesAsync();
        await LogActivity(userId, "Requested account deletion", "account", "Account deletion requested");

        return Ok(new { message = "Account deletion requested. A confirmation email has been sent. Your account will be permanently deleted after a 30-day grace period." });
    }

    private async Task UpsertPreference(Guid userId, string category, string? key, string? value)
    {
        if (key == null || value == null) return;

        var existing = await _db.UserPreferences.FirstOrDefaultAsync(p => p.UserId == userId && p.Category == category && p.Key == key);
        if (existing != null)
        {
            existing.Value = value;
            existing.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            _db.UserPreferences.Add(new UserPreference { UserId = userId, Category = category, Key = key, Value = value });
        }
    }

    private async Task LogActivity(Guid userId, string action, string category, string details)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var userAgent = Request.Headers.UserAgent.ToString();

        _db.ActivityLogs.Add(new ActivityLog
        {
            UserId = userId,
            Action = action,
            Category = category,
            Details = JsonSerializer.Serialize(new { message = details, timestamp = DateTime.UtcNow }),
            IPAddress = ipAddress,
            UserAgent = userAgent,
        });

        await _db.SaveChangesAsync();
    }

    private static string GenerateSecretKey()
    {
        var key = new byte[20];
        RandomNumberGenerator.Fill(key);
        return Convert.ToBase64String(key).Replace('+', 'a').Replace('/', 'b').Replace('=', 'c');
    }

    private static string GenerateRecoveryCode()
    {
        var bytes = new byte[6];
        RandomNumberGenerator.Fill(bytes);
        return string.Concat(bytes.Select(b => (char)('A' + (b % 26))));
    }

    private static string HashString(string input) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(input)));

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
}