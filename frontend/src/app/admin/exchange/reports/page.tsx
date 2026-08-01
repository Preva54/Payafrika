"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts"
import { cn } from "@/lib/utils"
import { exchangeApi, type FxDashboard, type FxAnalytics, type FxReport } from "@/lib/exchange-api"
import {
  Globe, Activity, Users, AlertTriangle, DollarSign, TrendingUp,
  TrendingDown, Download, Calendar, RefreshCw, BarChart3, PieChart as PieChartIcon,
  LineChart as LineChartIcon, FileText, Percent, XCircle, CheckCircle,
  ArrowUpDown, LucideIcon,
} from "lucide-react"

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#f97316"]

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

function KpiCard({ label, value, icon: Icon, color, sub }: { label: string; value: string; icon: LucideIcon; color: string; sub?: string }) {
  return (
    <Card className="rounded-2xl bg-background/95 backdrop-blur-xl border-0 shadow-md">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
          <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
            <Icon className="h-4 w-4" style={{ color }} />
          </div>
        </div>
        <div className="text-2xl font-bold">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  )
}

function DashboardTab({ dashboard }: { dashboard: FxDashboard | null }) {
  if (!dashboard) return null
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Supported Currencies" value={String(dashboard.supportedCurrencies)} icon={Globe} color="#3b82f6" />
        <KpiCard label="Active Rates" value={String(dashboard.activeRates)} icon={Activity} color="#10b981" />
        <KpiCard label="Currency Pairs" value={String(dashboard.currencyPairs)} icon={ArrowUpDown} color="#8b5cf6" />
        <KpiCard label="Active Providers" value={String(dashboard.activeProviders)} icon={Users} color="#06b6d4" />
        <KpiCard label="Degraded Providers" value={String(dashboard.degradedProviders)} icon={AlertTriangle} color="#f59e0b" />
        <KpiCard label="Failed Updates" value={String(dashboard.failedUpdates)} icon={XCircle} color="#ef4444" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <KpiCard label="Today FX Volume" value={formatCurrency(dashboard.todayFxVolume)} icon={DollarSign} color="#10b981" />
        <KpiCard label="Average Margin" value={`${dashboard.averageMargin.toFixed(2)}%`} icon={Percent} color="#8b5cf6" />
        <KpiCard label="Last Sync" value={dashboard.lastSync ? new Date(dashboard.lastSync).toLocaleString() : "N/A"} icon={RefreshCw} color="#3b82f6" />
      </div>
    </div>
  )
}

