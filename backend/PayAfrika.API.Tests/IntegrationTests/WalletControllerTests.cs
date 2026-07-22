using Microsoft.AspNetCore.Mvc;
using PayAfrika.API.Controllers;
using PayAfrika.API.Models;

namespace PayAfrika.API.Tests.IntegrationTests;

public class WalletControllerTests : TestBase
{
    [Fact]
    public async Task GetWallet_ExistingWallet_ReturnsWallet()
    {
        var user = new User
        {
            FullName = "Test User",
            Email = "test@example.com",
            PasswordHash = "hash",
        };
        SeedUser(user);

        var wallet = new Wallet
        {
            UserId = user.Id,
            Currency = "ZAR",
            Balance = 50000,
        };
        SeedWallet(wallet);

        var controller = new WalletController(Db);
        SetAuthHeader(controller, user.Id.ToString());

        var result = await controller.GetWallet();

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var response = Assert.IsType<Wallet>(okResult.Value);
        Assert.Equal(50000, response.Balance);
        Assert.Equal("ZAR", response.Currency);
    }

    [Fact]
    public async Task GetWallet_NoWallet_ReturnsNotFound()
    {
        var user = new User
        {
            FullName = "Test User",
            Email = "test@example.com",
            PasswordHash = "hash",
        };
        SeedUser(user);

        var controller = new WalletController(Db);
        SetAuthHeader(controller, user.Id.ToString());

        var result = await controller.GetWallet();

        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    [Fact]
    public async Task Deposit_PositiveAmount_IncreasesBalance()
    {
        var user = new User
        {
            FullName = "Test User",
            Email = "test@example.com",
            PasswordHash = "hash",
        };
        SeedUser(user);

        var wallet = new Wallet
        {
            UserId = user.Id,
            Currency = "ZAR",
            Balance = 1000,
        };
        SeedWallet(wallet);

        var controller = new WalletController(Db);
        SetAuthHeader(controller, user.Id.ToString());

        var result = await controller.Deposit(5000);

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var response = Assert.IsType<Wallet>(okResult.Value);
        Assert.Equal(6000, response.Balance);
    }

    [Fact]
    public async Task Deposit_ZeroAmount_ReturnsBadRequest()
    {
        var user = new User
        {
            FullName = "Test User",
            Email = "test@example.com",
            PasswordHash = "hash",
        };
        SeedUser(user);

        var wallet = new Wallet
        {
            UserId = user.Id,
            Currency = "ZAR",
            Balance = 1000,
        };
        SeedWallet(wallet);

        var controller = new WalletController(Db);
        SetAuthHeader(controller, user.Id.ToString());

        var result = await controller.Deposit(0);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task Deposit_NegativeAmount_ReturnsBadRequest()
    {
        var user = new User
        {
            FullName = "Test User",
            Email = "test@example.com",
            PasswordHash = "hash",
        };
        SeedUser(user);

        var wallet = new Wallet
        {
            UserId = user.Id,
            Currency = "ZAR",
            Balance = 1000,
        };
        SeedWallet(wallet);

        var controller = new WalletController(Db);
        SetAuthHeader(controller, user.Id.ToString());

        var result = await controller.Deposit(-100);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task Deposit_CreatesTransaction()
    {
        var user = new User
        {
            FullName = "Test User",
            Email = "test@example.com",
            PasswordHash = "hash",
        };
        SeedUser(user);

        var wallet = new Wallet
        {
            UserId = user.Id,
            Currency = "ZAR",
            Balance = 0,
        };
        SeedWallet(wallet);

        var controller = new WalletController(Db);
        SetAuthHeader(controller, user.Id.ToString());

        await controller.Deposit(10000);

        var transactions = Db.Transactions.Where(t => t.UserId == user.Id).ToList();
        Assert.Single(transactions);
        Assert.Equal("deposit", transactions[0].Type);
        Assert.Equal(10000, transactions[0].Amount);
        Assert.Equal("completed", transactions[0].Status);
    }

    [Fact]
    public async Task GetTransactions_ReturnsRecentTransactions()
    {
        var user = new User
        {
            FullName = "Test User",
            Email = "test@example.com",
            PasswordHash = "hash",
        };
        SeedUser(user);

        Db.Transactions.AddRange(
            new Transaction { UserId = user.Id, Type = "deposit", Amount = 5000, Status = "completed", CreatedAt = DateTime.UtcNow.AddDays(-1) },
            new Transaction { UserId = user.Id, Type = "payment", Amount = 1000, Status = "completed", CreatedAt = DateTime.UtcNow.AddDays(-2) },
            new Transaction { UserId = user.Id, Type = "transfer", Amount = 2000, Status = "pending", CreatedAt = DateTime.UtcNow.AddDays(-3) }
        );
        Db.SaveChanges();

        var controller = new WalletController(Db);
        SetAuthHeader(controller, user.Id.ToString());

        var result = await controller.GetTransactions();

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var transactions = Assert.IsType<List<Transaction>>(okResult.Value);
        Assert.Equal(3, transactions.Count);
        Assert.All(transactions, t => Assert.Equal(user.Id, t.UserId));
    }

    [Fact]
    public async Task GetTransactions_NoTransactions_ReturnsEmpty()
    {
        var user = new User
        {
            FullName = "Test User",
            Email = "test@example.com",
            PasswordHash = "hash",
        };
        SeedUser(user);

        var controller = new WalletController(Db);
        SetAuthHeader(controller, user.Id.ToString());

        var result = await controller.GetTransactions();

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var transactions = Assert.IsType<List<Transaction>>(okResult.Value);
        Assert.Empty(transactions);
    }
}
