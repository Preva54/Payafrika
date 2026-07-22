using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using PayAfrika.API.Middleware;

namespace PayAfrika.API.Tests.IntegrationTests;

public class MiddlewareTests
{
    [Fact]
    public async Task ExceptionMiddleware_CatchesAndFormatsException()
    {
        var logger = LoggerFactory.Create(b => { }).CreateLogger<ExceptionMiddleware>();
        var middleware = new ExceptionMiddleware(_ => throw new InvalidOperationException("Test error"), logger);

        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        await middleware.InvokeAsync(context);

        Assert.Equal((int)HttpStatusCode.BadRequest, context.Response.StatusCode);
        Assert.Equal("application/json", context.Response.ContentType);

        context.Response.Body.Seek(0, SeekOrigin.Begin);
        var body = await new StreamReader(context.Response.Body).ReadToEndAsync();
        var response = JsonSerializer.Deserialize<JsonElement>(body);
        Assert.Equal("Test error", response.GetProperty("error").GetString());
        Assert.Equal(400, response.GetProperty("statusCode").GetInt32());
    }

    [Fact]
    public async Task ExceptionMiddleware_UnauthorizedAccess_Returns401()
    {
        var logger = LoggerFactory.Create(b => { }).CreateLogger<ExceptionMiddleware>();
        var middleware = new ExceptionMiddleware(_ => throw new UnauthorizedAccessException("Not authorized"), logger);

        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        await middleware.InvokeAsync(context);

        Assert.Equal(401, context.Response.StatusCode);
    }

    [Fact]
    public async Task ExceptionMiddleware_KeyNotFound_Returns404()
    {
        var logger = LoggerFactory.Create(b => { }).CreateLogger<ExceptionMiddleware>();
        var middleware = new ExceptionMiddleware(_ => throw new KeyNotFoundException("Not found"), logger);

        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        await middleware.InvokeAsync(context);

        Assert.Equal(404, context.Response.StatusCode);
    }

    [Fact]
    public async Task ExceptionMiddleware_GenericException_Returns500()
    {
        var logger = LoggerFactory.Create(b => { }).CreateLogger<ExceptionMiddleware>();
        var middleware = new ExceptionMiddleware(_ => throw new Exception("Unexpected"), logger);

        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        await middleware.InvokeAsync(context);

        Assert.Equal(500, context.Response.StatusCode);
    }

    [Fact]
    public async Task SecurityHeadersMiddleware_AddsAllHeaders()
    {
        var middleware = new SecurityHeadersMiddleware(_ => Task.CompletedTask);
        var context = new DefaultHttpContext();

        await middleware.InvokeAsync(context);

        Assert.Equal("nosniff", context.Response.Headers["X-Content-Type-Options"]);
        Assert.Equal("DENY", context.Response.Headers["X-Frame-Options"]);
        Assert.Equal("1; mode=block", context.Response.Headers["X-XSS-Protection"]);
        Assert.Equal("strict-origin-when-cross-origin", context.Response.Headers["Referrer-Policy"]);
        Assert.StartsWith("default-src 'self'", context.Response.Headers["Content-Security-Policy"]);
        Assert.True(context.Response.Headers.ContainsKey("Permissions-Policy"));
    }

    [Fact]
    public async Task SecurityHeadersMiddleware_DoesNotOverrideExistingHeaders()
    {
        var middleware = new SecurityHeadersMiddleware(async ctx =>
        {
            ctx.Response.Headers["X-Custom"] = "custom-value";
            await Task.CompletedTask;
        });
        var context = new DefaultHttpContext();

        await middleware.InvokeAsync(context);

        Assert.Equal("custom-value", context.Response.Headers["X-Custom"]);
    }

    [Fact]
    public async Task RateLimitingMiddleware_AllowsUnderLimit()
    {
        var middleware = new RateLimitingMiddleware(_ => Task.CompletedTask);
        var context = new DefaultHttpContext();
        context.Connection.RemoteIpAddress = IPAddress.Parse("192.168.1.1");

        for (int i = 0; i < 99; i++)
        {
            await middleware.InvokeAsync(context);
        }

        Assert.NotEqual(429, context.Response.StatusCode);
    }

    [Fact]
    public async Task RateLimitingMiddleware_BlocksOverLimit()
    {
        var middleware = new RateLimitingMiddleware(_ => Task.CompletedTask);
        var context = new DefaultHttpContext();
        context.Connection.RemoteIpAddress = IPAddress.Parse("192.168.1.2");

        for (int i = 0; i < 101; i++)
        {
            context.Response.StatusCode = 200;
            await middleware.InvokeAsync(context);
        }

        Assert.Equal(429, context.Response.StatusCode);
        Assert.True(context.Response.Headers.ContainsKey("Retry-After"));
    }

    [Fact]
    public async Task RateLimitingMiddleware_DifferentIps_IndependentlyLimited()
    {
        var middleware = new RateLimitingMiddleware(_ => Task.CompletedTask);
        var ctx1 = new DefaultHttpContext();
        ctx1.Connection.RemoteIpAddress = IPAddress.Parse("10.0.0.1");
        var ctx2 = new DefaultHttpContext();
        ctx2.Connection.RemoteIpAddress = IPAddress.Parse("10.0.0.2");

        for (int i = 0; i < 101; i++)
        {
            ctx1.Response.StatusCode = 200;
            ctx2.Response.StatusCode = 200;
            await middleware.InvokeAsync(ctx1);
            await middleware.InvokeAsync(ctx2);
        }

        Assert.Equal(429, ctx1.Response.StatusCode);
        Assert.Equal(429, ctx2.Response.StatusCode);
    }
}
