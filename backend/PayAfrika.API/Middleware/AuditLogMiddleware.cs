using System.Diagnostics;
using System.Security.Claims;
using Microsoft.AspNetCore.Http.Extensions;
using PayAfrika.API.Services;

namespace PayAfrika.API.Middleware;

public class AuditLogMiddleware
{
    private readonly RequestDelegate _next;
    private readonly string[] _excludedPaths = { "/swagger", "/openapi", "/health", "/favicon.ico" };
    private readonly string[] _excludedMethods = { "OPTIONS", "HEAD" };

    public AuditLogMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, IAuditService auditService)
    {
        foreach (var path in _excludedPaths)
            if (context.Request.Path.StartsWithSegments(path, StringComparison.OrdinalIgnoreCase))
            {
                await _next(context);
                return;
            }

        foreach (var method in _excludedMethods)
            if (context.Request.Method.Equals(method, StringComparison.OrdinalIgnoreCase))
            {
                await _next(context);
                return;
            }

        var sw = Stopwatch.StartNew();
        var originalBodyStream = context.Response.Body;
        using var responseBody = new MemoryStream();
        context.Response.Body = responseBody;

        try
        {
            await _next(context);
        }
        finally
        {
            sw.Stop();
            responseBody.Seek(0, SeekOrigin.Begin);
            context.Response.Body = originalBodyStream;

            var statusCode = context.Response.StatusCode;
            var isError = statusCode >= 400;

            if (isError || ShouldLogAction(context.Request.Method, context.Request.Path))
            {
                var userId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var userAgent = context.Request.Headers.UserAgent.FirstOrDefault() ?? "";

                var severity = statusCode >= 500 ? "critical" :
                               statusCode >= 400 ? "medium" :
                               statusCode >= 300 ? "low" : "info";

                await auditService.LogAsync(new AuditLogEntry
                {
                    UserId = userId != null && Guid.TryParse(userId, out var uid) ? uid : null,
                    UserName = context.User.FindFirst(ClaimTypes.Name)?.Value ?? "",
                    UserRole = context.User.FindFirst(ClaimTypes.Role)?.Value ?? "",
                    Email = context.User.FindFirst(ClaimTypes.Email)?.Value ?? "",
                    Action = MapMethodToAction(context.Request.Method),
                    Module = GetModuleFromPath(context.Request.Path),
                    Resource = context.Request.Path,
                    ResourceId = context.Request.RouteValues["id"]?.ToString() ?? "",
                    IPAddress = context.Connection.RemoteIpAddress?.ToString() ?? "",
                    UserAgent = userAgent,
                    Endpoint = context.Request.Path,
                    HttpMethod = context.Request.Method,
                    HttpStatus = statusCode,
                    Result = statusCode < 400 ? "success" : "failed",
                    Severity = severity,
                    ResponseTimeMs = sw.ElapsedMilliseconds,
                    Department = "",
                    IsSecurityAlert = IsSecurityAlert(statusCode, context.Request.Path),
                });
            }

            await responseBody.CopyToAsync(originalBodyStream);
        }
    }

    private static bool ShouldLogAction(string method, string path)
    {
        var p = new PathString(path);
        if (new[] { "POST", "PUT", "PATCH", "DELETE" }.Contains(method, StringComparer.OrdinalIgnoreCase))
            return true;
        if (method.Equals("GET", StringComparison.OrdinalIgnoreCase) && p.StartsWithSegments("/api/admin", StringComparison.OrdinalIgnoreCase))
            return true;
        if (p.StartsWithSegments("/api/auth/login", StringComparison.OrdinalIgnoreCase) ||
            p.StartsWithSegments("/api/auth/logout", StringComparison.OrdinalIgnoreCase))
            return true;
        return false;
    }

    private static bool IsSecurityAlert(int statusCode, string path)
    {
        if (statusCode == 401 || statusCode == 403) return true;
        if (path.Contains("login", StringComparison.OrdinalIgnoreCase) && statusCode >= 400) return true;
        return false;
    }

    private static string MapMethodToAction(string method) => method.ToUpperInvariant() switch
    {
        "GET" => "Read",
        "POST" => "Create",
        "PUT" => "Update",
        "PATCH" => "Update",
        "DELETE" => "Delete",
        _ => method,
    };

    private static string GetModuleFromPath(string path)
    {
        var segments = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (segments.Length < 2) return "General";
        return segments[1] switch
        {
            "auth" => "Authentication",
            "users" => "User Management",
            "admin" => "Admin",
            "loans" => "Loans",
            "payments" => "Payments",
            "wallet" => "Wallet",
            "kyc" => "KYC",
            "support" => "Support",
            "cms" => "CMS",
            "affiliates" => "Affiliate",
            "api" => "API",
            _ => segments[1],
        };
    }
}
