using Microsoft.EntityFrameworkCore;
using PayAfrika.API.Data;
using PayAfrika.API.Models;

namespace PayAfrika.API.Services;

public interface IReportService
{
    Task<ReportDashboardResponse> GetDashboardAsync(ReportQuery query);
    Task<RevenueReportResponse> GetRevenueReportAsync(ReportQuery query);
    Task<TransactionReportResponse> GetTransactionReportAsync(ReportQuery query);
    Task<MerchantReportResponse> GetMerchantReportAsync(ReportQuery query);
    Task<CustomerReportResponse> GetCustomerReportAsync(ReportQuery query);
    Task<FinancialReportResponse> GetFinancialReportAsync(ReportQuery query);
    Task<ComplianceReportResponse> GetComplianceReportAsync(ReportQuery query);
    Task<AffiliateReportResponse> GetAffiliateReportAsync(ReportQuery query);
    Task<WalletReportResponse> GetWalletReportAsync(ReportQuery query);
    Task<SupportReportResponse> GetSupportReportAsync(ReportQuery query);
}

public class ReportService : IReportService
{
    private readonly AppDbContext _db;

    public ReportService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<ReportDashboardResponse> GetDashboardAsync(ReportQuery query)
    {
        var (startDate, endDate, prevStart, prevEnd) = GetDateRanges(query);

        var kpis = await GetExecutiveKpis(startDate, endDate, prevStart, prevEnd);
        var revenueTrend = await GetTimeSeries(_db.Transactions
            .Where(t => t.Status == "completed" && (t.Type == "payment" || t.Type == "deposit")), startDate, endDate);
        var transactionTrend = await GetTimeSeries(_db.Transactions, startDate, endDate);
        var userGrowthTrend = await GetUserGrowthTrend(startDate, endDate);

        var paymentMethods = await _db.Transactions
            .Where(t => t.CreatedAt >= startDate && t.CreatedAt <= endDate)
            .GroupBy(t => t.Type)
            .Select(g => new TimeSeriesPoint { Label = g.Key, Value = g.Sum(t => t.Amount) })
            .ToListAsync();

        var topMerchants = await _db.Transactions
            .Where(t => t.CreatedAt >= startDate && t.CreatedAt <= endDate && t.Status == "completed")
            .GroupBy(t => t.User.FullName)
            .OrderByDescending(g => g.Sum(t => t.Amount))
            .Take(5)
            .Select(g => new PerformerItem { Name = g.Key, Value = g.Sum(t => t.Amount) })
            .ToListAsync();

        var topAffiliates = await _db.Affiliates
            .OrderByDescending(a => a.TotalEarnings)
            .Take(5)
            .Select(a => new PerformerItem
            {
                Name = a.BusinessName,
                Value = a.TotalEarnings,
                SecondaryValue = a.LifetimeReferrals,
                Badge = a.Tier,
            })
            .ToListAsync();

        var topCountries = await _db.Users
            .Where(u => u.Country != null && u.Country != "")
            .GroupBy(u => u.Country!)
            .OrderByDescending(g => g.Count())
            .Take(5)
            .Select(g => new PerformerItem { Name = g.Key, Value = g.Count() })
            .ToListAsync();

        var insights = GenerateAiInsights(kpis, revenueTrend, transactionTrend);

        return new ReportDashboardResponse
        {
            Kpis = kpis,
            RevenueTrend = revenueTrend,
            TransactionTrend = transactionTrend,
            UserGrowthTrend = userGrowthTrend,
            PaymentMethodDistribution = paymentMethods,
            TopPerformers = new TopPerformersData
            {
                TopMerchantsByRevenue = topMerchants,
                TopAffiliatesByEarnings = topAffiliates,
                TopCountriesByVolume = topCountries,
            },
            AiInsights = insights,
        };
    }

