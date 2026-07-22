using System.Collections.Concurrent;

namespace PayAfrika.API.Middleware;

public class RateLimitingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ConcurrentDictionary<string, RateLimitEntry> _clients = new();
    private readonly int _maxRequests = 100;
    private readonly TimeSpan _window = TimeSpan.FromMinutes(1);

    public RateLimitingMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var clientIp = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var now = DateTime.UtcNow;

        var entry = _clients.GetOrAdd(clientIp, _ => new RateLimitEntry { Count = 0, WindowStart = now });

        lock (entry)
        {
            if (now - entry.WindowStart > _window)
            {
                entry.Count = 0;
                entry.WindowStart = now;
            }

            entry.Count++;

            if (entry.Count > _maxRequests)
            {
                context.Response.StatusCode = 429;
                context.Response.Headers["Retry-After"] = _window.TotalSeconds.ToString();
                context.Response.WriteAsync("Rate limit exceeded. Try again later.");
                return;
            }
        }

        await _next(context);
    }

    private class RateLimitEntry
    {
        public int Count { get; set; }
        public DateTime WindowStart { get; set; }
    }
}
