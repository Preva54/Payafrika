using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using PayAfrika.API.Controllers;
using PayAfrika.API.DTOs;
using PayAfrika.API.Models;
using PayAfrika.API.Services;

namespace PayAfrika.API.Tests.IntegrationTests;

public class KycControllerTests : TestBase
{
    private readonly KycService _kyc = null!;

    private KycController CreateController(Guid userId, string role = "customer")
    {
        var controller = new KycController(Db, new KycService(Db, new TestAuditService()));
        SetAuthHeader(controller, userId.ToString(), role);
        return controller;
    }

    private async Task<Guid> SeedStartedApp(Guid userId, string country = "Nigeria")
    {
        var app = new KycApplication
        {
            UserId = userId,
            Status = "pending",
            CountryOfResidence = country,
            CompletedSteps = "[]",
        };
        Db.KycApplications.Add(app);
        await Db.SaveChangesAsync();
        return app.Id;
    }

    private static Stream PngStream(int size = 60_000)
    {
        var bytes = new byte[size];
        for (var i = 0; i < bytes.Length; i++) bytes[i] = (byte)(i % 251);
        return new MemoryStream(bytes);
    }

    private static async Task<KycDocumentUploadResponse> UploadDoc(KycController c, string type, string side = "front")
    {
        var result = await c.UploadDocument(type, side, new FormFile(PngStream(), 0, 60_000, "file", "doc.png")
        {
            Headers = new HeaderDictionary(),
            ContentType = "image/png",
        });
        return Assert.IsType<OkObjectResult>(result.Result).Value as KycDocumentUploadResponse
            ?? throw new InvalidOperationException();
    }

    private async Task<Guid> CompleteLevel1(Guid userId, KycController controller)
    {
        var appId = await SeedStartedApp(userId);
        var ok1 = await controller.UpdatePersonalInfo(new KycPersonalInfoRequest
        {
            FirstName = "Ada", LastName = "Nwosu",
            DateOfBirth = new DateTime(1995, 4, 12),
            Gender = "female", Nationality = "Nigerian",
            CountryOfResidence = "Nigeria",
            NationalIdNumber = "NG12345678",
        });
        Assert.IsType<OkObjectResult>(ok1);
        var ok2 = await controller.UpdateContact(new KycContactRequest
        {
            PhoneCountryCode = "+2348000000000",
            ResidentialAddress = "12 Adeola Odeku St, Victoria Island",
            City = "Lagos", Province = "Lagos", PostalCode = "101241",
        });
        Assert.IsType<OkObjectResult>(ok2);
        return appId;
    }

    [Fact]
    public async Task Start_CreatesApplication()
    {
        var user = new User { FullName = "Ada Nwosu", Email = "ada@test.com", PasswordHash = "hash" };
        SeedUser(user);

        var controller = CreateController(user.Id);
        var result = await controller.StartApplication();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var status = Assert.IsType<KycStatusResponse>(ok.Value);
        Assert.Equal("pending", status.Status);
        Assert.NotEqual(Guid.Empty, status.Id);
    }

    [Fact]
    public async Task GetStatus_NoApplication_ReturnsNotStarted()
    {
        var user = new User { FullName = "Ada Nwosu", Email = "ada@test.com", PasswordHash = "hash" };
        SeedUser(user);

        var controller = CreateController(user.Id);
        var result = await controller.GetStatus();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var status = Assert.IsType<KycStatusResponse>(ok.Value);
        Assert.Equal("not_started", status.Status);
        Assert.Equal(0, status.OverallProgress);
        Assert.Equal(3, status.Levels.Count);
        Assert.Equal("locked", status.Levels[1].Status);
    }

