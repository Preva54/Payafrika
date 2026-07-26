using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PayAfrika.API.Data;
using PayAfrika.API.Models;

namespace PayAfrika.API.Services;

public interface IAiInsightService
{
    Task<List<AiInsight>> GenerateInsightsAsync();
    Task<object> GetExecutiveSummaryAsync();
    Task<object> ForecastRevenueAsync(int months = 3);
    Task<object> DetectAnomaliesAsync();
    Task<List<object>> GetRecommendationsAsync();
}

public class AiInsightService : IAiInsightService
{
    private readonly AppDbContext _db;

    public AiInsightService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<AiInsight>> GenerateInsightsAsync()
    {
        var insights = new List<AiInsight>();
        var now = DateTime.UtcNow;
        var thirtyDaysAgo = now.AddDays(-30);
        var sixtyDaysAgo = now.AddDays(-60);

        var currentRevenue = await _db.Transactions
            .Where(t => t.CreatedAt >= thirtyDaysAgo && t.Status == "completed" && (t.Type == "payment" || t.Type == "deposit"))
            .SumAsync(t => (decimal?)t.Amount) ?? 0;
        var previousRevenue = await _db.Transactions
            .Where(t => t.CreatedAt >= sixtyDaysAgo && t.CreatedAt < thirtyDaysAgo && t.Status == "completed" && (t.Type == "payment" || t.Type == "deposit"))
            .SumAsync(t => (decimal?)t.Amount) ?? 0;

        if (previousRevenue > 0)
        {
            var growthRate = (double)((currentRevenue - previousRevenue) / previousRevenue * 100);
            if (growthRate > 10)
                insights.Add(new AiInsight { Type = "success", Title = "Revenue Growth", Message = $"Revenue grew {growthRate:F1}% compared to last month.", Metric = "revenue_growth" });
            else if (growthRate < -5)
                insights.Add(new AiInsight { Type = "warning", Title = "Revenue Decline", Message = $"Revenue declined {Math.Abs(growthRate):F1}% month over month.", Severity = 0.6, Metric = "revenue_decline" });
        }

        var failedTx = await _db.Transactions.CountAsync(t => t.CreatedAt >= thirtyDaysAgo && t.Status == "failed");
        var totalTx = await _db.Transactions.CountAsync(t => t.CreatedAt >= thirtyDaysAgo);
        if (totalTx > 0 && (double)failedTx / totalTx * 100 > 5)
        {
            insights.Add(new AiInsight
            {
                Type = "critical", Title = "Elevated Failure Rate",
                Message = $"{(double)failedTx / totalTx * 100:F1}% of transactions failed in the last 30 days.",
                Severity = 0.8, Metric = "failure_rate",
            });
        }

        var fraudCount = await _db.FraudFlags.CountAsync(f => f.CreatedAt >= thirtyDaysAgo);
        if (fraudCount > 0)
            insights.Add(new AiInsight { Type = "warning", Title = "Fraud Activity", Message = $"{fraudCount} fraud case(s) detected in the last 30 days.", Severity = Math.Min(0.9, fraudCount * 0.1), Metric = "fraud_activity" });

        var userGrowth = await _db.Users.CountAsync(u => u.CreatedAt >= thirtyDaysAgo);
        var prevUserGrowth = await _db.Users.CountAsync(u => u.CreatedAt >= sixtyDaysAgo && u.CreatedAt < thirtyDaysAgo);
        if (prevUserGrowth > 0 && (double)userGrowth / prevUserGrowth < 0.7)
            insights.Add(new AiInsight { Type = "warning", Title = "Slowing User Growth", Message = "New user registrations have dropped significantly. Review acquisition channels.", Severity = 0.5, Metric = "user_growth_slow" });

        insights.Add(new AiInsight { Type = "info", Title = "Forecast", Message = $"Based on current trends, next month revenue is estimated at R {(currentRevenue * 1.05m):N0}.", Metric = "forecast" });

        return insights;
    }

    public async Task<object> GetExecutiveSummaryAsync()
    {
        var now = DateTime.UtcNow;
        var thirtyDaysAgo = now.AddDays(-30);

        var totalUsers = await _db.Users.CountAsync();
        var revenue = await _db.Transactions
            .Where(t => t.CreatedAt >= thirtyDaysAgo && t.Status == "completed" && (t.Type == "payment" || t.Type == "deposit"))
            .SumAsync(t => (decimal?)t.Amount) ?? 0;
        var txCount = await _db.Transactions.CountAsync(t => t.CreatedAt >= thirtyDaysAgo);
        var successRate = txCount > 0
            ? (double)await _db.Transactions.CountAsync(t => t.CreatedAt >= thirtyDaysAgo && t.Status == "completed") / txCount * 100
            : 0;

        var topMetric = "Revenue";
        var topValue = $"R {revenue:N0}";
        var summary = $"PayAfrika processed {txCount} transactions worth R {revenue:N0} in the last 30 days with a {successRate:F1}% success rate. " +
                      $"The platform serves {totalUsers} registered users. " +
                      (successRate > 95 ? "Payment infrastructure is performing well." : "Payment processing needs attention.");

        return new { summary, metrics = new { totalUsers, revenue, txCount, successRate }, topMetric, topValue };
    }

