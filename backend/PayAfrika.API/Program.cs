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
builder.Services.AddScoped<IAuditService, AuditService>();
builder.Services.AddScoped<IPermissionService, PermissionService>();
builder.Services.AddScoped<IReportService, ReportService>();
builder.Services.AddScoped<IAiInsightService, AiInsightService>();
builder.Services.AddScoped<IExchangeRateService, ExchangeRateService>();
builder.Services.AddScoped<IFxAuditService, FxAuditService>();
  builder.Services.AddScoped<IBankVerificationService, BankVerificationService>();
  builder.Services.AddScoped<IBankVerificationProvider, SimulatorBankVerificationProvider>();
builder.Services.AddHttpContextAccessor();

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
app.UseMiddleware<AuditLogMiddleware>();
app.UseMiddleware<PermissionMiddleware>();

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

    db.Database.ExecuteSqlRaw(@"
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

        CREATE TABLE IF NOT EXISTS ""AuditLogs"" (
            ""Id"" UUID PRIMARY KEY,
            ""UserId"" UUID NULL REFERENCES ""Users""(""Id"") ON DELETE SET NULL,
            ""UserName"" VARCHAR(200) NOT NULL DEFAULT '',
            ""UserRole"" VARCHAR(100) NOT NULL DEFAULT '',
            ""Email"" VARCHAR(300) NOT NULL DEFAULT '',
            ""Action"" VARCHAR(100) NOT NULL DEFAULT '',
            ""Module"" VARCHAR(100) NOT NULL DEFAULT '',
            ""Resource"" VARCHAR(200) NOT NULL DEFAULT '',
            ""ResourceId"" VARCHAR(100) NOT NULL DEFAULT '',
            ""PreviousValue"" TEXT NOT NULL DEFAULT '',
            ""NewValue"" TEXT NOT NULL DEFAULT '',
            ""Metadata"" TEXT NOT NULL DEFAULT '{{}}',
            ""IPAddress"" VARCHAR(50) NOT NULL DEFAULT '',
            ""UserAgent"" VARCHAR(500) NOT NULL DEFAULT '',
            ""Browser"" VARCHAR(100) NOT NULL DEFAULT '',
            ""OperatingSystem"" VARCHAR(50) NOT NULL DEFAULT '',
            ""DeviceType"" VARCHAR(50) NOT NULL DEFAULT '',
            ""SessionId"" VARCHAR(100) NOT NULL DEFAULT '',
            ""Location"" VARCHAR(200) NOT NULL DEFAULT '',
            ""Country"" VARCHAR(100) NOT NULL DEFAULT '',
            ""City"" VARCHAR(100) NOT NULL DEFAULT '',
            ""Endpoint"" VARCHAR(500) NOT NULL DEFAULT '',
            ""HttpMethod"" VARCHAR(10) NOT NULL DEFAULT '',
            ""HttpStatus"" INTEGER NULL,
            ""Result"" VARCHAR(20) NOT NULL DEFAULT 'success',
            ""Severity"" VARCHAR(20) NOT NULL DEFAULT 'info',
            ""ResponseTimeMs"" BIGINT NULL,
            ""Department"" VARCHAR(100) NOT NULL DEFAULT '',
            ""IsSecurityAlert"" BOOLEAN NOT NULL DEFAULT FALSE,
            ""IsAcknowledged"" BOOLEAN NOT NULL DEFAULT FALSE,
            ""AcknowledgedById"" UUID NULL,
            ""AcknowledgedAt"" TIMESTAMPTZ NULL,
            ""CorrelationId"" UUID NULL,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS ""IX_AuditLogs_UserId"" ON ""AuditLogs""(""UserId"");
        CREATE INDEX IF NOT EXISTS ""IX_AuditLogs_CreatedAt"" ON ""AuditLogs""(""CreatedAt"");
        CREATE INDEX IF NOT EXISTS ""IX_AuditLogs_Module"" ON ""AuditLogs""(""Module"");
        CREATE INDEX IF NOT EXISTS ""IX_AuditLogs_Action"" ON ""AuditLogs""(""Action"");
        CREATE INDEX IF NOT EXISTS ""IX_AuditLogs_Severity"" ON ""AuditLogs""(""Severity"");
        CREATE INDEX IF NOT EXISTS ""IX_AuditLogs_Result"" ON ""AuditLogs""(""Result"");
        CREATE INDEX IF NOT EXISTS ""IX_AuditLogs_Email"" ON ""AuditLogs""(""Email"");
        CREATE INDEX IF NOT EXISTS ""IX_AuditLogs_IPAddress"" ON ""AuditLogs""(""IPAddress"");
        CREATE INDEX IF NOT EXISTS ""IX_AuditLogs_Country"" ON ""AuditLogs""(""Country"");
        CREATE INDEX IF NOT EXISTS ""IX_AuditLogs_IsSecurityAlert"" ON ""AuditLogs""(""IsSecurityAlert"");
        CREATE INDEX IF NOT EXISTS ""IX_AuditLogs_ResourceId"" ON ""AuditLogs""(""ResourceId"");
        CREATE INDEX IF NOT EXISTS ""IX_AuditLogs_CorrelationId"" ON ""AuditLogs""(""CorrelationId"");

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

        CREATE TABLE IF NOT EXISTS ""RoleDefinitions"" (
            ""Id"" UUID PRIMARY KEY,
            ""Name"" VARCHAR(100) NOT NULL,
            ""Description"" VARCHAR(500) NOT NULL DEFAULT '',
            ""Department"" VARCHAR(100) NOT NULL DEFAULT '',
            ""Color"" VARCHAR(20) NOT NULL DEFAULT '#0057FF',
            ""Icon"" VARCHAR(50) NOT NULL DEFAULT 'Shield',
            ""Priority"" INT NOT NULL DEFAULT 0,
            ""IsSystem"" BOOLEAN NOT NULL DEFAULT FALSE,
            ""IsActive"" BOOLEAN NOT NULL DEFAULT TRUE,
            ""ParentRoleId"" UUID NULL REFERENCES ""RoleDefinitions""(""Id"") ON DELETE SET NULL,
            ""AllowedCountries"" VARCHAR(200) NOT NULL DEFAULT '[]',
            ""AllowedDepartments"" VARCHAR(200) NOT NULL DEFAULT '[]',
            ""Restrictions"" VARCHAR(500) NOT NULL DEFAULT '{{}}',
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ""UpdatedAt"" TIMESTAMPTZ NULL
        );
        CREATE UNIQUE INDEX IF NOT EXISTS ""IX_RoleDefinitions_Name"" ON ""RoleDefinitions""(""Name"");

        CREATE TABLE IF NOT EXISTS ""Permissions"" (
            ""Id"" UUID PRIMARY KEY,
            ""Module"" VARCHAR(100) NOT NULL,
            ""Action"" VARCHAR(50) NOT NULL,
            ""Description"" VARCHAR(200) NOT NULL DEFAULT '',
            ""GroupName"" VARCHAR(100) NOT NULL DEFAULT '',
            ""SortOrder"" INT NOT NULL DEFAULT 0
        );
        CREATE UNIQUE INDEX IF NOT EXISTS ""IX_Permissions_Module_Action"" ON ""Permissions""(""Module"", ""Action"");

        CREATE TABLE IF NOT EXISTS ""RolePermissions"" (
            ""RoleId"" UUID NOT NULL REFERENCES ""RoleDefinitions""(""Id"") ON DELETE CASCADE,
            ""PermissionId"" UUID NOT NULL REFERENCES ""Permissions""(""Id"") ON DELETE CASCADE,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (""RoleId"", ""PermissionId"")
        );

        CREATE TABLE IF NOT EXISTS ""UserRoleAssignments"" (
            ""Id"" UUID PRIMARY KEY,
            ""UserId"" UUID NOT NULL REFERENCES ""Users""(""Id"") ON DELETE CASCADE,
            ""RoleId"" UUID NOT NULL REFERENCES ""RoleDefinitions""(""Id"") ON DELETE CASCADE,
            ""Department"" VARCHAR(100) NOT NULL DEFAULT '',
            ""Region"" VARCHAR(100) NOT NULL DEFAULT '',
            ""ExpiresAt"" TIMESTAMPTZ NULL,
            ""Status"" VARCHAR(50) NOT NULL DEFAULT 'active',
            ""AssignedById"" UUID NULL REFERENCES ""Users""(""Id"") ON DELETE SET NULL,
            ""Notes"" VARCHAR(500) NOT NULL DEFAULT '',
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ""UpdatedAt"" TIMESTAMPTZ NULL
        );
        CREATE INDEX IF NOT EXISTS ""IX_UserRoleAssignments_UserId"" ON ""UserRoleAssignments""(""UserId"");
        CREATE INDEX IF NOT EXISTS ""IX_UserRoleAssignments_RoleId"" ON ""UserRoleAssignments""(""RoleId"");
        CREATE INDEX IF NOT EXISTS ""IX_UserRoleAssignments_Status"" ON ""UserRoleAssignments""(""Status"");

        CREATE TABLE IF NOT EXISTS ""Invitations"" (
            ""Id"" UUID PRIMARY KEY,
            ""Email"" VARCHAR(200) NOT NULL,
            ""RoleId"" VARCHAR(100) NOT NULL DEFAULT '',
            ""Department"" VARCHAR(100) NOT NULL DEFAULT '',
            ""Status"" VARCHAR(50) NOT NULL DEFAULT 'pending',
            ""InvitedById"" UUID NULL,
            ""ExpiresAt"" TIMESTAMPTZ NULL,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ""AcceptedAt"" TIMESTAMPTZ NULL
        );

        CREATE TABLE IF NOT EXISTS ""WalletBalances"" (
            ""Id"" UUID PRIMARY KEY,
            ""UserId"" UUID NOT NULL REFERENCES ""Users""(""Id""),
            ""Currency"" VARCHAR(3) NOT NULL DEFAULT 'ZAR',
            ""Balance"" DECIMAL(18,2) NOT NULL DEFAULT 0,
            ""ReservedBalance"" DECIMAL(18,2) NOT NULL DEFAULT 0,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ""UpdatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE UNIQUE INDEX IF NOT EXISTS ""IX_WalletBalances_UserId_Currency"" ON ""WalletBalances""(""UserId"", ""Currency"");

        CREATE TABLE IF NOT EXISTS ""LinkedBanks"" (
            ""Id"" UUID PRIMARY KEY,
            ""UserId"" UUID NOT NULL REFERENCES ""Users""(""Id""),
            ""BankName"" VARCHAR(200) NOT NULL,
            ""AccountName"" VARCHAR(200) NOT NULL,
            ""AccountNumber"" VARCHAR(50) NOT NULL,
            ""BranchCode"" VARCHAR(20) NULL,
            ""AccountType"" VARCHAR(50) NULL,
            ""Nickname"" VARCHAR(200) NULL,
            ""Country"" VARCHAR(100) NULL,
            ""Currency"" VARCHAR(3) NOT NULL DEFAULT 'ZAR',
            ""Status"" VARCHAR(20) NOT NULL DEFAULT 'pending',
            ""IsVerified"" BOOLEAN NOT NULL DEFAULT FALSE,
            ""IsPrimary"" BOOLEAN NOT NULL DEFAULT FALSE,
            ""RejectionReason"" VARCHAR(500) NULL,
            ""VerifiedById"" UUID NULL REFERENCES ""Users""(""Id""),
            ""VerifiedAt"" TIMESTAMPTZ NULL,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ""UpdatedAt"" TIMESTAMPTZ NULL
        );

        CREATE TABLE IF NOT EXISTS ""Currencies"" (
            ""Id"" UUID PRIMARY KEY,
            ""Code"" VARCHAR(3) NOT NULL,
            ""Name"" VARCHAR(100) NOT NULL,
            ""Symbol"" VARCHAR(10) NOT NULL DEFAULT '',
            ""Country"" VARCHAR(100) NOT NULL DEFAULT '',
            ""FlagEmoji"" VARCHAR(10) NOT NULL DEFAULT '',
            ""DecimalPlaces"" INTEGER NOT NULL DEFAULT 2,
            ""IsActive"" BOOLEAN NOT NULL DEFAULT TRUE,
            ""IsDefault"" BOOLEAN NOT NULL DEFAULT FALSE,
            ""IsArchived"" BOOLEAN NOT NULL DEFAULT FALSE,
            ""SortOrder"" INTEGER NOT NULL DEFAULT 0,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ""UpdatedAt"" TIMESTAMPTZ NULL
        );
        CREATE UNIQUE INDEX IF NOT EXISTS ""IX_Currencies_Code"" ON ""Currencies""(""Code"");

        CREATE TABLE IF NOT EXISTS ""ExchangeRateProviders"" (
            ""Id"" UUID PRIMARY KEY,
            ""Name"" VARCHAR(100) NOT NULL,
            ""ApiEndpoint"" VARCHAR(500) NOT NULL DEFAULT '',
            ""ApiKeyEncrypted"" TEXT NULL,
            ""Priority"" INTEGER NOT NULL DEFAULT 0,
            ""IsActive"" BOOLEAN NOT NULL DEFAULT TRUE,
            ""IsPrimary"" BOOLEAN NOT NULL DEFAULT FALSE,
            ""IsFallback"" BOOLEAN NOT NULL DEFAULT FALSE,
            ""HealthStatus"" VARCHAR(20) NOT NULL DEFAULT 'unknown',
            ""LastHealthCheck"" TIMESTAMPTZ NULL,
            ""ConfigJson"" TEXT NULL,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ""UpdatedAt"" TIMESTAMPTZ NULL
        );
        CREATE UNIQUE INDEX IF NOT EXISTS ""IX_ExchangeRateProviders_Name"" ON ""ExchangeRateProviders""(""Name"");

        CREATE TABLE IF NOT EXISTS ""ExchangeRates"" (
            ""Id"" UUID PRIMARY KEY,
            ""BaseCurrency"" VARCHAR(3) NOT NULL,
            ""QuoteCurrency"" VARCHAR(3) NOT NULL,
            ""BuyRate"" DECIMAL(18,8) NOT NULL DEFAULT 0,
            ""SellRate"" DECIMAL(18,8) NOT NULL DEFAULT 0,
            ""MidMarketRate"" DECIMAL(18,8) NOT NULL DEFAULT 0,
            ""Spread"" DECIMAL(18,8) NOT NULL DEFAULT 0,
            ""ProviderId"" UUID NULL REFERENCES ""ExchangeRateProviders""(""Id"") ON DELETE SET NULL,
            ""Source"" VARCHAR(20) NOT NULL DEFAULT 'manual',
            ""LockedUntil"" TIMESTAMPTZ NULL,
            ""IsActive"" BOOLEAN NOT NULL DEFAULT TRUE,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ""UpdatedAt"" TIMESTAMPTZ NULL
        );
        CREATE INDEX IF NOT EXISTS ""IX_ExchangeRates_Pair"" ON ""ExchangeRates""(""BaseCurrency"", ""QuoteCurrency"");

        CREATE TABLE IF NOT EXISTS ""CurrencyPairs"" (
            ""Id"" UUID PRIMARY KEY,
            ""BaseCurrency"" VARCHAR(3) NOT NULL,
            ""QuoteCurrency"" VARCHAR(3) NOT NULL,
            ""IsEnabled"" BOOLEAN NOT NULL DEFAULT TRUE,
            ""PreferredProviderId"" UUID NULL,
            ""MinBuySpread"" DECIMAL(18,8) NOT NULL DEFAULT 0,
            ""MaxBuySpread"" DECIMAL(18,8) NOT NULL DEFAULT 0,
            ""MinSellSpread"" DECIMAL(18,8) NOT NULL DEFAULT 0,
            ""MaxSellSpread"" DECIMAL(18,8) NOT NULL DEFAULT 0,
            ""DailyBuyLimit"" DECIMAL(18,2) NOT NULL DEFAULT 0,
            ""DailySellLimit"" DECIMAL(18,2) NOT NULL DEFAULT 0,
            ""BuyFee"" DECIMAL(18,8) NOT NULL DEFAULT 0,
            ""SellFee"" DECIMAL(18,8) NOT NULL DEFAULT 0,
            ""FeeType"" VARCHAR(20) NOT NULL DEFAULT 'percentage',
            ""SortOrder"" INTEGER NOT NULL DEFAULT 0,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ""UpdatedAt"" TIMESTAMPTZ NULL
        );
        CREATE UNIQUE INDEX IF NOT EXISTS ""IX_CurrencyPairs_Pair"" ON ""CurrencyPairs""(""BaseCurrency"", ""QuoteCurrency"");

        CREATE TABLE IF NOT EXISTS ""FxMargins"" (
            ""Id"" UUID PRIMARY KEY,
            ""Name"" VARCHAR(100) NOT NULL,
            ""Type"" VARCHAR(20) NOT NULL DEFAULT 'global',
            ""EntityId"" UUID NULL,
            ""MarginType"" VARCHAR(20) NOT NULL DEFAULT 'percentage',
            ""Value"" DECIMAL(18,8) NOT NULL DEFAULT 0,
            ""MinValue"" DECIMAL(18,8) NULL,
            ""MaxValue"" DECIMAL(18,8) NULL,
            ""IsActive"" BOOLEAN NOT NULL DEFAULT TRUE,
            ""Priority"" INTEGER NOT NULL DEFAULT 0,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ""UpdatedAt"" TIMESTAMPTZ NULL
        );

        CREATE TABLE IF NOT EXISTS ""ConversionRules"" (
            ""Id"" UUID PRIMARY KEY,
            ""Name"" VARCHAR(100) NOT NULL,
            ""RuleType"" VARCHAR(30) NOT NULL,
            ""RoundingRule"" VARCHAR(20) NOT NULL DEFAULT 'standard',
            ""DecimalPrecision"" INTEGER NOT NULL DEFAULT 2,
            ""MinAmount"" DECIMAL(18,2) NULL,
            ""MaxAmount"" DECIMAL(18,2) NULL,
            ""IsActive"" BOOLEAN NOT NULL DEFAULT TRUE,
            ""Priority"" INTEGER NOT NULL DEFAULT 0,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ""UpdatedAt"" TIMESTAMPTZ NULL
        );

        CREATE TABLE IF NOT EXISTS ""SettlementCurrencies"" (
            ""Id"" UUID PRIMARY KEY,
            ""Currency"" VARCHAR(3) NOT NULL,
            ""IsDefaultSettlement"" BOOLEAN NOT NULL DEFAULT FALSE,
            ""AutoConversion"" BOOLEAN NOT NULL DEFAULT TRUE,
            ""SettlementFrequency"" VARCHAR(20) NOT NULL DEFAULT 'daily',
            ""MarginPercent"" DECIMAL(18,8) NOT NULL DEFAULT 0,
            ""FeePercent"" DECIMAL(18,8) NOT NULL DEFAULT 0,
            ""IsActive"" BOOLEAN NOT NULL DEFAULT TRUE,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ""UpdatedAt"" TIMESTAMPTZ NULL
        );
        CREATE UNIQUE INDEX IF NOT EXISTS ""IX_SettlementCurrencies_Currency"" ON ""SettlementCurrencies""(""Currency"");

        CREATE TABLE IF NOT EXISTS ""RegionalCurrencyRules"" (
            ""Id"" UUID PRIMARY KEY,
            ""Country"" VARCHAR(100) NOT NULL,
            ""DefaultCurrency"" VARCHAR(3) NOT NULL,
            ""SupportedCurrenciesJson"" TEXT NOT NULL DEFAULT '[]',
            ""AllowedPairsJson"" TEXT NOT NULL DEFAULT '[]',
            ""RestrictionsJson"" TEXT NOT NULL DEFAULT '',
            ""LocalPaymentMethodsJson"" TEXT NOT NULL DEFAULT '[]',
            ""IsActive"" BOOLEAN NOT NULL DEFAULT TRUE,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ""UpdatedAt"" TIMESTAMPTZ NULL
        );
        CREATE UNIQUE INDEX IF NOT EXISTS ""IX_RegionalCurrencyRules_Country"" ON ""RegionalCurrencyRules""(""Country"");

        CREATE TABLE IF NOT EXISTS ""ExchangeAlerts"" (
            ""Id"" UUID PRIMARY KEY,
            ""AlertType"" VARCHAR(50) NOT NULL,
            ""Channel"" VARCHAR(50) NOT NULL DEFAULT 'email',
            ""Threshold"" DECIMAL(18,8) NOT NULL DEFAULT 0,
            ""IsEnabled"" BOOLEAN NOT NULL DEFAULT TRUE,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ""UpdatedAt"" TIMESTAMPTZ NULL
        );

        CREATE TABLE IF NOT EXISTS ""FxAuditLogs"" (
            ""Id"" UUID PRIMARY KEY,
            ""UserId"" UUID NULL,
            ""UserName"" VARCHAR(200) NOT NULL DEFAULT '',
            ""Action"" VARCHAR(100) NOT NULL,
            ""EntityType"" VARCHAR(50) NOT NULL DEFAULT '',
            ""EntityId"" VARCHAR(100) NULL,
            ""PreviousValueJson"" TEXT NULL,
            ""NewValueJson"" TEXT NULL,
            ""IpAddress"" VARCHAR(50) NULL,
            ""UserAgent"" VARCHAR(500) NULL,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS ""Deposits"" (
            ""Id"" UUID PRIMARY KEY,
            ""UserId"" UUID NOT NULL REFERENCES ""Users""(""Id"") ON DELETE CASCADE,
            ""Reference"" VARCHAR(20) NOT NULL,
            ""Amount"" DECIMAL(18,2) NOT NULL,
            ""Currency"" VARCHAR(3) NOT NULL DEFAULT 'ZAR',
            ""Status"" VARCHAR(20) NOT NULL DEFAULT 'pending',
            ""BankName"" VARCHAR(200) NOT NULL DEFAULT '',
            ""AccountHolderName"" VARCHAR(200) NOT NULL DEFAULT '',
            ""ReferenceUsed"" VARCHAR(200) NULL,
            ""TransferDate"" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ""TransferTime"" VARCHAR(20) NULL,
            ""ProofUrl"" VARCHAR(500) NULL,
            ""ProofData"" TEXT NULL,
            ""ProofFileName"" VARCHAR(500) NULL,
            ""ProofContentType"" VARCHAR(100) NULL,
            ""Notes"" VARCHAR(1000) NULL,
            ""RejectionReason"" VARCHAR(500) NULL,
            ""RejectionCategory"" VARCHAR(100) NULL,
            ""ApprovedById"" UUID NULL REFERENCES ""Users""(""Id"") ON DELETE SET NULL,
            ""ApprovedAt"" TIMESTAMPTZ NULL,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ""UpdatedAt"" TIMESTAMPTZ NULL
        );
        CREATE UNIQUE INDEX IF NOT EXISTS ""IX_Deposits_Reference"" ON ""Deposits""(""Reference"");
        CREATE INDEX IF NOT EXISTS ""IX_Deposits_UserId"" ON ""Deposits""(""UserId"");
        CREATE INDEX IF NOT EXISTS ""IX_Deposits_Status"" ON ""Deposits""(""Status"");
        CREATE INDEX IF NOT EXISTS ""IX_Deposits_CreatedAt"" ON ""Deposits""(""CreatedAt"");

        CREATE TABLE IF NOT EXISTS ""CurrencyExchanges"" (
            ""Id"" UUID PRIMARY KEY,
            ""UserId"" UUID NOT NULL REFERENCES ""Users""(""Id"") ON DELETE CASCADE,
            ""Reference"" VARCHAR(20) NOT NULL,
            ""FromCurrency"" VARCHAR(3) NOT NULL,
            ""ToCurrency"" VARCHAR(3) NOT NULL,
            ""Amount"" DECIMAL(18,2) NOT NULL,
            ""ConvertedAmount"" DECIMAL(18,2) NOT NULL,
            ""Rate"" DECIMAL(18,8) NOT NULL,
            ""Fee"" DECIMAL(18,2) NOT NULL,
            ""FeeCurrency"" VARCHAR(3) NOT NULL DEFAULT 'ZAR',
            ""FxMargin"" DECIMAL(18,8) NOT NULL DEFAULT 0,
            ""Status"" VARCHAR(20) NOT NULL DEFAULT 'completed',
            ""SourceWalletBalanceBefore"" DECIMAL(18,2) NOT NULL DEFAULT 0,
            ""SourceWalletBalanceAfter"" DECIMAL(18,2) NOT NULL DEFAULT 0,
            ""DestWalletBalanceBefore"" DECIMAL(18,2) NOT NULL DEFAULT 0,
            ""DestWalletBalanceAfter"" DECIMAL(18,2) NOT NULL DEFAULT 0,
            ""SourceTransactionId"" UUID NULL,
            ""DestTransactionId"" UUID NULL,
            ""ReversedById"" UUID NULL REFERENCES ""Users""(""Id"") ON DELETE SET NULL,
            ""ReversedAt"" TIMESTAMPTZ NULL,
            ""ReversalReason"" VARCHAR(500) NULL,
            ""Notes"" VARCHAR(500) NULL,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ""CompletedAt"" TIMESTAMPTZ NULL
        );
        CREATE UNIQUE INDEX IF NOT EXISTS ""IX_CurrencyExchanges_Reference"" ON ""CurrencyExchanges""(""Reference"");
        CREATE INDEX IF NOT EXISTS ""IX_CurrencyExchanges_UserId"" ON ""CurrencyExchanges""(""UserId"");
        CREATE INDEX IF NOT EXISTS ""IX_CurrencyExchanges_Status"" ON ""CurrencyExchanges""(""Status"");
        CREATE INDEX IF NOT EXISTS ""IX_CurrencyExchanges_CreatedAt"" ON ""CurrencyExchanges""(""CreatedAt"");
        CREATE INDEX IF NOT EXISTS ""IX_CurrencyExchanges_Pair"" ON ""CurrencyExchanges""(""FromCurrency"", ""ToCurrency"");

        CREATE TABLE IF NOT EXISTS ""Withdrawals"" (
            ""Id"" UUID PRIMARY KEY,
            ""UserId"" UUID NOT NULL REFERENCES ""Users""(""Id"") ON DELETE CASCADE,
            ""Reference"" VARCHAR(20) NOT NULL,
            ""Amount"" DECIMAL(18,2) NOT NULL,
            ""Fee"" DECIMAL(18,2) NOT NULL DEFAULT 0,
            ""Currency"" VARCHAR(3) NOT NULL DEFAULT 'ZAR',
            ""Status"" VARCHAR(20) NOT NULL DEFAULT 'pending',
            ""BankId"" UUID NULL,
            ""BankName"" VARCHAR(200) NOT NULL DEFAULT '',
            ""AccountHolderName"" VARCHAR(200) NOT NULL DEFAULT '',
            ""AccountNumber"" VARCHAR(50) NOT NULL DEFAULT '',
            ""BranchCode"" VARCHAR(20) NULL,
            ""AccountType"" VARCHAR(50) NULL,
            ""Purpose"" VARCHAR(500) NULL,
            ""CustomerReference"" VARCHAR(200) NULL,
            ""RejectionReason"" VARCHAR(500) NULL,
            ""RejectionCategory"" VARCHAR(100) NULL,
            ""BankPaymentReference"" VARCHAR(500) NULL,
            ""ProcessedById"" UUID NULL REFERENCES ""Users""(""Id"") ON DELETE SET NULL,
            ""ApprovedAt"" TIMESTAMPTZ NULL,
            ""PaidAt"" TIMESTAMPTZ NULL,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ""UpdatedAt"" TIMESTAMPTZ NULL
        );
        CREATE UNIQUE INDEX IF NOT EXISTS ""IX_Withdrawals_Reference"" ON ""Withdrawals""(""Reference"");
        CREATE INDEX IF NOT EXISTS ""IX_Withdrawals_UserId"" ON ""Withdrawals""(""UserId"");
        CREATE INDEX IF NOT EXISTS ""IX_Withdrawals_Status"" ON ""Withdrawals""(""Status"");
        CREATE INDEX IF NOT EXISTS ""IX_Withdrawals_CreatedAt"" ON ""Withdrawals""(""CreatedAt"");

        -- Add new columns to LinkedBanks if they don't exist (for existing databases)
        DO $$ BEGIN
            ALTER TABLE ""LinkedBanks"" ADD COLUMN IF NOT EXISTS ""BranchCode"" VARCHAR(20) NULL;
            ALTER TABLE ""LinkedBanks"" ADD COLUMN IF NOT EXISTS ""AccountType"" VARCHAR(50) NULL;
            ALTER TABLE ""LinkedBanks"" ADD COLUMN IF NOT EXISTS ""Nickname"" VARCHAR(200) NULL;
            ALTER TABLE ""LinkedBanks"" ADD COLUMN IF NOT EXISTS ""Country"" VARCHAR(100) NULL;
            ALTER TABLE ""LinkedBanks"" ADD COLUMN IF NOT EXISTS ""Currency"" VARCHAR(3) NOT NULL DEFAULT 'ZAR';
            ALTER TABLE ""LinkedBanks"" ADD COLUMN IF NOT EXISTS ""Status"" VARCHAR(20) NOT NULL DEFAULT 'pending';
            ALTER TABLE ""LinkedBanks"" ADD COLUMN IF NOT EXISTS ""RejectionReason"" VARCHAR(500) NULL;
            ALTER TABLE ""LinkedBanks"" ADD COLUMN IF NOT EXISTS ""VerifiedById"" UUID NULL;
            ALTER TABLE ""LinkedBanks"" ADD COLUMN IF NOT EXISTS ""VerifiedAt"" TIMESTAMPTZ NULL;
            ALTER TABLE ""LinkedBanks"" ADD COLUMN IF NOT EXISTS ""UpdatedAt"" TIMESTAMPTZ NULL;
        END $$;
    ");

    db.Database.ExecuteSqlRaw(@"
        CREATE TABLE IF NOT EXISTS ""PlatformSettings"" (
            ""Id"" UUID PRIMARY KEY,
            ""Category"" VARCHAR(100) NOT NULL,
            ""Key"" VARCHAR(200) NOT NULL,
            ""Value"" TEXT NOT NULL DEFAULT '',
            ""Description"" VARCHAR(500) NULL,
            ""Type"" VARCHAR(50) NOT NULL DEFAULT 'string',
            ""IsEncrypted"" BOOLEAN NOT NULL DEFAULT FALSE,
            ""SortOrder"" INTEGER NOT NULL DEFAULT 0,
            ""UpdatedById"" UUID NULL REFERENCES ""Users""(""Id"") ON DELETE SET NULL,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ""UpdatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE UNIQUE INDEX IF NOT EXISTS ""IX_PlatformSettings_Category_Key"" ON ""PlatformSettings""(""Category"", ""Key"");
        CREATE TABLE IF NOT EXISTS ""SettingChangeLogs"" (
            ""Id"" UUID PRIMARY KEY,
            ""Category"" VARCHAR(100) NOT NULL DEFAULT '',
            ""Key"" VARCHAR(200) NOT NULL DEFAULT '',
            ""OldValue"" TEXT NOT NULL DEFAULT '',
            ""NewValue"" TEXT NOT NULL DEFAULT '',
            ""ChangedById"" UUID NULL,
            ""ChangedByName"" VARCHAR(200) NOT NULL DEFAULT '',
            ""ChangedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS ""IX_SettingChangeLogs_Category_ChangedAt"" ON ""SettingChangeLogs""(""Category"", ""ChangedAt"");

        CREATE TABLE IF NOT EXISTS ""ScheduledReports"" (
            ""Id"" UUID PRIMARY KEY,
            ""CreatedById"" UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
            ""Name"" VARCHAR(200) NOT NULL,
            ""Description"" VARCHAR(500) NOT NULL DEFAULT '',
            ""ReportType"" VARCHAR(100) NOT NULL DEFAULT '',
            ""Frequency"" VARCHAR(50) NOT NULL DEFAULT 'weekly',
            ""CronExpression"" VARCHAR(100) NOT NULL DEFAULT '',
            ""Filters"" TEXT NOT NULL DEFAULT '{{}}',
            ""Format"" VARCHAR(50) NOT NULL DEFAULT 'pdf',
            ""RecipientEmails"" VARCHAR(500) NOT NULL DEFAULT '',
            ""IncludeCharts"" BOOLEAN NOT NULL DEFAULT TRUE,
            ""IncludeSummary"" BOOLEAN NOT NULL DEFAULT TRUE,
            ""Status"" VARCHAR(50) NOT NULL DEFAULT 'active',
            ""LastRunAt"" TIMESTAMPTZ NULL,
            ""NextRunAt"" TIMESTAMPTZ NULL,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ""UpdatedAt"" TIMESTAMPTZ NULL
        );
        CREATE TABLE IF NOT EXISTS ""ReportExportJobs"" (
            ""Id"" UUID PRIMARY KEY,
            ""UserId"" UUID NULL REFERENCES ""Users""(""Id"") ON DELETE SET NULL,
            ""ReportType"" VARCHAR(100) NOT NULL DEFAULT '',
            ""Format"" VARCHAR(50) NOT NULL DEFAULT 'xlsx',
            ""Filters"" TEXT NOT NULL DEFAULT '{{}}',
            ""FileUrl"" TEXT NOT NULL DEFAULT '',
            ""FileSize"" BIGINT NOT NULL DEFAULT 0,
            ""Status"" VARCHAR(50) NOT NULL DEFAULT 'pending',
            ""ErrorMessage"" TEXT NOT NULL DEFAULT '',
            ""CompletedAt"" TIMESTAMPTZ NULL,
            ""ExpiresAt"" TIMESTAMPTZ NULL,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        ALTER TABLE ""Users"" ADD COLUMN IF NOT EXISTS ""Username"" VARCHAR(35) NULL;
        CREATE UNIQUE INDEX IF NOT EXISTS ""IX_Users_Username"" ON ""Users""(""Username"") WHERE ""Username"" IS NOT NULL;

        CREATE TABLE IF NOT EXISTS ""Countries"" (
            ""Id"" UUID PRIMARY KEY,
            ""Name"" VARCHAR(100) NOT NULL,
            ""Code"" VARCHAR(3) NOT NULL,
            ""CurrencyCode"" VARCHAR(3) NOT NULL DEFAULT 'ZAR',
            ""CurrencySymbol"" VARCHAR(5) NULL,
            ""IsEnabled"" BOOLEAN NOT NULL DEFAULT TRUE,
            ""SortOrder"" INTEGER NOT NULL DEFAULT 0,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ""UpdatedAt"" TIMESTAMPTZ NULL
        );
        CREATE UNIQUE INDEX IF NOT EXISTS ""IX_Countries_Code"" ON ""Countries""(""Code"");

        CREATE TABLE IF NOT EXISTS ""Banks"" (
            ""Id"" UUID PRIMARY KEY,
            ""CountryCode"" VARCHAR(3) NOT NULL,
            ""Name"" VARCHAR(200) NOT NULL,
            ""Code"" VARCHAR(50) NULL,
            ""IsEnabled"" BOOLEAN NOT NULL DEFAULT TRUE,
            ""SortOrder"" INTEGER NOT NULL DEFAULT 0,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ""UpdatedAt"" TIMESTAMPTZ NULL
        );
        CREATE INDEX IF NOT EXISTS ""IX_Banks_CountryCode"" ON ""Banks""(""CountryCode"");
        CREATE UNIQUE INDEX IF NOT EXISTS ""IX_Banks_CountryCode_Code"" ON ""Banks""(""CountryCode"", ""Code"");

        CREATE TABLE IF NOT EXISTS ""BankVerifications"" (
            ""Id"" UUID PRIMARY KEY,
            ""UserId"" UUID NOT NULL REFERENCES ""Users""(""Id"") ON DELETE CASCADE,
            ""CountryCode"" VARCHAR(3) NOT NULL,
            ""BankCode"" VARCHAR(200) NULL,
            ""BankName"" VARCHAR(50) NULL,
            ""AccountNumber"" VARCHAR(50) NOT NULL,
            ""AccountName"" VARCHAR(200) NULL,
            ""Status"" VARCHAR(20) NOT NULL DEFAULT 'pending',
            ""Provider"" VARCHAR(100) NULL,
            ""ProviderRequestId"" VARCHAR(200) NULL,
            ""RawResponse"" TEXT NULL,
            ""ErrorMessage"" TEXT NULL,
            ""VerifiedAt"" TIMESTAMPTZ NULL,
            ""CreatedAt"" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS ""IX_BankVerifications_UserId"" ON ""BankVerifications""(""UserId"");
    ");

    // ─── Seed Default Roles & Permissions ──────────────────────
    if (!db.RoleDefinitions.Any())
    {
        var sortOrder = 0;
        var allPerms = new List<PayAfrika.API.Models.Permission>();
        foreach (var (module, actions) in PayAfrika.API.Models.DefaultPermissions.Modules)
        {
            foreach (var action in actions)
            {
                var perm = new PayAfrika.API.Models.Permission
                {
                    Id = Guid.NewGuid(),
                    Module = module,
                    Action = action,
                    Description = $"{action} in {module}",
                    GroupName = module,
                    SortOrder = sortOrder++,
                };
                db.Permissions.Add(perm);
                allPerms.Add(perm);
            }
        }

        var systemRoles = new[] { "super_admin", "admin", "compliance_officer", "finance_admin",
            "risk_manager", "merchant_manager", "support_manager", "support_agent",
            "marketing_manager", "content_editor", "affiliate_manager", "api_developer", "auditor", "read_only" };

        foreach (var roleName in systemRoles)
        {
            var rolePerms = PayAfrika.API.Models.DefaultPermissions.GetRolePermissions(roleName);
            var role = new PayAfrika.API.Models.RoleDefinition
            {
                Id = Guid.NewGuid(),
                Name = roleName,
                Description = GetRoleDescription(roleName),
                Department = GetRoleDepartment(roleName),
                Color = GetRoleColor(roleName),
                Icon = GetRoleIcon(roleName),
                Priority = Array.IndexOf(systemRoles, roleName),
                IsSystem = true,
                IsActive = true,
            };
            db.RoleDefinitions.Add(role);

            foreach (var (module, actions) in rolePerms)
            {
                foreach (var action in actions)
                {
                    var perm = allPerms.FirstOrDefault(p => p.Module == module && p.Action == action);
                    if (perm != null)
                    {
                        db.RolePermissions.Add(new PayAfrika.API.Models.RolePermission { RoleId = role.Id, PermissionId = perm.Id });
                    }
                }
            }
        }
        db.SaveChanges();
    }

    var adminEmail = builder.Configuration["AdminEmail"]
        ?? Environment.GetEnvironmentVariable("NEXT_PUBLIC_ADMIN_EMAIL")
        ?? "meetpeterosakwe@gmail.com";

    var adminUser = db.Users.FirstOrDefault(u => u.Email == adminEmail);
    if (adminUser != null && adminUser.Role != "admin")
    {
        adminUser.Role = "admin";
        db.SaveChanges();
    }

    // Assign super_admin role to admin user
    if (adminUser != null)
    {
        var superAdminRole = db.RoleDefinitions.FirstOrDefault(r => r.Name == "super_admin");
        if (superAdminRole != null && !db.UserRoleAssignments.Any(a => a.UserId == adminUser.Id && a.RoleId == superAdminRole.Id))
        {
            db.UserRoleAssignments.Add(new PayAfrika.API.Models.UserRoleAssignment
            {
                Id = Guid.NewGuid(),
                UserId = adminUser.Id,
                RoleId = superAdminRole.Id,
                Status = "active",
            });
            db.SaveChanges();
        }
    }

    // Seed exchange data
    if (!db.Currencies.Any())
    {
        var currencies = new List<PayAfrika.API.Models.Currency>
        {
            new() { Code = "ZAR", Name = "South African Rand", Symbol = "R", Country = "South Africa", FlagEmoji = "🇿🇦", DecimalPlaces = 2, IsDefault = true, SortOrder = 1 },
            new() { Code = "USD", Name = "US Dollar", Symbol = "$", Country = "United States", FlagEmoji = "🇺🇸", DecimalPlaces = 2, SortOrder = 2 },
            new() { Code = "EUR", Name = "Euro", Symbol = "€", Country = "European Union", FlagEmoji = "🇪🇺", DecimalPlaces = 2, SortOrder = 3 },
            new() { Code = "GBP", Name = "British Pound", Symbol = "£", Country = "United Kingdom", FlagEmoji = "🇬🇧", DecimalPlaces = 2, SortOrder = 4 },
            new() { Code = "NGN", Name = "Nigerian Naira", Symbol = "₦", Country = "Nigeria", FlagEmoji = "🇳🇬", DecimalPlaces = 2, SortOrder = 5 },
            new() { Code = "GHS", Name = "Ghanaian Cedi", Symbol = "₵", Country = "Ghana", FlagEmoji = "🇬🇭", DecimalPlaces = 2, SortOrder = 6 },
            new() { Code = "KES", Name = "Kenyan Shilling", Symbol = "KSh", Country = "Kenya", FlagEmoji = "🇰🇪", DecimalPlaces = 2, SortOrder = 7 },
            new() { Code = "UGX", Name = "Ugandan Shilling", Symbol = "USh", Country = "Uganda", FlagEmoji = "🇺🇬", DecimalPlaces = 0, SortOrder = 8 },
            new() { Code = "TZS", Name = "Tanzanian Shilling", Symbol = "TSh", Country = "Tanzania", FlagEmoji = "🇹🇿", DecimalPlaces = 0, SortOrder = 9 },
            new() { Code = "BWP", Name = "Botswana Pula", Symbol = "P", Country = "Botswana", FlagEmoji = "🇧🇼", DecimalPlaces = 2, SortOrder = 10 },
            new() { Code = "NAD", Name = "Namibian Dollar", Symbol = "$", Country = "Namibia", FlagEmoji = "🇳🇦", DecimalPlaces = 2, SortOrder = 11 },
            new() { Code = "ZMW", Name = "Zambian Kwacha", Symbol = "ZK", Country = "Zambia", FlagEmoji = "🇿🇲", DecimalPlaces = 2, SortOrder = 12 },
            new() { Code = "MZN", Name = "Mozambican Metical", Symbol = "MT", Country = "Mozambique", FlagEmoji = "🇲🇿", DecimalPlaces = 2, SortOrder = 13 },
            new() { Code = "EGP", Name = "Egyptian Pound", Symbol = "E£", Country = "Egypt", FlagEmoji = "🇪🇬", DecimalPlaces = 2, SortOrder = 14 },
            new() { Code = "MAD", Name = "Moroccan Dirham", Symbol = "DH", Country = "Morocco", FlagEmoji = "🇲🇦", DecimalPlaces = 2, SortOrder = 15 },
        };
        db.Currencies.AddRange(currencies);
        db.SaveChanges();
    }

    if (!db.ExchangeRateProviders.Any())
    {
        var providers = new List<PayAfrika.API.Models.ExchangeRateProvider>
        {
            new() { Name = "Open Exchange Rates", ApiEndpoint = "https://openexchangerates.org/api/latest.json", Priority = 1, IsPrimary = true, IsActive = true, HealthStatus = "unknown" },
            new() { Name = "ExchangeRate-API", ApiEndpoint = "https://api.exchangerate-api.com/v4/latest/USD", Priority = 2, IsFallback = true, IsActive = true, HealthStatus = "unknown" },
            new() { Name = "CurrencyLayer", ApiEndpoint = "https://api.currencylayer.com/live", Priority = 3, IsFallback = true, IsActive = true, HealthStatus = "unknown" },
            new() { Name = "Fixer.io", ApiEndpoint = "https://data.fixer.io/api/latest", Priority = 4, IsActive = false, HealthStatus = "unknown" },
            new() { Name = "XE", ApiEndpoint = "https://xecdapi.xe.com/v1/", Priority = 5, IsActive = false, HealthStatus = "unknown" },
            new() { Name = "Wise API", ApiEndpoint = "https://api.wise.com/v1/rates", Priority = 6, IsActive = false, HealthStatus = "unknown" },
        };
        db.ExchangeRateProviders.AddRange(providers);
        db.SaveChanges();
    }

    if (!db.ExchangeRates.Any())
    {
        var primaryProvider = db.ExchangeRateProviders.FirstOrDefault(p => p.IsPrimary);
        var rates = new List<PayAfrika.API.Models.ExchangeRate>
        {
            new() { BaseCurrency = "USD", QuoteCurrency = "ZAR", BuyRate = 18.25m, SellRate = 18.55m, MidMarketRate = 18.40m, Spread = 0.30m, ProviderId = primaryProvider?.Id, Source = "seed" },
            new() { BaseCurrency = "EUR", QuoteCurrency = "ZAR", BuyRate = 20.00m, SellRate = 20.30m, MidMarketRate = 20.15m, Spread = 0.30m, ProviderId = primaryProvider?.Id, Source = "seed" },
            new() { BaseCurrency = "GBP", QuoteCurrency = "ZAR", BuyRate = 23.10m, SellRate = 23.50m, MidMarketRate = 23.30m, Spread = 0.40m, ProviderId = primaryProvider?.Id, Source = "seed" },
            new() { BaseCurrency = "USD", QuoteCurrency = "NGN", BuyRate = 1550m, SellRate = 1580m, MidMarketRate = 1565m, Spread = 30m, ProviderId = primaryProvider?.Id, Source = "seed" },
            new() { BaseCurrency = "USD", QuoteCurrency = "KES", BuyRate = 145m, SellRate = 148m, MidMarketRate = 146.5m, Spread = 3m, ProviderId = primaryProvider?.Id, Source = "seed" },
            new() { BaseCurrency = "USD", QuoteCurrency = "GHS", BuyRate = 14.5m, SellRate = 14.8m, MidMarketRate = 14.65m, Spread = 0.3m, ProviderId = primaryProvider?.Id, Source = "seed" },
            new() { BaseCurrency = "EUR", QuoteCurrency = "USD", BuyRate = 1.08m, SellRate = 1.10m, MidMarketRate = 1.09m, Spread = 0.02m, ProviderId = primaryProvider?.Id, Source = "seed" },
            new() { BaseCurrency = "GBP", QuoteCurrency = "USD", BuyRate = 1.26m, SellRate = 1.28m, MidMarketRate = 1.27m, Spread = 0.02m, ProviderId = primaryProvider?.Id, Source = "seed" },
            new() { BaseCurrency = "USD", QuoteCurrency = "BWP", BuyRate = 13.5m, SellRate = 13.8m, MidMarketRate = 13.65m, Spread = 0.3m, ProviderId = primaryProvider?.Id, Source = "seed" },
            new() { BaseCurrency = "USD", QuoteCurrency = "ZMW", BuyRate = 25.0m, SellRate = 25.5m, MidMarketRate = 25.25m, Spread = 0.5m, ProviderId = primaryProvider?.Id, Source = "seed" },
        };
        db.ExchangeRates.AddRange(rates);
        db.SaveChanges();
    }

    if (!db.CurrencyPairs.Any())
    {
        var pairs = new List<PayAfrika.API.Models.CurrencyPair>
        {
            new() { BaseCurrency = "USD", QuoteCurrency = "ZAR", IsEnabled = true, MinBuySpread = 0.1m, MaxBuySpread = 0.5m, BuyFee = 0.5m, SellFee = 0.5m, FeeType = "percentage", SortOrder = 1 },
            new() { BaseCurrency = "EUR", QuoteCurrency = "ZAR", IsEnabled = true, MinBuySpread = 0.1m, MaxBuySpread = 0.5m, BuyFee = 0.5m, SellFee = 0.5m, FeeType = "percentage", SortOrder = 2 },
            new() { BaseCurrency = "GBP", QuoteCurrency = "ZAR", IsEnabled = true, MinBuySpread = 0.2m, MaxBuySpread = 0.6m, BuyFee = 0.5m, SellFee = 0.5m, FeeType = "percentage", SortOrder = 3 },
            new() { BaseCurrency = "USD", QuoteCurrency = "NGN", IsEnabled = true, MinBuySpread = 10m, MaxBuySpread = 50m, BuyFee = 0.8m, SellFee = 0.8m, FeeType = "percentage", SortOrder = 4 },
            new() { BaseCurrency = "USD", QuoteCurrency = "KES", IsEnabled = true, MinBuySpread = 1m, MaxBuySpread = 5m, BuyFee = 0.7m, SellFee = 0.7m, FeeType = "percentage", SortOrder = 5 },
            new() { BaseCurrency = "USD", QuoteCurrency = "GHS", IsEnabled = true, MinBuySpread = 0.1m, MaxBuySpread = 0.5m, BuyFee = 0.7m, SellFee = 0.7m, FeeType = "percentage", SortOrder = 6 },
            new() { BaseCurrency = "EUR", QuoteCurrency = "USD", IsEnabled = true, MinBuySpread = 0.01m, MaxBuySpread = 0.03m, BuyFee = 0.3m, SellFee = 0.3m, FeeType = "percentage", SortOrder = 7 },
            new() { BaseCurrency = "GBP", QuoteCurrency = "USD", IsEnabled = true, MinBuySpread = 0.01m, MaxBuySpread = 0.03m, BuyFee = 0.3m, SellFee = 0.3m, FeeType = "percentage", SortOrder = 8 },
        };
        db.CurrencyPairs.AddRange(pairs);
        db.SaveChanges();
    }

    if (!db.FxMargins.Any())
    {
        db.FxMargins.Add(new PayAfrika.API.Models.FxMargin { Name = "Global Margin", Type = "global", MarginType = "percentage", Value = 0.5m, Priority = 1 });
        db.FxMargins.Add(new PayAfrika.API.Models.FxMargin { Name = "Premium Customer", Type = "customer", MarginType = "percentage", Value = 0.25m, Priority = 2 });
        db.FxMargins.Add(new PayAfrika.API.Models.FxMargin { Name = "VIP Merchant", Type = "merchant", MarginType = "percentage", Value = 0.15m, Priority = 3 });
        db.FxMargins.Add(new PayAfrika.API.Models.FxMargin { Name = "USD/ZAR Pair", Type = "pair", MarginType = "fixed", Value = 0.1m, Priority = 4 });
        db.SaveChanges();
    }

    if (!db.SettlementCurrencies.Any())
    {
        db.SettlementCurrencies.Add(new PayAfrika.API.Models.SettlementCurrency { Currency = "ZAR", IsDefaultSettlement = true, AutoConversion = true, SettlementFrequency = "daily", MarginPercent = 0.5m, FeePercent = 0.5m });
        db.SettlementCurrencies.Add(new PayAfrika.API.Models.SettlementCurrency { Currency = "USD", IsDefaultSettlement = false, AutoConversion = true, SettlementFrequency = "daily", MarginPercent = 0.5m, FeePercent = 0.5m });
        db.SettlementCurrencies.Add(new PayAfrika.API.Models.SettlementCurrency { Currency = "EUR", IsDefaultSettlement = false, AutoConversion = true, SettlementFrequency = "weekly", MarginPercent = 0.5m, FeePercent = 0.5m });
        db.SaveChanges();
    }

    if (!db.ExchangeAlerts.Any())
    {
        db.ExchangeAlerts.Add(new PayAfrika.API.Models.ExchangeAlert { AlertType = "large_rate_change", Channel = "email", Threshold = 2m, IsEnabled = true });
        db.ExchangeAlerts.Add(new PayAfrika.API.Models.ExchangeAlert { AlertType = "provider_failure", Channel = "slack", Threshold = 0m, IsEnabled = true });
        db.ExchangeAlerts.Add(new PayAfrika.API.Models.ExchangeAlert { AlertType = "manual_override", Channel = "email", Threshold = 0m, IsEnabled = true });
        db.ExchangeAlerts.Add(new PayAfrika.API.Models.ExchangeAlert { AlertType = "high_spread", Channel = "email", Threshold = 1m, IsEnabled = true });
        db.ExchangeAlerts.Add(new PayAfrika.API.Models.ExchangeAlert { AlertType = "sync_failure", Channel = "slack", Threshold = 0m, IsEnabled = true });
        db.SaveChanges();
    }

    if (!db.ConversionRules.Any())
    {
        db.ConversionRules.Add(new PayAfrika.API.Models.ConversionRule { Name = "Auto Conversion Default", RuleType = "auto", RoundingRule = "standard", DecimalPrecision = 2, MinAmount = 1m, MaxAmount = 1000000m, Priority = 1 });
        db.ConversionRules.Add(new PayAfrika.API.Models.ConversionRule { Name = "Manual Conversion", RuleType = "manual", RoundingRule = "round_up", DecimalPrecision = 2, MinAmount = 10m, MaxAmount = 500000m, Priority = 2 });
        db.ConversionRules.Add(new PayAfrika.API.Models.ConversionRule { Name = "Multi-Currency Wallet", RuleType = "multi_wallet", RoundingRule = "standard", DecimalPrecision = 2, MinAmount = 0m, MaxAmount = 100000m, Priority = 3 });
        db.SaveChanges();
    }

    // Seed destination countries for transfers
    if (!db.Countries.Any())
    {
        var countries = new List<PayAfrika.API.Models.Country>
        {
            new() { Name = "South Africa", Code = "ZA", CurrencyCode = "ZAR", CurrencySymbol = "R", IsEnabled = true, SortOrder = 1 },
            new() { Name = "Nigeria", Code = "NG", CurrencyCode = "NGN", CurrencySymbol = "₦", IsEnabled = true, SortOrder = 2 },
            new() { Name = "Kenya", Code = "KE", CurrencyCode = "KES", CurrencySymbol = "KSh", IsEnabled = true, SortOrder = 3 },
            new() { Name = "Ghana", Code = "GH", CurrencyCode = "GHS", CurrencySymbol = "GH₵", IsEnabled = true, SortOrder = 4 },
            new() { Name = "United Kingdom", Code = "GB", CurrencyCode = "GBP", CurrencySymbol = "£", IsEnabled = true, SortOrder = 5 },
            new() { Name = "United States", Code = "US", CurrencyCode = "USD", CurrencySymbol = "$", IsEnabled = true, SortOrder = 6 },
            new() { Name = "Canada", Code = "CA", CurrencyCode = "CAD", CurrencySymbol = "C$", IsEnabled = true, SortOrder = 7 },
            new() { Name = "Australia", Code = "AU", CurrencyCode = "AUD", CurrencySymbol = "A$", IsEnabled = true, SortOrder = 8 },
            new() { Name = "Botswana", Code = "BW", CurrencyCode = "BWP", CurrencySymbol = "P", IsEnabled = true, SortOrder = 9 },
            new() { Name = "Zambia", Code = "ZM", CurrencyCode = "ZMW", CurrencySymbol = "ZK", IsEnabled = true, SortOrder = 10 },
            new() { Name = "Tanzania", Code = "TZ", CurrencyCode = "TZS", CurrencySymbol = "TSh", IsEnabled = true, SortOrder = 11 },
            new() { Name = "Uganda", Code = "UG", CurrencyCode = "UGX", CurrencySymbol = "USh", IsEnabled = true, SortOrder = 12 },
            new() { Name = "Rwanda", Code = "RW", CurrencyCode = "RWF", CurrencySymbol = "Fr", IsEnabled = true, SortOrder = 13 },
            new() { Name = "Namibia", Code = "NA", CurrencyCode = "NAD", CurrencySymbol = "N$", IsEnabled = true, SortOrder = 14 },
            new() { Name = "Eswatini", Code = "SZ", CurrencyCode = "SZL", CurrencySymbol = "E", IsEnabled = true, SortOrder = 15 },
            new() { Name = "Malawi", Code = "MW", CurrencyCode = "MWK", CurrencySymbol = "MK", IsEnabled = true, SortOrder = 16 },
            new() { Name = "Zimbabwe", Code = "ZW", CurrencyCode = "USD", CurrencySymbol = "$", IsEnabled = true, SortOrder = 17 },
            new() { Name = "Ethiopia", Code = "ET", CurrencyCode = "ETB", CurrencySymbol = "Br", IsEnabled = true, SortOrder = 18 },
            new() { Name = "Mozambique", Code = "MZ", CurrencyCode = "MZN", CurrencySymbol = "MT", IsEnabled = true, SortOrder = 19 },
            new() { Name = "Egypt", Code = "EG", CurrencyCode = "EGP", CurrencySymbol = "E£", IsEnabled = true, SortOrder = 20 },
            new() { Name = "Morocco", Code = "MA", CurrencyCode = "MAD", CurrencySymbol = "DH", IsEnabled = true, SortOrder = 21 },
        };
        db.Countries.AddRange(countries);
        db.SaveChanges();
    }

    // Seed banks for destination countries (idempotent: adds only missing banks)
    {
        string[] bankRows =
        {
            // South Africa
            "ZA|CAP|Capitec Bank", "ZA|FNB|FNB", "ZA|SB|Standard Bank", "ZA|NED|Nedbank", "ZA|ABS|Absa",
            "ZA|AFB|African Bank", "ZA|FIG|FirstRand", "ZA|IFT|Investec", "ZA|TYM|TymeBank", "ZA|BZ|Bank Zero",
            "ZA|DIS|Discovery Bank", "ZA|SAS|Sasfin", "ZA|GRI|Grindrod Bank", "ZA|MER|Mercantile Bank",
            "ZA|BID|Bidvest Bank", "ZA|ALB|Albaraka Bank", "ZA|HBZ|HBZ Bank", "ZA|UBN|Ubank", "ZA|POB|Postbank",
            "ZA|GBS|GBS Mutual Bank",
            // Nigeria
            "NG|ACC|Access Bank", "NG|FBN|First Bank", "NG|ZEN|Zenith Bank", "NG|GTB|GTBank", "NG|UBA|UBA",
            "NG|STB|Sterling Bank", "NG|FID|Fidelity Bank", "NG|UNI|Union Bank", "NG|ECO|Ecobank Nigeria",
            "NG|SIB|Stanbic IBTC", "NG|KEY|Keystone Bank", "NG|WEM|Wema Bank", "NG|POL|Polaris Bank",
            "NG|UNY|Unity Bank", "NG|JAI|Jaiz Bank", "NG|TAJ|Taj Bank", "NG|GLO|Globus Bank",
            "NG|PRO|Providus Bank", "NG|SUN|SunTrust Bank", "NG|HER|Heritage Bank",
            "NG|SCB|Standard Chartered Nigeria", "NG|CIT|Citibank Nigeria", "NG|FCM|FCMB",
            "NG|COR|Coronation Merchant Bank", "NG|RMB|Rand Merchant Bank", "NG|KUD|Kuda",
            "NG|OPA|Opay", "NG|PAL|PalmPay", "NG|MON|Moniepoint", "NG|VFD|VFD Bank",
            "NG|TIT|Titan Trust Bank", "NG|LOT|Lotus Bank", "NG|SIG|Signature Bank", "NG|PTB|Premium Trust Bank",
            // Kenya
            "KE|KCB|Kenya Commercial Bank", "KE|EQT|Equity Bank", "KE|COOP|Cooperative Bank",
            "KE|NBC|National Bank of Kenya", "KE|FAM|Family Bank", "KE|STB|Stanbic Kenya",
            "KE|SCB|Standard Chartered Kenya", "KE|ABS|Absa Kenya", "KE|IMB|I&M Bank",
            "KE|DTB|Diamond Trust Bank", "KE|NCB|NCBA", "KE|SID|Sidian Bank", "KE|GUL|Gulf African Bank",
            "KE|VIC|Victoria Commercial Bank", "KE|CRE|Credit Bank", "KE|CON|Consolidated Bank of Kenya",
            "KE|SPI|Spire Bank", "KE|PRI|Prime Bank", "KE|BOA|Bank of Africa Kenya", "KE|ECO|Ecobank Kenya",
            "KE|GUA|Guardian Bank", "KE|HFB|Housing Finance Bank", "KE|MAY|Mayfair Bank",
            "KE|PAR|Paramount Bank", "KE|SBM|SBM Bank Kenya", "KE|KIN|Kingdom Bank", "KE|UBA|UBA Kenya",
            "KE|FCM|First Community Bank",
            // Ghana
            "GH|GCB|Ghana Commercial Bank", "GH|ECO|Ecobank Ghana", "GH|ACC|Access Bank Ghana",
            "GH|STA|Stanbic Ghana", "GH|FID|Fidelity Bank Ghana", "GH|ABS|Absa Ghana",
            "GH|SCB|Standard Chartered Ghana", "GH|CAL|CalBank", "GH|ZEN|Zenith Bank Ghana",
            "GH|UMB|Universal Merchant Bank", "GH|CBG|Consolidated Bank Ghana", "GH|ADB|Agricultural Development Bank",
            "GH|PRU|Prudential Bank", "GH|REP|Republic Bank Ghana", "GH|SG|Societe Generale Ghana",
            "GH|GTB|GTBank Ghana", "GH|FAB|First Atlantic Bank", "GH|GTG|Guaranty Trust Bank Ghana",
            "GH|OMN|OmniBSIC Bank", "GH|FBN|FBNBank Ghana", "GH|USL|Union Savings and Loans",
            // United Kingdom
            "GB|BARC|Barclays", "GB|HSBC|HSBC", "GB|LLOY|Lloyds Bank", "GB|NW|NatWest", "GB|SAN|Santander",
            "GB|NAT|Nationwide", "GB|TSB|TSB Bank", "GB|HAL|Halifax", "GB|MET|Metro Bank", "GB|MON|Monzo",
            "GB|STA|Starling Bank", "GB|REV|Revolut", "GB|VIR|Virgin Money", "GB|COOP|Co-operative Bank",
            "GB|SCB|Standard Chartered", "GB|RBS|Royal Bank of Scotland", "GB|YOR|Yorkshire Bank",
            "GB|BOS|Bank of Scotland", "GB|CLY|Clydesdale Bank", "GB|FDR|First Direct", "GB|COU|Coutts",
            "GB|AIB|Allied Irish Bank", "GB|DAN|Danske Bank", "GB|TES|Tesco Bank", "GB|MSB|M&S Bank",
            "GB|ALD|Aldermore", "GB|PAR|Paragon Bank", "GB|SHA|Shawbrook Bank",
            // United States
            "US|CHASE|Chase Bank", "US|BAC|Bank of America", "US|WFC|Wells Fargo", "US|CITI|Citibank",
            "US|USB|US Bank", "US|PNC|PNC Bank", "US|CAP|Capital One", "US|TDB|TD Bank", "US|TRU|Truist",
            "US|FIF|Fifth Third Bank", "US|KEY|KeyBank", "US|REG|Regions Bank", "US|HUN|Huntington Bank",
            "US|ALLY|Ally Bank", "US|SCH|Charles Schwab", "US|GS|Goldman Sachs", "US|AMEX|American Express",
            "US|SYN|Synchrony Bank", "US|DIS|Discover Bank", "US|CIT|Citizens Bank",
            // Canada
            "CA|RBC|Royal Bank of Canada", "CA|TD|Toronto-Dominion Bank", "CA|BNS|Scotiabank",
            "CA|BMO|Bank of Montreal", "CA|CIBC|CIBC", "CA|NBC|National Bank of Canada",
            "CA|DES|Desjardins", "CA|HSBC|HSBC Canada", "CA|LAU|Laurentian Bank", "CA|TAN|Tangerine",
            "CA|SIM|Simplii", "CA|ATB|ATB Financial", "CA|MAN|Manulife Bank", "CA|CWB|Canadian Western Bank",
            "CA|EQ|EQ Bank", "CA|VAN|Vancity",
            // Australia
            "AU|CBA|Commonwealth Bank", "AU|ANZ|ANZ", "AU|WBC|Westpac", "AU|NAB|National Australia Bank",
            "AU|MQG|Macquarie", "AU|BEN|Bendigo Bank", "AU|SUN|Suncorp", "AU|BOQ|Bank of Queensland",
            "AU|HSBC|HSBC Australia", "AU|ING|ING Australia", "AU|CIT|Citibank Australia", "AU|AMP|AMP Bank",
            "AU|BB|Beyond Bank", "AU|ME|ME Bank", "AU|STG|St George", "AU|BKW|Bankwest", "AU|UB|UBank",
            // Botswana
            "BW|FNB|FNB Botswana", "BW|BAR|Barclays Botswana", "BW|STA|Stanbic Bank Botswana",
            "BW|SCB|Standard Chartered Botswana", "BW|ABS|Absa Botswana", "BW|BGB|Bank Gaborone",
            "BW|BAB|BancABC Botswana", "BW|FCB|First Capital Bank Botswana", "BW|NDB|National Development Bank",
            "BW|BSB|Botswana Savings Bank", "BW|LETS|Letshego", "BW|BOB|Bank of Baroda",
            "BW|ACC|Access Bank Botswana",
            // Zambia
            "ZM|ZAN|Zanaco", "ZM|SCB|Standard Chartered Zambia", "ZM|BAR|Barclays Zambia", "ZM|FNB|FNB Zambia",
            "ZM|STA|Stanbic Bank Zambia", "ZM|ABS|Absa Zambia", "ZM|ATM|Atlas Mara Zambia",
            "ZM|IZB|Indo-Zambia Bank", "ZM|NSC|National Savings and Credit Bank", "ZM|BOC|Bank of China Zambia",
            "ZM|ACC|Access Bank Zambia", "ZM|CAV|Cavmont Bank", "ZM|UBA|UBA Zambia",
            "ZM|FAB|First Alliance Bank", "ZM|INV|Investrust Bank", "ZM|ZIC|Zambia Industrial Commercial Bank",
            // Tanzania
            "TZ|NMB|NMB Bank", "TZ|CRDB|CRDB Bank", "TZ|NBC|NBC Tanzania", "TZ|STA|Stanbic Bank Tanzania",
            "TZ|SCB|Standard Chartered Tanzania", "TZ|ABS|Absa Tanzania", "TZ|EXI|Exim Bank",
            "TZ|AZA|Azania Bank", "TZ|BOA|Bank of Africa Tanzania", "TZ|ECO|Ecobank Tanzania",
            "TZ|EQT|Equity Bank Tanzania", "TZ|KCB|KCB Tanzania", "TZ|DTB|Diamond Trust Bank Tanzania",
            "TZ|ACC|Access Bank Tanzania", "TZ|CIT|Citibank Tanzania", "TZ|TPB|TPB Bank",
            // Uganda
            "UG|STA|Stanbic Bank Uganda", "UG|SCB|Standard Chartered Uganda", "UG|BAR|Barclays Uganda",
            "UG|EQT|Equity Bank Uganda", "UG|CEN|Centenary Bank", "UG|BOB|Bank of Baroda Uganda",
            "UG|DFC|DFCU Bank", "UG|PST|PostBank Uganda", "UG|CAI|Cairo Bank", "UG|EXI|Exim Bank Uganda",
            "UG|BOA|Bank of Africa Uganda", "UG|DTB|Diamond Trust Bank Uganda", "UG|KCB|KCB Uganda",
            "UG|ECO|Ecobank Uganda", "UG|ORI|Orient Bank", "UG|NCB|NC Bank Uganda", "UG|TRO|Tropical Bank",
            "UG|HFB|Housing Finance Bank", "UG|UBA|UBA Uganda", "UG|FTB|Finance Trust Bank",
            // Rwanda
            "RW|BOK|Bank of Kigali", "RW|EQT|Equity Bank Rwanda", "RW|ECO|Ecobank Rwanda", "RW|KCB|KCB Rwanda",
            "RW|BPR|BPR Bank", "RW|IMB|I&M Bank Rwanda", "RW|BOA|Bank of Africa Rwanda",
            "RW|STA|Stanbic Rwanda", "RW|GTB|GTBank Rwanda", "RW|COG|COGEBANQUE", "RW|UNG|Unguka Bank",
            "RW|ACC|Access Bank Rwanda",
            // Namibia
            "NA|FNB|FNB Namibia", "NA|SB|Standard Bank Namibia", "NA|NED|Nedbank Namibia",
            "NA|BWK|Bank Windhoek", "NA|ABS|Absa Namibia", "NA|LET|Letshego Namibia",
            "NA|BOB|Bank of Baroda", "NA|SME|SME Bank", "NA|TRU|Trustco Bank", "NA|PNB|PostBank Namibia",
            // Eswatini
            "SZ|SB|Standard Bank Eswatini", "SZ|NED|Nedbank Eswatini", "SZ|FNB|FNB Eswatini",
            "SZ|ABS|Absa Eswatini",             "SZ|SWB|SwaziBank",
            // Malawi
            "MW|NBM|National Bank of Malawi", "MW|SB|Standard Bank Malawi", "MW|FDH|FDH Bank",
            "MW|NED|Nedbank Malawi", "MW|FCM|First Capital Bank", "MW|CDH|CDH Investment Bank",
            "MW|NFB|New Finance Bank", "MW|MYB|MyBucks Malawi", "MW|NBS|NBS Bank",
            // Zimbabwe
            "ZW|CBZ|CBZ Bank", "ZW|STA|Stanbic Bank Zimbabwe", "ZW|SCB|Standard Chartered Zimbabwe",
            "ZW|FBC|FBC Bank", "ZW|NMB|NMB Zimbabwe", "ZW|ZBB|ZB Bank", "ZW|CAB|CABS",
            "ZW|STW|Steward Bank", "ZW|BAR|Barclays Zimbabwe", "ZW|ECO|Ecobank Zimbabwe",
            "ZW|NED|Nedbank Zimbabwe", "ZW|MET|Metropolitan Bank", "ZW|GTB|GetBucks", "ZW|POS|POSB",
            "ZW|AGR|Agribank",
            // Ethiopia
            "ET|CBE|Commercial Bank of Ethiopia", "ET|AWK|Awash Bank", "ET|DSH|Dashen Bank",
            "ET|ABY|Abyssinia Bank", "ET|BAB|Bank of Abyssinia", "ET|WEG|Wegagen Bank", "ET|UNI|United Bank",
            "ET|LIO|Lion International Bank", "ET|NIB|Nib International Bank", "ET|CBO|Cooperative Bank of Oromia",
            "ET|ZEM|Zemen Bank", "ET|ORM|Oromia Bank", "ET|BER|Berhan Bank", "ET|ENA|Enat Bank",
            "ET|ADI|Addis International Bank", "ET|DEB|Debub Global Bank", "ET|BUN|Bunna Bank",
            "ET|SID|Sidama Bank", "ET|GAD|Gadaa Bank", "ET|HIJ|Hijra Bank", "ET|AMH|Amhara Bank",
            "ET|TSE|Tsehay Bank", "ET|GOH|Goh Bank", "ET|GLO|Global Bank Ethiopia", "ET|TSD|Tseday Bank",
            // Mozambique
            "MZ|MBI|Millennium BIM", "MZ|SB|Standard Bank Mozambique", "MZ|BCI|BCI Mozambique",
            "MZ|ABS|Absa Mozambique", "MZ|MOZ|Moza Banco", "MZ|FNB|First National Bank Mozambique",
            "MZ|BIG|Banco Big", "MZ|LET|Letshego Mozambique", "MZ|MAI|Banco Mais",
            // Egypt
            "EG|NBE|National Bank of Egypt", "EG|BM|Banque Misr", "EG|CIB|CIB Egypt", "EG|HSBC|HSBC Egypt",
            "EG|QNB|QNB Alahli", "EG|BOA|Bank of Alexandria", "EG|BDC|Banque du Caire", "EG|AAIB|Arab African International Bank",
            "EG|ARB|Arab Bank Egypt", "EG|NBK|National Bank of Kuwait Egypt", "EG|ENBD|Emirates NBD Egypt",
            "EG|ADIB|Abu Dhabi Islamic Bank", "EG|FIB|Faisal Islamic Bank", "EG|ALB|Al Baraka Bank Egypt",
            "EG|SCB|Suez Canal Bank", "EG|AXB|Alex Bank", "EG|CAE|Credit Agricole Egypt", "EG|MAS|Mashreq",
            "EG|EGB|EG Bank", "EG|UBE|United Bank Egypt", "EG|SAIB|SAIB Bank", "EG|AUB|Ahli United Bank",
            "EG|ABC|ABC Bank Egypt", "EG|ATT|Attijariwafa Bank Egypt",
            // Morocco
            "MA|ATT|Attijariwafa Bank", "MA|BMCE|BMCE Bank", "MA|BP|Banque Populaire", "MA|CIH|CIH Bank",
            "MA|SG|Societe Generale Maroc", "MA|BMCI|BMCI", "MA|CAM|Credit Agricole du Maroc",
            "MA|ALB|Al Baraka Bank Morocco", "MA|CFG|CFG Bank", "MA|ARB|Arab Bank Maroc",
            "MA|UPL|Upline Bank",
        };

        var existing = db.Banks.Select(b => new { b.CountryCode, b.Code }).ToHashSet();
        var missing = bankRows.Select((row, i) =>
        {
            var parts = row.Split('|');
            return new PayAfrika.API.Models.Bank
            {
                CountryCode = parts[0],
                Code = parts[1],
                Name = parts[2],
                SortOrder = i,
            };
        }).Where(b => !existing.Contains(new { b.CountryCode, b.Code })).ToList();

        if (missing.Count > 0)
        {
            db.Banks.AddRange(missing);
            db.SaveChanges();
        }
    }

}

static string GetRoleDescription(string name) => name switch
{
    "super_admin" => "Full platform access with all permissions",
    "admin" => "Nearly full access except critical security settings",
    "compliance_officer" => "KYC, AML, fraud detection, and regulatory compliance",
    "finance_admin" => "Transactions, wallets, refunds, settlements, and billing",
    "risk_manager" => "Fraud monitoring, chargebacks, AML alerts, and risk rules",
    "merchant_manager" => "Merchant onboarding, approvals, KYC, and limits",
    "support_manager" => "Tickets, live chat, escalations, and customer profiles",
    "support_agent" => "Respond to tickets, chat, and view customer information",
    "marketing_manager" => "CMS, blog, SEO, campaigns, and media library",
    "content_editor" => "Write blogs, edit pages, upload media, save drafts",
    "affiliate_manager" => "Affiliates, referral programs, commissions, and payouts",
    "api_developer" => "API keys, webhooks, SDKs, and integrations",
    "auditor" => "Read-only access to logs, reports, and KYC data",
    "read_only" => "View-only access to assigned modules",
    _ => "",
};

static string GetRoleDepartment(string name) => name switch
{
    "super_admin" => "Executive",
    "admin" => "Executive",
    "compliance_officer" => "Compliance",
    "finance_admin" => "Finance",
    "risk_manager" => "Risk",
    "merchant_manager" => "Operations",
    "support_manager" => "Support",
    "support_agent" => "Support",
    "marketing_manager" => "Marketing",
    "content_editor" => "Marketing",
    "affiliate_manager" => "Marketing",
    "api_developer" => "Engineering",
    "auditor" => "Compliance",
    "read_only" => "Operations",
    _ => "",
};

static string GetRoleColor(string name) => name switch
{
    "super_admin" => "#EF4444",
    "admin" => "#F97316",
    "compliance_officer" => "#22C55E",
    "finance_admin" => "#3B82F6",
    "risk_manager" => "#A855F7",
    "merchant_manager" => "#06B6D4",
    "support_manager" => "#14B8A6",
    "support_agent" => "#84CC16",
    "marketing_manager" => "#E91E63",
    "content_editor" => "#EC4899",
    "affiliate_manager" => "#F59E0B",
    "api_developer" => "#6366F1",
    "auditor" => "#8B5CF6",
    "read_only" => "#6B7280",
    _ => "#0057FF",
};

static string GetRoleIcon(string name) => name switch
{
    "super_admin" => "Shield",
    "admin" => "ShieldCheck",
    "compliance_officer" => "Scale",
    "finance_admin" => "DollarSign",
    "risk_manager" => "AlertTriangle",
    "merchant_manager" => "Store",
    "support_manager" => "HeadphonesIcon",
    "support_agent" => "MessageCircle",
    "marketing_manager" => "Megaphone",
    "content_editor" => "PenSquare",
    "affiliate_manager" => "UsersRound",
    "api_developer" => "Code",
    "auditor" => "Search",
    "read_only" => "Eye",
    _ => "Shield",
};

app.Run();
