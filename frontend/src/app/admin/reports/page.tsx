"use client"

import React, { useEffect, useState, useCallback } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"
import { reportsApi, type ReportDashboard, type RevenueReport, type TransactionReport, type MerchantReport, type CustomerReport, type FinancialReport, type ComplianceReport, type AffiliateReport, type WalletReport, type SupportReport, type KpiCard, type TimeSeriesPoint, type AiInsight, type ScheduledReportItem } from "@/lib/reports-api"
import {
  DollarSign, TrendingUp, Activity, Users, Store, Wallet, RotateCcw, AlertTriangle,
  CheckCircle, XCircle, Percent, Clock, UserPlus, UserCheck, Shield, CreditCard,
  ArrowDownToLine, ArrowUpFromLine, WalletCards, BarChart3, FileText, FilePlus,
  Brain, Share2, Ticket, Star, RefreshCw, Download, Calendar,
  FileDown, Lightbulb, TrendingDown,
} from "lucide-react"

const colors = {
  emerald: "#10b981", blue: "#3b82f6", violet: "#8b5cf6", amber: "#f59e0b",
  red: "#ef4444", cyan: "#06b6d4", pink: "#ec4899", orange: "#f97316",
}

const chartColors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#f97316", "#6366f1", "#14b8a6"]

const periodOptions = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last7days", label: "Last 7 Days" },
  { value: "last30days", label: "Last 30 Days" },
  { value: "quarter", label: "This Quarter" },
  { value: "year", label: "This Year" },
]

const iconMap: Record<string, React.ElementType> = {
  DollarSign, TrendingUp, Activity, Users, Store, Wallet, RotateCcw, AlertTriangle,
  CheckCircle, XCircle, Percent, Clock, UserPlus, UserCheck, Shield, CreditCard,
  ArrowDownToLine, ArrowUpFromLine, WalletCards, BarChart3, FileText, FilePlus,
  Brain, Share2, Ticket, Star,
}

function CountUp({ value, suffix = "", prefix = "" }: { value: number; suffix?: string; prefix?: string }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    if (value === 0) { setDisplay(0); return }
    const duration = 1000
    const steps = 30
    const increment = value / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= value) { setDisplay(value); clearInterval(timer) }
      else setDisplay(Math.floor(current))
    }, duration / steps)
    return () => clearInterval(timer)
  }, [value])
  return <>{prefix}{display.toLocaleString("en-ZA", { minimumFractionDigits: 0 })}{suffix}</>
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
}

function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })
}

