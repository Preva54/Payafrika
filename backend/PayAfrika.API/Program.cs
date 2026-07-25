using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PayAfrika.API.Data;
using PayAfrika.API.Middleware;
using PayAfrika.API.Services;
using PayAfrika.API.Services.Payment;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection("Jwt"));

var jwtSettings = builder.Configuration.GetSection("Jwt").Get<JwtSettings>();
if (jwtSettings != null)
{
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.SecretKey)),
                ValidateIssuer = true,
                ValidIssuer = jwtSettings.Issuer,
                ValidateAudience = true,
                ValidAudience = jwtSettings.Audience,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero,
            };
        });
}

builder.Services.AddAuthorization();

builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ILoanService, LoanService>();

builder.Services.Configure<FlutterwaveSettings>(builder.Configuration.GetSection("Payment:Flutterwave"));
builder.Services.Configure<PaystackSettings>(builder.Configuration.GetSection("Payment:Paystack"));
builder.Services.Configure<OzowSettings>(builder.Configuration.GetSection("Payment:Ozow"));
builder.Services.Configure<PeachPaymentsSettings>(builder.Configuration.GetSection("Payment:Peach"));

builder.Services.AddHttpClient<FlutterwaveProvider>();
builder.Services.AddHttpClient<PaystackProvider>();
builder.Services.AddHttpClient<OzowProvider>();
builder.Services.AddHttpClient<PeachPaymentsProvider>();

builder.Services.AddScoped<IPaymentProvider, FlutterwaveProvider>();
builder.Services.AddScoped<IPaymentProvider, PaystackProvider>();
builder.Services.AddScoped<IPaymentProvider, OzowProvider>();
builder.Services.AddScoped<IPaymentProvider, PeachPaymentsProvider>();
builder.Services.AddScoped<IPaymentService, PaymentService>();

