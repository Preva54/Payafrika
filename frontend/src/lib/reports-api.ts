import { api } from "./api"

export interface ReportQuery {
  startDate?: string
  endDate?: string
  period?: string
  merchantId?: string
  customerId?: string
  currency?: string
  paymentMethod?: string
  status?: string
  country?: string
}

export interface KpiCard {
  label: string
  value: number
  previousValue: number
  changePercent: number
  trend: string
  format: string
  icon: string
  color: string
}

export interface TimeSeriesPoint {
  date: string
  label: string
  value: number
  secondaryValue?: number
}

export interface PerformerItem {
  name: string
  value: number
  secondaryValue?: number
  identifier?: string
  badge?: string
}

export interface TopPerformersData {
  topMerchantsByRevenue: PerformerItem[]
  topAffiliatesByEarnings: PerformerItem[]
  topCountriesByVolume: PerformerItem[]
}

export interface AiInsight {
  type: string
  title: string
  message: string
  severity?: number
  metric?: string
  currentValue?: number
  previousValue?: number
}

export interface ReportDashboard {
  kpis: KpiCard[]
  revenueTrend: TimeSeriesPoint[]
  transactionTrend: TimeSeriesPoint[]
  userGrowthTrend: TimeSeriesPoint[]
  paymentMethodDistribution: TimeSeriesPoint[]
  topPerformers: TopPerformersData
  aiInsights: AiInsight[]
}

export interface RevenueReport {
  kpis: KpiCard[]
  dailyRevenue: TimeSeriesPoint[]
  monthlyRevenue: TimeSeriesPoint[]
  revenueByPaymentMethod: TimeSeriesPoint[]
  revenueByCurrency: TimeSeriesPoint[]
}

export interface TransactionRow {
  id: string
  type: string
  amount: number
  currency: string
  status: string
  userName: string
  reference?: string
  createdAt: string
}

export interface TransactionReport {
  kpis: KpiCard[]
  volumeTrend: TimeSeriesPoint[]
  statusDistribution: TimeSeriesPoint[]
  peakHours: TimeSeriesPoint[]
  byPaymentMethod: TimeSeriesPoint[]
  recentTransactions: TransactionRow[]
}

export interface MerchantReport {
  kpis: KpiCard[]
  growthTrend: TimeSeriesPoint[]
  revenueLeaderboard: PerformerItem[]
  growthLeaderboard: PerformerItem[]
  transactionLeaderboard: PerformerItem[]
}

export interface CustomerReport {
  kpis: KpiCard[]
  registrationTrend: TimeSeriesPoint[]
  countryDistribution: TimeSeriesPoint[]
  kycStatusDistribution: TimeSeriesPoint[]
}

export interface FinancialReport {
  kpis: KpiCard[]
  monthlyPnl: TimeSeriesPoint[]
  feeBreakdown: TimeSeriesPoint[]
  summary: {
    totalRevenue: number
    totalFees: number
    totalRefunds: number
    totalChargebacks: number
    affiliateExpenses: number
    netProfit: number
    grossMargin: number
  }
}

export interface ComplianceReport {
  kpis: KpiCard[]
  applicationTrend: TimeSeriesPoint[]
  countryDistribution: TimeSeriesPoint[]
}

export interface AffiliateReport {
  kpis: KpiCard[]
  referralTrend: TimeSeriesPoint[]
  commissionTrend: TimeSeriesPoint[]
  topAffiliates: PerformerItem[]
}

export interface WalletReport {
  kpis: KpiCard[]
  balanceTrend: TimeSeriesPoint[]
  currencyDistribution: TimeSeriesPoint[]
}

export interface SupportReport {
  kpis: KpiCard[]
  ticketTrend: TimeSeriesPoint[]
  categoryDistribution: TimeSeriesPoint[]
  satisfactionTrend: TimeSeriesPoint[]
}