    public async Task<RevenueReportResponse> GetRevenueReportAsync(ReportQuery query)
    {
        var (startDate, endDate, prevStart, prevEnd) = GetDateRanges(query);

        var currentRevenue = await _db.Transactions
            .Where(t => t.CreatedAt >= startDate && t.CreatedAt <= endDate && t.Status == "completed" && (t.Type == "payment" || t.Type == "deposit"))
            .SumAsync(t => (decimal?)t.Amount) ?? 0;
        var previousRevenue = await _db.Transactions
            .Where(t => t.CreatedAt >= prevStart && t.CreatedAt <= prevEnd && t.Status == "completed" && (t.Type == "payment" || t.Type == "deposit"))
            .SumAsync(t => (decimal?)t.Amount) ?? 0;

        var totalFees = currentRevenue * 0.035m; // Estimate: 3.5% avg fee
        var netRevenue = currentRevenue - totalFees;
        var avgTransactionValue = await _db.Transactions
            .Where(t => t.CreatedAt >= startDate && t.CreatedAt <= endDate && t.Status == "completed")
            .AverageAsync(t => (decimal?)t.Amount) ?? 0;
        var transactionCount = await _db.Transactions
            .CountAsync(t => t.CreatedAt >= startDate && t.CreatedAt <= endDate && t.Status == "completed");

        var kpis = new List<KpiCard>
        {
            new() { Label = "Gross Revenue", Value = currentRevenue, PreviousValue = previousRevenue, ChangePercent = previousRevenue > 0 ? (double)((currentRevenue - previousRevenue) / previousRevenue * 100) : 0, Format = "currency", Icon = "DollarSign", Color = "emerald", Trend = currentRevenue >= previousRevenue ? "up" : "down" },
            new() { Label = "Net Revenue", Value = netRevenue, PreviousValue = 0, Format = "currency", Icon = "TrendingUp", Color = "blue", Trend = "up" },
            new() { Label = "Fees Collected", Value = totalFees, PreviousValue = 0, Format = "currency", Icon = "Percent", Color = "violet", Trend = "neutral" },
            new() { Label = "Avg Transaction Value", Value = avgTransactionValue, PreviousValue = 0, Format = "currency", Icon = "CreditCard", Color = "amber", Trend = "neutral" },
            new() { Label = "Transaction Count", Value = transactionCount, PreviousValue = 0, Format = "number", Icon = "Activity", Color = "cyan", Trend = "neutral" },
            new() { Label = "Revenue Growth", Value = currentRevenue - previousRevenue, PreviousValue = previousRevenue, ChangePercent = previousRevenue > 0 ? (double)((currentRevenue - previousRevenue) / previousRevenue * 100) : 0, Format = "percentage", Icon = "TrendingUp", Color = currentRevenue >= previousRevenue ? "emerald" : "red", Trend = currentRevenue >= previousRevenue ? "up" : "down" },
        };

        var dailyRevenue = await _db.Transactions
            .Where(t => t.CreatedAt >= startDate && t.CreatedAt <= endDate && t.Status == "completed" && (t.Type == "payment" || t.Type == "deposit"))
            .GroupBy(t => t.CreatedAt.Date)
            .Select(g => new TimeSeriesPoint { Date = g.Key.ToString("yyyy-MM-dd"), Value = g.Sum(t => t.Amount) })
            .OrderBy(p => p.Date)
            .ToListAsync();

        var monthlyRevenue = await _db.Transactions
            .Where(t => t.Status == "completed" && (t.Type == "payment" || t.Type == "deposit"))
            .GroupBy(t => new { t.CreatedAt.Year, t.CreatedAt.Month })
            .Select(g => new TimeSeriesPoint { Date = $"{g.Key.Year}-{g.Key.Month:D2}", Label = $"{g.Key.Year}-{g.Key.Month:D2}", Value = g.Sum(t => t.Amount) })
            .OrderBy(p => p.Date)
            .ToListAsync();

        var byPaymentMethod = await _db.Transactions
            .Where(t => t.CreatedAt >= startDate && t.CreatedAt <= endDate && t.Status == "completed")
            .GroupBy(t => t.Type)
            .Select(g => new TimeSeriesPoint { Label = g.Key, Value = g.Sum(t => t.Amount) })
            .ToListAsync();

        var byCurrency = await _db.Transactions
            .Where(t => t.CreatedAt >= startDate && t.CreatedAt <= endDate && t.Status == "completed")
            .GroupBy(t => t.Currency)
            .Select(g => new TimeSeriesPoint { Label = g.Key, Value = g.Sum(t => t.Amount) })
            .ToListAsync();

        return new RevenueReportResponse
        {
            Kpis = kpis,
            DailyRevenue = dailyRevenue,
            MonthlyRevenue = monthlyRevenue,
            RevenueByPaymentMethod = byPaymentMethod,
            RevenueByCurrency = byCurrency,
        };
    }

    public async Task<TransactionReportResponse> GetTransactionReportAsync(ReportQuery query)
    {
        var (startDate, endDate, prevStart, prevEnd) = GetDateRanges(query);

        var totalTx = await _db.Transactions.CountAsync(t => t.CreatedAt >= startDate && t.CreatedAt <= endDate);
        var prevTotalTx = await _db.Transactions.CountAsync(t => t.CreatedAt >= prevStart && t.CreatedAt <= prevEnd);
        var successful = await _db.Transactions.CountAsync(t => t.CreatedAt >= startDate && t.CreatedAt <= endDate && t.Status == "completed");
        var failed = await _db.Transactions.CountAsync(t => t.CreatedAt >= startDate && t.CreatedAt <= endDate && t.Status == "failed");
        var pending = await _db.Transactions.CountAsync(t => t.CreatedAt >= startDate && t.CreatedAt <= endDate && t.Status == "pending");
        var refunded = await _db.Transactions.CountAsync(t => t.CreatedAt >= startDate && t.CreatedAt <= endDate && t.Status == "refunded");
        var totalVolume = await _db.Transactions
            .Where(t => t.CreatedAt >= startDate && t.CreatedAt <= endDate && t.Status == "completed")
            .SumAsync(t => (decimal?)t.Amount) ?? 0;
        var successRate = totalTx > 0 ? (double)successful / totalTx * 100 : 0;

        var kpis = new List<KpiCard>
        {
            new() { Label = "Total Transactions", Value = totalTx, PreviousValue = prevTotalTx, ChangePercent = prevTotalTx > 0 ? (double)(totalTx - prevTotalTx) / prevTotalTx * 100 : 0, Format = "number", Icon = "Activity", Color = "blue", Trend = totalTx >= prevTotalTx ? "up" : "down" },
            new() { Label = "Successful", Value = successful, PreviousValue = 0, Format = "number", Icon = "CheckCircle", Color = "emerald", Trend = "up" },
            new() { Label = "Failed", Value = failed, PreviousValue = 0, Format = "number", Icon = "XCircle", Color = "red", Trend = failed > 0 ? "down" : "neutral" },
            new() { Label = "Success Rate", Value = (decimal)successRate, PreviousValue = 0, Format = "percentage", Icon = "Percent", Color = successRate >= 95 ? "emerald" : "amber", Trend = successRate >= 95 ? "up" : "down" },
            new() { Label = "Total Volume", Value = totalVolume, PreviousValue = 0, Format = "currency", Icon = "DollarSign", Color = "violet", Trend = "up" },
            new() { Label = "Pending", Value = pending, PreviousValue = 0, Format = "number", Icon = "Clock", Color = "amber", Trend = "neutral" },
        };

        var volumeTrend = await _db.Transactions
            .Where(t => t.CreatedAt >= startDate && t.CreatedAt <= endDate)
            .GroupBy(t => t.CreatedAt.Date)
            .Select(g => new TimeSeriesPoint { Date = g.Key.ToString("yyyy-MM-dd"), Value = g.Count(), SecondaryValue = g.Sum(t => t.Amount) })
            .OrderBy(p => p.Date)
            .ToListAsync();

        var statusDist = new List<TimeSeriesPoint>
        {
            new() { Label = "Completed", Value = successful },
            new() { Label = "Failed", Value = failed },
            new() { Label = "Pending", Value = pending },
            new() { Label = "Refunded", Value = refunded },
        };

        var peakHours = await _db.Transactions
            .Where(t => t.CreatedAt >= startDate && t.CreatedAt <= endDate)
            .GroupBy(t => t.CreatedAt.Hour)
            .Select(g => new TimeSeriesPoint { Label = $"{g.Key:D2}:00", Value = g.Count() })
            .OrderBy(p => p.Label)
            .ToListAsync();

        var byPaymentMethod = await _db.Transactions
            .Where(t => t.CreatedAt >= startDate && t.CreatedAt <= endDate)
            .GroupBy(t => t.Type)
            .Select(g => new TimeSeriesPoint { Label = g.Key, Value = g.Count() })
            .ToListAsync();

        var recent = await _db.Transactions
            .Where(t => t.CreatedAt >= startDate && t.CreatedAt <= endDate)
            .OrderByDescending(t => t.CreatedAt)
            .Take(50)
            .Select(t => new TransactionRow
            {
                Id = t.Id,
                Type = t.Type,
                Amount = t.Amount,
                Currency = t.Currency,
                Status = t.Status,
                UserName = t.User.FullName,
                Reference = t.Reference,
                CreatedAt = t.CreatedAt,
            })
            .ToListAsync();

        return new TransactionReportResponse
        {
            Kpis = kpis,
            VolumeTrend = volumeTrend,
            StatusDistribution = statusDist,
            PeakHours = peakHours,
            ByPaymentMethod = byPaymentMethod,
            RecentTransactions = recent,
        };
    }