    [Fact]
    public async Task UploadDocument_StoresEncryptedAndReturnsMetadata()
    {
        var user = new User { FullName = "Ada Nwosu", Email = "ada@test.com", PasswordHash = "hash" };
        SeedUser(user);
        var appId = await SeedStartedApp(user.Id);

        var controller = CreateController(user.Id);
        var response = await UploadDoc(controller, "selfie");

        Assert.Equal("selfie", response.DocumentType);
        Assert.True(response.QualityScore >= 70);
        Assert.StartsWith("enc:", Db.KycDocuments.Single(d => d.Id == response.Id).FileData);

        var admin = CreateController(user.Id, "admin");
        var adminResult = await admin.GetDocumentImage(appId, response.Id);
        var fileResult = Assert.IsAssignableFrom<FileResult>(adminResult);
        Assert.NotNull(fileResult);

        var stored = Db.KycDocuments.Single(d => d.Id == response.Id).FileData;
        Assert.NotEqual(Convert.ToBase64String(new byte[60_000]), stored);
    }

    [Fact]
    public async Task UploadDocument_RejectsOversizedAndWrongType()
    {
        var user = new User { FullName = "Ada Nwosu", Email = "ada@test.com", PasswordHash = "hash" };
        SeedUser(user);
        await SeedStartedApp(user.Id);

        var controller = CreateController(user.Id);
        var big = new FormFile(new MemoryStream(new byte[11 * 1024 * 1024]), 0, 11 * 1024 * 1024, "f", "doc.png")
        { Headers = new HeaderDictionary(), ContentType = "image/png" };
        var bigResult = await controller.UploadDocument("selfie", "front", big);
        Assert.IsType<BadRequestObjectResult>(bigResult.Result);

        var wrongType = new FormFile(new MemoryStream(new byte[100]), 0, 100, "f", "doc.exe")
        { Headers = new HeaderDictionary(), ContentType = "application/x-msdownload" };
        var bad2 = Assert.IsType<BadRequestObjectResult>((await controller.UploadDocument("selfie", "front", wrongType)).Result);
        Assert.NotNull(bad2.Value);
    }