var corsRaw = builder.Configuration["Cors:AllowedOrigins"] ?? "";
var corsOrigins = corsRaw
    .Trim('[', ']')
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
    .DefaultIfEmpty("http://localhost:3000")
    .ToArray();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(corsOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

app.UseMiddleware<ExceptionMiddleware>();
app.UseMiddleware<SecurityHeadersMiddleware>();
app.UseMiddleware<RateLimitingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();

    db.Database.ExecuteSqlRaw($@"
        CREATE TABLE IF NOT EXISTS ""Beneficiaries"" (
            ""Id"" UUID PRIMARY KEY,
            ""UserId"" UUID NOT NULL REFERENCES ""Users""(""Id""),
            ""Name"" VARCHAR(200) NOT NULL,
            ""BankName"" VARCHAR(200) NULL,
            ""AccountNumber"" VARCHAR(50) NULL,
            ""Country"" VARCHAR(100) NULL,
            ""Currency"" VARCHAR(3) NOT NULL DEFAULT 'ZAR',
            ""IsVerified"" BOOLEAN NOT NULL DEFAULT FALSE,
            ""IsFavorite"" BOOLEAN NOT NULL DEFAULT FALSE,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS ""ScheduledPayments"" (
            ""Id"" UUID PRIMARY KEY,
            ""UserId"" UUID NOT NULL REFERENCES ""Users""(""Id""),
            ""BeneficiaryId"" UUID NULL,
            ""BeneficiaryName"" VARCHAR(200) NOT NULL,
            ""Amount"" DECIMAL(18,2) NOT NULL,
            ""Currency"" VARCHAR(3) NOT NULL DEFAULT 'ZAR',
            ""Frequency"" VARCHAR(20) NOT NULL DEFAULT 'monthly',
            ""NextDate"" TIMESTAMPTZ NOT NULL,
            ""EndDate"" TIMESTAMPTZ NULL,
            ""Status"" VARCHAR(20) NOT NULL DEFAULT 'active',
            ""Description"" VARCHAR(500) NULL,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        ALTER TABLE ""Loans"" ADD COLUMN IF NOT EXISTS ""LoanType"" VARCHAR(50) NOT NULL DEFAULT 'personal';
        ALTER TABLE ""Loans"" ADD COLUMN IF NOT EXISTS ""Balance"" DECIMAL(18,2) NOT NULL DEFAULT 0;
        ALTER TABLE ""Loans"" ADD COLUMN IF NOT EXISTS ""PaidAmount"" DECIMAL(18,2) NOT NULL DEFAULT 0;

        CREATE TABLE IF NOT EXISTS ""KycApplications"" (
            ""Id"" UUID PRIMARY KEY,
            ""UserId"" UUID NOT NULL REFERENCES ""Users""(""Id""),
            ""Status"" VARCHAR(20) NOT NULL DEFAULT 'not_started',
            ""ApplicationType"" VARCHAR(20) NOT NULL DEFAULT 'individual',
            ""RiskScore"" INTEGER NOT NULL DEFAULT 0,
            ""FraudScore"" INTEGER NOT NULL DEFAULT 0,
            ""AiConfidenceScore"" INTEGER NOT NULL DEFAULT 0,
            ""FirstName"" VARCHAR(100) NULL,
            ""MiddleName"" VARCHAR(100) NULL,
            ""LastName"" VARCHAR(100) NULL,
            ""DateOfBirth"" TIMESTAMPTZ NULL,
            ""Gender"" VARCHAR(20) NULL,
            ""Nationality"" VARCHAR(100) NULL,
            ""CountryOfResidence"" VARCHAR(100) NULL,
            ""NationalIdNumber"" VARCHAR(100) NULL,
            ""PassportNumber"" VARCHAR(100) NULL,
            ""DriversLicenseNumber"" VARCHAR(100) NULL,
            ""TaxNumber"" VARCHAR(100) NULL,
            ""PhoneCountryCode"" VARCHAR(20) NULL,
            ""ResidentialAddress"" VARCHAR(500) NULL,
            ""Province"" VARCHAR(100) NULL,
            ""City"" VARCHAR(100) NULL,
            ""PostalCode"" VARCHAR(20) NULL,
            ""BankName"" VARCHAR(200) NULL,
            ""BankAccountNumber"" VARCHAR(50) NULL,
            ""BranchCode"" VARCHAR(20) NULL,
            ""AccountHolderName"" VARCHAR(200) NULL,
            ""BusinessName"" VARCHAR(200) NULL,
            ""BusinessRegistrationNumber"" VARCHAR(100) NULL,
            ""BusinessTaxNumber"" VARCHAR(100) NULL,
            ""BusinessVatNumber"" VARCHAR(50) NULL,
            ""BusinessIndustry"" VARCHAR(100) NULL,
            ""BusinessWebsite"" VARCHAR(200) NULL,
            ""YearsInOperation"" VARCHAR(10) NULL,
            ""CompletedSteps"" TEXT NULL DEFAULT '[]',
            ""Metadata"" TEXT NULL DEFAULT '',
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ""SubmittedAt"" TIMESTAMPTZ NULL,
            ""ReviewedAt"" TIMESTAMPTZ NULL,
            ""CompletedAt"" TIMESTAMPTZ NULL,
            ""UpdatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE UNIQUE INDEX IF NOT EXISTS ""IX_KycApplications_UserId"" ON ""KycApplications""(""UserId"");
        CREATE INDEX IF NOT EXISTS ""IX_KycApplications_Status"" ON ""KycApplications""(""Status"");
        CREATE INDEX IF NOT EXISTS ""IX_KycApplications_CreatedAt"" ON ""KycApplications""(""CreatedAt"");

        CREATE TABLE IF NOT EXISTS ""KycDocuments"" (
            ""Id"" UUID PRIMARY KEY,
            ""KycApplicationId"" UUID NOT NULL REFERENCES ""KycApplications""(""Id"") ON DELETE CASCADE,
            ""DocumentType"" VARCHAR(50) NOT NULL,
            ""DocumentSide"" VARCHAR(10) NOT NULL DEFAULT 'front',
            ""FileName"" VARCHAR(255) NOT NULL,
            ""ContentType"" VARCHAR(100) NOT NULL,
            ""FileSize"" BIGINT NOT NULL DEFAULT 0,
            ""FileData"" TEXT NOT NULL,
            ""Status"" VARCHAR(20) NOT NULL DEFAULT 'pending',
            ""OcrData"" TEXT NULL,
            ""RejectionReason"" VARCHAR(500) NULL,
            ""QualityScore"" INTEGER NOT NULL DEFAULT 0,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS ""IX_KycDocuments_KycApplicationId"" ON ""KycDocuments""(""KycApplicationId"");
        CREATE INDEX IF NOT EXISTS ""IX_KycDocuments_DocumentType"" ON ""KycDocuments""(""DocumentType"");

        CREATE TABLE IF NOT EXISTS ""KycReviews"" (
            ""Id"" UUID PRIMARY KEY,
            ""KycApplicationId"" UUID NOT NULL REFERENCES ""KycApplications""(""Id"") ON DELETE CASCADE,
            ""ReviewerId"" UUID NOT NULL REFERENCES ""Users""(""Id""),
            ""Action"" VARCHAR(20) NOT NULL,
            ""Notes"" VARCHAR(1000) NULL,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS ""KycTimelineEvents"" (
            ""Id"" UUID PRIMARY KEY,
            ""KycApplicationId"" UUID NOT NULL REFERENCES ""KycApplications""(""Id"") ON DELETE CASCADE,
            ""EventType"" VARCHAR(50) NOT NULL,
            ""Description"" VARCHAR(500) NOT NULL,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS ""IX_KycTimelineEvents_KycApplicationId"" ON ""KycTimelineEvents""(""KycApplicationId"");
        CREATE INDEX IF NOT EXISTS ""IX_KycTimelineEvents_CreatedAt"" ON ""KycTimelineEvents""(""CreatedAt"");

        CREATE TABLE IF NOT EXISTS ""UserPreferences"" (
            ""Id"" UUID PRIMARY KEY,
            ""UserId"" UUID NOT NULL REFERENCES ""Users""(""Id"") ON DELETE CASCADE,
            ""Category"" VARCHAR(50) NOT NULL,
            ""Key"" VARCHAR(100) NOT NULL,
            ""Value"" TEXT NOT NULL DEFAULT '',
            ""UpdatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE UNIQUE INDEX IF NOT EXISTS ""IX_UserPreferences_UserId_Category_Key"" ON ""UserPreferences""(""UserId"", ""Category"", ""Key"");

        CREATE TABLE IF NOT EXISTS ""BusinessProfiles"" (
            ""Id"" UUID PRIMARY KEY,
            ""UserId"" UUID NOT NULL REFERENCES ""Users""(""Id"") ON DELETE CASCADE,
            ""BusinessName"" VARCHAR(200) NULL,
            ""RegistrationNumber"" VARCHAR(100) NULL,
            ""VATNumber"" VARCHAR(50) NULL,
            ""Industry"" VARCHAR(100) NULL,
            ""CompanyAddress"" VARCHAR(500) NULL,
            ""Website"" VARCHAR(200) NULL,
            ""BusinessDescription"" VARCHAR(500) NULL,
            ""LogoUrl"" VARCHAR(500) NULL,
            ""Directors"" TEXT NULL,
            ""BankAccountDetails"" TEXT NULL,
            ""SettlementPreference"" VARCHAR(50) NULL DEFAULT 'daily',
            ""Documents"" TEXT NULL,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ""UpdatedAt"" TIMESTAMPTZ NULL
        );
        CREATE UNIQUE INDEX IF NOT EXISTS ""IX_BusinessProfiles_UserId"" ON ""BusinessProfiles""(""UserId"");

        CREATE TABLE IF NOT EXISTS ""Cards"" (
            ""Id"" UUID PRIMARY KEY,
            ""UserId"" UUID NOT NULL REFERENCES ""Users""(""Id"") ON DELETE CASCADE,
            ""Type"" VARCHAR(20) NOT NULL DEFAULT 'debit',
            ""LastFour"" VARCHAR(4) NOT NULL,
            ""Expiry"" VARCHAR(10) NOT NULL,
            ""CardholderName"" VARCHAR(100) NULL,
            ""IsFrozen"" BOOLEAN NOT NULL DEFAULT FALSE,
            ""IsVirtual"" BOOLEAN NOT NULL DEFAULT FALSE,
            ""Limit"" DECIMAL(18,2) NULL,
            ""IsActive"" BOOLEAN NOT NULL DEFAULT TRUE,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ""UpdatedAt"" TIMESTAMPTZ NULL
        );
        CREATE INDEX IF NOT EXISTS ""IX_Cards_UserId"" ON ""Cards""(""UserId"");
        CREATE INDEX IF NOT EXISTS ""IX_Cards_IsActive"" ON ""Cards""(""IsActive"");

        CREATE TABLE IF NOT EXISTS ""ApiKeys"" (
            ""Id"" UUID PRIMARY KEY,
            ""UserId"" UUID NOT NULL REFERENCES ""Users""(""Id"") ON DELETE CASCADE,
            ""Name"" VARCHAR(100) NOT NULL,
            ""KeyHash"" VARCHAR(64) NOT NULL,
            ""SecretHash"" VARCHAR(128) NOT NULL,
            ""Environment"" VARCHAR(20) NOT NULL DEFAULT 'sandbox',
            ""Scopes"" TEXT NOT NULL DEFAULT '[]',
            ""AllowedDomains"" TEXT NOT NULL DEFAULT '[]',
            ""CallbackUrls"" TEXT NOT NULL DEFAULT '[]',
            ""WebhookUrl"" VARCHAR(500) NULL,
            ""IsActive"" BOOLEAN NOT NULL DEFAULT TRUE,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ""LastUsedAt"" TIMESTAMPTZ NULL
        );
        CREATE INDEX IF NOT EXISTS ""IX_ApiKeys_UserId"" ON ""ApiKeys""(""UserId"");

        CREATE TABLE IF NOT EXISTS ""TeamMembers"" (
            ""Id"" UUID PRIMARY KEY,
            ""BusinessUserId"" UUID NOT NULL REFERENCES ""Users""(""Id"") ON DELETE CASCADE,
            ""MemberEmail"" VARCHAR(200) NOT NULL,
            ""Role"" VARCHAR(50) NOT NULL DEFAULT 'readonly',
            ""Permissions"" TEXT NOT NULL DEFAULT '[]',
            ""Status"" VARCHAR(20) NOT NULL DEFAULT 'invited',
            ""InvitedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ""AcceptedAt"" TIMESTAMPTZ NULL,
            ""UpdatedAt"" TIMESTAMPTZ NULL
        );
        CREATE UNIQUE INDEX IF NOT EXISTS ""IX_TeamMembers_BusinessUserId_MemberEmail"" ON ""TeamMembers""(""BusinessUserId"", ""MemberEmail"");

        CREATE TABLE IF NOT EXISTS ""ConnectedDevices"" (
            ""Id"" UUID PRIMARY KEY,
            ""UserId"" UUID NOT NULL REFERENCES ""Users""(""Id"") ON DELETE CASCADE,
            ""DeviceName"" VARCHAR(200) NOT NULL,
            ""DeviceType"" VARCHAR(50) NOT NULL,
            ""Browser"" VARCHAR(100) NULL,
            ""OS"" VARCHAR(50) NULL,
            ""IPAddress"" VARCHAR(50) NULL,
            ""Location"" VARCHAR(200) NULL,
            ""IsTrusted"" BOOLEAN NOT NULL DEFAULT FALSE,
            ""IsCurrent"" BOOLEAN NOT NULL DEFAULT FALSE,
            ""LastActiveAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS ""IX_ConnectedDevices_UserId"" ON ""ConnectedDevices""(""UserId"");
        CREATE INDEX IF NOT EXISTS ""IX_ConnectedDevices_LastActiveAt"" ON ""ConnectedDevices""(""LastActiveAt"");

        CREATE TABLE IF NOT EXISTS ""ActivityLogs"" (
            ""Id"" UUID PRIMARY KEY,
            ""UserId"" UUID NOT NULL REFERENCES ""Users""(""Id"") ON DELETE CASCADE,
            ""Action"" VARCHAR(100) NOT NULL,
            ""Category"" VARCHAR(50) NOT NULL,
            ""Details"" TEXT NOT NULL DEFAULT '',
            ""IPAddress"" VARCHAR(50) NULL,
            ""UserAgent"" VARCHAR(500) NULL,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS ""IX_ActivityLogs_UserId"" ON ""ActivityLogs""(""UserId"");
        CREATE INDEX IF NOT EXISTS ""IX_ActivityLogs_CreatedAt"" ON ""ActivityLogs""(""CreatedAt"");
        CREATE INDEX IF NOT EXISTS ""IX_ActivityLogs_Category"" ON ""ActivityLogs""(""Category"");

        CREATE TABLE IF NOT EXISTS ""Integrations"" (
            ""Id"" UUID PRIMARY KEY,
            ""UserId"" UUID NOT NULL REFERENCES ""Users""(""Id"") ON DELETE CASCADE,
            ""Provider"" VARCHAR(50) NOT NULL,
            ""IsConnected"" BOOLEAN NOT NULL DEFAULT FALSE,
            ""Permissions"" TEXT NOT NULL DEFAULT '[]',
            ""SyncStatus"" VARCHAR(20) NOT NULL DEFAULT 'idle',
            ""LastSyncedAt"" TIMESTAMPTZ NULL,
            ""Credentials"" TEXT NOT NULL DEFAULT '',
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ""UpdatedAt"" TIMESTAMPTZ NULL
        );
        CREATE UNIQUE INDEX IF NOT EXISTS ""IX_Integrations_UserId_Provider"" ON ""Integrations""(""UserId"", ""Provider"");

        CREATE TABLE IF NOT EXISTS ""SupportTickets"" (
            ""Id"" UUID PRIMARY KEY,
            ""Subject"" VARCHAR(300) NOT NULL,
            ""Description"" TEXT NOT NULL,
            ""Status"" VARCHAR(50) NOT NULL DEFAULT 'open',
            ""Priority"" VARCHAR(20) NOT NULL DEFAULT 'medium',
            ""Category"" VARCHAR(100) NOT NULL DEFAULT 'general',
            ""UserId"" UUID NOT NULL REFERENCES ""Users""(""Id"") ON DELETE CASCADE,
            ""AssignedToId"" UUID NULL REFERENCES ""Users""(""Id"") ON DELETE SET NULL,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ""UpdatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ""ResolvedAt"" TIMESTAMPTZ NULL,
            ""ClosedAt"" TIMESTAMPTZ NULL
        );
        CREATE INDEX IF NOT EXISTS ""IX_SupportTickets_UserId"" ON ""SupportTickets""(""UserId"");
        CREATE INDEX IF NOT EXISTS ""IX_SupportTickets_Status"" ON ""SupportTickets""(""Status"");
        CREATE INDEX IF NOT EXISTS ""IX_SupportTickets_Category"" ON ""SupportTickets""(""Category"");
        CREATE INDEX IF NOT EXISTS ""IX_SupportTickets_CreatedAt"" ON ""SupportTickets""(""CreatedAt"");

        CREATE TABLE IF NOT EXISTS ""ChatMessages"" (
            ""Id"" UUID PRIMARY KEY,
            ""TicketId"" UUID NOT NULL REFERENCES ""SupportTickets""(""Id"") ON DELETE CASCADE,
            ""UserId"" UUID NOT NULL REFERENCES ""Users""(""Id"") ON DELETE CASCADE,
            ""Content"" TEXT NOT NULL,
            ""IsFromAgent"" BOOLEAN NOT NULL DEFAULT FALSE,
            ""IsInternalNote"" BOOLEAN NOT NULL DEFAULT FALSE,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ""ReadAt"" TIMESTAMPTZ NULL
        );
        CREATE INDEX IF NOT EXISTS ""IX_ChatMessages_TicketId"" ON ""ChatMessages""(""TicketId"");
        CREATE INDEX IF NOT EXISTS ""IX_ChatMessages_UserId"" ON ""ChatMessages""(""UserId"");

        CREATE TABLE IF NOT EXISTS ""ChatAttachments"" (
            ""Id"" UUID PRIMARY KEY,
            ""MessageId"" UUID NOT NULL REFERENCES ""ChatMessages""(""Id"") ON DELETE CASCADE,
            ""FileName"" VARCHAR(300) NOT NULL,
            ""FileUrl"" VARCHAR(500) NOT NULL,
            ""MimeType"" VARCHAR(100) NOT NULL,
            ""FileSize"" BIGINT NOT NULL DEFAULT 0,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS ""IX_ChatAttachments_MessageId"" ON ""ChatAttachments""(""MessageId"");

        CREATE TABLE IF NOT EXISTS ""TicketAttachments"" (
            ""Id"" UUID PRIMARY KEY,
            ""TicketId"" UUID NOT NULL REFERENCES ""SupportTickets""(""Id"") ON DELETE CASCADE,
            ""FileName"" VARCHAR(300) NOT NULL,
            ""FileUrl"" VARCHAR(500) NOT NULL,
            ""MimeType"" VARCHAR(100) NOT NULL,
            ""FileSize"" BIGINT NOT NULL DEFAULT 0,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS ""IX_TicketAttachments_TicketId"" ON ""TicketAttachments""(""TicketId"");

        CREATE TABLE IF NOT EXISTS ""TicketSatisfactions"" (
            ""Id"" UUID PRIMARY KEY,
            ""TicketId"" UUID NOT NULL REFERENCES ""SupportTickets""(""Id"") ON DELETE CASCADE,
            ""UserId"" UUID NOT NULL REFERENCES ""Users""(""Id"") ON DELETE CASCADE,
            ""Rating"" INTEGER NOT NULL CHECK (""Rating"" >= 1 AND ""Rating"" <= 5),
            ""Comment"" VARCHAR(2000) NULL,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE UNIQUE INDEX IF NOT EXISTS ""IX_TicketSatisfactions_TicketId_UserId"" ON ""TicketSatisfactions""(""TicketId"", ""UserId"");

        CREATE TABLE IF NOT EXISTS ""KnowledgeBaseArticles"" (
            ""Id"" UUID PRIMARY KEY,
            ""Title"" VARCHAR(300) NOT NULL,
            ""Slug"" VARCHAR(500) NOT NULL,
            ""Content"" TEXT NOT NULL,
            ""Excerpt"" VARCHAR(1000) NOT NULL DEFAULT '',
            ""Category"" VARCHAR(100) NOT NULL DEFAULT 'general',
            ""Status"" VARCHAR(20) NOT NULL DEFAULT 'draft',
            ""IsFeatured"" BOOLEAN NOT NULL DEFAULT FALSE,
            ""ViewCount"" INTEGER NOT NULL DEFAULT 0,
            ""HelpfulCount"" INTEGER NOT NULL DEFAULT 0,
            ""NotHelpfulCount"" INTEGER NOT NULL DEFAULT 0,
            ""AuthorId"" UUID NULL REFERENCES ""Users""(""Id"") ON DELETE SET NULL,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ""UpdatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ""PublishedAt"" TIMESTAMPTZ NULL
        );

        CREATE TABLE IF NOT EXISTS ""SupportCategories"" (
            ""Id"" UUID PRIMARY KEY,
            ""Name"" VARCHAR(100) NOT NULL,
            ""Key"" VARCHAR(50) NOT NULL,
            ""Description"" VARCHAR(500) NOT NULL DEFAULT '',
            ""Icon"" VARCHAR(50) NOT NULL DEFAULT 'HelpCircle',
            ""Color"" VARCHAR(10) NOT NULL DEFAULT '#0057FF',
            ""DisplayOrder"" INTEGER NOT NULL DEFAULT 0,
            ""IsActive"" BOOLEAN NOT NULL DEFAULT TRUE
        );
    ");

    var adminEmail = builder.Configuration["AdminEmail"]
        ?? Environment.GetEnvironmentVariable("NEXT_PUBLIC_ADMIN_EMAIL")
        ?? "meetpeterosakwe@gmail.com";

    var adminUser = db.Users.FirstOrDefault(u => u.Email == adminEmail);
    if (adminUser != null && adminUser.Role != "admin")
    {
        adminUser.Role = "admin";
        db.SaveChanges();
    }

    var testEmails = new[] { "test@payafrika.com", "demo@test.com" };
    var testUsers = db.Users.Where(u => testEmails.Contains(u.Email)).ToList();
    if (testUsers.Count != 0)
    {
        db.Users.RemoveRange(testUsers);
        db.SaveChanges();
    }
}

app.Run();