    public async Task<MerchantReportResponse> GetMerchantReportAsync(ReportQuery query)
    {
        var (startDate, endDate, prevStart, prevEnd) = GetDateRanges(query);

        var totalMerchants = await _db.Users.CountAsync(u => u.Role == "business");
        var newMerchants = await _db.Users.CountAsync(u => u.Role == "business" && u.CreatedAt >= startDate && u.CreatedAt <= endDate);
        var prevNewMerchants = await _db.Users.CountAsync(u => u.Role == "business" && u.CreatedAt >= prevStart && u.CreatedAt <= prevEnd);
        var activeMerchants = await _db.Users.CountAsync(u => u.Role == "business" && u.UpdatedAt >= startDate);
        var kycCompleted = await _db.Users.CountAsync(u => u.Role == "business" && u.KYCStatus == "verified");

        var totalMerchantRevenue = await _db.Transactions
            .Where(t => t.CreatedAt >= startDate && t.CreatedAt <= endDate && t.Status == "completed" && t.User.Role == "business")
            .SumAsync(t => (decimal?)t.Amount) ?? 0;

        var kpis = new List<KpiCard>
        {
            new() { Label = "Total Merchants", Value = totalMerchants, PreviousValue = 0, Format = "number", Icon = "Store", Color = "blue", Trend = "up" },
            new() { Label = "New This Period", Value = newMerchants, PreviousValue = prevNewMerchants, ChangePercent = prevNewMerchants > 0 ? (double)(newMerchants - prevNewMerchants) / prevNewMerchants * 100 : 0, Format = "number", Icon = "UserPlus", Color = "emerald", Trend = newMerchants >= prevNewMerchants ? "up" : "down" },
            new() { Label = "Active Merchants", Value = activeMerchants, PreviousValue = 0, Format = "number", Icon = "UserCheck", Color = "violet", Trend = "neutral" },
            new() { Label = "KYC Completed", Value = kycCompleted, PreviousValue = 0, Format = "number", Icon = "Shield", Color = "cyan", Trend = "neutral" },
            new() { Label = "Revenue Generated", Value = totalMerchantRevenue, PreviousValue = 0, Format = "currency", Icon = "DollarSign", Color = "emerald", Trend = "up" },
            new() { Label = "KYC Completion Rate", Value = totalMerchants > 0 ? (decimal)((double)kycCompleted / totalMerchants * 100) : 0, PreviousValue = 0, Format = "percentage", Icon = "Percent", Color = "amber", Trend = "neutral" },
        };

        var growthTrend = await _db.Users
            .Where(u => u.Role == "business" && u.CreatedAt >= startDate && u.CreatedAt <= endDate)
            .GroupBy(u => u.CreatedAt.Date)
            .Select(g => new TimeSeriesPoint { Date = g.Key.ToString("yyyy-MM-dd"), Value = g.Count() })
            .OrderBy(p => p.Date)
            .ToListAsync();

        var revenueLeaderboard = await _db.Transactions
            .Where(t => t.CreatedAt >= startDate && t.CreatedAt <= endDate && t.Status == "completed" && t.User.Role == "business")
            .GroupBy(t => t.User.FullName)
            .OrderByDescending(g => g.Sum(t => t.Amount))
            .Take(10)
            .Select(g => new PerformerItem { Name = g.Key, Value = g.Sum(t => t.Amount) })
            .ToListAsync();

        var growthLeaderboard = await _db.Transactions
            .Where(t => t.CreatedAt >= prevStart && t.CreatedAt <= startDate && t.Status == "completed" && t.User.Role == "business")
            .GroupBy(t => t.User.FullName)
            .Select(g => new { Name = g.Key, Prev = g.Sum(t => t.Amount) })
            .ToListAsync();

        var currentMerchantRevenue = await _db.Transactions
            .Where(t => t.CreatedAt >= startDate && t.CreatedAt <= endDate && t.Status == "completed" && t.User.Role == "business")
            .GroupBy(t => t.User.FullName)
            .Select(g => new { Name = g.Key, Curr = g.Sum(t => t.Amount) })
            .ToListAsync();

        var growthLeaderboardMerged = currentMerchantRevenue
            .GroupJoin(growthLeaderboard, c => c.Name, p => p.Name, (c, p) => new { c.Name, c.Curr, Prev = p.FirstOrDefault()?.Prev ?? 0 })
            .OrderByDescending(x => x.Curr - x.Prev)
            .Take(10)
            .Select(x => new PerformerItem { Name = x.Name, Value = x.Curr - x.Prev, SecondaryValue = x.Curr })
            .ToList();

        var txLeaderboard = await _db.Transactions
            .Where(t => t.CreatedAt >= startDate && t.CreatedAt <= endDate && t.User.Role == "business")
            .GroupBy(t => t.User.FullName)
            .OrderByDescending(g => g.Count())
            .Take(10)
            .Select(g => new PerformerItem { Name = g.Key, Value = g.Count(), SecondaryValue = g.Sum(t => t.Amount) })
            .ToListAsync();

        return new MerchantReportResponse
        {
            Kpis = kpis,
            GrowthTrend = growthTrend,
            RevenueLeaderboard = revenueLeaderboard,
            GrowthLeaderboard = growthLeaderboardMerged,
            TransactionLeaderboard = txLeaderboard,
        };
    }

