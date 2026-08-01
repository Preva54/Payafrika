using System.Net;
using System.Net.Mail;
using System.Text;
using Microsoft.Extensions.Options;
using PayAfrika.API.Services;

namespace PayAfrika.API.Services.Security;

public class EmailOptions
{
    public string From { get; set; } = "security@payafrika.com";
    public string FromName { get; set; } = "PayAfrika Security";
    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 587;
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public bool UseSsl { get; set; } = true;
    public string AppBaseUrl { get; set; } = "http://localhost:3000";
    public bool Enabled { get; set; } = true;
}

public interface IEmailService
{
    Task SendOtpAsync(string to, string otp, string purpose, string? otpHint = null);
    Task SendPasswordResetAsync(string to, string resetToken, DateTime expiresAt);
    Task SendEmailVerificationAsync(string to, string otp);
    Task SendNewDeviceLoginAsync(string to, string deviceName, string location, string browser, DateTime loggedInAt);
    Task SendSecurityAlertAsync(string to, string subject, string message);
    Task SendGenericEmailAsync(string to, string subject, string title, string body, string ctaText = "", string ctaUrl = "");
}

public class EmailService : IEmailService
{
    private readonly EmailOptions _options;
    private readonly IAuditService _audit;

    public EmailService(IOptions<EmailOptions> options, IAuditService audit)
    {
        _options = options.Value;
        _audit = audit;
    }

    public Task SendOtpAsync(string to, string otp, string purpose, string? otpHint = null)
        => SendGenericEmailAsync(to,
            $"{purposeLabel(purpose)} - PayAfrika Security Code",
            "Your verification code",
            $"""
            <p>Your PayAfrika verification code is:</p>
            <p style="font-size:28px;font-weight:700;letter-spacing:6px;color:#0f172a;background:#f1f5f9;padding:14px 18px;border-radius:10px;text-align:center;">{otp}</p>
            <p>This code expires in <strong>5 minutes</strong> and can be used once. Never share it with anyone — PayAfrika will never ask for your code.</p>
            {(string.IsNullOrWhiteSpace(otpHint) ? "" : $"<p style=\"font-size:12px;color:#64748b;\">Hint: {otpHint}</p>")}
            """,
            "Didn't request this?",
            "Contact support immediately at support@payafrika.com");

    public Task SendPasswordResetAsync(string to, string resetToken, DateTime expiresAt)
        => SendGenericEmailAsync(to,
            "Reset your PayAfrika password",
            "Password reset requested",
            $"""
            <p>We received a request to reset your PayAfrika password.</p>
            <p>If this was you, click the button below to choose a new password. This link expires at <strong>{expiresAt.ToLocalTime():f}</strong>.</p>
            """,
            "Reset my password",
            $"{_options.AppBaseUrl}/auth/reset-password?token={resetToken}");

    public Task SendEmailVerificationAsync(string to, string otp)
        => SendGenericEmailAsync(to,
            "Verify your email address - PayAfrika",
            "Verify your email",
            $"""
            <p>Thanks for joining PayAfrika! Use the code below to verify your email address:</p>
            <p style="font-size:28px;font-weight:700;letter-spacing:6px;color:#0f172a;background:#f1f5f9;padding:14px 18px;border-radius:10px;text-align:center;">{otp}</p>
            <p>This code expires in <strong>5 minutes</strong>.</p>
            """);

    public Task SendNewDeviceLoginAsync(string to, string deviceName, string location, string browser, DateTime loggedInAt)
        => SendSecurityAlertAsync(to, "New device signed in to your account",
            $"A new device signed in to your PayAfrika account. Device: <strong>{deviceName}</strong> ({browser}) from <strong>{location}</strong> at <strong>{loggedInAt.ToLocalTime():f}</strong>. If this wasn't you, change your password immediately and contact support.");

