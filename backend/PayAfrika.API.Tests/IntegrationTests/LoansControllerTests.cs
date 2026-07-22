using Microsoft.AspNetCore.Mvc;
using PayAfrika.API.Controllers;
using PayAfrika.API.DTOs;
using PayAfrika.API.Models;

namespace PayAfrika.API.Tests.IntegrationTests;

public class LoansControllerTests : TestBase
{
    [Fact]
    public async Task Apply_CreatesLoan_ReturnsCreated()
    {
        var user = new User
        {
            FullName = "Test User",
            Email = "test@example.com",
            PasswordHash = "hash",
        };
        SeedUser(user);

        var controller = new LoansController(LoanService);
        SetAuthHeader(controller, user.Id.ToString());

        var result = await controller.Apply(new LoanApplicationRequest
        {
            Amount = 100000,
            InterestRate = 12.5m,
            TermMonths = 12,
            Purpose = "Business expansion",
        });

        var createdResult = Assert.IsType<CreatedAtActionResult>(result.Result);
        var loan = Assert.IsType<LoanResponse>(createdResult.Value);
        Assert.Equal(100000, loan.Amount);
        Assert.Equal(12.5m, loan.InterestRate);
        Assert.Equal(12, loan.TermMonths);
        Assert.Equal("pending", loan.Status);
        Assert.True(loan.MonthlyPayment > 0);
        Assert.True(loan.TotalPayment > loan.Amount);
    }

    [Fact]
    public async Task Apply_ZeroInterestLoan_CalculatesCorrectly()
    {
        var user = new User
        {
            FullName = "Test User",
            Email = "test@example.com",
            PasswordHash = "hash",
        };
        SeedUser(user);

        var controller = new LoansController(LoanService);
        SetAuthHeader(controller, user.Id.ToString());

        var result = await controller.Apply(new LoanApplicationRequest
        {
            Amount = 120000,
            InterestRate = 0,
            TermMonths = 12,
        });

        var createdResult = Assert.IsType<CreatedAtActionResult>(result.Result);
        var loan = Assert.IsType<LoanResponse>(createdResult.Value);
        Assert.Equal(10000, loan.MonthlyPayment);
        Assert.Equal(0, loan.TotalInterest);
    }

    [Fact]
    public async Task GetMyLoans_ReturnsUserLoans()
    {
        var user = new User
        {
            FullName = "Test User",
            Email = "test@example.com",
            PasswordHash = "hash",
        };
        SeedUser(user);

        Db.Loans.Add(new Loan
        {
            UserId = user.Id,
            Amount = 50000,
            InterestRate = 10,
            TermMonths = 6,
            Status = "pending",
            MonthlyPayment = 9000,
            TotalPayment = 54000,
            TotalInterest = 4000,
        });
        Db.SaveChanges();

        var controller = new LoansController(LoanService);
        SetAuthHeader(controller, user.Id.ToString());

        var result = await controller.GetMyLoans();

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var loans = Assert.IsAssignableFrom<IEnumerable<LoanResponse>>(okResult.Value).ToList();
        Assert.Single(loans);
        Assert.Equal(50000, loans[0].Amount);
    }

    [Fact]
    public async Task GetMyLoans_NoLoans_ReturnsEmpty()
    {
        var user = new User
        {
            FullName = "Test User",
            Email = "test@example.com",
            PasswordHash = "hash",
        };
        SeedUser(user);

        var controller = new LoansController(LoanService);
        SetAuthHeader(controller, user.Id.ToString());

        var result = await controller.GetMyLoans();

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var loans = Assert.IsAssignableFrom<IEnumerable<LoanResponse>>(okResult.Value).ToList();
        Assert.Empty(loans);
    }

    [Fact]
    public async Task GetLoan_ExistingId_ReturnsLoan()
    {
        var user = new User
        {
            FullName = "Test User",
            Email = "test@example.com",
            PasswordHash = "hash",
        };
        SeedUser(user);

        var loan = new Loan
        {
            UserId = user.Id,
            Amount = 75000,
            InterestRate = 15,
            TermMonths = 24,
            Status = "approved",
            MonthlyPayment = 4000,
            TotalPayment = 96000,
            TotalInterest = 21000,
        };
        Db.Loans.Add(loan);
        Db.SaveChanges();

        var controller = new LoansController(LoanService);
        SetAuthHeader(controller, user.Id.ToString());

        var result = await controller.GetLoan(loan.Id);

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var response = Assert.IsType<LoanResponse>(okResult.Value);
        Assert.Equal(loan.Id, response.Id);
        Assert.Equal("approved", response.Status);
    }

    [Fact]
    public async Task GetLoan_NonExistentId_ReturnsNotFound()
    {
        var user = new User
        {
            FullName = "Test User",
            Email = "test@example.com",
            PasswordHash = "hash",
        };
        SeedUser(user);

        var controller = new LoansController(LoanService);
        SetAuthHeader(controller, user.Id.ToString());

        var result = await controller.GetLoan(Guid.NewGuid());

        Assert.IsType<NotFoundObjectResult>(result.Result);
    }
}
