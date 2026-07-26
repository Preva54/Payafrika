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

        CREATE TABLE IF NOT EXISTS ""ContentPages"" (
            ""Id"" UUID PRIMARY KEY, ""Title"" VARCHAR(300) NOT NULL, ""Slug"" VARCHAR(500) NOT NULL,
            ""Content"" TEXT NOT NULL DEFAULT '', ""Status"" VARCHAR(50) NOT NULL DEFAULT 'draft',
            ""AuthorId"" UUID NULL REFERENCES ""Users""(""Id"") ON DELETE SET NULL,
            ""Template"" VARCHAR(200) NULL, ""Metadata"" TEXT NULL, ""SortOrder"" INTEGER NOT NULL DEFAULT 0,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW(), ""UpdatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ""PublishedAt"" TIMESTAMPTZ NULL, ""ScheduledAt"" TIMESTAMPTZ NULL
        );
        CREATE UNIQUE INDEX IF NOT EXISTS ""IX_ContentPages_Slug"" ON ""ContentPages""(""Slug"");
        CREATE INDEX IF NOT EXISTS ""IX_ContentPages_Status"" ON ""ContentPages""(""Status"");

        CREATE TABLE IF NOT EXISTS ""BlogCategories"" (
            ""Id"" UUID PRIMARY KEY, ""Name"" VARCHAR(200) NOT NULL, ""Slug"" VARCHAR(500) NOT NULL,
            ""Description"" TEXT NULL, ""SortOrder"" INTEGER NOT NULL DEFAULT 0, ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE UNIQUE INDEX IF NOT EXISTS ""IX_BlogCategories_Slug"" ON ""BlogCategories""(""Slug"");

        CREATE TABLE IF NOT EXISTS ""BlogPosts"" (
            ""Id"" UUID PRIMARY KEY, ""Title"" VARCHAR(300) NOT NULL, ""Slug"" VARCHAR(500) NOT NULL,
            ""Content"" TEXT NOT NULL DEFAULT '', ""Excerpt"" TEXT NULL, ""FeaturedImage"" TEXT NULL,
            ""CategoryId"" UUID NULL REFERENCES ""BlogCategories""(""Id"") ON DELETE SET NULL,
            ""Tags"" TEXT NOT NULL DEFAULT '', ""AuthorId"" UUID NULL REFERENCES ""Users""(""Id"") ON DELETE SET NULL,
            ""Status"" VARCHAR(50) NOT NULL DEFAULT 'draft', ""IsFeatured"" BOOLEAN NOT NULL DEFAULT FALSE,
            ""ViewCount"" INTEGER NOT NULL DEFAULT 0, ""ReadingTime"" INTEGER NOT NULL DEFAULT 0,
            ""SeoTitle"" VARCHAR(300) NULL, ""SeoDescription"" TEXT NULL, ""OpenGraphImage"" TEXT NULL,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW(), ""UpdatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ""PublishedAt"" TIMESTAMPTZ NULL, ""ScheduledAt"" TIMESTAMPTZ NULL
        );
        CREATE UNIQUE INDEX IF NOT EXISTS ""IX_BlogPosts_Slug"" ON ""BlogPosts""(""Slug"");

        CREATE TABLE IF NOT EXISTS ""Services"" (
            ""Id"" UUID PRIMARY KEY, ""Name"" VARCHAR(200) NOT NULL, ""Slug"" VARCHAR(500) NOT NULL,
            ""Icon"" TEXT NULL, ""HeroImage"" TEXT NULL, ""Description"" TEXT NOT NULL DEFAULT '',
            ""Features"" TEXT NOT NULL DEFAULT '[]', ""Pricing"" TEXT NULL, ""Faq"" TEXT NULL,
            ""CtaText"" VARCHAR(200) NULL, ""CtaUrl"" VARCHAR(500) NULL,
            ""SeoTitle"" VARCHAR(300) NULL, ""SeoDescription"" TEXT NULL,
            ""Status"" VARCHAR(50) NOT NULL DEFAULT 'draft', ""SortOrder"" INTEGER NOT NULL DEFAULT 0,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW(), ""UpdatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE UNIQUE INDEX IF NOT EXISTS ""IX_Services_Slug"" ON ""Services""(""Slug"");

        CREATE TABLE IF NOT EXISTS ""Products"" (
            ""Id"" UUID PRIMARY KEY, ""Name"" VARCHAR(200) NOT NULL, ""Slug"" VARCHAR(500) NOT NULL,
            ""Description"" TEXT NOT NULL DEFAULT '', ""Images"" TEXT NOT NULL DEFAULT '[]',
            ""Videos"" TEXT NULL, ""Features"" TEXT NOT NULL DEFAULT '[]', ""Pricing"" TEXT NULL,
            ""Documentation"" TEXT NULL, ""DownloadLinks"" TEXT NULL,
            ""SeoTitle"" VARCHAR(300) NULL, ""SeoDescription"" TEXT NULL,
            ""Status"" VARCHAR(50) NOT NULL DEFAULT 'draft', ""SortOrder"" INTEGER NOT NULL DEFAULT 0,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW(), ""UpdatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE UNIQUE INDEX IF NOT EXISTS ""IX_Products_Slug"" ON ""Products""(""Slug"");

        CREATE TABLE IF NOT EXISTS ""Testimonials"" (
            ""Id"" UUID PRIMARY KEY, ""CustomerName"" VARCHAR(200) NOT NULL, ""CustomerPhoto"" TEXT NULL,
            ""CompanyLogo"" TEXT NULL, ""CompanyName"" VARCHAR(200) NULL, ""Content"" TEXT NOT NULL,
            ""Rating"" INTEGER NOT NULL DEFAULT 5, ""VideoUrl"" TEXT NULL,
            ""Type"" VARCHAR(50) NOT NULL DEFAULT 'customer', ""IsFeatured"" BOOLEAN NOT NULL DEFAULT FALSE,
            ""SortOrder"" INTEGER NOT NULL DEFAULT 0, ""Status"" VARCHAR(20) NOT NULL DEFAULT 'published',
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS ""CmsTeamMembers"" (
            ""Id"" UUID PRIMARY KEY, ""Name"" VARCHAR(200) NOT NULL, ""Photo"" TEXT NULL,
            ""Role"" VARCHAR(200) NOT NULL, ""Biography"" TEXT NULL,
            ""LinkedIn"" VARCHAR(500) NULL, ""Twitter"" VARCHAR(500) NULL,
            ""Email"" VARCHAR(300) NULL, ""Phone"" VARCHAR(50) NULL,
            ""Department"" VARCHAR(100) NOT NULL DEFAULT '', ""SortOrder"" INTEGER NOT NULL DEFAULT 0,
            ""Status"" VARCHAR(20) NOT NULL DEFAULT 'published', ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS ""Partners"" (
            ""Id"" UUID PRIMARY KEY, ""Name"" VARCHAR(200) NOT NULL, ""LogoUrl"" TEXT NULL,
            ""Description"" TEXT NULL, ""Website"" VARCHAR(500) NULL,
            ""Type"" VARCHAR(50) NOT NULL DEFAULT 'partner', ""IsFeatured"" BOOLEAN NOT NULL DEFAULT FALSE,
            ""SortOrder"" INTEGER NOT NULL DEFAULT 0, ""Status"" VARCHAR(20) NOT NULL DEFAULT 'published',
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS ""JobPositions"" (
            ""Id"" UUID PRIMARY KEY, ""Title"" VARCHAR(200) NOT NULL, ""Department"" VARCHAR(200) NOT NULL,
            ""Location"" VARCHAR(200) NOT NULL, ""EmploymentType"" VARCHAR(50) NOT NULL DEFAULT 'full-time',
            ""SalaryMin"" DECIMAL(18,2) NULL, ""SalaryMax"" DECIMAL(18,2) NULL,
            ""Description"" TEXT NOT NULL DEFAULT '', ""Requirements"" TEXT NOT NULL DEFAULT '[]',
            ""Benefits"" TEXT NOT NULL DEFAULT '[]', ""HiringManager"" VARCHAR(200) NULL,
            ""ClosingDate"" TIMESTAMPTZ NULL, ""SortOrder"" INTEGER NOT NULL DEFAULT 0,
            ""Status"" VARCHAR(20) NOT NULL DEFAULT 'draft',
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW(), ""UpdatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS ""JobApplications"" (
            ""Id"" UUID PRIMARY KEY, ""PositionId"" UUID NOT NULL REFERENCES ""JobPositions""(""Id"") ON DELETE CASCADE,
            ""ApplicantName"" VARCHAR(200) NOT NULL, ""Email"" VARCHAR(300) NOT NULL,
            ""Phone"" VARCHAR(50) NULL, ""ResumeUrl"" TEXT NULL, ""CoverLetter"" TEXT NULL,
            ""Data"" TEXT NOT NULL DEFAULT '', ""Status"" VARCHAR(50) NOT NULL DEFAULT 'new',
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS ""FaqCategories"" (
            ""Id"" UUID PRIMARY KEY, ""Name"" VARCHAR(200) NOT NULL, ""SortOrder"" INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS ""Faqs"" (
            ""Id"" UUID PRIMARY KEY, ""Question"" TEXT NOT NULL, ""Answer"" TEXT NOT NULL,
            ""CategoryId"" UUID NULL REFERENCES ""FaqCategories""(""Id"") ON DELETE SET NULL,
            ""Priority"" INTEGER NOT NULL DEFAULT 0, ""RelatedFaqs"" TEXT NULL,
            ""Status"" VARCHAR(20) NOT NULL DEFAULT 'published', ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS ""MediaFolders"" (
            ""Id"" UUID PRIMARY KEY, ""Name"" VARCHAR(200) NOT NULL,
            ""ParentId"" UUID NULL REFERENCES ""MediaFolders""(""Id"") ON DELETE RESTRICT,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS ""MediaFiles"" (
            ""Id"" UUID PRIMARY KEY, ""Name"" VARCHAR(300) NOT NULL, ""FileName"" VARCHAR(500) NOT NULL,
            ""FileUrl"" VARCHAR(500) NOT NULL, ""FileType"" VARCHAR(50) NOT NULL DEFAULT 'image',
            ""MimeType"" VARCHAR(100) NOT NULL DEFAULT '', ""FileSize"" BIGINT NOT NULL DEFAULT 0,
            ""Width"" INTEGER NULL, ""Height"" INTEGER NULL, ""Alt"" TEXT NULL,
            ""FolderId"" UUID NULL REFERENCES ""MediaFolders""(""Id"") ON DELETE SET NULL,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS ""NavigationMenus"" (
            ""Id"" UUID PRIMARY KEY, ""Name"" VARCHAR(200) NOT NULL, ""Location"" VARCHAR(50) NOT NULL DEFAULT 'header',
            ""Items"" TEXT NOT NULL DEFAULT '[]', ""Status"" VARCHAR(20) NOT NULL DEFAULT 'published',
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW(), ""UpdatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS ""FooterConfigs"" (
            ""Id"" UUID PRIMARY KEY, ""CompanyInfo"" TEXT NOT NULL DEFAULT '', ""Links"" TEXT NOT NULL DEFAULT '[]',
            ""SocialMedia"" TEXT NOT NULL DEFAULT '[]', ""Newsletter"" TEXT NULL, ""ContactInfo"" TEXT NULL,
            ""Certifications"" TEXT NOT NULL DEFAULT '[]', ""PaymentLogos"" TEXT NOT NULL DEFAULT '[]',
            ""LegalLinks"" TEXT NOT NULL DEFAULT '[]', ""Copyright"" TEXT NULL,
            ""Status"" VARCHAR(20) NOT NULL DEFAULT 'published', ""UpdatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS ""Popups"" (
            ""Id"" UUID PRIMARY KEY, ""Title"" VARCHAR(300) NOT NULL, ""Content"" TEXT NOT NULL DEFAULT '',
            ""Type"" VARCHAR(50) NOT NULL DEFAULT 'announcement', ""Status"" VARCHAR(20) NOT NULL DEFAULT 'draft',
            ""Scheduling"" TEXT NULL, ""TargetAudience"" TEXT NULL, ""DisplayRules"" TEXT NULL,
            ""Animation"" TEXT NULL, ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ""UpdatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS ""Announcements"" (
            ""Id"" UUID PRIMARY KEY, ""Title"" VARCHAR(300) NOT NULL, ""Message"" TEXT NOT NULL DEFAULT '',
            ""Type"" VARCHAR(50) NOT NULL DEFAULT 'update', ""Status"" VARCHAR(20) NOT NULL DEFAULT 'draft',
            ""TargetRoles"" TEXT NOT NULL DEFAULT '[]', ""StartAt"" TIMESTAMPTZ NULL, ""EndAt"" TIMESTAMPTZ NULL,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS ""CmsForms"" (
            ""Id"" UUID PRIMARY KEY, ""Name"" VARCHAR(200) NOT NULL, ""Fields"" TEXT NOT NULL DEFAULT '[]',
            ""SuccessMessage"" TEXT NULL, ""EmailNotifications"" TEXT NULL, ""ValidationRules"" TEXT NULL,
            ""Status"" VARCHAR(20) NOT NULL DEFAULT 'draft',
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW(), ""UpdatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS ""FormSubmissions"" (
            ""Id"" UUID PRIMARY KEY, ""FormId"" UUID NOT NULL REFERENCES ""CmsForms""(""Id"") ON DELETE CASCADE,
            ""Data"" TEXT NOT NULL DEFAULT '', ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS ""LegalPages"" (
            ""Id"" UUID PRIMARY KEY, ""Title"" VARCHAR(200) NOT NULL, ""Slug"" VARCHAR(500) NOT NULL,
            ""Content"" TEXT NOT NULL DEFAULT '', ""Status"" VARCHAR(20) NOT NULL DEFAULT 'published',
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW(), ""UpdatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS ""ApiDocs"" (
            ""Id"" UUID PRIMARY KEY, ""Title"" VARCHAR(300) NOT NULL, ""Slug"" VARCHAR(500) NOT NULL,
            ""Content"" TEXT NOT NULL DEFAULT '', ""Category"" VARCHAR(100) NOT NULL DEFAULT '',
            ""SortOrder"" INTEGER NOT NULL DEFAULT 0, ""Status"" VARCHAR(20) NOT NULL DEFAULT 'draft',
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW(), ""UpdatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS ""SupportContents"" (
            ""Id"" UUID PRIMARY KEY, ""Title"" VARCHAR(300) NOT NULL, ""Slug"" VARCHAR(500) NOT NULL,
            ""Content"" TEXT NOT NULL DEFAULT '', ""Category"" VARCHAR(100) NOT NULL DEFAULT '',
            ""SortOrder"" INTEGER NOT NULL DEFAULT 0, ""Status"" VARCHAR(20) NOT NULL DEFAULT 'draft',
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW(), ""UpdatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS ""ContentVersions"" (
            ""Id"" UUID PRIMARY KEY, ""EntityType"" VARCHAR(100) NOT NULL, ""EntityId"" UUID NOT NULL,
            ""Content"" TEXT NOT NULL DEFAULT '', ""Version"" INTEGER NOT NULL DEFAULT 1,
            ""CreatedBy"" VARCHAR(200) NULL, ""ChangeNotes"" TEXT NULL,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS ""IX_ContentVersions_Entity"" ON ""ContentVersions""(""EntityType"", ""EntityId"");

        CREATE TABLE IF NOT EXISTS ""ContentRevisions"" (
            ""Id"" UUID PRIMARY KEY, ""EntityType"" VARCHAR(100) NOT NULL, ""EntityId"" UUID NOT NULL,
            ""FromStatus"" VARCHAR(50) NOT NULL DEFAULT '', ""ToStatus"" VARCHAR(50) NOT NULL DEFAULT '',
            ""Notes"" TEXT NULL, ""CreatedBy"" VARCHAR(200) NULL,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS ""IX_ContentRevisions_Entity"" ON ""ContentRevisions""(""EntityType"", ""EntityId"");

        CREATE TABLE IF NOT EXISTS ""Campaigns"" (
            ""Id"" UUID PRIMARY KEY, ""Name"" VARCHAR(200) NOT NULL, ""Description"" TEXT NULL,
            ""Type"" VARCHAR(50) NOT NULL DEFAULT 'email', ""Status"" VARCHAR(20) NOT NULL DEFAULT 'draft',
            ""StartDate"" TIMESTAMPTZ NULL, ""EndDate"" TIMESTAMPTZ NULL,
            ""TargetAudience"" TEXT NULL, ""Content"" TEXT NOT NULL DEFAULT '',
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW(), ""UpdatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS ""Affiliates"" (
            ""Id"" UUID PRIMARY KEY, ""UserId"" UUID NOT NULL REFERENCES ""Users""(""Id"") ON DELETE CASCADE,
            ""ReferralCode"" VARCHAR(50) NOT NULL, ""Status"" VARCHAR(50) NOT NULL DEFAULT 'pending',
            ""BusinessName"" VARCHAR(300) NOT NULL DEFAULT '', ""Website"" VARCHAR(500) NOT NULL DEFAULT '',
            ""SocialLinks"" TEXT NOT NULL DEFAULT '', ""Country"" VARCHAR(100) NOT NULL DEFAULT '',
            ""PreferredCurrency"" VARCHAR(10) NOT NULL DEFAULT 'ZAR', ""TaxInfo"" TEXT NOT NULL DEFAULT '',
            ""PaymentMethod"" VARCHAR(100) NOT NULL DEFAULT '', ""BankDetails"" TEXT NOT NULL DEFAULT '',
            ""TotalEarnings"" DECIMAL(18,2) NOT NULL DEFAULT 0, ""AvailableBalance"" DECIMAL(18,2) NOT NULL DEFAULT 0,
            ""PendingCommissions"" DECIMAL(18,2) NOT NULL DEFAULT 0, ""TotalPaid"" DECIMAL(18,2) NOT NULL DEFAULT 0,
            ""LifetimeReferrals"" INT NOT NULL DEFAULT 0, ""ConversionRate"" DECIMAL(5,2) NOT NULL DEFAULT 0,
            ""Tier"" VARCHAR(50) NOT NULL DEFAULT 'Bronze',
            ""ApplicationNotes"" TEXT NOT NULL DEFAULT '', ""RejectedReason"" TEXT NOT NULL DEFAULT '',
            ""ReviewedById"" UUID NULL, ""ReviewedAt"" TIMESTAMPTZ NULL,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW(), ""UpdatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE UNIQUE INDEX IF NOT EXISTS ""IX_Affiliates_UserId"" ON ""Affiliates""(""UserId"");
        CREATE UNIQUE INDEX IF NOT EXISTS ""IX_Affiliates_ReferralCode"" ON ""Affiliates""(""ReferralCode"");
        CREATE INDEX IF NOT EXISTS ""IX_Affiliates_Status"" ON ""Affiliates""(""Status"");
        CREATE INDEX IF NOT EXISTS ""IX_Affiliates_Tier"" ON ""Affiliates""(""Tier"");

        CREATE TABLE IF NOT EXISTS ""CommissionRules"" (
            ""Id"" UUID PRIMARY KEY, ""Name"" VARCHAR(300) NOT NULL, ""Description"" TEXT NOT NULL DEFAULT '',
            ""Type"" VARCHAR(50) NOT NULL DEFAULT 'percentage', ""TargetEntity"" VARCHAR(100) NOT NULL DEFAULT '',
            ""Amount"" DECIMAL(18,2) NOT NULL DEFAULT 0, ""Percentage"" DECIMAL(5,2) NOT NULL DEFAULT 0,
            ""TierMin"" INT NOT NULL DEFAULT 0, ""TierMax"" INT NOT NULL DEFAULT 0,
            ""RecurringMonths"" INT NOT NULL DEFAULT 0, ""RecurringAmount"" DECIMAL(18,2) NOT NULL DEFAULT 0,
            ""IsActive"" BOOLEAN NOT NULL DEFAULT TRUE, ""SortOrder"" INT NOT NULL DEFAULT 0,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS ""IX_CommissionRules_IsActive"" ON ""CommissionRules""(""IsActive"");

        CREATE TABLE IF NOT EXISTS ""Referrals"" (
            ""Id"" UUID PRIMARY KEY,
            ""AffiliateId"" UUID NOT NULL REFERENCES ""Affiliates""(""Id"") ON DELETE CASCADE,
            ""ReferralCode"" VARCHAR(100) NOT NULL DEFAULT '', ""CampaignId"" UUID NULL,
            ""ReferredEmail"" VARCHAR(300) NOT NULL DEFAULT '', ""ReferredUserId"" UUID NULL,
            ""ReferredName"" VARCHAR(300) NOT NULL DEFAULT '',
            ""Status"" VARCHAR(50) NOT NULL DEFAULT 'clicked',
            ""RevenueGenerated"" DECIMAL(18,2) NOT NULL DEFAULT 0,
            ""CommissionEarned"" DECIMAL(18,2) NOT NULL DEFAULT 0,
            ""Source"" VARCHAR(100) NOT NULL DEFAULT '', ""DeviceType"" VARCHAR(50) NOT NULL DEFAULT '',
            ""IPAddress"" VARCHAR(50) NOT NULL DEFAULT '', ""UserAgent"" TEXT NOT NULL DEFAULT '',
            ""CountryCode"" VARCHAR(10) NOT NULL DEFAULT '',
            ""IsFraudSuspected"" BOOLEAN NOT NULL DEFAULT FALSE, ""FraudReason"" TEXT NOT NULL DEFAULT '',
            ""ClickedAt"" TIMESTAMPTZ NULL, ""RegisteredAt"" TIMESTAMPTZ NULL,
            ""VerifiedAt"" TIMESTAMPTZ NULL, ""ConvertedAt"" TIMESTAMPTZ NULL,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS ""IX_Referrals_AffiliateId"" ON ""Referrals""(""AffiliateId"");
        CREATE INDEX IF NOT EXISTS ""IX_Referrals_ReferralCode"" ON ""Referrals""(""ReferralCode"");
        CREATE INDEX IF NOT EXISTS ""IX_Referrals_Status"" ON ""Referrals""(""Status"");
        CREATE INDEX IF NOT EXISTS ""IX_Referrals_ReferredUserId"" ON ""Referrals""(""ReferredUserId"");
        CREATE INDEX IF NOT EXISTS ""IX_Referrals_IsFraudSuspected"" ON ""Referrals""(""IsFraudSuspected"");

        CREATE TABLE IF NOT EXISTS ""AffiliateCampaigns"" (
            ""Id"" UUID PRIMARY KEY,
            ""AffiliateId"" UUID NOT NULL REFERENCES ""Affiliates""(""Id"") ON DELETE CASCADE,
            ""Name"" VARCHAR(300) NOT NULL, ""Description"" TEXT NOT NULL DEFAULT '',
            ""ReferralLink"" VARCHAR(1000) NOT NULL DEFAULT '', ""TargetAudience"" VARCHAR(500) NOT NULL DEFAULT '',
            ""MarketingChannel"" VARCHAR(200) NOT NULL DEFAULT '', ""Notes"" TEXT NOT NULL DEFAULT '',
            ""Clicks"" INT NOT NULL DEFAULT 0, ""Signups"" INT NOT NULL DEFAULT 0,
            ""Conversions"" INT NOT NULL DEFAULT 0, ""Revenue"" DECIMAL(18,2) NOT NULL DEFAULT 0,
            ""Commission"" DECIMAL(18,2) NOT NULL DEFAULT 0, ""ROI"" DECIMAL(18,2) NOT NULL DEFAULT 0,
            ""Status"" VARCHAR(50) NOT NULL DEFAULT 'active',
            ""StartDate"" TIMESTAMPTZ NULL, ""EndDate"" TIMESTAMPTZ NULL,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS ""IX_AffiliateCampaigns_AffiliateId"" ON ""AffiliateCampaigns""(""AffiliateId"");
        CREATE INDEX IF NOT EXISTS ""IX_AffiliateCampaigns_Status"" ON ""AffiliateCampaigns""(""Status"");

        CREATE TABLE IF NOT EXISTS ""Payouts"" (
            ""Id"" UUID PRIMARY KEY,
            ""AffiliateId"" UUID NOT NULL REFERENCES ""Affiliates""(""Id"") ON DELETE CASCADE,
            ""Amount"" DECIMAL(18,2) NOT NULL DEFAULT 0, ""Fee"" DECIMAL(18,2) NOT NULL DEFAULT 0,
            ""Method"" VARCHAR(100) NOT NULL DEFAULT 'bank_transfer',
            ""Status"" VARCHAR(50) NOT NULL DEFAULT 'pending',
            ""TransactionReference"" VARCHAR(500) NOT NULL DEFAULT '',
            ""BankReference"" VARCHAR(500) NOT NULL DEFAULT '', ""Notes"" TEXT NOT NULL DEFAULT '',
            ""ProcessedById"" UUID NULL,
            ""RequestedAt"" TIMESTAMPTZ NULL, ""ProcessedAt"" TIMESTAMPTZ NULL,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS ""IX_Payouts_AffiliateId"" ON ""Payouts""(""AffiliateId"");
        CREATE INDEX IF NOT EXISTS ""IX_Payouts_Status"" ON ""Payouts""(""Status"");

        CREATE TABLE IF NOT EXISTS ""BonusAwards"" (
            ""Id"" UUID PRIMARY KEY,
            ""AffiliateId"" UUID NOT NULL REFERENCES ""Affiliates""(""Id"") ON DELETE CASCADE,
            ""Type"" VARCHAR(100) NOT NULL, ""Name"" VARCHAR(300) NOT NULL,
            ""Description"" TEXT NOT NULL DEFAULT '', ""RewardAmount"" DECIMAL(18,2) NOT NULL DEFAULT 0,
            ""Requirements"" TEXT NOT NULL DEFAULT '', ""IsAwarded"" BOOLEAN NOT NULL DEFAULT FALSE,
            ""AwardedAt"" TIMESTAMPTZ NULL, ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS ""IX_BonusAwards_AffiliateId"" ON ""BonusAwards""(""AffiliateId"");

        CREATE TABLE IF NOT EXISTS ""LeaderboardEntries"" (
            ""Id"" UUID PRIMARY KEY,
            ""AffiliateId"" UUID NOT NULL REFERENCES ""Affiliates""(""Id"") ON DELETE CASCADE,
            ""Period"" VARCHAR(50) NOT NULL DEFAULT 'all-time', ""Rank"" INT NOT NULL DEFAULT 0,
            ""Referrals"" INT NOT NULL DEFAULT 0, ""Earnings"" DECIMAL(18,2) NOT NULL DEFAULT 0,
            ""Revenue"" DECIMAL(18,2) NOT NULL DEFAULT 0,
            ""PeriodStart"" TIMESTAMPTZ NULL, ""PeriodEnd"" TIMESTAMPTZ NULL,
            ""UpdatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS ""IX_LeaderboardEntries_PeriodRank"" ON ""LeaderboardEntries""(""Period"", ""Rank"");

        CREATE TABLE IF NOT EXISTS ""MarketingAssets"" (
            ""Id"" UUID PRIMARY KEY, ""Title"" VARCHAR(300) NOT NULL,
            ""Description"" TEXT NOT NULL DEFAULT '', ""Category"" VARCHAR(100) NOT NULL DEFAULT '',
            ""Type"" VARCHAR(50) NOT NULL DEFAULT 'image',
            ""FileUrl"" VARCHAR(2000) NOT NULL DEFAULT '', ""PreviewUrl"" VARCHAR(2000) NOT NULL DEFAULT '',
            ""DownloadUrl"" VARCHAR(2000) NOT NULL DEFAULT '',
            ""FileSize"" BIGINT NOT NULL DEFAULT 0, ""MimeType"" VARCHAR(100) NOT NULL DEFAULT '',
            ""IsActive"" BOOLEAN NOT NULL DEFAULT TRUE, ""SortOrder"" INT NOT NULL DEFAULT 0,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS ""AffiliateNotifications"" (
            ""Id"" UUID PRIMARY KEY,
            ""AffiliateId"" UUID NOT NULL REFERENCES ""Affiliates""(""Id"") ON DELETE CASCADE,
            ""Type"" VARCHAR(100) NOT NULL DEFAULT '', ""Title"" VARCHAR(300) NOT NULL,
            ""Message"" TEXT NOT NULL DEFAULT '', ""IsRead"" BOOLEAN NOT NULL DEFAULT FALSE,
            ""ReadAt"" TIMESTAMPTZ NULL, ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS ""IX_AffiliateNotifications_AffiliateId"" ON ""AffiliateNotifications""(""AffiliateId"");
        CREATE INDEX IF NOT EXISTS ""IX_AffiliateNotifications_IsRead"" ON ""AffiliateNotifications""(""IsRead"");

        CREATE TABLE IF NOT EXISTS ""FraudFlags"" (
            ""Id"" UUID PRIMARY KEY, ""AffiliateId"" UUID NOT NULL,
            ""ReferralId"" UUID NULL, ""Reason"" VARCHAR(500) NOT NULL,
            ""Evidence"" TEXT NOT NULL DEFAULT '', ""Status"" VARCHAR(50) NOT NULL DEFAULT 'open',
            ""ResolvedById"" UUID NULL, ""ResolvedAt"" TIMESTAMPTZ NULL,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS ""IX_FraudFlags_AffiliateId"" ON ""FraudFlags""(""AffiliateId"");
        CREATE INDEX IF NOT EXISTS ""IX_FraudFlags_Status"" ON ""FraudFlags""(""Status"");

        CREATE TABLE IF NOT EXISTS ""Commissions"" (
            ""Id"" UUID PRIMARY KEY,
            ""AffiliateId"" UUID NOT NULL REFERENCES ""Affiliates""(""Id"") ON DELETE CASCADE,
            ""ReferralId"" UUID NULL, ""CommissionRuleId"" UUID NULL,
            ""Amount"" DECIMAL(18,2) NOT NULL DEFAULT 0, ""Type"" VARCHAR(50) NOT NULL DEFAULT 'flat',
            ""Status"" VARCHAR(50) NOT NULL DEFAULT 'pending',
            ""Description"" TEXT NOT NULL DEFAULT '',
            ""EarnedAt"" TIMESTAMPTZ NULL, ""PaidAt"" TIMESTAMPTZ NULL,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS ""IX_Commissions_AffiliateId"" ON ""Commissions""(""AffiliateId"");
        CREATE INDEX IF NOT EXISTS ""IX_Commissions_Status"" ON ""Commissions""(""Status"");
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

    var testEmails = new[] { "test@payafrika.com", "demo@test.com", "testkyc4@example.com", "testkyc3@example.com", "testkyc2@example.com", "test-kyc@example.com", "meetpeterthecoder@gmail.com" };
    var testUsers = db.Users.Where(u => testEmails.Contains(u.Email)).ToList();
    if (testUsers.Count != 0)
    {
        var testUserIds = testUsers.Select(u => u.Id).ToList();
        db.KycApplications.RemoveRange(db.KycApplications.Where(k => testUserIds.Contains(k.UserId)));
        db.ActivityLogs.RemoveRange(db.ActivityLogs.Where(a => testUserIds.Contains(a.UserId)));
        db.ConnectedDevices.RemoveRange(db.ConnectedDevices.Where(d => testUserIds.Contains(d.UserId)));
        db.Integrations.RemoveRange(db.Integrations.Where(i => testUserIds.Contains(i.UserId)));
        db.SupportTickets.RemoveRange(db.SupportTickets.Where(t => testUserIds.Contains(t.UserId)));
        db.Loans.RemoveRange(db.Loans.Where(l => testUserIds.Contains(l.UserId)));
        db.Transactions.RemoveRange(db.Transactions.Where(t => testUserIds.Contains(t.UserId)));
        db.Wallets.RemoveRange(db.Wallets.Where(w => testUserIds.Contains(w.UserId)));
        db.Users.RemoveRange(testUsers);
        db.SaveChanges();
    }
}

app.Run();