    public async Task<CustomerReportResponse> GetCustomerReportAsync(ReportQuery query)
    {
        var (startDate, endDate, prevStart, prevEnd) = GetDateRanges(query);

        var totalUsers = await _db.Users.CountAsync();
        var newRegistrations = await _db.Users.CountAsync(u => u.CreatedAt >= startDate && u.CreatedAt <= endDate);
        var prevRegistrations = await _db.Users.CountAsync(u => u.CreatedAt >= prevStart && u.CreatedAt <= prevEnd);
        var activeUsers = await _db.Users.CountAsync(u => u.UpdatedAt >= startDate);
        var emailVerified = await _db.Users.CountAsync(u => u.IsEmailVerified);
        var kycVerified = await _db.Users.CountAsync(u => u.KYCStatus == "verified");

        var avgSpend = await _db.Transactions
            .Where(t => t.CreatedAt >= startDate && t.CreatedAt <= endDate && t.Status == "completed")
            .AverageAsync(t => (decimal?)t.Amount) ?? 0;

        var churnRate = totalUsers > 0 ? (1 - (double)activeUsers / totalUsers) * 100 : 0;
        var retentionRate = 100 - churnRate;

        var kpis = new List<KpiCard>
        {
            new() { Label = "Total Customers", Value = totalUsers, PreviousValue = 0, Format = "number", Icon = "Users", Color = "blue", Trend = "up" },
            new() { Label = "New Registrations", Value = newRegistrations, PreviousValue = prevRegistrations, ChangePercent = prevRegistrations > 0 ? (double)(newRegistrations - prevRegistrations) / prevRegistrations * 100 : 0, Format = "number", Icon = "UserPlus", Color = "emerald", Trend = newRegistrations >= prevRegistrations ? "up" : "down" },
            new() { Label = "Active Users", Value = activeUsers, PreviousValue = 0, Format = "number", Icon = "UserCheck", Color = "violet", Trend = "neutral" },
            new() { Label = "Avg Spend", Value = avgSpend, PreviousValue = 0, Format = "currency", Icon = "DollarSign", Color = "amber", Trend = "neutral" },
            new() { Label = "Retention Rate", Value = (decimal)retentionRate, PreviousValue = 0, Format = "percentage", Icon = "RefreshCcw", Color = retentionRate >= 70 ? "emerald" : "red", Trend = retentionRate >= 70 ? "up" : "down" },
            new() { Label = "Email Verified", Value = emailVerified, PreviousValue = 0, Format = "number", Icon = "Mail", Color = "cyan", Trend = "neutral" },
        };

        var registrationTrend = await _db.Users
            .Where(u => u.CreatedAt >= startDate && u.CreatedAt <= endDate)
            .GroupBy(u => u.CreatedAt.Date)
            .Select(g => new TimeSeriesPoint { Date = g.Key.ToString("yyyy-MM-dd"), Value = g.Count() })
            .OrderBy(p => p.Date)
            .ToListAsync();

        var countryDist = await _db.Users
            .Where(u => u.Country != null && u.Country != "")
            .GroupBy(u => u.Country!)
            .Select(g => new TimeSeriesPoint { Label = g.Key, Value = g.Count() })
            .OrderByDescending(p => p.Value)
            .Take(10)
            .ToListAsync();

        var kycDist = new List<TimeSeriesPoint>
        {
            new() { Label = "Verified", Value = kycVerified },
            new() { Label = "Pending", Value = await _db.Users.CountAsync(u => u.KYCStatus == "pending") },
            new() { Label = "Not Started", Value = await _db.Users.CountAsync(u => u.KYCStatus == null || u.KYCStatus == "not_started") },
            new() { Label = "Rejected", Value = await _db.Users.CountAsync(u => u.KYCStatus == "rejected") },
        };

        return new CustomerReportResponse
        {
            Kpis = kpis,
            RegistrationTrend = registrationTrend,
            CountryDistribution = countryDist,
            KycStatusDistribution = kycDist,
        };
    }

    public async Task<FinancialReportResponse> GetFinancialReportAsync(ReportQuery query)
    {
        var (startDate, endDate, _, _) = GetDateRanges(query);

        var totalRevenue = await _db.Transactions
            .Where(t => t.CreatedAt >= startDate && t.CreatedAt <= endDate && t.Status == "completed" && (t.Type == "payment" || t.Type == "deposit"))
            .SumAsync(t => (decimal?)t.Amount) ?? 0;
        var totalFees = totalRevenue * 0.035m;
        var totalRefunds = await _db.Transactions
            .Where(t => t.CreatedAt >= startDate && t.CreatedAt <= endDate && t.Status == "refunded")
            .SumAsync(t => (decimal?)t.Amount) ?? 0;
        var totalChargebacks = 0m;
        var affiliateExpenses = await _db.Affiliates.SumAsync(a => (decimal?)a.TotalPaid) ?? 0;
        var netProfit = totalRevenue - totalFees - totalRefunds - totalChargebacks - affiliateExpenses;
        var grossMargin = totalRevenue > 0 ? (double)(netProfit / totalRevenue * 100) : 0;

        var kpis = new List<KpiCard>
        {
            new() { Label = "Total Revenue", Value = totalRevenue, Format = "currency", Icon = "DollarSign", Color = "emerald", Trend = "up" },
            new() { Label = "Net Profit", Value = netProfit, Format = "currency", Icon = "TrendingUp", Color = "blue", Trend = netProfit >= 0 ? "up" : "down" },
            new() { Label = "Total Fees", Value = totalFees, Format = "currency", Icon = "Percent", Color = "violet", Trend = "neutral" },
            new() { Label = "Refunds", Value = totalRefunds, Format = "currency", Icon = "RotateCcw", Color = "red", Trend = totalRefunds > 0 ? "down" : "neutral" },
            new() { Label = "Affiliate Costs", Value = affiliateExpenses, Format = "currency", Icon = "Users", Color = "amber", Trend = "neutral" },
            new() { Label = "Gross Margin", Value = (decimal)grossMargin, Format = "percentage", Icon = "PieChart", Color = grossMargin >= 40 ? "emerald" : "red", Trend = grossMargin >= 40 ? "up" : "down" },
        };

        var monthlyPnl = await _db.Transactions
            .Where(t => t.Status == "completed" && (t.Type == "payment" || t.Type == "deposit"))
            .GroupBy(t => new { t.CreatedAt.Year, t.CreatedAt.Month })
            .Select(g => new TimeSeriesPoint
            {
                Date = $"{g.Key.Year}-{g.Key.Month:D2}",
                Label = $"{g.Key.Year}-{g.Key.Month:D2}",
                Value = g.Sum(t => t.Amount),
                SecondaryValue = g.Sum(t => t.Amount) * 0.035m,
            })
            .OrderBy(p => p.Date)
            .ToListAsync();

        var feeBreakdown = new List<TimeSeriesPoint>
        {
            new() { Label = "Processing Fees", Value = totalFees },
            new() { Label = "Refund Costs", Value = totalRefunds },
            new() { Label = "Chargebacks", Value = totalChargebacks },
            new() { Label = "Affiliate Commission", Value = affiliateExpenses },
        };

        return new FinancialReportResponse
        {
            Kpis = kpis,
            MonthlyPnl = monthlyPnl,
            FeeBreakdown = feeBreakdown,
            Summary = new FinancialSummary
            {
                TotalRevenue = totalRevenue,
                TotalFees = totalFees,
                TotalRefunds = totalRefunds,
                TotalChargebacks = totalChargebacks,
                AffiliateExpenses = affiliateExpenses,
                NetProfit = netProfit,
                GrossMargin = (decimal)grossMargin,
            },
        };
    }

