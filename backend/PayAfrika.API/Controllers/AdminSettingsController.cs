using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PayAfrika.API.Data;
using PayAfrika.API.Models;
using PayAfrika.API.Services;

namespace PayAfrika.API.Controllers;

[ApiController]
[Route("api/admin/settings")]
[Authorize(Roles = "admin")]
public class AdminSettingsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IPermissionService _perm;

    public AdminSettingsController(AppDbContext db, IPermissionService perm)
    {
        _db = db;
        _perm = perm;
    }

    [HttpGet("dashboard")]
    public async Task<ActionResult<AdminSettingsDashboard>> GetDashboard()
    {
        var settings = await _db.Set<PlatformSetting>().ToListAsync();
        var integrations = await _db.Integrations.CountAsync(i => i.IsConnected);
        var maintenance = settings.FirstOrDefault(s => s.Category == "general" && s.Key == "maintenance_mode");

        return Ok(new AdminSettingsDashboard
        {
            PlatformName = settings.FirstOrDefault(s => s.Category == "general" && s.Key == "platform_name")?.Value ?? "PayAfrika",
            CurrentVersion = "2.0.0",
            ActiveIntegrationCount = integrations,
            SecurityScore = true,
            BackupConfigured = true,
            ApiHealthy = true,
            MaintenanceMode = maintenance?.Value == "true",
            LicenseStatus = "active",
        });
    }

    [HttpGet]
    public async Task<ActionResult<List<PlatformSettingsCategory>>> GetAllSettings()
    {
        var settings = await _db.Set<PlatformSetting>().OrderBy(s => s.SortOrder).ToListAsync();

        var categories = GetCategoryDefinitions();
        foreach (var cat in categories)
        {
            foreach (var field in cat.Fields)
            {
                var setting = settings.FirstOrDefault(s => s.Category == cat.Id && s.Key == field.Key);
                field.Value = setting?.Value ?? field.DefaultValue ?? "";
                field.IsEncrypted = setting?.IsEncrypted ?? false;
            }
        }

        return Ok(categories);
    }

    [HttpGet("{category}")]
    public async Task<ActionResult<PlatformSettingsCategory>> GetCategory(string category)
    {
        var settings = await _db.Set<PlatformSetting>()
            .Where(s => s.Category == category)
            .OrderBy(s => s.SortOrder)
            .ToListAsync();

        var catDef = GetCategoryDefinitions().FirstOrDefault(c => c.Id == category);
        if (catDef == null) return NotFound();

        foreach (var field in catDef.Fields)
        {
            var setting = settings.FirstOrDefault(s => s.Key == field.Key);
            field.Value = setting?.Value ?? field.DefaultValue ?? "";
        }

        return Ok(catDef);
    }

    [HttpPut("{category}")]
    public async Task<ActionResult> UpdateCategory(string category, [FromBody] List<PlatformSettingsField> fields)
    {
        var userId = GetUserId();
        var userName = User.Identity?.Name ?? "System";

        foreach (var field in fields)
        {
            var existing = await _db.Set<PlatformSetting>()
                .FirstOrDefaultAsync(s => s.Category == category && s.Key == field.Key);

            if (existing != null)
            {
                var oldValue = existing.Value;
                if (existing.IsEncrypted && !string.IsNullOrEmpty(field.Value) && field.Value != "••••••••")
                {
                    existing.Value = field.Value;
                }
                else if (!existing.IsEncrypted)
                {
                    existing.Value = field.Value;
                }
                existing.UpdatedAt = DateTime.UtcNow;
                existing.UpdatedById = userId;

                if (oldValue != existing.Value)
                {
                    _db.Set<SettingChangeLog>().Add(new SettingChangeLog
                    {
                        Category = category,
                        Key = field.Key,
                        OldValue = oldValue,
                        NewValue = existing.Value,
                        ChangedById = userId,
                        ChangedByName = userName,
                        ChangedAt = DateTime.UtcNow,
                    });
                }
            }
            else
            {
                var setting = new PlatformSetting
                {
                    Category = category,
                    Key = field.Key,
                    Value = field.Value,
                    Type = field.Type,
                    Description = field.Description,
                    SortOrder = 0,
                    UpdatedById = userId,
                };
                _db.Set<PlatformSetting>().Add(setting);

                _db.Set<SettingChangeLog>().Add(new SettingChangeLog
                {
                    Category = category,
                    Key = field.Key,
                    OldValue = "",
                    NewValue = field.Value,
                    ChangedById = userId,
                    ChangedByName = userName,
                    ChangedAt = DateTime.UtcNow,
                });
            }
        }

        await _db.SaveChangesAsync();
        return Ok(new { message = $"{category} settings saved" });
    }

    [HttpPost("restore-defaults")]
    public async Task<ActionResult> RestoreDefaults([FromBody] string category)
    {
        var settings = await _db.Set<PlatformSetting>()
            .Where(s => s.Category == category)
            .ToListAsync();
        _db.Set<PlatformSetting>().RemoveRange(settings);
        await _db.SaveChangesAsync();

        var defaultFields = GetDefaultFields(category);
        foreach (var field in defaultFields)
        {
            _db.Set<PlatformSetting>().Add(new PlatformSetting
            {
                Category = category,
                Key = field.Key,
                Value = field.DefaultValue ?? "",
                Type = field.Type,
                Description = field.Description,
                SortOrder = 0,
            });
        }
        await _db.SaveChangesAsync();

        return Ok(new { message = $"{category} settings restored to defaults" });
    }

    [HttpGet("changelog")]
    public async Task<ActionResult> GetChangeLog([FromQuery] string? category = null, [FromQuery] int page = 1, [FromQuery] int limit = 50)
    {
        var query = _db.Set<SettingChangeLog>().AsQueryable();
        if (!string.IsNullOrEmpty(category)) query = query.Where(l => l.Category == category);
        var total = await query.CountAsync();
        var logs = await query.OrderByDescending(l => l.ChangedAt)
            .Skip((page - 1) * limit).Take(limit)
            .ToListAsync();

        return Ok(new { logs, total, page, limit });
    }

    [HttpPost("export")]
    public async Task<ActionResult> ExportConfiguration()
    {
        var settings = await _db.Set<PlatformSetting>()
            .OrderBy(s => s.Category).ThenBy(s => s.SortOrder)
            .Select(s => new { s.Category, s.Key, Value = s.IsEncrypted ? "••••••••" : s.Value, s.IsEncrypted })
            .ToListAsync();

        var export = new
        {
            exportedAt = DateTime.UtcNow,
            platform = "PayAfrika",
            version = "2.0.0",
            settings,
        };

        var json = JsonSerializer.Serialize(export, new JsonSerializerOptions { WriteIndented = true });
        return File(System.Text.Encoding.UTF8.GetBytes(json), "application/json", $"payafrika-config-{DateTime.UtcNow:yyyy-MM-dd}.json");
    }

    [HttpPost("import")]
    public async Task<ActionResult> ImportConfiguration()
    {
        using var reader = new StreamReader(Request.Body);
        var body = await reader.ReadToEndAsync();
        var import = JsonSerializer.Deserialize<JsonElement>(body);

        if (import.TryGetProperty("settings", out var settings))
        {
            foreach (var item in settings.EnumerateArray())
            {
                var category = item.GetProperty("category").GetString() ?? "";
                var key = item.GetProperty("key").GetString() ?? "";
                var value = item.GetProperty("value").GetString() ?? "";
                var isEncrypted = item.TryGetProperty("isEncrypted", out var enc) && enc.GetBoolean();

                var existing = await _db.Set<PlatformSetting>()
                    .FirstOrDefaultAsync(s => s.Category == category && s.Key == key);
                if (existing != null && !existing.IsEncrypted)
                {
                    existing.Value = value;
                    existing.UpdatedAt = DateTime.UtcNow;
                }
                else if (existing == null)
                {
                    _db.Set<PlatformSetting>().Add(new PlatformSetting
                    {
                        Category = category,
                        Key = key,
                        Value = value,
                        IsEncrypted = isEncrypted,
                    });
                }
            }
            await _db.SaveChangesAsync();
        }

        return Ok(new { message = "Configuration imported successfully" });
    }

    private static List<PlatformSettingsCategory> GetCategoryDefinitions() =>
    [
        new()
        {
            Id = "general", Label = "General", Icon = "Globe",
            Description = "Core platform configuration",
            Fields =
            [
                new() { Key = "platform_name", Label = "Platform Name", Type = "text", DefaultValue = "PayAfrika", Description = "The name displayed across the platform" },
                new() { Key = "platform_description", Label = "Platform Description", Type = "textarea", DefaultValue = "African payment gateway for global commerce", Description = "Short description for SEO and meta tags" },
                new() { Key = "default_language", Label = "Default Language", Type = "select", DefaultValue = "en", Options = ["en", "fr", "pt", "ar", "sw"], Description = "Platform default language" },
                new() { Key = "default_currency", Label = "Default Currency", Type = "select", DefaultValue = "ZAR", Options = ["ZAR", "NGN", "KES", "GHS", "USD", "EUR", "GBP"], Description = "Default currency for the platform" },
                new() { Key = "timezone", Label = "Time Zone", Type = "select", DefaultValue = "Africa/Johannesburg", Options = ["Africa/Johannesburg", "Africa/Lagos", "Africa/Nairobi", "Africa/Accra", "UTC"], Description = "Platform time zone" },
                new() { Key = "date_format", Label = "Date Format", Type = "select", DefaultValue = "DD/MM/YYYY", Options = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"], Description = "Date display format" },
                new() { Key = "support_email", Label = "Support Email", Type = "email", DefaultValue = "support@payafrika.com", Description = "Public support email address" },
                new() { Key = "support_phone", Label = "Support Phone", Type = "text", DefaultValue = "+27 87 551 3511", Description = "Public support phone number" },
                new() { Key = "website_url", Label = "Website URL", Type = "url", DefaultValue = "https://payafrika.com", Description = "Main website URL" },
                new() { Key = "default_country", Label = "Default Country", Type = "select", DefaultValue = "ZA", Options = ["ZA", "NG", "KE", "GH", "US", "GB"], Description = "Default country for new registrations" },
            ],
        },
        new()
        {
            Id = "company", Label = "Company Profile", Icon = "Building2",
            Description = "Company and legal information",
            Fields =
            [
                new() { Key = "company_name", Label = "Company Name", Type = "text", DefaultValue = "PayAfrika (Pty) Ltd", Description = "Registered company name" },
                new() { Key = "registration_number", Label = "Registration Number", Type = "text", DefaultValue = "2024/123456/07", Description = "Company registration number" },
                new() { Key = "vat_number", Label = "VAT Number", Type = "text", DefaultValue = "4123456789", Description = "VAT / tax registration number" },
                new() { Key = "office_address", Label = "Office Address", Type = "textarea", DefaultValue = "1 Sandton Drive, Sandton, Johannesburg, 2196", Description = "Physical office address" },
                new() { Key = "contact_email", Label = "Contact Email", Type = "email", DefaultValue = "hello@payafrika.com", Description = "General contact email" },
                new() { Key = "contact_phone", Label = "Contact Phone", Type = "text", DefaultValue = "+27 87 551 3511" },
                new() { Key = "social_linkedin", Label = "LinkedIn URL", Type = "url", DefaultValue = "https://linkedin.com/company/payafrika" },
                new() { Key = "social_twitter", Label = "Twitter URL", Type = "url", DefaultValue = "https://twitter.com/payafrika" },
                new() { Key = "social_facebook", Label = "Facebook URL", Type = "url", DefaultValue = "https://facebook.com/payafrika" },
                new() { Key = "business_hours", Label = "Business Hours", Type = "text", DefaultValue = "Mon-Fri 08:00-17:00 SAST", Description = "Operating hours displayed to customers" },
            ],
        },
        new()
        {
            Id = "branding", Label = "Branding", Icon = "Palette",
            Description = "Visual identity and white-label settings",
            Fields =
            [
                new() { Key = "logo_url", Label = "Logo URL", Type = "text", DefaultValue = "/logo.svg", Description = "Primary logo (light background)" },
                new() { Key = "logo_dark_url", Label = "Dark Mode Logo", Type = "text", DefaultValue = "/logo-dark.svg", Description = "Logo for dark backgrounds" },
                new() { Key = "favicon_url", Label = "Favicon URL", Type = "text", DefaultValue = "/favicon.ico", Description = "Browser tab icon" },
                new() { Key = "primary_color", Label = "Primary Color", Type = "color", DefaultValue = "#0057FF", Description = "Brand primary color" },
                new() { Key = "secondary_color", Label = "Secondary Color", Type = "color", DefaultValue = "#00D27A", Description = "Brand secondary color" },
                new() { Key = "accent_color", Label = "Accent Color", Type = "color", DefaultValue = "#F59E0B", Description = "Brand accent/highlight color" },
                new() { Key = "font_family", Label = "Font Family", Type = "select", DefaultValue = "Inter", Options = ["Inter", "Poppins", "Manrope", "DM Sans", "Plus Jakarta Sans"], Description = "Platform font" },
                new() { Key = "email_branding_enabled", Label = "Email Branding", Type = "switch", DefaultValue = "true", Description = "Apply branding to outgoing emails" },
                new() { Key = "invoice_branding_enabled", Label = "Invoice Branding", Type = "switch", DefaultValue = "true", Description = "Apply branding to invoices" },
                new() { Key = "white_label_enabled", Label = "White-Label Mode", Type = "switch", DefaultValue = "false", Description = "Remove PayAfrika branding" },
            ],
        },
        new()
        {
            Id = "authentication", Label = "Authentication", Icon = "Key",
            Description = "Login, session, and identity provider settings",
            Fields =
            [
                new() { Key = "jwt_expiration", Label = "JWT Expiration (minutes)", Type = "number", DefaultValue = "60", Description = "Access token lifetime" },
                new() { Key = "refresh_token_lifetime", Label = "Refresh Token Lifetime (days)", Type = "number", DefaultValue = "7", Description = "How long refresh tokens are valid" },
                new() { Key = "session_timeout", Label = "Session Timeout (minutes)", Type = "number", DefaultValue = "30", Description = "Auto-logout after inactivity" },
                new() { Key = "max_login_attempts", Label = "Max Login Attempts", Type = "number", DefaultValue = "5", Description = "Lockout after failed attempts" },
                new() { Key = "password_min_length", Label = "Minimum Password Length", Type = "number", DefaultValue = "8", Description = "Minimum characters for passwords" },
                new() { Key = "two_factor_required", Label = "Require 2FA for Admins", Type = "switch", DefaultValue = "true", Description = "All admin accounts must have 2FA" },
                new() { Key = "sso_enabled", Label = "Single Sign-On (SSO)", Type = "switch", DefaultValue = "false", Description = "Enable SAML/OIDC SSO" },
                new() { Key = "google_login_enabled", Label = "Google Login", Type = "switch", DefaultValue = "false", Description = "Allow sign-in with Google" },
                new() { Key = "magic_link_enabled", Label = "Magic Link Login", Type = "switch", DefaultValue = "false", Description = "Allow passwordless email login" },
            ],
        },
        new()
        {
            Id = "security", Label = "Security", Icon = "Shield",
            Description = "Platform security and threat protection",
            Fields =
            [
                new() { Key = "rate_limit_enabled", Label = "Rate Limiting", Type = "switch", DefaultValue = "true", Description = "Enable API rate limiting" },
                new() { Key = "rate_limit_max", Label = "Rate Limit (requests/min)", Type = "number", DefaultValue = "60", Description = "Max requests per minute per IP" },
                new() { Key = "captcha_enabled", Label = "CAPTCHA", Type = "switch", DefaultValue = "true", Description = "Enable CAPTCHA on public forms" },
                new() { Key = "ip_whitelist", Label = "IP Whitelist", Type = "textarea", DefaultValue = "", Description = "Comma-separated allowed IPs (empty = all)" },
                new() { Key = "ip_blacklist", Label = "IP Blacklist", Type = "textarea", DefaultValue = "", Description = "Comma-separated blocked IPs" },
                new() { Key = "geolocation_restrictions", Label = "Geolocation Restrictions", Type = "select", DefaultValue = "none", Options = ["none", "whitelist", "blacklist"], Description = "Restrict access by country" },
                new() { Key = "allowed_countries", Label = "Allowed Countries", Type = "textarea", DefaultValue = "ZA,NG,KE,GH", Description = "Comma-separated ISO country codes" },
                new() { Key = "login_notifications", Label = "Login Notifications", Type = "switch", DefaultValue = "true", Description = "Email on new device login" },
                new() { Key = "security_alerts", Label = "Security Alerts", Type = "switch", DefaultValue = "true", Description = "Alert on suspicious activity" },
            ],
        },
        new()
        {
            Id = "payment_gateway", Label = "Payment Gateway", Icon = "CreditCard",
            Description = "Payment provider configuration",
            Fields =
            [
                new() { Key = "provider_flutterwave", Label = "Flutterwave", Type = "switch", DefaultValue = "true", Description = "Enable Flutterwave" },
                new() { Key = "provider_paystack", Label = "Paystack", Type = "switch", DefaultValue = "true" },
                new() { Key = "provider_ozow", Label = "Ozow", Type = "switch", DefaultValue = "true" },
                new() { Key = "provider_peachpayments", Label = "Peach Payments", Type = "switch", DefaultValue = "true" },
                new() { Key = "settlement_frequency", Label = "Settlement Frequency", Type = "select", DefaultValue = "daily", Options = ["instant", "daily", "weekly", "biweekly", "monthly"], Description = "How often merchants are settled" },
                new() { Key = "settlement_delay", Label = "Settlement Delay (days)", Type = "number", DefaultValue = "1", Description = "Hold days before settlement" },
                new() { Key = "payment_timeout", Label = "Payment Timeout (minutes)", Type = "number", DefaultValue = "30", Description = "Unpaid transaction expiry" },
                new() { Key = "payment_method_card", Label = "Card Payments", Type = "switch", DefaultValue = "true" },
                new() { Key = "payment_method_bank_transfer", Label = "Bank Transfer", Type = "switch", DefaultValue = "true" },
                new() { Key = "payment_method_mobile_money", Label = "Mobile Money", Type = "switch", DefaultValue = "true", Description = "M-Pesa, MTN MoMo, Airtel Money" },
                new() { Key = "payment_method_qr", Label = "QR Payments", Type = "switch", DefaultValue = "true" },
                new() { Key = "payment_method_wallet", Label = "Wallet Payments", Type = "switch", DefaultValue = "true" },
            ],
        },
        new()
        {
            Id = "wallet", Label = "Wallet", Icon = "Wallet",
            Description = "Digital wallet configuration",
            Fields =
            [
                new() { Key = "wallet_creation", Label = "Auto-Create Wallet on Signup", Type = "switch", DefaultValue = "true", Description = "Create wallet for every new user" },
                new() { Key = "daily_limit", Label = "Daily Transaction Limit", Type = "number", DefaultValue = "50000", Description = "Max ZAR per day" },
                new() { Key = "monthly_limit", Label = "Monthly Transaction Limit", Type = "number", DefaultValue = "500000", Description = "Max ZAR per month" },
                new() { Key = "withdrawal_limit", Label = "Daily Withdrawal Limit", Type = "number", DefaultValue = "25000", Description = "Max withdrawal per day" },
                new() { Key = "transfer_limit", Label = "Transfer Limit", Type = "number", DefaultValue = "25000", Description = "Max single transfer" },
                new() { Key = "dormant_days", Label = "Dormant Account Days", Type = "number", DefaultValue = "365", Description = "Days before marking wallet dormant" },
                new() { Key = "currencies", Label = "Supported Currencies", Type = "text", DefaultValue = "ZAR,NGN,KES,GHS,USD", Description = "Comma-separated currencies" },
                new() { Key = "auto_currency_conversion", Label = "Auto Currency Conversion", Type = "switch", DefaultValue = "true", Description = "Auto-convert between supported currencies" },
            ],
        },
        new()
        {
            Id = "merchant", Label = "Merchant Config", Icon = "Store",
            Description = "Merchant onboarding and management",
            Fields =
            [
                new() { Key = "approval_workflow", Label = "Approval Workflow", Type = "select", DefaultValue = "automatic", Options = ["automatic", "manual_review", "kyc_only"], Description = "Merchant approval process" },
                new() { Key = "default_reserve", Label = "Default Reserve Percentage", Type = "number", DefaultValue = "5", Description = "% held as reserve" },
                new() { Key = "kyc_required", Label = "KYC Required", Type = "switch", DefaultValue = "true", Description = "Require KYC for all merchants" },
                new() { Key = "max_transaction_limit", Label = "Max Transaction Limit", Type = "number", DefaultValue = "100000", Description = "Default per-transaction cap" },
            ],
        },
        new()
        {
            Id = "customer", Label = "Customer Config", Icon = "Users",
            Description = "Customer account policies",
            Fields =
            [
                new() { Key = "registration_open", Label = "Open Registration", Type = "switch", DefaultValue = "true", Description = "Allow new user signups" },
                new() { Key = "email_verification_required", Label = "Email Verification Required", Type = "switch", DefaultValue = "true" },
                new() { Key = "phone_verification_required", Label = "Phone Verification Required", Type = "switch", DefaultValue = "false" },
                new() { Key = "default_wallet_creation", Label = "Auto-Create Wallet", Type = "switch", DefaultValue = "true" },
                new() { Key = "spending_limit_enabled", Label = "Spending Limits", Type = "switch", DefaultValue = "true" },
                new() { Key = "dormant_account_policy", Label = "Dormant Account Policy (days)", Type = "number", DefaultValue = "180" },
            ],
        },
        new()
        {
            Id = "kyc_compliance", Label = "KYC & Compliance", Icon = "ShieldCheck",
            Description = "Identity verification and regulatory compliance",
            Fields =
            [
                new() { Key = "verification_levels", Label = "Verification Levels", Type = "number", DefaultValue = "3", Description = "Number of KYC tiers" },
                new() { Key = "required_documents", Label = "Required Documents", Type = "textarea", DefaultValue = "national_id,passport,drivers_license,proof_of_address", Description = "Comma-separated document types" },
                new() { Key = "aml_screening", Label = "AML Screening", Type = "switch", DefaultValue = "true", Description = "Anti-money laundering checks" },
                new() { Key = "sanctions_screening", Label = "Sanctions Screening", Type = "switch", DefaultValue = "true", Description = "UN/OFAC sanctions list check" },
                new() { Key = "pep_checks", Label = "PEP Checks", Type = "switch", DefaultValue = "true", Description = "Politically exposed person screening" },
                new() { Key = "document_expiry_warning", Label = "Document Expiry Warning (days)", Type = "number", DefaultValue = "30", Description = "Warn before document expiry" },
                new() { Key = "auto_approve_threshold", Label = "Auto-Approve Confidence Score", Type = "number", DefaultValue = "85", Description = "AI score threshold for auto-approval" },
            ],
        },
        new()
        {
            Id = "fraud_risk", Label = "Risk & Fraud", Icon = "AlertTriangle",
            Description = "Fraud detection and risk management",
            Fields =
            [
                new() { Key = "fraud_detection_enabled", Label = "Fraud Detection", Type = "switch", DefaultValue = "true", Description = "Enable AI fraud detection" },
                new() { Key = "velocity_check_enabled", Label = "Velocity Checks", Type = "switch", DefaultValue = "true", Description = "Flag rapid successive transactions" },
                new() { Key = "device_fingerprinting", Label = "Device Fingerprinting", Type = "switch", DefaultValue = "true" },
                new() { Key = "vpn_detection", Label = "VPN Detection", Type = "switch", DefaultValue = "true", Description = "Flag VPN/proxy connections" },
                new() { Key = "chargeback_threshold", Label = "Chargeback Threshold (%)", Type = "number", DefaultValue = "1", Description = "Alert when chargeback rate exceeds" },
                new() { Key = "high_risk_countries", Label = "High-Risk Countries", Type = "textarea", DefaultValue = "", Description = "Comma-separated country codes" },
                new() { Key = "ai_risk_scoring", Label = "AI Risk Scoring", Type = "switch", DefaultValue = "true", Description = "Machine learning risk assessment" },
            ],
        },
        new()
        {
            Id = "fees_pricing", Label = "Fees & Pricing", Icon = "Percent",
            Description = "Transaction fees and pricing rules",
            Fields =
            [
                new() { Key = "transaction_fee_percentage", Label = "Transaction Fee (%)", Type = "number", DefaultValue = "2.9", Description = "Per-transaction percentage fee" },
                new() { Key = "transaction_fee_fixed", Label = "Transaction Fee (fixed)", Type = "number", DefaultValue = "2.00", Description = "Fixed fee per transaction in ZAR" },
                new() { Key = "withdrawal_fee", Label = "Withdrawal Fee", Type = "number", DefaultValue = "5.00", Description = "Flat withdrawal fee" },
                new() { Key = "merchant_fee_percentage", Label = "Merchant Discount Rate (%)", Type = "number", DefaultValue = "2.5", Description = "Fee charged to merchants" },
                new() { Key = "affiliate_commission_rate", Label = "Default Affiliate Commission (%)", Type = "number", DefaultValue = "5", Description = "Default affiliate commission rate" },
                new() { Key = "vat_rate", Label = "VAT Rate (%)", Type = "number", DefaultValue = "15", Description = "Value-added tax percentage" },
            ],
        },
        new()
        {
            Id = "exchange_rates", Label = "Exchange Rates", Icon = "ArrowLeftRight",
            Description = "Currency exchange configuration",
            Fields =
            [
                new() { Key = "base_currency", Label = "Base Currency", Type = "select", DefaultValue = "ZAR", Options = ["ZAR", "USD", "EUR"], Description = "Base currency for FX rates" },
                new() { Key = "auto_update", Label = "Auto-Update Rates", Type = "switch", DefaultValue = "true", Description = "Fetch live rates automatically" },
                new() { Key = "update_interval", Label = "Update Interval (hours)", Type = "number", DefaultValue = "6", Description = "How often rates are refreshed" },
                new() { Key = "fx_margin", Label = "FX Margin (%)", Type = "number", DefaultValue = "1.5", Description = "Markup on interbank rates" },
                new() { Key = "api_provider", Label = "Rate Provider", Type = "select", DefaultValue = "openexchangerates", Options = ["openexchangerates", "fixer", "exchangerate-api"], Description = "Third-party rate source" },
            ],
        },
        new()
        {
            Id = "notifications", Label = "Notifications", Icon = "Bell",
            Description = "Alert and notification channel configuration",
            Fields =
            [
                new() { Key = "email_notifications", Label = "Email Notifications", Type = "switch", DefaultValue = "true" },
                new() { Key = "sms_notifications", Label = "SMS Notifications", Type = "switch", DefaultValue = "true" },
                new() { Key = "push_notifications", Label = "Push Notifications", Type = "switch", DefaultValue = "true" },
                new() { Key = "whatsapp_notifications", Label = "WhatsApp Notifications", Type = "switch", DefaultValue = "false" },
                new() { Key = "notify_payment_success", Label = "Payment Success Events", Type = "switch", DefaultValue = "true" },
                new() { Key = "notify_payment_failed", Label = "Payment Failed Events", Type = "switch", DefaultValue = "true" },
                new() { Key = "notify_refund", Label = "Refund Events", Type = "switch", DefaultValue = "true" },
                new() { Key = "notify_wallet_activity", Label = "Wallet Activity", Type = "switch", DefaultValue = "true" },
                new() { Key = "notify_kyc_updates", Label = "KYC Updates", Type = "switch", DefaultValue = "true" },
                new() { Key = "notify_settlements", Label = "Settlement Events", Type = "switch", DefaultValue = "true" },
                new() { Key = "notify_security", Label = "Security Alerts", Type = "switch", DefaultValue = "true" },
            ],
        },
        new()
        {
            Id = "email", Label = "Email Configuration", Icon = "Mail",
            Description = "SMTP and email provider settings",
            Fields =
            [
                new() { Key = "provider", Label = "Email Provider", Type = "select", DefaultValue = "smtp", Options = ["smtp", "sendgrid", "ses", "mailgun", "postmark"], Description = "Email service provider" },
                new() { Key = "smtp_host", Label = "SMTP Host", Type = "text", DefaultValue = "smtp.sendgrid.net" },
                new() { Key = "smtp_port", Label = "SMTP Port", Type = "number", DefaultValue = "587", Options = ["25", "465", "587", "2525"] },
                new() { Key = "smtp_username", Label = "SMTP Username", Type = "text", DefaultValue = "apikey" },
                new() { Key = "smtp_password", Label = "SMTP Password", Type = "password", DefaultValue = "", IsEncrypted = true },
                new() { Key = "from_email", Label = "From Email", Type = "email", DefaultValue = "noreply@payafrika.com" },
                new() { Key = "from_name", Label = "From Name", Type = "text", DefaultValue = "PayAfrika" },
                new() { Key = "send_test_to", Label = "Send Test To", Type = "email", DefaultValue = "", Description = "Email address for test message" },
            ],
        },
        new()
        {
            Id = "sms", Label = "SMS Configuration", Icon = "MessageSquare",
            Description = "SMS provider settings",
            Fields =
            [
                new() { Key = "provider", Label = "SMS Provider", Type = "select", DefaultValue = "africas_talking", Options = ["africas_talking", "twilio", "infobip", "clickatell", "vonage"] },
                new() { Key = "api_key", Label = "API Key", Type = "password", DefaultValue = "", IsEncrypted = true },
                new() { Key = "sender_id", Label = "Sender ID", Type = "text", DefaultValue = "PayAfrika", Description = "SMS sender name/number" },
                new() { Key = "test_number", Label = "Test Phone Number", Type = "tel", DefaultValue = "", Description = "Number for test SMS" },
            ],
        },
        new()
        {
            Id = "api_webhooks", Label = "API & Webhooks", Icon = "Code2",
            Description = "API keys, webhooks, and rate limits",
            Fields =
            [
                new() { Key = "api_rate_limit", Label = "API Rate Limit (req/min)", Type = "number", DefaultValue = "1000", Description = "API key rate limit" },
                new() { Key = "webhook_retry_count", Label = "Webhook Retry Count", Type = "number", DefaultValue = "3" },
                new() { Key = "webhook_timeout", Label = "Webhook Timeout (seconds)", Type = "number", DefaultValue = "10" },
                new() { Key = "api_version", Label = "API Version", Type = "text", DefaultValue = "v1", Description = "Current API version header" },
                new() { Key = "sandbox_mode", Label = "Sandbox Mode", Type = "switch", DefaultValue = "false", Description = "Enable sandbox/test environment" },
            ],
        },
        new()
        {
            Id = "integrations", Label = "Integrations", Icon = "Puzzle",
            Description = "Third-party platform integrations",
            Fields =
            [
                new() { Key = "shopify_enabled", Label = "Shopify", Type = "switch", DefaultValue = "false" },
                new() { Key = "woocommerce_enabled", Label = "WooCommerce", Type = "switch", DefaultValue = "false" },
                new() { Key = "salesforce_enabled", Label = "Salesforce", Type = "switch", DefaultValue = "false" },
                new() { Key = "hubspot_enabled", Label = "HubSpot", Type = "switch", DefaultValue = "false" },
                new() { Key = "quickbooks_enabled", Label = "QuickBooks", Type = "switch", DefaultValue = "false" },
                new() { Key = "xero_enabled", Label = "Xero", Type = "switch", DefaultValue = "false" },
                new() { Key = "slack_enabled", Label = "Slack", Type = "switch", DefaultValue = "false" },
                new() { Key = "zapier_enabled", Label = "Zapier", Type = "switch", DefaultValue = "false" },
            ],
        },
        new()
        {
            Id = "cms", Label = "CMS Settings", Icon = "FileText",
            Description = "Content management configuration",
            Fields =
            [
                new() { Key = "blog_enabled", Label = "Blog Enabled", Type = "switch", DefaultValue = "true" },
                new() { Key = "seo_default_title", Label = "SEO Default Title", Type = "text", DefaultValue = "PayAfrika - African Payment Gateway" },
                new() { Key = "seo_default_description", Label = "SEO Default Description", Type = "textarea", DefaultValue = "PayAfrika is the leading African payment gateway for global commerce." },
                new() { Key = "media_max_size", Label = "Max Upload Size (MB)", Type = "number", DefaultValue = "10" },
                new() { Key = "media_allowed_types", Label = "Allowed Media Types", Type = "text", DefaultValue = "jpg,png,gif,webp,svg,pdf,doc,docx", Description = "Comma-separated extensions" },
            ],
        },
        new()
        {
            Id = "affiliate", Label = "Affiliate Program", Icon = "UsersRound",
            Description = "Referral and affiliate settings",
            Fields =
            [
                new() { Key = "program_enabled", Label = "Affiliate Program", Type = "switch", DefaultValue = "true", Description = "Enable the affiliate system" },
                new() { Key = "default_commission_rate", Label = "Default Commission Rate (%)", Type = "number", DefaultValue = "5" },
                new() { Key = "cookie_duration", Label = "Cookie Duration (days)", Type = "number", DefaultValue = "30", Description = "Referral tracking window" },
                new() { Key = "minimum_payout", Label = "Minimum Payout (ZAR)", Type = "number", DefaultValue = "100" },
                new() { Key = "approval_required", Label = "Approval Required", Type = "switch", DefaultValue = "true", Description = "Admin must approve affiliates" },
                new() { Key = "bonus_enabled", Label = "Signup Bonus", Type = "switch", DefaultValue = "true" },
                new() { Key = "bonus_amount", Label = "Signup Bonus Amount (ZAR)", Type = "number", DefaultValue = "50" },
            ],
        },
        new()
        {
            Id = "audit", Label = "Audit Policies", Icon = "Search",
            Description = "Audit logging and compliance retention",
            Fields =
            [
                new() { Key = "log_retention_days", Label = "Log Retention (days)", Type = "number", DefaultValue = "365", Description = "How long to retain audit logs" },
                new() { Key = "export_require_permission", Label = "Require Permission for Export", Type = "switch", DefaultValue = "true" },
                new() { Key = "mask_sensitive_data", Label = "Mask Sensitive Data", Type = "switch", DefaultValue = "true", Description = "Mask PII in logs" },
                new() { Key = "alert_on_admin_action", Label = "Alert on Admin Actions", Type = "switch", DefaultValue = "true" },
            ],
        },
        new()
        {
            Id = "regional", Label = "Regional Settings", Icon = "MapPin",
            Description = "Country, language, and locale configuration",
            Fields =
            [
                new() { Key = "available_countries", Label = "Available Countries", Type = "text", DefaultValue = "ZA,NG,KE,GH,US,GB", Description = "Comma-separated ISO country codes" },
                new() { Key = "available_languages", Label = "Available Languages", Type = "text", DefaultValue = "en,fr,pt,ar,sw", Description = "Comma-separated language codes" },
                new() { Key = "available_currencies", Label = "Available Currencies", Type = "text", DefaultValue = "ZAR,NGN,KES,GHS,USD,EUR,GBP" },
            ],
        },
        new()
        {
            Id = "maintenance", Label = "Maintenance", Icon = "Wrench",
            Description = "Maintenance mode and system status",
            Fields =
            [
                new() { Key = "maintenance_mode", Label = "Maintenance Mode", Type = "switch", DefaultValue = "false", Description = "Show maintenance page to users" },
                new() { Key = "maintenance_message", Label = "Maintenance Message", Type = "textarea", DefaultValue = "We are currently performing scheduled maintenance. We'll be back shortly.", Description = "Message displayed to users" },
                new() { Key = "maintenance_allowed_ips", Label = "Allowed IPs During Maintenance", Type = "textarea", DefaultValue = "", Description = "IPs that can bypass maintenance" },
                new() { Key = "read_only_mode", Label = "Read-Only Mode", Type = "switch", DefaultValue = "false", Description = "Block write operations" },
            ],
        },
        new()
        {
            Id = "backup", Label = "Backup & Recovery", Icon = "HardDrive",
            Description = "Automatic backup configuration",
            Fields =
            [
                new() { Key = "auto_backup", Label = "Automatic Backups", Type = "switch", DefaultValue = "true" },
                new() { Key = "backup_schedule", Label = "Backup Schedule", Type = "select", DefaultValue = "daily", Options = ["hourly", "daily", "weekly", "monthly"] },
                new() { Key = "backup_retention", Label = "Backup Retention (days)", Type = "number", DefaultValue = "30" },
                new() { Key = "backup_encryption", Label = "Encrypt Backups", Type = "switch", DefaultValue = "true" },
                new() { Key = "cloud_storage_provider", Label = "Cloud Storage Provider", Type = "select", DefaultValue = "azure", Options = ["azure", "aws_s3", "gcs", "local"] },
            ],
        },
        new()
        {
            Id = "performance", Label = "Performance", Icon = "Zap",
            Description = "Caching and performance optimization",
            Fields =
            [
                new() { Key = "cache_enabled", Label = "Caching Enabled", Type = "switch", DefaultValue = "true" },
                new() { Key = "cache_ttl", Label = "Cache TTL (seconds)", Type = "number", DefaultValue = "300" },
                new() { Key = "cdn_enabled", Label = "CDN Enabled", Type = "switch", DefaultValue = "true" },
                new() { Key = "image_optimization", Label = "Image Optimization", Type = "switch", DefaultValue = "true" },
                new() { Key = "background_jobs_enabled", Label = "Background Jobs", Type = "switch", DefaultValue = "true" },
            ],
        },
        new()
        {
            Id = "feature_flags", Label = "Feature Flags", Icon = "Flag",
            Description = "Beta features and progressive rollout",
            Fields =
            [
                new() { Key = "beta_loans", Label = "Loans Module", Type = "switch", DefaultValue = "true" },
                new() { Key = "beta_cross_border", Label = "Cross-Border Payments", Type = "switch", DefaultValue = "true" },
                new() { Key = "beta_currency_exchange", Label = "Currency Exchange", Type = "switch", DefaultValue = "true" },
                new() { Key = "beta_business_banking", Label = "Business Banking", Type = "switch", DefaultValue = "true" },
                new() { Key = "beta_affiliate_program", Label = "Affiliate Program", Type = "switch", DefaultValue = "true" },
                new() { Key = "beta_cms", Label = "Content Management", Type = "switch", DefaultValue = "true" },
                new() { Key = "beta_api_sandbox", Label = "API Sandbox", Type = "switch", DefaultValue = "false" },
                new() { Key = "beta_ai_insights", Label = "AI Insights", Type = "switch", DefaultValue = "true" },
            ],
        },
        new()
        {
            Id = "developer", Label = "Developer Settings", Icon = "Terminal",
            Description = "Developer tools and diagnostics",
            Fields =
            [
                new() { Key = "debug_mode", Label = "Debug Mode", Type = "switch", DefaultValue = "false", Description = "Enable detailed error messages" },
                new() { Key = "api_docs_enabled", Label = "API Documentation", Type = "switch", DefaultValue = "true" },
                new() { Key = "webhook_logging", Label = "Webhook Logging", Type = "switch", DefaultValue = "true", Description = "Log all webhook events" },
                new() { Key = "queue_monitoring", Label = "Queue Monitoring", Type = "switch", DefaultValue = "true" },
                new() { Key = "health_checks_enabled", Label = "Health Checks", Type = "switch", DefaultValue = "true" },
                new() { Key = "cron_jobs_enabled", Label = "Cron Jobs", Type = "switch", DefaultValue = "true" },
            ],
        },
    ];

    private static List<PlatformSettingsField> GetDefaultFields(string category)
    {
        var cat = GetCategoryDefinitions().FirstOrDefault(c => c.Id == category);
        return cat?.Fields.Select(f => new PlatformSettingsField
        {
            Key = f.Key,
            Label = f.Label,
            Type = f.Type,
            DefaultValue = f.DefaultValue,
            Description = f.Description,
        }).ToList() ?? [];
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
}
