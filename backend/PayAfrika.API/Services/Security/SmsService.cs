using System.Net.Http.Json;
using Microsoft.Extensions.Options;
using PayAfrika.API.Services;

namespace PayAfrika.API.Services.Security;

public class SmsOptions
{
    public bool Enabled { get; set; } = false;
    public string Provider { get; set; } = "twilio"; // twilio | termii
    public string AccountSid { get; set; } = string.Empty;
    public string AuthToken { get; set; } = string.Empty;
    public string FromNumber { get; set; } = string.Empty;
    public string TermiiApiKey { get; set; } = string.Empty;
    public string TermiiSenderId { get; set; } = "PayAfrika";
    public string TermiiChannel { get; set; } = "generic";
}

public interface ISmsService
{
    Task SendOtpAsync(string phoneNumber, string otp, string purpose, string? countryCode = null);
    Task SendGenericAsync(string phoneNumber, string message);
}

public class SmsService : ISmsService
{
    private readonly SmsOptions _options;
    private readonly IAuditService _audit;
    private static readonly HttpClient _http = new() { Timeout = TimeSpan.FromSeconds(15) };

    public SmsService(IOptions<SmsOptions> options, IAuditService audit)
    {
        _options = options.Value;
        _audit = audit;
    }

    public async Task SendOtpAsync(string phoneNumber, string otp, string purpose, string? countryCode = null)
    {
        var message = $"Your PayAfrika code is {otp}. It expires in 5 minutes. Never share this code with anyone. {purpose switch
        {
            "login" => "You're signing in to your PayAfrika account.",
            "transaction" => "You're approving a transaction.",
            "withdrawal" => "You're approving a withdrawal.",
            "new_device" => "A new device is signing in to your account.",
            "password_reset" => "You requested a password reset.",
            "phone_verify" => "You're verifying your phone number.",
            "settings" => "You're updating your security settings.",
            _ => "Ignore this if you didn't request it."
        }}";

        await SendGenericAsync(NormalizePhone(phoneNumber, countryCode), message);
    }

    public async Task SendGenericAsync(string phoneNumber, string message)
    {
        await _audit.LogAsync(new AuditLogEntry
        {
            Action = "sms_sent",
            Module = "sms",
            Resource = "phone",
            ResourceId = MaskPhone(phoneNumber),
            Metadata = $"{{\"message\":\"{EscapeJson(message)}\"}}"
        });

        if (!_options.Enabled)
        {
            Console.WriteLine($"[SmsService][disabled] To={phoneNumber} Message={message}");
            return;
        }

        try
        {
            var (ok, detail) = _options.Provider.ToLowerInvariant() switch
            {
                "termii" => await SendViaTermiiAsync(phoneNumber, message),
                _ => await SendViaTwilioAsync(phoneNumber, message)
            };

            await _audit.LogAsync(new AuditLogEntry
            {
                Action = ok ? "sms_delivered" : "sms_failed",
                Module = "sms",
                Resource = "phone",
                ResourceId = MaskPhone(phoneNumber),
                Result = ok ? "success" : "error",
                Severity = ok ? "info" : "warning",
                Metadata = $"{{\"detail\":\"{EscapeJson(detail)}\"}}"
            });

            if (!ok) Console.WriteLine($"[SmsService][error] To={phoneNumber} Detail={detail}");
        }
        catch (Exception ex)
        {
            await _audit.LogAsync(new AuditLogEntry
            {
                Action = "sms_failed",
                Module = "sms",
                Resource = "phone",
                ResourceId = MaskPhone(phoneNumber),
                Result = "error",
                Severity = "warning",
                Metadata = $"{{\"error\":\"{EscapeJson(ex.Message)}\"}}"
            });
            Console.WriteLine($"[SmsService][error] To={phoneNumber} Error={ex.Message}");
        }
    }

    private async Task<(bool Ok, string Detail)> SendViaTwilioAsync(string phoneNumber, string message)
    {
        var auth = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes($"{_options.AccountSid}:{_options.AuthToken}"));
        var uri = $"https://api.twilio.com/2010-04-01/Accounts/{_options.AccountSid}/Messages.json";
        using var request = new HttpRequestMessage(HttpMethod.Post, uri);
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", auth);
        request.Content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["To"] = phoneNumber,
            ["From"] = _options.FromNumber,
            ["Body"] = message
        });

        using var response = await _http.SendAsync(request);
        var body = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode)
            return (false, $"Twilio {(int)response.StatusCode}: {body}");

        using var json = System.Text.Json.JsonDocument.Parse(body);
        var status = json.RootElement.TryGetProperty("status", out var s) ? s.GetString() : "";
        return (true, status ?? "");
    }

    private async Task<(bool Ok, string Detail)> SendViaTermiiAsync(string phoneNumber, string message)
    {
        var payload = new
        {
            to = phoneNumber,
            from = _options.TermiiSenderId,
            sms = message,
            type = "plain",
            channel = _options.TermiiChannel,
            api_key = _options.TermiiApiKey
        };

        using var response = await _http.PostAsJsonAsync("https://api.ng.termii.com/api/sms/send", payload);
        var body = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode)
            return (false, $"Termii {(int)response.StatusCode}: {body}");

        using var json = System.Text.Json.JsonDocument.Parse(body);
        var status = json.RootElement.TryGetProperty("message", out var m) ? m.GetString() : "";
        return (true, status ?? "");
    }

    private static string NormalizePhone(string phone, string? countryCode = null)
    {
        var cleaned = phone.Replace(" ", "").Replace("-", "").Trim();
        if (cleaned.StartsWith("0") && cleaned.Length == 10 && countryCode == "NG")
            cleaned = "+234" + cleaned[1..];
        if (cleaned.StartsWith("234") && cleaned.Length == 13)
            cleaned = "+" + cleaned;
        return cleaned;
    }

    private static string MaskPhone(string phone)
    {
        if (phone.Length <= 6) return "****";
        return phone[..3] + "****" + phone[^3..];
    }

    private static string EscapeJson(string value)
        => value.Replace("\\", "\\\\").Replace("\"", "\\\"");
}
