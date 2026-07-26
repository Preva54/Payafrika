using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PayAfrika.API.Data;
using PayAfrika.API.Models;
using PayAfrika.API.Services;
using System.Text.Json;

namespace PayAfrika.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly IReportService _reportService;
    private readonly IAiInsightService _aiInsightService;
    private readonly AppDbContext _db;

    public ReportsController(IReportService reportService, IAiInsightService aiInsightService, AppDbContext db)
    {
        _reportService = reportService;
        _aiInsightService = aiInsightService;
        _db = db;
    }

    [HttpGet("dashboard")]
    public async Task<ActionResult<ReportDashboardResponse>> GetDashboard([FromQuery] ReportQuery query)
    {
        var result = await _reportService.GetDashboardAsync(query);
        return Ok(result);
    }

    [HttpGet("revenue")]
    public async Task<ActionResult<RevenueReportResponse>> GetRevenue([FromQuery] ReportQuery query)
    {
        var result = await _reportService.GetRevenueReportAsync(query);
        return Ok(result);
    }

    [HttpGet("transactions")]
    public async Task<ActionResult<TransactionReportResponse>> GetTransactions([FromQuery] ReportQuery query)
    {
        var result = await _reportService.GetTransactionReportAsync(query);
        return Ok(result);
    }

    [HttpGet("merchants")]
    public async Task<ActionResult<MerchantReportResponse>> GetMerchants([FromQuery] ReportQuery query)
    {
        var result = await _reportService.GetMerchantReportAsync(query);
        return Ok(result);
    }

    [HttpGet("customers")]
    public async Task<ActionResult<CustomerReportResponse>> GetCustomers([FromQuery] ReportQuery query)
    {
        var result = await _reportService.GetCustomerReportAsync(query);
        return Ok(result);
    }

    [HttpGet("financial")]
    public async Task<ActionResult<FinancialReportResponse>> GetFinancial([FromQuery] ReportQuery query)
    {
        var result = await _reportService.GetFinancialReportAsync(query);
        return Ok(result);
    }

    [HttpGet("compliance")]
    public async Task<ActionResult<ComplianceReportResponse>> GetCompliance([FromQuery] ReportQuery query)
    {
        var result = await _reportService.GetComplianceReportAsync(query);
        return Ok(result);
    }

    [HttpGet("affiliates")]
    public async Task<ActionResult<AffiliateReportResponse>> GetAffiliates([FromQuery] ReportQuery query)
    {
        var result = await _reportService.GetAffiliateReportAsync(query);
        return Ok(result);
    }

    [HttpGet("wallets")]
    public async Task<ActionResult<WalletReportResponse>> GetWallets([FromQuery] ReportQuery query)
    {
        var result = await _reportService.GetWalletReportAsync(query);
        return Ok(result);
    }

    [HttpGet("support")]
    public async Task<ActionResult<SupportReportResponse>> GetSupport([FromQuery] ReportQuery query)
    {
        var result = await _reportService.GetSupportReportAsync(query);
        return Ok(result);
    }

    [HttpGet("ai/insights")]
    public async Task<ActionResult> GetAiInsights()
    {
        var insights = await _aiInsightService.GenerateInsightsAsync();
        return Ok(new { insights });
    }

    [HttpGet("ai/executive-summary")]
    public async Task<ActionResult> GetExecutiveSummary()
    {
        var summary = await _aiInsightService.GetExecutiveSummaryAsync();
        return Ok(summary);
    }

    [HttpGet("ai/forecast")]
    public async Task<ActionResult> GetForecast([FromQuery] int months = 3)
    {
        var forecast = await _aiInsightService.ForecastRevenueAsync(months);
        return Ok(forecast);
    }

    [HttpGet("ai/anomalies")]
    public async Task<ActionResult> GetAnomalies()
    {
        var anomalies = await _aiInsightService.DetectAnomaliesAsync();
        return Ok(anomalies);
    }

    [HttpGet("ai/recommendations")]
    public async Task<ActionResult> GetRecommendations()
    {
        var recommendations = await _aiInsightService.GetRecommendationsAsync();
        return Ok(new { recommendations });
    }

    [HttpGet("scheduled")]
    public async Task<ActionResult> GetScheduledReports()
    {
        var reports = await _db.Set<ScheduledReport>()
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();
        return Ok(reports);
    }

    [HttpPost("scheduled")]
    public async Task<ActionResult> CreateScheduledReport([FromBody] CreateScheduledReportRequest request)
    {
        var report = new ScheduledReport
        {
            Id = Guid.NewGuid(),
            CreatedById = Guid.Empty,
            Name = request.Name,
            Description = request.Description ?? "",
            ReportType = request.ReportType,
            Frequency = request.Frequency,
            CronExpression = request.CronExpression ?? "",
            Filters = request.Filters ?? "{}",
            Format = request.Format ?? "pdf",
            RecipientEmails = request.RecipientEmails ?? "",
            IncludeCharts = request.IncludeCharts,
            IncludeSummary = request.IncludeSummary,
            Status = "active",
            CreatedAt = DateTime.UtcNow,
        };

        _db.Set<ScheduledReport>().Add(report);
        await _db.SaveChangesAsync();
        return Ok(report);
    }

    [HttpDelete("scheduled/{id}")]
    public async Task<ActionResult> DeleteScheduledReport(Guid id)
    {
        var report = await _db.Set<ScheduledReport>().FindAsync(id);
        if (report == null) return NotFound();
        _db.Set<ScheduledReport>().Remove(report);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("scheduled/{id}/run-now")]
    public async Task<ActionResult> RunScheduledReport(Guid id)
    {
        var report = await _db.Set<ScheduledReport>().FindAsync(id);
        if (report == null) return NotFound();
        report.LastRunAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { message = "Report queued for generation", reportId = id });
    }

    [HttpGet("export")]
    public async Task<ActionResult> ExportReport(
        [FromQuery] string type = "dashboard",
        [FromQuery] string format = "json",
        [FromQuery] string? startDate = null,
        [FromQuery] string? endDate = null)
    {
        var query = new ReportQuery
        {
            StartDate = startDate != null ? DateTime.Parse(startDate) : null,
            EndDate = endDate != null ? DateTime.Parse(endDate) : null,
        };

        object data = type switch
        {
            "dashboard" => await _reportService.GetDashboardAsync(query),
            "revenue" => await _reportService.GetRevenueReportAsync(query),
            "transactions" => await _reportService.GetTransactionReportAsync(query),
            "merchants" => await _reportService.GetMerchantReportAsync(query),
            "customers" => await _reportService.GetCustomerReportAsync(query),
            "financial" => await _reportService.GetFinancialReportAsync(query),
            "compliance" => await _reportService.GetComplianceReportAsync(query),
            "affiliates" => await _reportService.GetAffiliateReportAsync(query),
            "wallets" => await _reportService.GetWalletReportAsync(query),
            "support" => await _reportService.GetSupportReportAsync(query),
            _ => await _reportService.GetDashboardAsync(query),
        };

        if (format == "json")
        {
            var json = JsonSerializer.Serialize(data, new JsonSerializerOptions { WriteIndented = true });
            return File(System.Text.Encoding.UTF8.GetBytes(json), "application/json", $"report-{type}-{DateTime.UtcNow:yyyy-MM-dd}.json");
        }

        if (format == "csv")
        {
            var csv = ConvertToCsv(data);
            return File(System.Text.Encoding.UTF8.GetBytes(csv), "text/csv", $"report-{type}-{DateTime.UtcNow:yyyy-MM-dd}.csv");
        }

        return Ok(data);
    }

    [HttpGet("overview-stats")]
    public async Task<ActionResult> GetOverviewStats()
    {
        var totalUsers = await _db.Users.CountAsync();
        var totalRevenue = await _db.Transactions
            .Where(t => t.Status == "completed" && (t.Type == "payment" || t.Type == "deposit"))
            .SumAsync(t => (decimal?)t.Amount) ?? 0;
        var totalTx = await _db.Transactions.CountAsync();
        var totalAffiliates = await _db.Affiliates.CountAsync();
        var totalMerchants = await _db.Users.CountAsync(u => u.Role == "business");
        var totalFraudCases = await _db.FraudFlags.CountAsync();
        var successRate = totalTx > 0
            ? (double)await _db.Transactions.CountAsync(t => t.Status == "completed") / totalTx * 100
            : 0;

        return Ok(new
        {
            totalUsers,
            totalRevenue,
            totalTransactions = totalTx,
            totalAffiliates,
            totalMerchants,
            totalFraudCases,
            successRate,
        });
    }

    private static string ConvertToCsv(object data)
    {
        if (data is ReportDashboardResponse dashboard)
        {
            var lines = new List<string> { "Label,Value,ChangePercent,Trend" };
            lines.AddRange(dashboard.Kpis.Select(k => $"\"{k.Label}\",{k.Value},{k.ChangePercent:F2},{k.Trend}"));
            return string.Join("\n", lines);
        }

        if (data is TransactionReportResponse tx)
        {
            var lines = new List<string> { "Date,Count,Volume" };
            lines.AddRange(tx.VolumeTrend.Select(v => $"{v.Date},{v.Value},{v.SecondaryValue}"));
            return string.Join("\n", lines);
        }

        return JsonSerializer.Serialize(data);
    }
}

public class CreateScheduledReportRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string ReportType { get; set; } = "dashboard";
    public string Frequency { get; set; } = "weekly";
    public string? CronExpression { get; set; }
    public string? Filters { get; set; }
    public string? Format { get; set; }
    public string? RecipientEmails { get; set; }
    public bool IncludeCharts { get; set; } = true;
    public bool IncludeSummary { get; set; } = true;
}