export interface ScheduledReportItem {
  id: string
  name: string
  description: string
  reportType: string
  frequency: string
  format: string
  recipientEmails: string
  status: string
  lastRunAt?: string
  nextRunAt?: string
  createdAt: string
}

export interface OverviewStats {
  totalUsers: number
  totalRevenue: number
  totalTransactions: number
  totalAffiliates: number
  totalMerchants: number
  totalFraudCases: number
  successRate: number
}

function buildQuery(q?: ReportQuery): string {
  if (!q) return ""
  const params = new URLSearchParams()
  if (q.startDate) params.set("startDate", q.startDate)
  if (q.endDate) params.set("endDate", q.endDate)
  if (q.period) params.set("period", q.period)
  if (q.merchantId) params.set("merchantId", q.merchantId)
  if (q.customerId) params.set("customerId", q.customerId)
  if (q.currency) params.set("currency", q.currency)
  if (q.paymentMethod) params.set("paymentMethod", q.paymentMethod)
  if (q.status) params.set("status", q.status)
  if (q.country) params.set("country", q.country)
  const s = params.toString()
  return s ? `?${s}` : ""
}

export const reportsApi = {
  dashboard: (q?: ReportQuery) =>
    api.get<ReportDashboard>(`/reports/dashboard${buildQuery(q)}`),

  revenue: (q?: ReportQuery) =>
    api.get<RevenueReport>(`/reports/revenue${buildQuery(q)}`),

  transactions: (q?: ReportQuery) =>
    api.get<TransactionReport>(`/reports/transactions${buildQuery(q)}`),

  merchants: (q?: ReportQuery) =>
    api.get<MerchantReport>(`/reports/merchants${buildQuery(q)}`),

  customers: (q?: ReportQuery) =>
    api.get<CustomerReport>(`/reports/customers${buildQuery(q)}`),

  financial: (q?: ReportQuery) =>
    api.get<FinancialReport>(`/reports/financial${buildQuery(q)}`),

  compliance: (q?: ReportQuery) =>
    api.get<ComplianceReport>(`/reports/compliance${buildQuery(q)}`),

  affiliates: (q?: ReportQuery) =>
    api.get<AffiliateReport>(`/reports/affiliates${buildQuery(q)}`),

  wallets: (q?: ReportQuery) =>
    api.get<WalletReport>(`/reports/wallets${buildQuery(q)}`),

  support: (q?: ReportQuery) =>
    api.get<SupportReport>(`/reports/support${buildQuery(q)}`),

  aiInsights: () =>
    api.get<{ insights: AiInsight[] }>("/reports/ai/insights"),

  executiveSummary: () =>
    api.get<{ summary: string; metrics: Record<string, unknown>; topMetric: string; topValue: string }>("/reports/ai/executive-summary"),

  forecast: (months = 3) =>
    api.get<{ forecasts: unknown[] }>(`/reports/ai/forecast?months=${months}`),

  anomalies: () =>
    api.get<{ anomalies: unknown[]; totalAnomalies: number }>("/reports/ai/anomalies"),

  recommendations: () =>
    api.get<{ recommendations: unknown[] }>("/reports/ai/recommendations"),

  overviewStats: () =>
    api.get<OverviewStats>("/reports/overview-stats"),

  scheduled: {
    list: () => api.get<ScheduledReportItem[]>("/reports/scheduled"),
    create: (data: {
      name: string
      description?: string
      reportType: string
      frequency: string
      format?: string
      recipientEmails?: string
    }) => api.post<ScheduledReportItem>("/reports/scheduled", data),
    remove: (id: string) => api.delete(`/reports/scheduled/${id}`),
    runNow: (id: string) => api.post(`/reports/scheduled/${id}/run-now`),
  },

  exportReport: (type: string, format: "json" | "csv", period?: string) => {
    const params = new URLSearchParams({ type, format })
    if (period) params.set("period", period)
    return api.getBlob(`/reports/export?${params.toString()}`)
  },
}
