using PayAfrika.API.DTOs;

namespace PayAfrika.API.Services;

public interface ILoanService
{
    Task<LoanResponse> ApplyAsync(Guid userId, LoanApplicationRequest request);
    Task<LoanResponse> GetByIdAsync(Guid loanId);
    Task<IEnumerable<LoanResponse>> GetUserLoansAsync(Guid userId);
    Task<LoanResponse> ApproveAsync(Guid loanId);
    Task<LoanResponse> RejectAsync(Guid loanId, string reason);
}