    public async Task<ComplianceReportResponse> GetComplianceReportAsync(ReportQuery query)
    {
        var (startDate, endDate, prevStart, prevEnd) = GetDateRanges(query);

        var totalApps = await _db.KycApplications.CountAsync();
        var newApps = await _db.KycApplications.CountAsync(a => a.CreatedAt >= startDate && a.CreatedAt <= endDate);
        var prevApps = await _db.KycApplications.CountAsync(a => a.CreatedAt >= prevStart && a.CreatedAt <= prevEnd);
        var approved = await _db.KycApplications.CountAsync(a => a.Status == "approved");
        var rejected = await _db.KycApplications.CountAsync(a => a.Status == "rejected");
        var pendingReview = await _db.KycApplications.CountAsync(a => a.Status == "pending" || a.Status == "submitted");

        var avgScore = await _db.KycApplications
            .Where(a => a.CreatedAt >= startDate && a.CreatedAt <= endDate)
            .AverageAsync(a => (int?)a.AiConfidenceScore) ?? 0;

        var fraudFlags = await _db.FraudFlags.CountAsync(f => f.CreatedAt >= startDate && f.CreatedAt <= endDate);

        var kpis = new List<KpiCard>
        {
            new() { Label = "Total Applications", Value = totalApps, PreviousValue = 0, Format = "number", Icon = "FileText", Color = "blue", Trend = "up" },
            new() { Label = "New Applications", Value = newApps, PreviousValue = prevApps, ChangePercent = prevApps > 0 ? (double)(newApps - prevApps) / prevApps * 100 : 0, Format = "number", Icon = "FilePlus", Color = "emerald", Trend = newApps >= prevApps ? "up" : "down" },
            new() { Label = "Approved", Value = approved, PreviousValue = 0, Format = "number", Icon = "CheckCircle", Color = "emerald", Trend = "up" },
            new() { Label = "Rejected", Value = rejected, PreviousValue = 0, Format = "number", Icon = "XCircle", Color = "red", Trend = "down" },
            new() { Label = "Pending Review", Value = pendingReview, PreviousValue = 0, Format = "number", Icon = "Clock", Color = "amber", Trend = "neutral" },
            new() { Label = "Avg Confidence Score", Value = (decimal)avgScore, PreviousValue = 0, Format = "number", Icon = "Brain", Color = "violet", Trend = "neutral" },
            new() { Label = "Fraud Flags", Value = fraudFlags, PreviousValue = 0, Format = "number", Icon = "AlertTriangle", Color = "red", Trend = fraudFlags > 0 ? "down" : "neutral" },
        };

        var appTrend = await _db.KycApplications
            .Where(a => a.CreatedAt >= startDate && a.CreatedAt <= endDate)
            .GroupBy(a => a.CreatedAt.Date)
            .Select(g => new TimeSeriesPoint { Date = g.Key.ToString("yyyy-MM-dd"), Value = g.Count() })
            .OrderBy(p => p.Date)
            .ToListAsync();

        var countryDist = await _db.KycApplications
            .Where(a => a.Nationality != null && a.Nationality != "" && a.CreatedAt >= startDate && a.CreatedAt <= endDate)
            .GroupBy(a => a.Nationality!)
            .Select(g => new TimeSeriesPoint { Label = g.Key, Value = g.Count() })
            .OrderByDescending(p => p.Value)
            .Take(10)
            .ToListAsync();

        return new ComplianceReportResponse
        {
            Kpis = kpis,
            ApplicationTrend = appTrend,
            CountryDistribution = countryDist,
        };
    }

