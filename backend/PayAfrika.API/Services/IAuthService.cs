using PayAfrika.API.DTOs;

namespace PayAfrika.API.Services;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request);
    Task<LoginResult> LoginAsync(LoginRequest request);
    Task<AuthResponse> VerifyLoginAsync(LoginVerifyRequest request);
    Task<LoginChallengeResponse> ResendLoginCodeAsync(string challengeId);
    Task<UserInfo> GetUserByIdAsync(Guid userId);
    Task<bool> VerifyEmailAsync(string email, string code);
    Task<bool> ForgotPasswordAsync(string email);
    Task<bool> ResetPasswordAsync(string token, string newPassword);
    Task<List<UsernameSearchResult>> SearchUsersAsync(string query, int limit = 10);
    Task<UsernameCheckResponse> CheckUsernameAsync(string username);
    Task<string> GenerateUniqueUsernameAsync(string firstName, string lastName);
}