function AnalyticsTab({ analytics }: { analytics: FxAnalytics | null }) {
  if (!analytics) return null
  const volumeData = analytics.volumeTrend.length > 0 ? analytics.volumeTrend : [
    { date: "Daily", volume: analytics.dailyFxVolume },
    { date: "Weekly", volume: analytics.weeklyFxVolume },
    { date: "Monthly", volume: analytics.monthlyFxVolume },
  ]
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Most Used Currency" value={analytics.mostUsedCurrency} icon={Globe} color="#3b82f6" />
        <KpiCard label="Most Active Pair" value={analytics.mostActivePair} icon={ArrowUpDown} color="#10b981" />
        <KpiCard label="FX Profit" value={formatCurrency(analytics.fxProfit)} icon={DollarSign} color="#8b5cf6" />
        <KpiCard label="Conversion Rate" value={`${(analytics.conversionRate * 100).toFixed(1)}%`} icon={CheckCircle} color="#06b6d4" />
        <KpiCard label="Failed Conversions" value={formatNumber(analytics.failedConversions)} icon={XCircle} color="#ef4444" />
        <KpiCard label="Monthly Volume" value={formatCurrency(analytics.monthlyFxVolume)} icon={TrendingUp} color="#f59e0b" />
      </div>
      <Card className="rounded-2xl bg-background/95 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-sm font-medium">FX Volume</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={volumeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
              <Bar dataKey="volume" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

function ReportTab({ report }: { report: FxReport | null }) {
  if (!report) return null
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard label="Exchange Volume" value={formatCurrency(report.exchangeVolume)} icon={DollarSign} color="#3b82f6" />
        <KpiCard label="FX Revenue" value={formatCurrency(report.fxRevenue)} icon={TrendingUp} color="#10b981" />
        <KpiCard label="Average Margin" value={`${report.averageMargin.toFixed(2)}%`} icon={Percent} color="#8b5cf6" />
        <KpiCard label="Success Rate" value={`${(report.conversionSuccessRate * 100).toFixed(1)}%`} icon={CheckCircle} color="#06b6d4" />
        <KpiCard label="Failed Conversions" value={formatNumber(report.failedConversions)} icon={XCircle} color="#ef4444" />
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="rounded-2xl bg-background/95 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Currency Usage Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={report.currencyUsage} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="volume" nameKey="currency" label={(entry) => { const p = entry as { currency?: string; percent?: number }; return `${p.currency ?? ""} ${((p.percent ?? 0) * 100).toFixed(0)}%` }}>
                  {report.currencyUsage.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="rounded-2xl bg-background/95 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Top Currency Pairs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {report.topPairs.map((pair, i) => (
                <div key={pair.pair} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                    <span className="text-sm font-medium">{pair.pair}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-semibold">{formatCurrency(pair.volume)}</span>
                    <span className="text-xs text-muted-foreground">{formatNumber(pair.count)} txns</span>
                  </div>
                </div>
              ))}
              {report.topPairs.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No pair data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function VolumeTrendTab({ data }: { data: { date: string; volume: number }[] | null }) {
  if (!data || data.length === 0) {
    return (
      <Card className="rounded-2xl bg-background/95 backdrop-blur-xl">
        <CardContent className="py-16 text-center text-muted-foreground">
          <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No volume trend data available</p>
        </CardContent>
      </Card>
    )
  }
  return (
    <Card className="rounded-2xl bg-background/95 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Monthly Volume Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
            <defs>
              <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="volume" stroke="#3b82f6" fill="url(#volumeGradient)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export default function ExchangeReportsPage() {
  const [activeTab, setActiveTab] = useState("overview")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [dashboard, setDashboard] = useState<FxDashboard | null>(null)
  const [analytics, setAnalytics] = useState<FxAnalytics | null>(null)
  const [report, setReport] = useState<FxReport | null>(null)
  const [volumeTrend, setVolumeTrend] = useState<{ date: string; volume: number }[] | null>(null)
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")

  const fetchAll = () => {
    setLoading(true)
    setError("")
    Promise.all([
      exchangeApi.reports.dashboard(),
      exchangeApi.reports.analytics(),
      exchangeApi.reports.report(fromDate || undefined, toDate || undefined),
      exchangeApi.reports.volumeTrend("monthly"),
    ])
      .then(([d, a, r, v]) => {
        setDashboard(d)
        setAnalytics(a)
        setReport(r)
        setVolumeTrend(v)
      })
      .catch(() => setError("Failed to load report data"))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchAll() }, [])

  const handleFilter = () => {
    setLoading(true)
    setError("")
    Promise.all([
      exchangeApi.reports.report(fromDate || undefined, toDate || undefined),
    ])
      .then(([r]) => setReport(r))
      .catch(() => setError("Failed to filter reports"))
      .finally(() => setLoading(false))
  }

  const handleExport = (format: "csv" | "pdf") => {
    const data = report
    if (!data) return
    const rows = [
      ["Metric", "Value"],
      ["Exchange Volume", formatCurrency(data.exchangeVolume)],
      ["FX Revenue", formatCurrency(data.fxRevenue)],
      ["Average Margin", `${data.averageMargin}%`],
      ["Success Rate", `${(data.conversionSuccessRate * 100).toFixed(1)}%`],
      ["Failed Conversions", String(data.failedConversions)],
    ]
    if (format === "csv") {
      const csv = rows.map((r) => r.join(",")).join("\n")
      const blob = new Blob([csv], { type: "text/csv" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `exchange-report-${new Date().toISOString().split("T")[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  if (error && !dashboard) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">FX Reports & Analytics</h1>
            <p className="text-sm text-muted-foreground">Exchange performance metrics and insights</p>
          </div>
        </div>
        <Card className="border-destructive/50 bg-destructive/5 rounded-2xl">
          <CardContent className="p-6 flex items-center gap-4">
            <AlertTriangle className="h-6 w-6 text-destructive shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-destructive">Error</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchAll}>
              <RefreshCw className="mr-2 h-4 w-4" /> Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">FX Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground">Exchange performance metrics and insights</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-9 w-36 text-xs" placeholder="From" />
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-9 w-36 text-xs" placeholder="To" />
            <Button variant="outline" size="sm" onClick={handleFilter}>
              <Calendar className="w-3.5 h-3.5 mr-1" /> Filter
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => handleExport("csv")}>
            <Download className="w-3.5 h-3.5 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("pdf")}>
            <FileText className="w-3.5 h-3.5 mr-1" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={fetchAll}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="report">Report</TabsTrigger>
          <TabsTrigger value="volume">Volume Trend</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          {loading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
              </div>
            </div>
          ) : (
            <DashboardTab dashboard={dashboard} />
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6 mt-6">
          {loading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
              </div>
              <Skeleton className="h-80 rounded-2xl" />
            </div>
          ) : (
            <AnalyticsTab analytics={analytics} />
          )}
        </TabsContent>

        <TabsContent value="report" className="space-y-6 mt-6">
          {loading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <Skeleton className="h-80 rounded-2xl" />
                <Skeleton className="h-80 rounded-2xl" />
              </div>
            </div>
          ) : (
            <ReportTab report={report} />
          )}
        </TabsContent>

        <TabsContent value="volume" className="space-y-6 mt-6">
          {loading ? (
            <Skeleton className="h-96 rounded-2xl" />
          ) : (
            <VolumeTrendTab data={volumeTrend} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