function KpiCards({ kpis }: { kpis: KpiCard[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {kpis.map((kpi, i) => {
        const Icon = iconMap[kpi.icon] || Activity
        const color = colors[kpi.color as keyof typeof colors] || colors.blue
        return (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.04 }}
          >
            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-card to-muted/50 shadow-md hover:shadow-lg transition-shadow">
              <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-10" style={{ backgroundColor: color }} />
              <CardHeader className="pb-1 pt-3 px-4 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground">{kpi.label}</CardTitle>
                <Icon className="w-4 h-4" style={{ color }} />
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="text-xl font-bold">
                  {kpi.format === "currency" ? (
                    <CountUp value={kpi.value} prefix="R " />
                  ) : kpi.format === "percentage" ? (
                    <CountUp value={kpi.value} suffix="%" />
                  ) : (
                    <CountUp value={kpi.value} />
                  )}
                </div>
                {kpi.changePercent !== 0 && (
                  <div className={`flex items-center gap-1 text-xs mt-1 ${kpi.trend === "up" ? "text-emerald-500" : kpi.trend === "down" ? "text-red-500" : "text-muted-foreground"}`}>
                    {kpi.trend === "up" ? <TrendingUp className="w-3 h-3" /> : kpi.trend === "down" ? <TrendingDown className="w-3 h-3" /> : null}
                    {Math.abs(kpi.changePercent).toFixed(1)}% vs previous
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}

function SimpleLineChart({ data, xKey = "date", yKey = "value", color = "#3b82f6", height = 250 }: { data: TimeSeriesPoint[]; xKey?: string; yKey?: string; color?: string; height?: number }) {
  if (!data.length) return <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">No data available</div>
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey={xKey} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
        <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
        <Line type="monotone" dataKey={yKey} stroke={color} strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

function SimpleBarChart({ data, xKey = "label", yKey = "value", color = "#3b82f6", height = 250 }: { data: TimeSeriesPoint[]; xKey?: string; yKey?: string; color?: string; height?: number }) {
  if (!data.length) return <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">No data available</div>
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey={xKey} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
        <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
        <Bar dataKey={yKey} fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function SimplePieChart({ data, height = 250 }: { data: TimeSeriesPoint[]; height?: number }) {
  if (!data.length) return <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">No data available</div>
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value" label={({ label, percent }) => `${label} ${(percent * 100).toFixed(0)}%`}>
          {data.map((_, i) => <Cell key={i} fill={chartColors[i % chartColors.length]} />)}
        </Pie>
        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

function SimpleAreaChart({ data, xKey = "date", yKey = "value", color = "#3b82f6", height = 250 }: { data: TimeSeriesPoint[]; xKey?: string; yKey?: string; color?: string; height?: number }) {
  if (!data.length) return <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">No data available</div>
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey={xKey} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
        <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
        <Area type="monotone" dataKey={yKey} stroke={color} fill={color} fillOpacity={0.15} strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function Leaderboard({ items, title, format = "currency" }: { items: { name: string; value: number; secondaryValue?: number; badge?: string }[]; title: string; format?: string }) {
  if (!items.length) return null
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={item.name} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-bold text-muted-foreground w-5 text-right">#{i + 1}</span>
                <span className="text-sm truncate">{item.name}</span>
                {item.badge && <Badge variant="secondary" className="text-[10px] px-1.5">{item.badge}</Badge>}
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="font-semibold">{format === "currency" ? formatCurrency(item.value) : formatNumber(item.value)}</span>
                {item.secondaryValue !== undefined && (
                  <span className="text-xs text-muted-foreground">{formatNumber(item.secondaryValue)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function InsightCard({ insight }: { insight: AiInsight }) {
  const borderColor = insight.type === "success" ? "border-emerald-500/30" : insight.type === "warning" ? "border-amber-500/30" : insight.type === "critical" ? "border-red-500/30" : "border-blue-500/30"
  const bgColor = insight.type === "success" ? "bg-emerald-500/10" : insight.type === "warning" ? "bg-amber-500/10" : insight.type === "critical" ? "bg-red-500/10" : "bg-blue-500/10"
  const Icon = insight.type === "success" ? CheckCircle : insight.type === "warning" ? AlertTriangle : insight.type === "critical" ? XCircle : Lightbulb
  const iconColor = insight.type === "success" ? "text-emerald-500" : insight.type === "warning" ? "text-amber-500" : insight.type === "critical" ? "text-red-500" : "text-blue-500"

  return (
    <div className={`flex gap-3 p-3 rounded-lg border ${borderColor} ${bgColor}`}>
      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${iconColor}`} />
      <div>
        <p className="text-sm font-medium">{insight.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{insight.message}</p>
      </div>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
      <p className="text-lg font-medium text-red-400">{message}</p>
      <p className="text-sm text-muted-foreground mt-1">Try refreshing the page or check your connection</p>
    </div>
  )
}

function ChartCard({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function AiSummaryCard({ data }: { data: { summary: string; metrics: Record<string, unknown>; topMetric: string; topValue: string } | null }) {
  if (!data) return null
  return (
    <Card className="bg-gradient-to-br from-blue-500/5 to-violet-500/5 border-blue-500/20">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-blue-500" />
          <CardTitle className="text-sm font-medium">AI Executive Summary</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed text-muted-foreground">{data.summary}</p>
        <div className="mt-3 flex items-center gap-4 text-xs">
          <Badge variant="secondary" className="text-xs">{data.topMetric}: {data.topValue}</Badge>
        </div>
      </CardContent>
    </Card>
  )
}

function StatCard({ label, value, sub, icon: Icon, color }: { label: string; value: string; sub?: string; icon: React.ElementType; color: string }) {
  return (
    <Card className="border-0 bg-gradient-to-br from-card to-muted/30 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">{label}</span>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <div className="text-lg font-bold">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  )
}

function DataTable({ columns, rows }: { columns: string[]; rows: Record<string, React.ReactNode>[] }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => <TableHead key={col} className="text-xs">{col}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i}>
              {columns.map((col) => <TableCell key={col} className="text-sm">{row[col]}</TableCell>)}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────

export default function AdminReportsPage() {
  const [period, setPeriod] = useState("last30days")
  const [activeTab, setActiveTab] = useState("dashboard")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [dashboardData, setDashboardData] = useState<ReportDashboard | null>(null)
  const [revenueData, setRevenueData] = useState<RevenueReport | null>(null)
  const [txData, setTxData] = useState<TransactionReport | null>(null)
  const [merchantData, setMerchantData] = useState<MerchantReport | null>(null)
  const [customerData, setCustomerData] = useState<CustomerReport | null>(null)
  const [financialData, setFinancialData] = useState<FinancialReport | null>(null)
  const [complianceData, setComplianceData] = useState<ComplianceReport | null>(null)
  const [affiliateData, setAffiliateData] = useState<AffiliateReport | null>(null)
  const [walletData, setWalletData] = useState<WalletReport | null>(null)
  const [supportData, setSupportData] = useState<SupportReport | null>(null)
  const [aiSummary, setAiSummary] = useState<{ summary: string; metrics: Record<string, unknown>; topMetric: string; topValue: string } | null>(null)
  const [scheduledReports, setScheduledReports] = useState<ScheduledReportItem[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [showScheduler, setShowScheduler] = useState(false)
  const [scheduleForm, setScheduleForm] = useState({ name: "", description: "", reportType: "dashboard", frequency: "weekly", format: "pdf", recipientEmails: "" })

  const query = { period }

  const loadTabData = useCallback(async (tab: string) => {
    try {
      switch (tab) {
        case "dashboard":
          setDashboardData(await reportsApi.dashboard(query))
          break
        case "revenue":
          setRevenueData(await reportsApi.revenue(query))
          break
        case "transactions":
          setTxData(await reportsApi.transactions(query))
          break
        case "merchants":
          setMerchantData(await reportsApi.merchants(query))
          break
        case "customers":
          setCustomerData(await reportsApi.customers(query))
          break
        case "financial":
          setFinancialData(await reportsApi.financial(query))
          break
        case "compliance":
          setComplianceData(await reportsApi.compliance(query))
          break
        case "affiliates":
          setAffiliateData(await reportsApi.affiliates(query))
          break
        case "wallets":
          setWalletData(await reportsApi.wallets(query))
          break
        case "support":
          setSupportData(await reportsApi.support(query))
          break
        case "scheduled":
          setScheduledReports(await reportsApi.scheduled.list())
          break
      }
    } catch {
      setError("Failed to load report data")
    }
  }, [period])

  useEffect(() => {
    setLoading(true)
    setError("")
    setActiveTab("dashboard")
    Promise.all([
      reportsApi.dashboard(query),
      reportsApi.executiveSummary(),
    ])
      .then(([dashboard, summary]) => {
        setDashboardData(dashboard)
        setAiSummary(summary)
      })
      .catch(() => setError("Failed to load dashboard data"))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (activeTab !== "dashboard") loadTabData(activeTab)
  }, [activeTab, loadTabData])

  const handlePeriodChange = async (newPeriod: string) => {
    setPeriod(newPeriod)
    setLoading(true)
    const q = { period: newPeriod }
    try {
      if (activeTab === "dashboard") {
        const [dashboard, summary] = await Promise.all([
          reportsApi.dashboard(q),
          reportsApi.executiveSummary(),
        ])
        setDashboardData(dashboard)
        setAiSummary(summary)
      } else {
        await loadTabData(activeTab)
      }
    } catch {
      setError("Failed to load data")
    }
    setLoading(false)
  }

  const handleExport = async (format: "json" | "csv") => {
    try {
      const reportType = activeTab === "dashboard" ? "dashboard" : activeTab
      const blob = await reportsApi.exportReport(reportType, format, period)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `report-${reportType}-${new Date().toISOString().split("T")[0]}.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // ignore
    }
  }

  const handleCreateSchedule = async () => {
    if (!scheduleForm.name) return
    setSubmitting(true)
    try {
      await reportsApi.scheduled.create(scheduleForm)
      setShowScheduler(false)
      setScheduleForm({ name: "", description: "", reportType: "dashboard", frequency: "weekly", format: "pdf", recipientEmails: "" })
      setScheduledReports(await reportsApi.scheduled.list())
    } catch { /* ignore */ }
    setSubmitting(false)
  }

  const handleDeleteSchedule = async (id: string) => {
    try {
      await reportsApi.scheduled.remove(id)
      setScheduledReports((prev) => prev.filter((r) => r.id !== id))
    } catch { /* ignore */ }
  }

  const handleRunNow = async (id: string) => {
    try {
      await reportsApi.scheduled.runNow(id)
      setScheduledReports((prev) => prev.map((r) => r.id === id ? { ...r, lastRunAt: new Date().toISOString() } : r))
    } catch { /* ignore */ }
  }

  if (error && !dashboardData) return <ErrorState message={error} />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Business Intelligence</h1>
          <p className="text-sm text-muted-foreground">Enterprise analytics & reporting center</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-[140px] h-9 text-sm">
              <Calendar className="w-3.5 h-3.5 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => handleExport("csv")}><FileDown className="w-4 h-4 mr-1" />CSV</Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("json")}><Download className="w-4 h-4 mr-1" />JSON</Button>
          <Button variant="outline" size="sm" onClick={() => setShowScheduler(true)}><Clock className="w-4 h-4 mr-1" />Schedule</Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="dashboard">Executive</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="merchants">Merchants</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="affiliates">Affiliates</TabsTrigger>
          <TabsTrigger value="wallets">Wallets</TabsTrigger>
          <TabsTrigger value="support">Support</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
        </TabsList>

        {/* ─── Executive Dashboard ─────────────────── */}
        <TabsContent value="dashboard" className="space-y-6">
          {loading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <Skeleton className="h-64 rounded-xl" />
                <Skeleton className="h-64 rounded-xl" />
              </div>
            </div>
          ) : (
            <>
              {dashboardData && <KpiCards kpis={dashboardData.kpis} />}
              {dashboardData && dashboardData.aiInsights.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <Brain className="w-4 h-4 text-blue-500" /> AI Insights
                  </h3>
                  <div className="grid md:grid-cols-2 gap-2">
                    {dashboardData.aiInsights.map((insight, i) => (
                      <InsightCard key={i} insight={insight} />
                    ))}
                  </div>
                </div>
              )}
              {aiSummary && <AiSummaryCard data={aiSummary} />}
              <div className="grid md:grid-cols-2 gap-4">
                {dashboardData && (
                  <ChartCard title="Revenue Trend">
                    <SimpleAreaChart data={dashboardData.revenueTrend} color={colors.emerald} />
                  </ChartCard>
                )}
                {dashboardData && (
                  <ChartCard title="Transaction Volume">
                    <SimpleLineChart data={dashboardData.transactionTrend} color={colors.blue} />
                  </ChartCard>
                )}
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {dashboardData && (
                  <ChartCard title="User Growth">
                    <SimpleLineChart data={dashboardData.userGrowthTrend} color={colors.violet} />
                  </ChartCard>
                )}
                {dashboardData && (
                  <ChartCard title="Payment Method Distribution (Volume)">
                    <SimplePieChart data={dashboardData.paymentMethodDistribution} />
                  </ChartCard>
                )}
              </div>
              {dashboardData && dashboardData.topPerformers && (
                <div className="grid md:grid-cols-3 gap-4">
                  <Leaderboard items={dashboardData.topPerformers.topMerchantsByRevenue} title="Top Merchants by Revenue" />
                  <Leaderboard items={dashboardData.topPerformers.topAffiliatesByEarnings} title="Top Affiliates by Earnings" />
                  <Leaderboard items={dashboardData.topPerformers.topCountriesByVolume} title="Top Countries by Volume" format="number" />
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* ─── Revenue ─────────────────────────────── */}
        <TabsContent value="revenue" className="space-y-6">
          {!revenueData ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : (
            <>
              <KpiCards kpis={revenueData.kpis} />
              <div className="grid md:grid-cols-2 gap-4">
                <ChartCard title="Daily Revenue">
                  <SimpleAreaChart data={revenueData.dailyRevenue} color={colors.emerald} />
                </ChartCard>
                <ChartCard title="Monthly Revenue">
                  <SimpleBarChart data={revenueData.monthlyRevenue} xKey="label" color={colors.blue} />
                </ChartCard>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <ChartCard title="Revenue by Payment Method">
                  <SimplePieChart data={revenueData.revenueByPaymentMethod} />
                </ChartCard>
                <ChartCard title="Revenue by Currency">
                  <SimpleBarChart data={revenueData.revenueByCurrency} color={colors.amber} />
                </ChartCard>
              </div>
            </>
          )}
        </TabsContent>

        {/* ─── Transactions ────────────────────────── */}
        <TabsContent value="transactions" className="space-y-6">
          {!txData ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : (
            <>
              <KpiCards kpis={txData.kpis} />
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <ChartCard title="Volume Trend">
                  <SimpleLineChart data={txData.volumeTrend} color={colors.blue} />
                </ChartCard>
                <ChartCard title="Status Distribution">
                  <SimplePieChart data={txData.statusDistribution} />
                </ChartCard>
                <ChartCard title="Peak Hours">
                  <SimpleBarChart data={txData.peakHours} color={colors.amber} />
                </ChartCard>
              </div>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <DataTable
                    columns={["Date", "Type", "Amount", "Status", "User", "Reference"]}
                    rows={txData.recentTransactions.slice(0, 25).map((tx) => ({
                      Date: formatDate(tx.createdAt),
                      Type: <Badge variant="secondary" className="text-[10px]">{tx.type}</Badge>,
                      Amount: formatCurrency(tx.amount),
                      Status: (
                        <Badge variant={tx.status === "completed" ? "default" : tx.status === "failed" ? "destructive" : "secondary"} className="text-[10px]">
                          {tx.status}
                        </Badge>
                      ),
                      User: tx.userName,
                      Reference: tx.reference || "-",
                    }))}
                  />
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ─── Merchants ───────────────────────────── */}
        <TabsContent value="merchants" className="space-y-6">
          {!merchantData ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : (
            <>
              <KpiCards kpis={merchantData.kpis} />
              <div className="grid md:grid-cols-2 gap-4">
                <ChartCard title="Merchant Growth">
                  <SimpleBarChart data={merchantData.growthTrend} color={colors.cyan} />
                </ChartCard>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <Leaderboard items={merchantData.revenueLeaderboard} title="Highest Revenue" />
                <Leaderboard items={merchantData.growthLeaderboard} title="Fastest Growth" />
                <Leaderboard items={merchantData.transactionLeaderboard} title="Most Transactions" format="number" />
              </div>
            </>
          )}
        </TabsContent>

        {/* ─── Customers ───────────────────────────── */}
        <TabsContent value="customers" className="space-y-6">
          {!customerData ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : (
            <>
              <KpiCards kpis={customerData.kpis} />
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <ChartCard title="Registrations">
                  <SimpleAreaChart data={customerData.registrationTrend} color={colors.violet} />
                </ChartCard>
                <ChartCard title="Country Distribution">
                  <SimpleBarChart data={customerData.countryDistribution} color={colors.blue} />
                </ChartCard>
                <ChartCard title="KYC Status">
                  <SimplePieChart data={customerData.kycStatusDistribution} />
                </ChartCard>
              </div>
            </>
          )}
        </TabsContent>

        {/* ─── Financial ───────────────────────────── */}
        <TabsContent value="financial" className="space-y-6">
          {!financialData ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : (
            <>
              <KpiCards kpis={financialData.kpis} />
              <div className="grid md:grid-cols-2 gap-4">
                <ChartCard title="Monthly P&L">
                  <SimpleBarChart data={financialData.monthlyPnl} xKey="label" color={colors.emerald} />
                </ChartCard>
                <ChartCard title="Fee Breakdown">
                  <SimplePieChart data={financialData.feeBreakdown} />
                </ChartCard>
              </div>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Financial Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label="Total Revenue" value={formatCurrency(financialData.summary.totalRevenue)} icon={DollarSign} color={colors.emerald} />
                    <StatCard label="Net Profit" value={formatCurrency(financialData.summary.netProfit)} icon={TrendingUp} color={colors.blue} />
                    <StatCard label="Total Fees" value={formatCurrency(financialData.summary.totalFees)} icon={Percent} color={colors.violet} />
                    <StatCard label="Gross Margin" value={`${financialData.summary.grossMargin.toFixed(1)}%`} icon={Percent} color={financialData.summary.grossMargin >= 40 ? colors.emerald : colors.red} />
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ─── Compliance ──────────────────────────── */}
        <TabsContent value="compliance" className="space-y-6">
          {!complianceData ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : (
            <>
              <KpiCards kpis={complianceData.kpis} />
              <div className="grid md:grid-cols-2 gap-4">
                <ChartCard title="Applications Over Time">
                  <SimpleLineChart data={complianceData.applicationTrend} color={colors.blue} />
                </ChartCard>
                <ChartCard title="Country Distribution">
                  <SimpleBarChart data={complianceData.countryDistribution} color={colors.amber} />
                </ChartCard>
              </div>
            </>
          )}
        </TabsContent>

        {/* ─── Affiliates ──────────────────────────── */}
        <TabsContent value="affiliates" className="space-y-6">
          {!affiliateData ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : (
            <>
              <KpiCards kpis={affiliateData.kpis} />
              <div className="grid md:grid-cols-2 gap-4">
                <ChartCard title="Referral Trend">
                  <SimpleLineChart data={affiliateData.referralTrend} color={colors.amber} />
                </ChartCard>
                <ChartCard title="Commission Trend">
                  <SimpleAreaChart data={affiliateData.commissionTrend} color={colors.emerald} />
                </ChartCard>
              </div>
              <Leaderboard items={affiliateData.topAffiliates} title="Top Affiliates" />
            </>
          )}
        </TabsContent>

        {/* ─── Wallets ─────────────────────────────── */}
        <TabsContent value="wallets" className="space-y-6">
          {!walletData ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : (
            <>
              <KpiCards kpis={walletData.kpis} />
              <ChartCard title="Currency Distribution">
                <SimplePieChart data={walletData.currencyDistribution} />
              </ChartCard>
            </>
          )}
        </TabsContent>

        {/* ─── Support ─────────────────────────────── */}
        <TabsContent value="support" className="space-y-6">
          {!supportData ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : (
            <>
              <KpiCards kpis={supportData.kpis} />
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <ChartCard title="Ticket Volume">
                  <SimpleLineChart data={supportData.ticketTrend} color={colors.blue} />
                </ChartCard>
                <ChartCard title="Category Distribution">
                  <SimplePieChart data={supportData.categoryDistribution} />
                </ChartCard>
                <ChartCard title="Satisfaction Trend">
                  <SimpleLineChart data={supportData.satisfactionTrend} color={colors.emerald} />
                </ChartCard>
              </div>
            </>
          )}
        </TabsContent>

        {/* ─── Scheduled Reports ───────────────────── */}
        <TabsContent value="scheduled" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium">Scheduled Reports</h3>
            <Dialog open={showScheduler} onOpenChange={setShowScheduler}>
              <DialogTrigger asChild>
                <Button size="sm"><Clock className="w-4 h-4 mr-1" />New Schedule</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Schedule Report</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Name</label>
                    <Input value={scheduleForm.name} onChange={(e) => setScheduleForm((p) => ({ ...p, name: e.target.value }))} placeholder="Weekly Executive Summary" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Description</label>
                    <Input value={scheduleForm.description} onChange={(e) => setScheduleForm((p) => ({ ...p, description: e.target.value }))} placeholder="Brief description" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Report Type</label>
                      <Select value={scheduleForm.reportType} onValueChange={(v) => setScheduleForm((p) => ({ ...p, reportType: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dashboard">Executive Dashboard</SelectItem>
                          <SelectItem value="revenue">Revenue</SelectItem>
                          <SelectItem value="transactions">Transactions</SelectItem>
                          <SelectItem value="financial">Financial</SelectItem>
                          <SelectItem value="compliance">Compliance</SelectItem>
                          <SelectItem value="affiliates">Affiliates</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Frequency</label>
                      <Select value={scheduleForm.frequency} onValueChange={(v) => setScheduleForm((p) => ({ ...p, frequency: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Format</label>
                      <Select value={scheduleForm.format} onValueChange={(v) => setScheduleForm((p) => ({ ...p, format: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pdf">PDF</SelectItem>
                          <SelectItem value="xlsx">Excel</SelectItem>
                          <SelectItem value="csv">CSV</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Recipient Emails</label>
                      <Input value={scheduleForm.recipientEmails} onChange={(e) => setScheduleForm((p) => ({ ...p, recipientEmails: e.target.value }))} placeholder="admin@payafrika.com" />
                    </div>
                  </div>
                  <Button className="w-full mt-2" onClick={handleCreateSchedule} disabled={submitting || !scheduleForm.name}>
                    {submitting ? "Creating..." : "Create Schedule"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {scheduledReports.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Clock className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">No scheduled reports yet</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowScheduler(true)}>
                  <Clock className="w-4 h-4 mr-1" />Create First Schedule
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {scheduledReports.map((report) => (
                <Card key={report.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{report.name}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="text-[10px]">{report.reportType}</Badge>
                        <span>{report.frequency}</span>
                        <span>{report.format}</span>
                        {report.lastRunAt && <span>Last: {formatDate(report.lastRunAt)}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleRunNow(report.id)}><RefreshCw className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteSchedule(report.id)}><XCircle className="w-3.5 h-3.5 text-red-400" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
