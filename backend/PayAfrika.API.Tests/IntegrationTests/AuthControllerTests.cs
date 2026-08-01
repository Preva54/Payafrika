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
        var user = new User
        {
            FullName = "Test User",
            Email = "test@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!"),
        };
        SeedUser(user);

        Db.ConnectedDevices.Add(new ConnectedDevice
        {
            UserId = user.Id,
            DeviceId = "test-device-1",
            DeviceName = "Test Device",
            DeviceType = "web",
            IsTrusted = true,
            IsCurrent = true,
            LastActiveAt = DateTime.UtcNow,
        });
        Db.SaveChanges();

        var controller = new AuthController(AuthService);

        var result = await controller.Login(new LoginRequest
        {
            Email = "test@example.com",
            Password = "Password123!",
        });

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var loginResult = Assert.IsType<LoginResult>(okResult.Value);
        Assert.False(loginResult.RequiresChallenge);
        Assert.NotNull(loginResult.Auth);
        Assert.NotEmpty(loginResult.Auth.Token);
    }

    [Fact]
    public async Task Login_NewDevice_ReturnsChallenge()
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
        var loginResult = Assert.IsType<LoginResult>(okResult.Value);
        Assert.True(loginResult.RequiresChallenge);
        Assert.NotNull(loginResult.Challenge);
        Assert.NotEmpty(loginResult.Challenge.ChallengeId);
    }

    [Fact]
    public async Task Login_ResendCode_ReturnsNewChallenge()
    {
        SeedUser(new User
        {
            FullName = "Test User",
            Email = "test@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!"),
        });

        var controller = new AuthController(AuthService);

        var loginResult = await controller.Login(new LoginRequest
        {
            Email = "test@example.com",
            Password = "Password123!",
        });

        var okLogin = Assert.IsType<OkObjectResult>(loginResult.Result);
        var challenge = Assert.IsType<LoginResult>(okLogin.Value).Challenge;
        Assert.NotNull(challenge);

        var resendResult = await controller.ResendLoginCode(new LoginResendRequest
        {
            ChallengeId = challenge!.ChallengeId,
        });

        var okResult = Assert.IsType<OkObjectResult>(resendResult.Result);
        var resend = Assert.IsType<LoginChallengeResponse>(okResult.Value);
        Assert.True(resend.RequiresOtp);
        Assert.NotEmpty(resend.ChallengeId);
        Assert.Equal(300, resend.ExpiresInSeconds);
    }

    [Fact]
    public async Task Login_ResendCode_InvalidChallenge_ReturnsBadRequest()
    {
        var controller = new AuthController(AuthService);

        var result = await controller.ResendLoginCode(new LoginResendRequest
        {
            ChallengeId = Guid.NewGuid().ToString(),
        });

        Assert.IsType<BadRequestObjectResult>(result.Result);
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
        var user = new User
        {
            FullName = "Test User",
            Email = "test@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!"),
        };
        SeedUser(user);

        Db.SecurityTokens.Add(new SecurityToken
        {
            UserId = user.Id,
            Purpose = "email_verify",
            Channel = "email",
            CodeHash = SecurityService.HashCode("123456"),
            ExpiresAt = DateTime.UtcNow.AddMinutes(5),
            MaxAttempts = 5,
        });
        Db.SaveChanges();

        var controller = new AuthController(AuthService);

        var result = await controller.VerifyEmail(new VerifyEmailRequest
        {
            Email = "test@example.com",
            Code = "123456",
        });

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);

        var updated = Db.Users.Find(user.Id);
        Assert.True(updated!.IsEmailVerified);
    }

    [Fact]
    public async Task VerifyEmail_WrongCode_ReturnsBadRequest()
    {
        var user = new User
        {
            FullName = "Test User",
            Email = "test@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!"),
        };
        SeedUser(user);

        Db.SecurityTokens.Add(new SecurityToken
        {
            UserId = user.Id,
            Purpose = "email_verify",
            Channel = "email",
            CodeHash = SecurityService.HashCode("123456"),
            ExpiresAt = DateTime.UtcNow.AddMinutes(5),
            MaxAttempts = 5,
        });
        Db.SaveChanges();

        var controller = new AuthController(AuthService);

        var result = await controller.VerifyEmail(new VerifyEmailRequest
        {
            Email = "test@example.com",
            Code = "999999",
        });

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task ForgotPassword_ReturnsSuccess()
    {
        var user = new User
        {
            FullName = "Test User",
            Email = "test@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!"),
        };
        SeedUser(user);

        var controller = new AuthController(AuthService);

        var result = await controller.ForgotPassword(new ForgotPasswordRequest
        {
            Email = "test@example.com",
        });

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);

        var token = Db.SecurityTokens
            .OrderByDescending(t => t.CreatedAt)
            .FirstOrDefault(t => t.UserId == user.Id && t.Purpose == "password_reset");
        Assert.NotNull(token);
    }

    [Fact]
    public async Task ForgotPassword_UnknownEmail_StillReturnsSuccess()
    {
        var controller = new AuthController(AuthService);

        var result = await controller.ForgotPassword(new ForgotPasswordRequest
        {
            Email = "nobody@example.com",
        });

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task ResetPassword_ReturnsSuccess()
    {
        var user = new User
        {
            FullName = "Test User",
            Email = "test@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("OldPassword123!"),
        };
        SeedUser(user);

        var resetToken = new SecurityToken
        {
            UserId = user.Id,
            Purpose = "password_reset",
            Channel = "email",
            CodeHash = SecurityService.HashCode("unused"),
            ExpiresAt = DateTime.UtcNow.AddMinutes(30),
            MaxAttempts = 1,
        };
        Db.SecurityTokens.Add(resetToken);
        Db.SaveChanges();

        var controller = new AuthController(AuthService);

        var result = await controller.ResetPassword(new ResetPasswordRequest
        {
            Token = resetToken.Id.ToString(),
            NewPassword = "NewPassword123!",
        });

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);

        var updated = Db.Users.Find(user.Id);
        Assert.True(BCrypt.Net.BCrypt.Verify("NewPassword123!", updated!.PasswordHash));
    }

    [Fact]
    public async Task ResetPassword_InvalidToken_ReturnsBadRequest()
    {
        var controller = new AuthController(AuthService);

        var result = await controller.ResetPassword(new ResetPasswordRequest
        {
            Token = "not-a-real-token",
            NewPassword = "NewPassword123!",
        });

        Assert.IsType<BadRequestObjectResult>(result);
    }
}