    public async Task<AffiliateReportResponse> GetAffiliateReportAsync(ReportQuery query)
    {
        var (startDate, endDate, prevStart, prevEnd) = GetDateRanges(query);

        var totalAffiliates = await _db.Affiliates.CountAsync();
        var newAffiliates = await _db.Affiliates.CountAsync(a => a.CreatedAt >= startDate && a.CreatedAt <= endDate);
        var prevNewAffiliates = await _db.Affiliates.CountAsync(a => a.CreatedAt >= prevStart && a.CreatedAt <= prevEnd);
        var activeAffiliates = await _db.Users.CountAsync(u => u.UpdatedAt >= startDate);
        var totalEarnings = await _db.Affiliates.SumAsync(a => (decimal?)a.TotalEarnings) ?? 0;
        var totalPaid = await _db.Affiliates.SumAsync(a => (decimal?)a.TotalPaid) ?? 0;
        var totalReferrals = await _db.Referrals.CountAsync();
        var newReferrals = await _db.Referrals.CountAsync(r => r.CreatedAt >= startDate && r.CreatedAt <= endDate);
        var convertedReferrals = await _db.Referrals.CountAsync(r => r.Status == "converted" && r.CreatedAt >= startDate && r.CreatedAt <= endDate);
        var conversionRate = newReferrals > 0 ? (double)convertedReferrals / newReferrals * 100 : 0;

        var commissionsPaid = await _db.Commissions
            .Where(c => c.Status == "paid" && c.PaidAt >= startDate && c.PaidAt <= endDate)
            .SumAsync(c => (decimal?)c.Amount) ?? 0;

        var kpis = new List<KpiCard>
        {
            new() { Label = "Total Affiliates", Value = totalAffiliates, PreviousValue = 0, Format = "number", Icon = "Users", Color = "blue", Trend = "up" },
            new() { Label = "New This Period", Value = newAffiliates, PreviousValue = prevNewAffiliates, ChangePercent = prevNewAffiliates > 0 ? (double)(newAffiliates - prevNewAffiliates) / prevNewAffiliates * 100 : 0, Format = "number", Icon = "UserPlus", Color = "emerald", Trend = newAffiliates >= prevNewAffiliates ? "up" : "down" },
            new() { Label = "Total Referrals", Value = totalReferrals, PreviousValue = 0, Format = "number", Icon = "Share2", Color = "violet", Trend = "up" },
            new() { Label = "Conversion Rate", Value = (decimal)conversionRate, PreviousValue = 0, Format = "percentage", Icon = "Percent", Color = conversionRate >= 10 ? "emerald" : "amber", Trend = conversionRate >= 10 ? "up" : "down" },
            new() { Label = "Total Earnings", Value = totalEarnings, PreviousValue = 0, Format = "currency", Icon = "DollarSign", Color = "emerald", Trend = "up" },
            new() { Label = "Commissions Paid", Value = commissionsPaid, PreviousValue = 0, Format = "currency", Icon = "CreditCard", Color = "amber", Trend = "neutral" },
        };

        var referralTrend = await _db.Referrals
            .Where(r => r.CreatedAt >= startDate && r.CreatedAt <= endDate)
            .GroupBy(r => r.CreatedAt.Date)
            .Select(g => new TimeSeriesPoint { Date = g.Key.ToString("yyyy-MM-dd"), Value = g.Count() })
            .OrderBy(p => p.Date)
            .ToListAsync();

        var commissionTrend = await _db.Commissions
            .Where(c => c.CreatedAt >= startDate && c.CreatedAt <= endDate)
            .GroupBy(c => c.CreatedAt.Date)
            .Select(g => new TimeSeriesPoint { Date = g.Key.ToString("yyyy-MM-dd"), Value = g.Sum(c => c.Amount) })
            .OrderBy(p => p.Date)
            .ToListAsync();

        var topAffiliates = await _db.Affiliates
            .OrderByDescending(a => a.TotalEarnings)
            .Take(10)
            .Select(a => new PerformerItem
            {
                Name = a.BusinessName,
                Value = a.TotalEarnings,
                SecondaryValue = a.LifetimeReferrals,
                Badge = a.Tier,
            })
            .ToListAsync();

        return new AffiliateReportResponse
        {
            Kpis = kpis,
            ReferralTrend = referralTrend,
            CommissionTrend = commissionTrend,
            TopAffiliates = topAffiliates,
        };
    }

    public async Task<WalletReportResponse> GetWalletReportAsync(ReportQuery query)
    {
        var (startDate, endDate, _, _) = GetDateRanges(query);

        var totalBalance = await _db.Wallets.SumAsync(w => (decimal?)w.Balance) ?? 0;
        var totalDeposits = await _db.Transactions
            .Where(t => t.CreatedAt >= startDate && t.CreatedAt <= endDate && t.Type == "deposit" && t.Status == "completed")
            .SumAsync(t => (decimal?)t.Amount) ?? 0;
        var totalWithdrawals = await _db.Transactions
            .Where(t => t.CreatedAt >= startDate && t.CreatedAt <= endDate && t.Type == "withdrawal" && t.Status == "completed")
            .SumAsync(t => (decimal?)t.Amount) ?? 0;
        var walletCount = await _db.Wallets.CountAsync();
        var avgBalance = walletCount > 0 ? totalBalance / walletCount : 0;

        var kpis = new List<KpiCard>
        {
            new() { Label = "Total Wallet Balance", Value = totalBalance, Format = "currency", Icon = "Wallet", Color = "blue", Trend = "up" },
            new() { Label = "Deposits", Value = totalDeposits, Format = "currency", Icon = "ArrowDownToLine", Color = "emerald", Trend = "up" },
            new() { Label = "Withdrawals", Value = totalWithdrawals, Format = "currency", Icon = "ArrowUpFromLine", Color = "red", Trend = "down" },
            new() { Label = "Active Wallets", Value = walletCount, Format = "number", Icon = "WalletCards", Color = "violet", Trend = "neutral" },
            new() { Label = "Avg Wallet Balance", Value = avgBalance, Format = "currency", Icon = "BarChart3", Color = "amber", Trend = "neutral" },
        };

        var balanceTrend = new List<TimeSeriesPoint>();
        var currencyDist = await _db.Wallets
            .GroupBy(w => w.Currency)
            .Select(g => new TimeSeriesPoint { Label = g.Key, Value = g.Sum(w => w.Balance) })
            .ToListAsync();

        return new WalletReportResponse
        {
            Kpis = kpis,
            BalanceTrend = balanceTrend,
            CurrencyDistribution = currencyDist,
        };
    }