    [Fact]
    public async Task UploadDocument_RejectsCountryDisallowedType()
    {
        Db.KycCountryConfigs.Add(new KycCountryConfig
        {
            CountryCode = "ZA",
            CountryName = "South Africa",
            IdentityDocumentTypes = "[\"passport\"]",
            AddressDocumentTypes = "[\"utility_bill\"]",
            IdentityDocBackRequired = false,
            AddressDocMaxAgeMonths = 3,
            RequiredLevel = 3,
        });
        var user = new User { FullName = "Ada Nwosu", Email = "ada@test.com", PasswordHash = "hash" };
        SeedUser(user);
        await SeedStartedApp(user.Id, "South Africa");

        var controller = CreateController(user.Id);
        var result = await controller.UploadDocument("national_id", "front",
            new FormFile(PngStream(), 0, 60_000, "f", "doc.png") { Headers = new HeaderDictionary(), ContentType = "image/png" });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task Submit_WithoutDocuments_Throws()
    {
        var user = new User { FullName = "Ada Nwosu", Email = "ada@test.com", PasswordHash = "hash" };
        SeedUser(user);
        await SeedStartedApp(user.Id);

        var controller = CreateController(user.Id);
        var result = await controller.SubmitForReview();

        var bad = Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.NotNull(bad.Value);
    }

    [Fact]
    public async Task FullFlow_Submit_AdminApprove_SetsVerifiedAndLevel3()
    {
        var user = new User { FullName = "Ada Nwosu", Email = "ada@test.com", PasswordHash = "hash" };
        SeedUser(user);

        var controller = CreateController(user.Id);
        var appId = await CompleteLevel1(user.Id, controller);

        await UploadDoc(controller, "national_id");
        await UploadDoc(controller, "selfie");
        await UploadDoc(controller, "utility_bill");

        var submit = await controller.SubmitForReview();
        var okSubmit = Assert.IsType<OkObjectResult>(submit.Result);
        var submitResult = Assert.IsType<KycSubmitResponse>(okSubmit.Value);
        Assert.Equal("under_review", submitResult.Status);

        var updated = Db.Users.Find(user.Id);
        Assert.Equal("pending", updated!.KYCStatus);

        var admin = CreateController(user.Id, "admin");
        var review = await admin.ReviewApplication(appId, new KycReviewRequest { Action = "approve", Notes = "All good" });
        Assert.IsType<OkObjectResult>(review);

        var approved = Db.Users.Find(user.Id);
        Assert.Equal("verified", approved!.KYCStatus);
        Assert.Equal(3, approved.KycLevel);
        Assert.Equal("approved", Db.KycApplications.Single(a => a.UserId == user.Id).Status);
        Assert.Equal(2, Db.InAppNotifications.Count(n => n.UserId == user.Id));
    }

    [Fact]
    public async Task Admin_RequestInfo_ThenResubmit_ReturnsUnderReview()
    {
        var user = new User { FullName = "Ada Nwosu", Email = "ada@test.com", PasswordHash = "hash" };
        SeedUser(user);

        var controller = CreateController(user.Id);
        var appId = await CompleteLevel1(user.Id, controller);
        await UploadDoc(controller, "national_id");
        await UploadDoc(controller, "selfie");
        await UploadDoc(controller, "utility_bill");
        await controller.SubmitForReview();

        var admin = CreateController(user.Id, "admin");
        var review = await admin.ReviewApplication(appId,
            new KycReviewRequest { Action = "request_info", Notes = "Upload a clearer utility bill" });
        Assert.IsType<OkObjectResult>(review);
        Assert.Equal("additional_info", Db.KycApplications.Single(a => a.UserId == user.Id).Status);

        var resubmit = await controller.SubmitForReview();
        Assert.IsType<OkObjectResult>(resubmit.Result);
        Assert.Equal("under_review", Db.KycApplications.Single(a => a.UserId == user.Id).Status);
    }

    [Fact]
    public async Task Admin_Reject_SetsUserRejected()
    {
        var user = new User { FullName = "Ada Nwosu", Email = "ada@test.com", PasswordHash = "hash" };
        SeedUser(user);

        var controller = CreateController(user.Id);
        var appId = await CompleteLevel1(user.Id, controller);
        await UploadDoc(controller, "national_id");
        await UploadDoc(controller, "selfie");
        await UploadDoc(controller, "utility_bill");
        await controller.SubmitForReview();

        var admin = CreateController(user.Id, "admin");
        await admin.ReviewApplication(appId, new KycReviewRequest { Action = "reject", Notes = "Document expired" });

        var rejected = Db.Users.Find(user.Id);
        Assert.Equal("rejected", rejected!.KYCStatus);
        var status = Assert.IsType<KycStatusResponse>(Assert.IsType<OkObjectResult>((await controller.GetStatus()).Result).Value);
        Assert.Equal("rejected", status.Status);
        Assert.Contains("Document expired", status.Reason);
    }

    [Fact]
    public async Task Admin_Escalate_SetsEscalatedFlag()
    {
        var user = new User { FullName = "Ada Nwosu", Email = "ada@test.com", PasswordHash = "hash" };
        SeedUser(user);
        var appId = await SeedStartedApp(user.Id);

        var admin = CreateController(user.Id, "admin");
        var result = await admin.EscalateApplication(appId, new KycEscalateRequest { Reason = "High risk jurisdiction" });

        Assert.IsType<OkObjectResult>(result);
        Assert.True(Db.KycApplications.Single(a => a.Id == appId).Escalated);
        Assert.Equal("High risk jurisdiction", Db.KycApplications.Single(a => a.Id == appId).EscalationReason);
    }

    [Fact]
    public async Task GetCountryConfig_ReturnsRules()
    {
        Db.KycCountryConfigs.Add(new KycCountryConfig
        {
            CountryCode = "NG",
            CountryName = "Nigeria",
            IdentityDocumentTypes = "[\"national_id\",\"passport\"]",
            AddressDocumentTypes = "[\"utility_bill\",\"bank_statement\"]",
            IdentityDocBackRequired = false,
            AddressDocMaxAgeMonths = 3,
            RequiredLevel = 3,
        });

        var user = new User { FullName = "Ada Nwosu", Email = "ada@test.com", PasswordHash = "hash", Country = "Nigeria" };
        SeedUser(user);

        var controller = CreateController(user.Id);
        var result = await controller.GetCountryConfig(null);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var config = Assert.IsType<KycCountryConfigResponse>(ok.Value);
        Assert.Equal("NG", config.CountryCode);
        Assert.Contains("passport", config.IdentityDocumentTypes);
        Assert.Equal(3, config.RequiredLevel);
    }
}
