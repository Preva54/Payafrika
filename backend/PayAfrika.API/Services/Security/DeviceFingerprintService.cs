using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Http;
using PayAfrika.API.DTOs;

namespace PayAfrika.API.Services.Security;

public interface IDeviceFingerprintService
{
    DeviceFingerprint Capture(HttpContext context);
    string ComputeFingerprintHash(DeviceFingerprint fingerprint);
    string ResolveBrowser(string userAgent);
    string ResolveOs(string userAgent);
    string ResolveDeviceType(string userAgent);
    string ResolveLocation(string ipAddress, string? city = null, string? country = null);
}

public partial class DeviceFingerprintService : IDeviceFingerprintService
{
    public DeviceFingerprint Capture(HttpContext context)
    {
        var ua = context.Request.Headers.UserAgent.FirstOrDefault() ?? "";

        return new DeviceFingerprint
        {
            DeviceId = context.Request.Headers["X-Device-Id"].FirstOrDefault(),
            DeviceName = BuildDeviceName(ua),
            DeviceType = ResolveDeviceType(ua),
            ScreenResolution = context.Request.Headers["X-Screen-Resolution"].FirstOrDefault(),
            BrowserLanguage = context.Request.Headers.AcceptLanguage.FirstOrDefault()?.Split(',').FirstOrDefault()?.Trim(),
            TimeZone = context.Request.Headers["X-Timezone"].FirstOrDefault()
        };
    }

    public string ComputeFingerprintHash(DeviceFingerprint fp)
    {
        if (fp == null) return string.Empty;
        var stable = string.Join("|",
            Normalize(fp.DeviceId ?? ""),
            Normalize(fp.Browser ?? ""),
            Normalize(fp.DeviceType ?? ""),
            Normalize(fp.ScreenResolution ?? ""),
            Normalize(fp.BrowserLanguage ?? ""),
            Normalize(fp.TimeZone ?? ""));
        if (string.IsNullOrWhiteSpace(stable)) return string.Empty;

        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(stable))).ToLowerInvariant();
    }

    public string ResolveBrowser(string userAgent)
    {
        if (string.IsNullOrWhiteSpace(userAgent)) return "Unknown";
        if (userAgent.Contains("Edg/")) return "Edge";
        if (userAgent.Contains("OPR/") || userAgent.Contains("Opera")) return "Opera";
        if (userAgent.Contains("Chrome/")) return "Chrome";
        if (userAgent.Contains("Firefox/")) return "Firefox";
        if (userAgent.Contains("Safari/")) return "Safari";
        if (userAgent.Contains("MSIE") || userAgent.Contains("Trident/")) return "Internet Explorer";
        return "Unknown";
    }

    public string ResolveOs(string userAgent)
    {
        if (string.IsNullOrWhiteSpace(userAgent)) return "Unknown";
        if (userAgent.Contains("Windows NT 10")) return "Windows 10/11";
        if (userAgent.Contains("Windows NT 6.3")) return "Windows 8.1";
        if (userAgent.Contains("Windows NT 6.1")) return "Windows 7";
        if (userAgent.Contains("Android")) return "Android";
        if (userAgent.Contains("iPhone") || userAgent.Contains("iPad") || userAgent.Contains("iPod"))
            return userAgent.Contains("iPad") ? "iPadOS" : "iOS";
        if (userAgent.Contains("Mac OS X")) return "macOS";
        if (userAgent.Contains("Linux")) return "Linux";
        return "Unknown";
    }

    public string ResolveDeviceType(string userAgent)
    {
        if (string.IsNullOrWhiteSpace(userAgent)) return "web";
        if (userAgent.Contains("Android") && userAgent.Contains("Mobile")) return "mobile";
        if (userAgent.Contains("iPhone") || userAgent.Contains("iPod")) return "mobile";
        if (userAgent.Contains("iPad") || userAgent.Contains("Tablet") || userAgent.Contains("Kindle")) return "tablet";
        return "desktop";
    }

    public string ResolveLocation(string ipAddress, string? city = null, string? country = null)
    {
        if (!string.IsNullOrWhiteSpace(city) || !string.IsNullOrWhiteSpace(country))
            return string.Join(", ", new[] { city, country }.Where(x => !string.IsNullOrWhiteSpace(x)));

        if (IsPrivateIp(ipAddress) || string.IsNullOrWhiteSpace(ipAddress))
            return "Local network";

        return "Nigeria"; // GeoIP resolution is intentionally conservative by default
    }

    private static string GetClientIp(HttpContext context)
    {
        var forwarded = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(forwarded))
            return forwarded.Split(',')[0].Trim();

        var realIp = context.Request.Headers["X-Real-IP"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(realIp))
            return realIp.Trim();

        return context.Connection.RemoteIpAddress?.ToString() ?? "";
    }

    private static string BuildDeviceName(string userAgent)
    {
        var os = "";
        if (userAgent.Contains("Windows")) os = "Windows";
        else if (userAgent.Contains("Mac OS X")) os = "Mac";
        else if (userAgent.Contains("iPhone")) os = "iPhone";
        else if (userAgent.Contains("iPad")) os = "iPad";
        else if (userAgent.Contains("Android")) os = "Android";
        else if (userAgent.Contains("Linux")) os = "Linux";

        var browser = "";
        if (userAgent.Contains("Chrome")) browser = "Chrome";
        else if (userAgent.Contains("Firefox")) browser = "Firefox";
        else if (userAgent.Contains("Safari")) browser = "Safari";
        else if (userAgent.Contains("Edg/")) browser = "Edge";

        return string.IsNullOrWhiteSpace(os) ? "Web browser" : $"{os} - {browser}".TrimEnd('-', ' ');
    }

    private static string Normalize(string value)
        => value?.Trim().ToLowerInvariant().Replace(" ", "") ?? "";

    private static bool IsPrivateIp(string? ip)
    {
        if (string.IsNullOrWhiteSpace(ip)) return true;
        if (ip == "::1" || ip.StartsWith("127.") || ip.StartsWith("10.") ||
            ip.StartsWith("192.168.") || ip.StartsWith("172.16.") ||
            ip.StartsWith("169.254.") || ip.StartsWith("0.")) return true;
        return false;
    }

    [GeneratedRegex("[^a-zA-Z0-9]")]
    private static partial Regex NonAlphanumericRegex();
}
