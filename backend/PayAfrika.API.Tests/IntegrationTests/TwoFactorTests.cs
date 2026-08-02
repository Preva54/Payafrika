using Microsoft.AspNetCore.Mvc;
using PayAfrika.API.Controllers;
using PayAfrika.API.DTOs;
using PayAfrika.API.Models;
using PayAfrika.API.Services.Security;

namespace PayAfrika.API.Tests.IntegrationTests;

public class TwoFactorTests : TestBase
{
    private readonly ITotpService _totp = new TotpService();

    private SettingsController CreateSettingsController(Guid userId)
    {
        var controller = new SettingsController(Db, SecurityService);
        SetAuthHeader(controller, userId.ToString());
        return controller;
    }

    private async Task<(SettingsController controller, TwoFactorSetupResponse setup)> SetupTwoFactor(Guid userId)
    {
        var controller = CreateSettingsController(userId);
        var result = await controller.SetupTwoFactor();
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var setup = Assert.IsType<TwoFactorSetupResponse>(okResult.Value);
        Assert.Equal(10, setup.RecoveryCodes.Count);
        return (controller, setup);
    }

    [Fact]
    public async Task SetupTwoFactor_ReturnsSecretQrAndRecoveryCodes()
    {
        var user = new User { FullName = "Test User", Email = "tfa@example.com", PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!") };
        SeedUser(user);

        var (_, setup) = await SetupTwoFactor(user.Id);

        Assert.False(string.IsNullOrWhiteSpace(setup.SecretKey));
        Assert.Contains("otpauth://totp/", setup.QrCodeUrl);
        Assert.All(setup.RecoveryCodes, code => Assert.Matches(@"^\d{3}-\d{3}$", code));

        var updated = Db.Users.Find(user.Id);
        Assert.False(updated!.TwoFactorEnabled);
        Assert.NotNull(updated.TotpSecretEncrypted);
        Assert.NotNull(updated.BackupCodesHash);
        Assert.Equal("authenticator", updated.TwoFactorMethod);
    }

    [Fact]
    public async Task EnableTwoFactor_ValidAuthenticatorCode_Enables2FA()
    {
        var user = new User { FullName = "Test User", Email = "tfa@example.com", PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!") };
        SeedUser(user);

        var (controller, setup) = await SetupTwoFactor(user.Id);
        var code = _totp.GenerateCode(setup.SecretKey);

        var result = await controller.ToggleTwoFactor(new TwoFactorRequest { Enabled = true, Code = code });

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
        var updated = Db.Users.Find(user.Id);
        Assert.True(updated!.TwoFactorEnabled);
        Assert.Equal("authenticator", updated.TwoFactorMethod);
    }

    [Fact]
    public async Task EnableTwoFactor_WrongCode_ThrowsInvalidOperation()
    {
        var user = new User { FullName = "Test User", Email = "tfa@example.com", PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!") };
        SeedUser(user);

        var (controller, _) = await SetupTwoFactor(user.Id);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            controller.ToggleTwoFactor(new TwoFactorRequest { Enabled = true, Code = "000000" }));

        var updated = Db.Users.Find(user.Id);
        Assert.False(updated!.TwoFactorEnabled);
    }

    [Fact]
    public async Task EnableTwoFactor_WithoutSetup_ThrowsInvalidOperation()
    {
        var user = new User { FullName = "Test User", Email = "tfa@example.com", PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!") };
        SeedUser(user);

        var controller = CreateSettingsController(user.Id);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            controller.ToggleTwoFactor(new TwoFactorRequest { Enabled = true, Code = "123456" }));
    }

    [Fact]
    public async Task EnableTwoFactor_MissingCode_ReturnsBadRequest()
    {
        var user = new User { FullName = "Test User", Email = "tfa@example.com", PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!") };
        SeedUser(user);

        var controller = CreateSettingsController(user.Id);

        var result = await controller.ToggleTwoFactor(new TwoFactorRequest { Enabled = true });

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task DisableTwoFactor_WrongPassword_ThrowsUnauthorized()
    {
        var user = new User { FullName = "Test User", Email = "tfa@example.com", PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!") };
        SeedUser(user);

        var (controller, setup) = await SetupTwoFactor(user.Id);
        await controller.ToggleTwoFactor(new TwoFactorRequest { Enabled = true, Code = _totp.GenerateCode(setup.SecretKey) });

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            controller.ToggleTwoFactor(new TwoFactorRequest
            {
                Enabled = false,
                Password = "WrongPassword1!",
                Code = _totp.GenerateCode(setup.SecretKey),
            }));
    }

    [Fact]
    public async Task DisableTwoFactor_ValidPasswordAndCode_Disables2FA()
    {
        var user = new User { FullName = "Test User", Email = "tfa@example.com", PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!") };
        SeedUser(user);

        var (controller, setup) = await SetupTwoFactor(user.Id);
        await controller.ToggleTwoFactor(new TwoFactorRequest { Enabled = true, Code = _totp.GenerateCode(setup.SecretKey) });

        var result = await controller.ToggleTwoFactor(new TwoFactorRequest
        {
            Enabled = false,
            Password = "Password123!",
            Code = _totp.GenerateCode(setup.SecretKey),
        });

        Assert.IsType<OkObjectResult>(result);
        var updated = Db.Users.Find(user.Id);
        Assert.False(updated!.TwoFactorEnabled);
        Assert.Null(updated.TotpSecretEncrypted);
        Assert.Null(updated.BackupCodesHash);
    }

    [Fact]
    public async Task RegenerateRecoveryCodes_NotEnabled_ThrowsInvalidOperation()
    {
        var user = new User { FullName = "Test User", Email = "tfa@example.com", PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!") };
        SeedUser(user);

        var controller = CreateSettingsController(user.Id);

        await Assert.ThrowsAsync<InvalidOperationException>(() => controller.RegenerateRecoveryCodes());
    }

    [Fact]
    public async Task RegenerateRecoveryCodes_AfterEnable_ReturnsTenNewCodes()
    {
        var user = new User { FullName = "Test User", Email = "tfa@example.com", PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!") };
        SeedUser(user);

        var (controller, setup) = await SetupTwoFactor(user.Id);
        await controller.ToggleTwoFactor(new TwoFactorRequest { Enabled = true, Code = _totp.GenerateCode(setup.SecretKey) });

        var result = await controller.RegenerateRecoveryCodes();
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var response = Assert.IsType<RecoveryCodesResponse>(okResult.Value);

        Assert.Equal(10, response.RecoveryCodes.Count);
        Assert.DoesNotContain(response.RecoveryCodes, code => setup.RecoveryCodes.Contains(code));
    }

    [Fact]
    public async Task RecoveryCode_CompletesLogin_AndIsConsumed()
    {
        var user = new User { FullName = "Test User", Email = "tfa@example.com", PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!") };
        SeedUser(user);

        var (controller, setup) = await SetupTwoFactor(user.Id);
        await controller.ToggleTwoFactor(new TwoFactorRequest { Enabled = true, Code = _totp.GenerateCode(setup.SecretKey) });
        var recoveryCode = setup.RecoveryCodes[0];

        var authController = new AuthController(AuthService);
        var loginResult = await authController.Login(new LoginRequest
        {
            Email = "tfa@example.com",
            Password = "Password123!",
        });
        var okLogin = Assert.IsType<OkObjectResult>(loginResult.Result);
        var challenge = Assert.IsType<LoginResult>(okLogin.Value).Challenge;
        Assert.NotNull(challenge);
        Assert.True(challenge!.RecoveryCodeHint != null);

        var verifyResult = await authController.VerifyLogin(new LoginVerifyRequest
        {
            ChallengeId = challenge.ChallengeId,
            Code = recoveryCode,
        });

        var okVerify = Assert.IsType<OkObjectResult>(verifyResult.Result);
        var auth = Assert.IsType<AuthResponse>(okVerify.Value);
        Assert.NotEmpty(auth.Token);

        var updated = Db.Users.Find(user.Id);
        Assert.NotNull(updated!.BackupCodesHash);
        Assert.Equal(9, updated.BackupCodesHash.Split(';', StringSplitOptions.RemoveEmptyEntries).Length);
        Assert.False(SecurityService.ValidateRecoveryCode(updated, recoveryCode));
    }
}
