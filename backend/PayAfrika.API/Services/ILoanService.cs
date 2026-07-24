using PayAfrika.API.DTOs;

namespace PayAfrika.API.Services;

public interface ILoanService
{
    Task<LoanResponse> ApplyAsync(Guid userId, LoanApplicationRequest request);
    Task<LoanResponse> GetByIdAsync(Guid loanId);
    Task<IEnumerable<LoanResponse>> GetUserLoansAsync(Guid userId);
    Task<LoanResponse> ApproveAsync(Guid loanId);
    Task<LoanResponse> RejectAsync(Guid loanId, string reason);
    Task<LoanOverviewResponse> GetOverviewAsync(Guid userId);
    Task<List<RepaymentScheduleItem>> GetRepaymentScheduleAsync(Guid loanId);
    Task<CreditScoreResponse> GetCreditScoreAsync(Guid userId);
    Task<EligibilityResponse> CheckEligibilityAsync(EligibilityRequest request);
    Task<CalculatorResponse> CalculateLoanAsync(CalculatorRequest request);
    Task<LoanResponse> MakePaymentAsync(Guid userId, LoanPaymentRequest request);
    Task<List<LoanNotificationResponse>> GetNotificationsAsync(Guid userId);
    Task<LoanAnalyticsResponse> GetAnalyticsAsync(Guid userId);
    Task<List<LoanDocumentResponse>> GetDocumentsAsync(Guid userId);
}