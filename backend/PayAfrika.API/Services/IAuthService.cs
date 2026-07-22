using PayAfrika.API.DTOs;

namespace PayAfrika.API.Services;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request);
    Task<AuthResponse> LoginAsync(LoginRequest request);
    Task<UserInfo> GetUserByIdAsync(Guid userId);
    Task<bool> VerifyEmailAsync(string email, string code);
    Task<bool> ForgotPasswordAsync(string email);
    Task<bool> ResetPasswordAsync(string token, string newPassword);
}