    public Task SendSecurityAlertAsync(string to, string subject, string message)
        => SendGenericEmailAsync(to, subject, "Security alert",
            $"<p>{message}</p>",
            "Review account security",
            $"{_options.AppBaseUrl}/settings?section=security");

    public async Task SendGenericEmailAsync(string to, string subject, string title, string body, string ctaText = "", string ctaUrl = "")
    {
        await _audit.LogAsync(new AuditLogEntry
        {
            Action = "email_sent",
            Module = "email",
            Resource = "email",
            ResourceId = to,
            Metadata = $"{{\"subject\":\"{EscapeJson(subject)}\",\"to\":\"{EscapeJson(to)}\"}}",
            IsSecurityAlert = false
        });

        if (!_options.Enabled || string.IsNullOrWhiteSpace(_options.Host))
        {
            Console.WriteLine($"[EmailService][disabled] To={to} Subject={subject} Body={body}");
            return;
        }

        var ctaHtml = string.IsNullOrWhiteSpace(ctaUrl) ? "" :
            $"""<p style="text-align:center;margin:26px 0;"><a href="{ctaUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;">{ctaText}</a></p>""";

        var html = $"""
            <!DOCTYPE html>
            <html><body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
            <div style="max-width:520px;margin:24px auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
              <div style="background:#0f172a;padding:18px 26px;">
                <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:1px;">PAY<span style="color:#22c55e;">AFRIKA</span></span>
              </div>
              <div style="padding:28px 26px;">
                <h2 style="margin:0 0 14px;color:#0f172a;font-size:20px;">{title}</h2>
                <div style="color:#334155;font-size:14px;line-height:1.6;">{body}</div>
                {ctaHtml}
              </div>
              <div style="background:#f1f5f9;padding:14px 26px;font-size:11px;color:#64748b;">
                You're receiving this email because you have an account with PayAfrika. If you didn't request this, please contact us immediately at support@payafrika.com.<br/>
                © {DateTime.UtcNow.Year} PayAfrika Ltd. 12A Adeola Odeku Street, Victoria Island, Lagos, Nigeria.
              </div>
            </div></body></html>
            """;

        try
        {
            using var client = new SmtpClient(_options.Host, _options.Port)
            {
                EnableSsl = _options.UseSsl,
                Credentials = new NetworkCredential(_options.Username, _options.Password),
                Timeout = 15000
            };
            var message = new MailMessage
            {
                From = new MailAddress(_options.From, _options.FromName),
                Subject = subject,
                IsBodyHtml = true,
                Body = html
            };
            message.To.Add(to);

            await client.SendMailAsync(message);

            await _audit.LogAsync(new AuditLogEntry
            {
                Action = "email_delivered",
                Module = "email",
                Resource = "email",
                ResourceId = to,
                Metadata = $"{{\"subject\":\"{EscapeJson(subject)}\"}}"
            });
        }
        catch (Exception ex)
        {
            await _audit.LogAsync(new AuditLogEntry
            {
                Action = "email_failed",
                Module = "email",
                Resource = "email",
                ResourceId = to,
                Result = "error",
                Severity = "warning",
                Metadata = $"{{\"subject\":\"{EscapeJson(subject)}\",\"error\":\"{EscapeJson(ex.Message)}\"}}"
            });
            Console.WriteLine($"[EmailService][error] To={to} Subject={subject} Error={ex.Message}");
        }
    }

    private static string EscapeJson(string value)
        => value.Replace("\\", "\\\\").Replace("\"", "\\\"");

    private static string purposeLabel(string purpose) => purpose switch
    {
        "login" => "Sign-in",
        "transaction" => "Transaction",
        "withdrawal" => "Withdrawal",
        "password_reset" => "Password reset",
        "email_verify" => "Email verification",
        "phone_verify" => "Phone verification",
        "new_device" => "New device",
        "settings" => "Security settings",
        "kyc" => "KYC",
        _ => "Security"
    };
}