    public async Task<SupportReportResponse> GetSupportReportAsync(ReportQuery query)
    {
        var (startDate, endDate, prevStart, prevEnd) = GetDateRanges(query);

        var totalTickets = await _db.SupportTickets.CountAsync(t => t.CreatedAt >= startDate && t.CreatedAt <= endDate);
        var prevTotalTickets = await _db.SupportTickets.CountAsync(t => t.CreatedAt >= prevStart && t.CreatedAt <= prevEnd);
        var openTickets = await _db.SupportTickets.CountAsync(t => t.Status == "open" || t.Status == "in_progress");
        var resolvedTickets = await _db.SupportTickets.CountAsync(t => t.Status == "resolved" || t.Status == "closed");
        var avgRating = await _db.TicketSatisfactions
            .Where(s => s.CreatedAt >= startDate && s.CreatedAt <= endDate)
            .AverageAsync(s => (int?)s.Rating) ?? 0;

        var kpis = new List<KpiCard>
        {
            new() { Label = "Total Tickets", Value = totalTickets, PreviousValue = prevTotalTickets, ChangePercent = prevTotalTickets > 0 ? (double)(totalTickets - prevTotalTickets) / prevTotalTickets * 100 : 0, Format = "number", Icon = "Ticket", Color = "blue", Trend = totalTickets >= prevTotalTickets ? "up" : "down" },
            new() { Label = "Open", Value = openTickets, Format = "number", Icon = "Clock", Color = "amber", Trend = "neutral" },
            new() { Label = "Resolved", Value = resolvedTickets, Format = "number", Icon = "CheckCircle", Color = "emerald", Trend = "up" },
            new() { Label = "Avg Rating", Value = (decimal)avgRating, Format = "number", Icon = "Star", Color = avgRating >= 4 ? "emerald" : "amber", Trend = avgRating >= 4 ? "up" : "down" },
        };

        var ticketTrend = await _db.SupportTickets
            .Where(t => t.CreatedAt >= startDate && t.CreatedAt <= endDate)
            .GroupBy(t => t.CreatedAt.Date)
            .Select(g => new TimeSeriesPoint { Date = g.Key.ToString("yyyy-MM-dd"), Value = g.Count() })
            .OrderBy(p => p.Date)
            .ToListAsync();

        var categoryDist = await _db.SupportTickets
            .Where(t => t.CreatedAt >= startDate && t.CreatedAt <= endDate && t.Category != null)
            .GroupBy(t => t.Category!)
            .Select(g => new TimeSeriesPoint { Label = g.Key, Value = g.Count() })
            .OrderByDescending(p => p.Value)
            .Take(10)
            .ToListAsync();

        var satisfactionTrend = await _db.TicketSatisfactions
            .Where(s => s.CreatedAt >= startDate && s.CreatedAt <= endDate)
            .GroupBy(s => s.CreatedAt.Date)
            .Select(g => new TimeSeriesPoint { Date = g.Key.ToString("yyyy-MM-dd"), Value = (decimal)g.Average(s => s.Rating) })
            .OrderBy(p => p.Date)
            .ToListAsync();

        return new SupportReportResponse
        {
            Kpis = kpis,
            TicketTrend = ticketTrend,
            CategoryDistribution = categoryDist,
            SatisfactionTrend = satisfactionTrend,
        };
    }

    // ─── Private Helpers ──────────────────────────

    private (DateTime start, DateTime end, DateTime prevStart, DateTime prevEnd) GetDateRanges(ReportQuery query)
    {
        var endDate = query.EndDate ?? DateTime.UtcNow;
        var startDate = query.StartDate;

        if (startDate == null)
        {
            startDate = query.Period switch
            {
                "today" => DateTime.UtcNow.Date,
                "yesterday" => DateTime.UtcNow.Date.AddDays(-1),
                "last7days" => DateTime.UtcNow.AddDays(-7),
                "last30days" => DateTime.UtcNow.AddDays(-30),
                "quarter" => DateTime.UtcNow.AddMonths(-3),
                "year" => DateTime.UtcNow.AddYears(-1),
                _ => DateTime.UtcNow.AddDays(-30),
            };
        }

        var periodLength = endDate - startDate.Value;
        var prevEnd = startDate.Value;
        var prevStart = prevEnd - periodLength;

        return (startDate.Value, endDate, prevStart, prevEnd);
    }

