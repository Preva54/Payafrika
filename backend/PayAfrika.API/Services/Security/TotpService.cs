using System.Security.Cryptography;

namespace PayAfrika.API.Services.Security;

/// <summary>
/// RFC 6238 TOTP implementation (HMAC-SHA1, 30-second period, 6 digits)
/// compatible with Google Authenticator and other authenticator apps.
/// </summary>
public interface ITotpService
{
    string GenerateSecret();
    string GenerateCode(string secret, DateTime? timestamp = null);
    bool ValidateCode(string secret, string code, int clockDriftToleranceSeconds = 60);
    string BuildOtpAuthUrl(string accountName, string secret, string issuer = "PayAfrika");
}

public class TotpService : ITotpService
{
    private const int PeriodSeconds = 30;
    private const int Digits = 6;
    private static readonly DateTime UnixEpoch = new(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc);

    public string GenerateSecret()
        => Base32Encode(RandomNumberGenerator.GetBytes(20));

    public string GenerateCode(string secret, DateTime? timestamp = null)
    {
        var timeStep = (long)(((timestamp ?? DateTime.UtcNow) - UnixEpoch).TotalSeconds / PeriodSeconds);
        var counter = BitConverter.GetBytes(timeStep);
        if (BitConverter.IsLittleEndian) Array.Reverse(counter);

        using var hmac = new HMACSHA1(FromBase32(secret));
        var hash = hmac.ComputeHash(counter);

        var offset = hash[^1] & 0x0F;
        var binary = ((hash[offset] & 0x7F) << 24)
                     | ((hash[offset + 1] & 0xFF) << 16)
                     | ((hash[offset + 2] & 0xFF) << 8)
                     | (hash[offset + 3] & 0xFF);

        return (binary % (int)Math.Pow(10, Digits)).ToString($"D{Digits}");
    }

    public bool ValidateCode(string secret, string code, int clockDriftToleranceSeconds = 60)
    {
        if (string.IsNullOrWhiteSpace(code) || code.Length != Digits || !code.All(char.IsDigit))
            return false;

        var now = DateTime.UtcNow;
        var steps = clockDriftToleranceSeconds / PeriodSeconds;
        for (var i = -steps; i <= steps; i++)
        {
            var candidate = GenerateCode(secret, now.AddSeconds(i * PeriodSeconds));
            if (FixedTimeEquals(candidate, code)) return true;
        }

        return false;
    }

    public string BuildOtpAuthUrl(string accountName, string secret, string issuer = "PayAfrika")
        => $"otpauth://totp/{Uri.EscapeDataString(issuer)}:{Uri.EscapeDataString(accountName)}?secret={secret}&issuer={Uri.EscapeDataString(issuer)}&digits={Digits}&period={PeriodSeconds}";

    private static bool FixedTimeEquals(string a, string b)
    {
        if (a.Length != b.Length) return false;
        var result = 0;
        for (var i = 0; i < a.Length; i++)
            result |= a[i] ^ b[i];
        return result == 0;
    }

    private static string Base32Encode(byte[] data)
    {
        const string alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        var output = new System.Text.StringBuilder();
        var bits = 0;
        var value = 0;
        foreach (var b in data)
        {
            value = (value << 8) | b;
            bits += 8;
            while (bits >= 5)
            {
                output.Append(alphabet[(value >> (bits - 5)) & 31]);
                bits -= 5;
            }
        }
        if (bits > 0)
            output.Append(alphabet[(value << (5 - bits)) & 31]);
        return output.ToString();
    }

    private static byte[] FromBase32(string input)
    {
        const string alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        var cleaned = input.ToUpperInvariant().Replace(" ", "").TrimEnd('=');
        var bits = 0;
        var value = 0;
        var bytes = new System.Collections.Generic.List<byte>();
        foreach (var c in cleaned)
        {
            var idx = alphabet.IndexOf(c);
            if (idx < 0) continue;
            value = (value << 5) | idx;
            bits += 5;
            if (bits >= 8)
            {
                bytes.Add((byte)((value >> (bits - 8)) & 0xFF));
                bits -= 8;
            }
        }
        return bytes.ToArray();
    }
}
