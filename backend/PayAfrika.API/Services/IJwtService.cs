using PayAfrika.API.Models;

namespace PayAfrika.API.Services;

public interface IJwtService
{
    (string token, DateTime expiresAt) GenerateToken(User user);
    string GenerateRefreshToken();
    Guid? ValidateToken(string token);
}