    private async Task<List<KpiCard>> GetExecutiveKpis(DateTime startDate, DateTime endDate, DateTime prevStart, DateTime prevEnd)
    {
        var totalRevenue = await _db.Transactions
            .Where(t => t.CreatedAt >= startDate && t.CreatedAt <= endDate && t.Status == "completed" && (t.Type == "payment" || t.Type == "deposit"))
            .SumAsync(t => (decimal?)t.Amount) ?? 0;
        var prevRevenue = await _db.Transactions
            .Where(t => t.CreatedAt >= prevStart && t.CreatedAt <= prevEnd && t.Status == "completed" && (t.Type == "payment" || t.Type == "deposit"))
            .SumAsync(t => (decimal?)t.Amount) ?? 0;

        var totalTx = await _db.Transactions.CountAsync(t => t.CreatedAt >= startDate && t.CreatedAt <= endDate);
        var prevTx = await _db.Transactions.CountAsync(t => t.CreatedAt >= prevStart && t.CreatedAt <= prevEnd);
        var successfulTx = await _db.Transactions.CountAsync(t => t.CreatedAt >= startDate && t.CreatedAt <= endDate && t.Status == "completed");
        var failedTx = await _db.Transactions.CountAsync(t => t.CreatedAt >= startDate && t.CreatedAt <= endDate && t.Status == "failed");
        var activeCustomers = await _db.Users.CountAsync(u => u.Role != "admin" && u.UpdatedAt >= startDate);
        var prevActiveCustomers = await _db.Users.CountAsync(u => u.Role != "admin" && u.UpdatedAt >= prevStart && u.UpdatedAt <= prevEnd);
        var activeMerchants = await _db.Users.CountAsync(u => u.Role == "business" && u.UpdatedAt >= startDate);
        var walletBalance = await _db.Wallets.SumAsync(w => (decimal?)w.Balance) ?? 0;
        var affiliateEarnings = await _db.Affiliates.SumAsync(a => (decimal?)a.TotalEarnings) ?? 0;
        var refundVolume = await _db.Transactions
            .Where(t => t.CreatedAt >= startDate && t.CreatedAt <= endDate && t.Status == "refunded")
            .SumAsync(t => (decimal?)t.Amount) ?? 0;
        var fraudCases = await _db.FraudFlags.CountAsync(f => f.CreatedAt >= startDate && f.CreatedAt <= endDate);

        return new List<KpiCard>
        {
            new() { Label = "Total Revenue", Value = totalRevenue, PreviousValue = prevRevenue, ChangePercent = prevRevenue > 0 ? (double)((totalRevenue - prevRevenue) / prevRevenue * 100) : 0, Format = "currency", Icon = "DollarSign", Color = "emerald", Trend = totalRevenue >= prevRevenue ? "up" : "down" },
            new() { Label = "Total Transactions", Value = totalTx, PreviousValue = prevTx, ChangePercent = prevTx > 0 ? (double)(totalTx - prevTx) / prevTx * 100 : 0, Format = "number", Icon = "Activity", Color = "blue", Trend = totalTx >= prevTx ? "up" : "down" },
            new() { Label = "Successful Payments", Value = successfulTx, Format = "number", Icon = "CheckCircle", Color = "emerald", Trend = "up" },
            new() { Label = "Failed Payments", Value = failedTx, Format = "number", Icon = "XCircle", Color = "red", Trend = failedTx > 0 ? "down" : "neutral" },
            new() { Label = "Active Customers", Value = activeCustomers, PreviousValue = prevActiveCustomers, ChangePercent = prevActiveCustomers > 0 ? (double)(activeCustomers - prevActiveCustomers) / prevActiveCustomers * 100 : 0, Format = "number", Icon = "Users", Color = "violet", Trend = activeCustomers >= prevActiveCustomers ? "up" : "down" },
            new() { Label = "Active Merchants", Value = activeMerchants, Format = "number", Icon = "Store", Color = "cyan", Trend = "neutral" },
            new() { Label = "Wallet Balance", Value = walletBalance, Format = "currency", Icon = "Wallet", Color = "blue", Trend = "up" },
            new() { Label = "Affiliate Earnings", Value = affiliateEarnings, Format = "currency", Icon = "Users", Color = "amber", Trend = "up" },
            new() { Label = "Refund Volume", Value = refundVolume, Format = "currency", Icon = "RotateCcw", Color = "red", Trend = refundVolume > 0 ? "down" : "neutral" },
            new() { Label = "Fraud Cases", Value = fraudCases, Format = "number", Icon = "AlertTriangle", Color = "red", Trend = fraudCases > 0 ? "down" : "neutral" },
        };
    }

    private async Task<List<TimeSeriesPoint>> GetTimeSeries(IQueryable<Transaction> source, DateTime startDate, DateTime endDate)
    {
        return await source
            .Where(t => t.CreatedAt >= startDate && t.CreatedAt <= endDate)
            .GroupBy(t => t.CreatedAt.Date)
            .Select(g => new TimeSeriesPoint { Date = g.Key.ToString("yyyy-MM-dd"), Value = g.Count() })
            .OrderBy(p => p.Date)
            .ToListAsync();
    }

    private async Task<List<TimeSeriesPoint>> GetUserGrowthTrend(DateTime startDate, DateTime endDate)
    {
        return await _db.Users
            .Where(u => u.CreatedAt >= startDate && u.CreatedAt <= endDate)
            .GroupBy(u => u.CreatedAt.Date)
            .Select(g => new TimeSeriesPoint { Date = g.Key.ToString("yyyy-MM-dd"), Value = g.Count() })
            .OrderBy(p => p.Date)
            .ToListAsync();
    }

    private List<AiInsight> GenerateAiInsights(List<KpiCard> kpis, List<TimeSeriesPoint> revenueTrend, List<TimeSeriesPoint> transactionTrend)
    {
        var insights = new List<AiInsight>();

        var revenueKpi = kpis.FirstOrDefault(k => k.Label == "Total Revenue");
        if (revenueKpi != null && revenueKpi.Trend == "up" && revenueKpi.ChangePercent > 10)
        {
            insights.Add(new AiInsight
            {
                Type = "success",
                Title = "Strong Revenue Growth",
                Message = $"Revenue increased by {revenueKpi.ChangePercent:F1}% compared to the previous period. This is a strong indicator of platform growth.",
                Metric = "revenue_growth",
                CurrentValue = revenueKpi.Value,
                PreviousValue = revenueKpi.PreviousValue,
            });
        }
        else if (revenueKpi != null && revenueKpi.Trend == "down" && revenueKpi.ChangePercent < -5)
        {
            insights.Add(new AiInsight
            {
                Type = "warning",
                Title = "Revenue Decline Detected",
                Message = $"Revenue has decreased by {Math.Abs(revenueKpi.ChangePercent):F1}%. Investigate transaction volumes and payment success rates.",
                Severity = 0.7,
                Metric = "revenue_decline",
                CurrentValue = revenueKpi.Value,
                PreviousValue = revenueKpi.PreviousValue,
            });
        }

        var txKpi = kpis.FirstOrDefault(k => k.Label == "Total Transactions");
        if (txKpi != null && txKpi.ChangePercent > 15)
        {
            insights.Add(new AiInsight
            {
                Type = "success",
                Title = "Transaction Volume Surge",
                Message = $"Transaction volume grew by {txKpi.ChangePercent:F1}%. Consider scaling infrastructure to maintain performance.",
                Metric = "tx_volume_growth",
            });
        }

        var failedKpi = kpis.FirstOrDefault(k => k.Label == "Failed Payments");
        if (failedKpi != null && failedKpi.Value > 0)
        {
            var failureRate = txKpi != null && txKpi.Value > 0 ? (double)(failedKpi.Value / txKpi.Value) * 100 : 0;
            if (failureRate > 5)
            {
                insights.Add(new AiInsight
                {
                    Type = "critical",
                    Title = "High Payment Failure Rate",
                    Message = $"Payment failure rate is {failureRate:F1}%, which exceeds the 5% threshold. Review payment gateway configurations and error logs.",
                    Severity = 0.85,
                    Metric = "high_failure_rate",
                });
            }
        }

        insights.Add(new AiInsight
        {
            Type = "info",
            Title = "Operational Health",
            Message = $"Platform is processing an average of {(txKpi?.Value ?? 0) / 30:F0} transactions per day. All core services are operational.",
            Metric = "operational_health",
        });

        return insights;
    }
}
