using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using PayAfrika.API.Data;
using PayAfrika.API.DTOs;

namespace PayAfrika.API.Services.Security;

public class LoginRiskResult
{
    public int RiskScore { get; set; }
    public bool IsNewDevice { get; set; }
    public bool IsNewIp { get; set; }
    public bool IsUnusualTime { get; set; }
    public bool RequiresChallenge { get; set; }
    public List<string> Flags { get; set; } = new();
}

public interface ILoginRiskService
{
    Task<LoginRiskResult> AssessAsync(
        AppDbContext db,
        Guid userId,
        DeviceFingerprint fingerprint,
        string ipAddress,
        string? existingFingerprintHash = null,
        string? existingIp = null);
}

public class LoginRiskService : ILoginRiskService
{
    private static readonly HashSet<string> FlaggedCountries = new(StringComparer.OrdinalIgnoreCase)
    {
        "CN", "KP", "RU", "IR", "SY", "VE", "CU"
    };

    public async Task<LoginRiskResult> AssessAsync(
        AppDbContext db,
        Guid userId,
        DeviceFingerprint fingerprint,
        string ipAddress,
        string? existingFingerprintHash = null,
        string? existingIp = null)
    {
        var result = new LoginRiskResult();

        var device = fingerprint?.DeviceId != null
            ? await db.ConnectedDevices.FirstOrDefaultAsync(d =>
                d.UserId == userId && d.DeviceId == fingerprint.DeviceId)
            : null;

        if (device != null)
        {
            result.IsNewDevice = false;
            if (!device.IsTrusted) result.RiskScore += 25;
        }
        else
        {
            result.IsNewDevice = true;
            result.RiskScore += 30;
            result.Flags.Add("new_device");
        }

        var now = DateTime.UtcNow;
        if (existingFingerprintHash == null)
        {
            // No prior device for this user at all - first login on fresh account is low risk
            result.RiskScore += 5;
        }
        else if (existingFingerprintHash != fingerprint?.DeviceId?.ToLowerInvariant() && !string.IsNullOrEmpty(existingFingerprintHash))
        {
            // Different device hash than last login
            result.RiskScore += 15;
            result.Flags.Add("device_changed");
        }

        if (!string.IsNullOrEmpty(existingIp) && !string.IsNullOrEmpty(ipAddress) &&
            existingIp != ipAddress)
        {
            result.IsNewIp = true;
            result.RiskScore += 15;
            result.Flags.Add("ip_changed");
        }

        var hour = now.Hour;
        if (hour < 5 || hour >= 23)
        {
            result.IsUnusualTime = true;
            result.RiskScore += 10;
            result.Flags.Add("unusual_time");
        }

        var country = ipAddress?.Split('.')?.Length == 4 ? "NG" : "";
        if (country != "" && FlaggedCountries.Contains(country))
        {
            result.RiskScore += 50;
            result.Flags.Add("flagged_country");
        }

        if (result.RiskScore > 100) result.RiskScore = 100;

        result.RequiresChallenge = result.IsNewDevice || result.RiskScore >= 40;

        return result;
    }
}