    public async Task<object> ForecastRevenueAsync(int months = 3)
    {
        var forecasts = new List<object>();
        var now = DateTime.UtcNow;

        for (int i = 1; i <= months; i++)
        {
            var start = now.AddMonths(i - 1);
            var end = now.AddMonths(i);

            var historicalRevenue = await _db.Transactions
                .Where(t => t.Status == "completed" && (t.Type == "payment" || t.Type == "deposit"))
                .GroupBy(t => new { t.CreatedAt.Year, t.CreatedAt.Month })
                .OrderByDescending(g => g.Key.Year).ThenByDescending(g => g.Key.Month)
                .Select(g => g.Sum(t => t.Amount))
                .Take(3)
                .ToListAsync();

            var avgRevenue = historicalRevenue.Count > 0 ? historicalRevenue.Average() : 0;
            var forecastedRevenue = avgRevenue * 1.05m;
            var growthRate = 5.0;

            forecasts.Add(new
            {
                month = start.ToString("MMM yyyy"),
                forecastedRevenue,
                lowerBound = forecastedRevenue * 0.9m,
                upperBound = forecastedRevenue * 1.1m,
                growthRate,
                confidence = 85,
            });
        }

        return new { forecasts, methodology = "Moving average with 5% projected growth based on historical trends." };
    }

    public async Task<object> DetectAnomaliesAsync()
    {
        var now = DateTime.UtcNow;
        var thirtyDaysAgo = now.AddDays(-30);
        var anomalies = new List<object>();

        var dailyVolumes = await _db.Transactions
            .Where(t => t.CreatedAt >= thirtyDaysAgo)
            .GroupBy(t => t.CreatedAt.Date)
            .Select(g => new { Date = g.Key, Count = g.Count(), Volume = g.Sum(t => t.Amount) })
            .ToListAsync();

        if (dailyVolumes.Count > 0)
        {
            var avgVolume = dailyVolumes.Average(d => (double)d.Volume);
            var stdDevVolume = Math.Sqrt(dailyVolumes.Average(d => Math.Pow((double)d.Volume - avgVolume, 2)));

            foreach (var day in dailyVolumes)
            {
                if ((double)day.Volume > avgVolume + 3 * stdDevVolume)
                    anomalies.Add(new { type = "volume_spike", date = day.Date.ToString("yyyy-MM-dd"), value = day.Volume, reason = "Transaction volume spike detected" });
                if ((double)day.Volume > 0 && (double)day.Volume < avgVolume - 2 * stdDevVolume)
                    anomalies.Add(new { type = "volume_drop", date = day.Date.ToString("yyyy-MM-dd"), value = day.Volume, reason = "Transaction volume drop detected" });
            }
        }

        var failedRate = await _db.Transactions
            .Where(t => t.CreatedAt >= thirtyDaysAgo)
            .GroupBy(t => t.CreatedAt.Date)
            .Select(g => new { Date = g.Key, Rate = (double)g.Count(t => t.Status == "failed") / g.Count() * 100 })
            .ToListAsync();

        foreach (var day in failedRate.Where(d => d.Rate > 10))
            anomalies.Add(new { type = "high_failure_rate", date = day.Date.ToString("yyyy-MM-dd"), value = $"{day.Rate:F1}%", reason = "Payment failure rate exceeded 10%" });

        return new { anomalies, totalAnomalies = anomalies.Count };
    }

    public async Task<List<object>> GetRecommendationsAsync()
    {
        var recommendations = new List<object>();
        var now = DateTime.UtcNow;
        var thirtyDaysAgo = now.AddDays(-30);

        var failedRate = await _db.Transactions
            .CountAsync(t => t.CreatedAt >= thirtyDaysAgo && t.Status == "failed");
        var totalCount = await _db.Transactions.CountAsync(t => t.CreatedAt >= thirtyDaysAgo);

        if (totalCount > 0 && (double)failedRate / totalCount * 100 > 5)
            recommendations.Add(new { priority = "high", category = "payment_processing", title = "Review Payment Gateways", description = "Failure rate is above 5%. Consider adding fallback gateways.", impact = "Increase success rate and revenue" });

        var kycPending = await _db.KycApplications.CountAsync(a => a.Status == "pending" || a.Status == "submitted");
        if (kycPending > 10)
            recommendations.Add(new { priority = "medium", category = "compliance", title = "Clear KYC Backlog", description = $"{kycPending} applications awaiting review.", impact = "Faster onboarding and reduced churn" });

        var lowConversionReferrals = await _db.Referrals.CountAsync(r => r.CreatedAt >= thirtyDaysAgo && r.Status == "clicked" && r.ConvertedAt == null);
        if (lowConversionReferrals > 20)
            recommendations.Add(new { priority = "medium", category = "affiliates", title = "Optimize Referral Funnel", description = $"{lowConversionReferrals} clicks without conversion. Review landing page.", impact = "Increase affiliate ROI" });

        recommendations.Add(new { priority = "low", category = "growth", title = "Expand Payment Methods", description = "Adding mobile money (M-Pesa, MTN MoMo) could increase African market reach.", impact = "Expand into new markets" });
        recommendations.Add(new { priority = "low", category = "engagement", title = "Reactivate Dormant Users", description = "Run a re-engagement campaign for users inactive > 90 days.", impact = "Improve retention and LTV" });

        return recommendations;
    }
}
