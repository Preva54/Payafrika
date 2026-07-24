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
