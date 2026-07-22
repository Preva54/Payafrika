using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using PayAfrika.API.Controllers;
using PayAfrika.API.DTOs;
using PayAfrika.API.Models;

namespace PayAfrika.API.Tests.IntegrationTests;

public class AuthControllerTests : TestBase
{
    [Fact]
    public async Task Register_CreatesUserAndReturnsToken()
    {
        var controller = new AuthController(AuthService);

        var result = await controller.Register(new RegisterRequest
        {
            FullName = "Test User",
            Email = "test@example.com",
            Password = "Password123!",
            Role = "customer",
        });

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var response = Assert.IsType<AuthResponse>(okResult.Value);
        Assert.NotEmpty(response.Token);
        Assert.Equal("Test User", response.User.FullName);
        Assert.Equal("test@example.com", response.User.Email);
    }

    [Fact]
    public async Task Register_DuplicateEmail_ReturnsBadRequest()
    {
        SeedUser(new User
        {
            FullName = "Existing",
            Email = "existing@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!"),
        });

        var controller = new AuthController(AuthService);

        var result = await controller.Register(new RegisterRequest
        {
            FullName = "Test User",
            Email = "existing@example.com",
            Password = "Password123!",
        });

        var badResult = Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.NotNull(badResult.Value);
    }

    [Fact]
    public async Task Login_ValidCredentials_ReturnsToken()
    {
        SeedUser(new User
        {
            FullName = "Test User",
            Email = "test@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!"),
        });

        var controller = new AuthController(AuthService);

        var result = await controller.Login(new LoginRequest
        {
            Email = "test@example.com",
            Password = "Password123!",
        });

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var response = Assert.IsType<AuthResponse>(okResult.Value);
        Assert.NotEmpty(response.Token);
    }

    [Fact]
    public async Task Login_InvalidPassword_ReturnsUnauthorized()
    {
        SeedUser(new User
        {
            FullName = "Test User",
            Email = "test@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("CorrectPassword1!"),
        });

        var controller = new AuthController(AuthService);

        var result = await controller.Login(new LoginRequest
        {
            Email = "test@example.com",
            Password = "WrongPassword1!",
        });

        Assert.IsType<UnauthorizedObjectResult>(result.Result);
    }

    [Fact]
    public async Task Login_NonExistentEmail_ReturnsUnauthorized()
    {
        var controller = new AuthController(AuthService);

        var result = await controller.Login(new LoginRequest
        {
            Email = "nonexistent@example.com",
            Password = "Password123!",
        });

        Assert.IsType<UnauthorizedObjectResult>(result.Result);
    }

    [Fact]
    public async Task GetCurrentUser_WithValidToken_ReturnsUserInfo()
    {
        var user = new User
        {
            FullName = "Test User",
            Email = "test@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!"),
        };
        SeedUser(user);

        var controller = new AuthController(AuthService);
        SetAuthHeader(controller, user.Id.ToString());

        var result = await controller.GetCurrentUser();

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var userInfo = Assert.IsType<UserInfo>(okResult.Value);
        Assert.Equal(user.Id, userInfo.Id);
        Assert.Equal("Test User", userInfo.FullName);
    }

    [Fact]
    public async Task GetCurrentUser_WithoutAuth_ReturnsUnauthorized()
    {
        var controller = new AuthController(AuthService);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext(),
        };

        var result = await controller.GetCurrentUser();

        Assert.IsType<UnauthorizedResult>(result.Result);
    }

    [Fact]
    public async Task VerifyEmail_ReturnsSuccess()
    {
        var controller = new AuthController(AuthService);

        var result = await controller.VerifyEmail(new VerifyEmailRequest
        {
            Email = "test@example.com",
            Code = "123456",
        });

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task ForgotPassword_ReturnsSuccess()
    {
        var controller = new AuthController(AuthService);

        var result = await controller.ForgotPassword(new ForgotPasswordRequest
        {
            Email = "test@example.com",
        });

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task ResetPassword_ReturnsSuccess()
    {
        var controller = new AuthController(AuthService);

        var result = await controller.ResetPassword(new ResetPasswordRequest
        {
            Token = "reset-token",
            NewPassword = "NewPassword123!",
        });

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }
}
