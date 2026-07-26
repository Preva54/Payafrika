"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { auditApi, type AuditLog, type AuditDashboard } from "@/lib/audit-api"
import {
  Search, Filter, X, Download, RefreshCw, Bell, BellOff,
  Shield, ShieldAlert, AlertTriangle, AlertCircle, CheckCircle, XCircle,
  Info, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Users, Activity, Globe, Monitor, Smartphone, Laptop,
  Fingerprint, MapPin, Flag, Eye, FileDown,
} from "lucide-react"

const severityColor: Record<string, string> = {
  info: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  low: "bg-green-500/10 text-green-500 border-green-500/20",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  critical: "bg-red-500/10 text-red-500 border-red-500/20",
}

const severityIcon: Record<string, typeof Info> = {
  info: Info, low: CheckCircle, medium: AlertCircle, high: AlertTriangle, critical: ShieldAlert,
}

const resultColor: Record<string, string> = {
  success: "success", failed: "destructive",
}

const modules = ["Authentication", "User Management", "Admin", "KYC", "Loans", "Wallet", "Payments", "Support", "CMS", "Affiliate", "API", "System"]
const severities = ["info", "low", "medium", "high", "critical"]

function StatsCard({ label, value, icon: Icon, color, loading }: {
  label: string; value: number; icon: React.ElementType; color: string; loading?: boolean
}) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    if (loading) return
    let start = 0
    const step = Math.max(1, Math.floor(value / 30))
    const timer = setInterval(() => {
      start += step
      if (start >= value) { setDisplay(value); clearInterval(timer) } else setDisplay(start)
    }, 30)
    return () => clearInterval(timer)
  }, [value, loading])

  return (
    <Card className={`glass-card rounded-2xl p-4 border-l-4 ${color} transition-all hover:shadow-card-hover`}>
      <CardContent className="p-0 flex items-center gap-3">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${color.replace("border", "bg").replace("-500", "-500/15")}`}>
          <Icon className={`h-5 w-5 ${color.replace("border", "text")}`} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          {loading ? <Skeleton className="h-6 w-16 mt-1" /> : <p className="text-xl font-bold">{display.toLocaleString()}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
      {label}
      <button onClick={onRemove} className="hover:bg-primary/20 rounded-full p-0.5"><X className="h-3 w-3" /></button>
    </span>
  )
}

export default function AdminAuditLogsPage() {
  const [dashboard, setDashboard] = useState<AuditDashboard | null>(null)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [dashboardLoading, setDashboardLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [liveMode, setLiveMode] = useState(false)
  const liveRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [search, setSearch] = useState("")
  const [moduleFilter, setModuleFilter] = useState("")
  const [severityFilter, setSeverityFilter] = useState("")
  const [resultFilter, setResultFilter] = useState("")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")

  const activeFilters = [
    ...(moduleFilter ? [{ label: `Module: ${moduleFilter}`, onRemove: () => setModuleFilter("") }] : []),
    ...(severityFilter ? [{ label: `Severity: ${severityFilter}`, onRemove: () => setSeverityFilter("") }] : []),
    ...(resultFilter ? [{ label: `Result: ${resultFilter}`, onRemove: () => setResultFilter("") }] : []),
    ...(fromDate ? [{ label: `From: ${fromDate}`, onRemove: () => setFromDate("") }] : []),
    ...(toDate ? [{ label: `To: ${toDate}`, onRemove: () => setToDate("") }] : []),
  ]

  const fetchDashboard = useCallback(async () => {
    try {
      const data = await auditApi.dashboard()
      setDashboard(data)
    } catch { }
    setDashboardLoading(false)
  }, [])

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const data = await auditApi.list({
        page,
        pageSize: 50,
        search: search || undefined,
        module: moduleFilter || undefined,
        severity: severityFilter || undefined,
        result: resultFilter || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
      })
      setLogs(data.items)
      setTotal(data.total)
      setTotalPages(data.totalPages)
    } catch { }
    setLoading(false)
  }, [page, search, moduleFilter, severityFilter, resultFilter, fromDate, toDate])

  useEffect(() => { fetchDashboard() }, [fetchDashboard])
  useEffect(() => { fetchLogs() }, [fetchLogs])

  useEffect(() => {
    if (liveMode) {
      liveRef.current = setInterval(fetchLogs, 10000)
    } else {
      if (liveRef.current) clearInterval(liveRef.current)
    }
    return () => { if (liveRef.current) clearInterval(liveRef.current) }
  }, [liveMode, fetchLogs])

  const openDetail = (log: AuditLog) => { setSelectedLog(log); setDetailOpen(true) }
  const clearFilters = () => { setModuleFilter(""); setSeverityFilter(""); setResultFilter(""); setFromDate(""); setToDate(""); setSearch("") }

  const handleExport = (format: "csv" | "json") => {
    auditApi.export(format, {
      from: fromDate || undefined,
      to: toDate || undefined,
      module: moduleFilter || undefined,
      severity: severityFilter || undefined,
    })
  }

  const SeverityBadge = ({ severity }: { severity: string }) => {
    const Icon = severityIcon[severity] || Info
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${severityColor[severity] || severityColor.info}`}>
        <Icon className="h-3 w-3" />{severity}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">Audit Logs Center</h1>
          <p className="text-muted-foreground">Complete activity monitoring across all modules</p>
        </div>
        <div className="flex gap-2">
          <Button variant={liveMode ? "default" : "outline"} size="sm" onClick={() => setLiveMode(!liveMode)}>
            {liveMode ? <><Bell className="mr-2 h-4 w-4" />Live</> : <><BellOff className="mr-2 h-4 w-4" />Paused</>}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchLogs}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("csv")}><FileDown className="mr-2 h-4 w-4" />CSV</Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("json")}><Download className="mr-2 h-4 w-4" />JSON</Button>
        </div>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <StatsCard label="Events Today" value={dashboard?.totalToday ?? 0} icon={Activity} color="border-blue-500" loading={dashboardLoading} />
        <StatsCard label="Critical" value={dashboard?.criticalToday ?? 0} icon={ShieldAlert} color="border-red-500" loading={dashboardLoading} />
        <StatsCard label="Failed Logins" value={dashboard?.failedLogins ?? 0} icon={XCircle} color="border-orange-500" loading={dashboardLoading} />
        <StatsCard label="Admin Actions" value={dashboard?.adminActions ?? 0} icon={Users} color="border-purple-500" loading={dashboardLoading} />
        <StatsCard label="API Requests" value={dashboard?.apiRequests ?? 0} icon={Activity} color="border-cyan-500" loading={dashboardLoading} />
        <StatsCard label="Fraud Alerts" value={dashboard?.fraudAlerts ?? 0} icon={Flag} color="border-red-500" loading={dashboardLoading} />
        <StatsCard label="KYC Reviews" value={dashboard?.kycReviews ?? 0} icon={Shield} color="border-green-500" loading={dashboardLoading} />
        <StatsCard label="System Errors" value={dashboard?.systemErrors ?? 0} icon={AlertTriangle} color="border-yellow-500" loading={dashboardLoading} />
      </div>

      {/* Filters */}
      <Card className="glass-card rounded-2xl p-4">
        <CardContent className="p-0 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by user, email, action, resource, IP..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 rounded-xl"
              />
            </div>
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger className="w-40 rounded-xl"><SelectValue placeholder="All modules" /></SelectTrigger>
              <SelectContent>
                <SelectItem value=" ">All modules</SelectItem>
                {modules.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-32 rounded-xl"><SelectValue placeholder="Severity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value=" ">All severities</SelectItem>
                {severities.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={resultFilter} onValueChange={setResultFilter}>
              <SelectTrigger className="w-28 rounded-xl"><SelectValue placeholder="Result" /></SelectTrigger>
              <SelectContent>
                <SelectItem value=" ">All results</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-36 rounded-xl" />
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-36 rounded-xl" />
          </div>
          {activeFilters.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              {activeFilters.map((f, i) => <FilterChip key={i} label={f.label} onRemove={f.onRemove} />)}
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={clearFilters}>Clear all</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Severity Distribution */}
      {dashboard && !dashboardLoading && (
        <div className="flex gap-2 items-center">
          {severities.map((s) => {
            const count = dashboard.severityDistribution.find((d) => d.severity === s)?.count ?? 0
            return (
              <div key={s} className="flex-1">
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${
                    s === "critical" ? "bg-red-500" : s === "high" ? "bg-orange-500" : s === "medium" ? "bg-yellow-500" : s === "low" ? "bg-green-500" : "bg-blue-500"
                  }`} style={{ width: `${Math.min(100, (count / Math.max(1, ...dashboard.severityDistribution.map((d) => d.count))) * 100)}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 text-center">{s}: {count}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Log Table */}
      <Card className="glass-card rounded-2xl p-6">
        <CardHeader className="px-0 pt-0 flex flex-row items-center justify-between">
          <CardTitle>Activity Logs <span className="text-sm font-normal text-muted-foreground">({total} events)</span></CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No audit logs found</p>
              {activeFilters.length > 0 && <Button variant="link" size="sm" onClick={clearFilters} className="text-xs">Clear filters</Button>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log, i) => (
                    <motion.tr key={log.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.015 }}
                      className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
                      onClick={() => openDetail(log)}
                    >
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString("en-ZA", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full gradient-bg flex items-center justify-center text-white font-semibold text-xs">
                            {log.userName.charAt(0).toUpperCase() || "?"}
                          </div>
                          <div>
                            <p className="text-sm font-medium leading-tight">{log.userName || "System"}</p>
                            <p className="text-[10px] text-muted-foreground">{log.userRole}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{log.action}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs">{log.module}</Badge></TableCell>
                      <TableCell className="max-w-[150px]">
                        <p className="text-sm truncate" title={log.resource}>{log.resource}</p>
                        {log.resourceId && <p className="text-[10px] text-muted-foreground truncate">ID: {log.resourceId}</p>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={resultColor[log.result] as "success" | "destructive" | "secondary" || "secondary"} className="text-xs">
                          {log.result}
                        </Badge>
                      </TableCell>
                      <TableCell><SeverityBadge severity={log.severity} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">{log.ipAddress}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{log.country || "-"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-6 w-6"><Eye className="h-3.5 w-3.5" /></Button>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
              <p className="text-xs text-muted-foreground">Page {page} of {totalPages} ({total} total)</p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, totalPages - 4))
                  const p = start + i
                  return (
                    <Button key={p} variant={p === page ? "default" : "outline"} size="sm" onClick={() => setPage(p)} className="w-8">
                      {p}
                    </Button>
                  )
                })}
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Drawer */}
      {detailOpen && selectedLog && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDetailOpen(false)} />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative w-full max-w-2xl bg-background border-l border-border shadow-2xl overflow-y-auto"
          >
            <div className="sticky top-0 bg-background/95 backdrop-blur-xl border-b border-border p-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${selectedLog.severity === "critical" ? "bg-red-500" : selectedLog.severity === "high" ? "bg-orange-500" : selectedLog.severity === "medium" ? "bg-yellow-500" : "bg-blue-500"}`} />
                <h2 className="font-semibold">Event Details</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setDetailOpen(false)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold">{selectedLog.action}</p>
                  <p className="text-sm text-muted-foreground">{new Date(selectedLog.createdAt).toLocaleString("en-ZA", { dateStyle: "full", timeStyle: "medium" })}</p>
                </div>
                <div className="flex gap-2">
                  <SeverityBadge severity={selectedLog.severity} />
                  <Badge variant={resultColor[selectedLog.result] as "success" | "destructive" | "secondary" || "secondary"}>{selectedLog.result}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card className="glass-card rounded-xl p-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" /> User
                  </h3>
                  <div className="space-y-1.5">
                    <p className="text-sm font-medium">{selectedLog.userName || "System"}</p>
                    <p className="text-xs text-muted-foreground">{selectedLog.email}</p>
                    <Badge variant="outline" className="text-xs">{selectedLog.userRole || "N/A"}</Badge>
                  </div>
                </Card>
                <Card className="glass-card rounded-xl p-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5" /> Request
                  </h3>
                  <div className="space-y-1.5">
                    <p className="text-xs"><span className="text-muted-foreground">Method:</span> <span className="font-mono">{selectedLog.httpMethod}</span></p>
                    <p className="text-xs truncate"><span className="text-muted-foreground">Endpoint:</span> {selectedLog.endpoint}</p>
                    <p className="text-xs"><span className="text-muted-foreground">Status:</span> {selectedLog.httpStatus ?? "-"}</p>
                    {selectedLog.responseTimeMs != null && <p className="text-xs"><span className="text-muted-foreground">Response:</span> {selectedLog.responseTimeMs}ms</p>}
                  </div>
                </Card>
                <Card className="glass-card rounded-xl p-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Monitor className="h-3.5 w-3.5" /> Device
                  </h3>
                  <div className="space-y-1.5">
                    <p className="text-xs"><span className="text-muted-foreground">Browser:</span> {selectedLog.browser || "Unknown"}</p>
                    <p className="text-xs"><span className="text-muted-foreground">OS:</span> {selectedLog.operatingSystem || "Unknown"}</p>
                    {selectedLog.deviceType === "Mobile" ? <Smartphone className="h-4 w-4 text-muted-foreground" /> :
                     selectedLog.deviceType === "Tablet" ? <Smartphone className="h-4 w-4 text-muted-foreground rotate-90" /> :
                     <Laptop className="h-4 w-4 text-muted-foreground" />}
                    <p className="text-xs text-muted-foreground">{selectedLog.deviceType || "Unknown"}</p>
                  </div>
                </Card>
                <Card className="glass-card rounded-xl p-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> Location
                  </h3>
                  <div className="space-y-1.5">
                    <p className="text-xs"><span className="text-muted-foreground">IP:</span> <span className="font-mono">{selectedLog.ipAddress}</span></p>
                    <p className="text-xs"><span className="text-muted-foreground">Country:</span> {selectedLog.country || "-"}</p>
                    <p className="text-xs"><span className="text-muted-foreground">City:</span> {selectedLog.city || "-"}</p>
                    <p className="text-xs"><span className="text-muted-foreground">Location:</span> {selectedLog.location || "-"}</p>
                  </div>
                </Card>
              </div>

              <Card className="glass-card rounded-xl p-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5" /> Resource
                </h3>
                <div className="space-y-1.5">
                  <p className="text-xs"><span className="text-muted-foreground">Module:</span> {selectedLog.module}</p>
                  <p className="text-xs"><span className="text-muted-foreground">Resource:</span> {selectedLog.resource}</p>
                  <p className="text-xs"><span className="text-muted-foreground">Resource ID:</span> {selectedLog.resourceId || "-"}</p>
                </div>
              </Card>

              {(selectedLog.previousValue || selectedLog.newValue) && (
                <Card className="glass-card rounded-xl p-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Before / After</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1">Previous Value</p>
                      <pre className="text-xs bg-muted rounded-lg p-3 overflow-x-auto max-h-40">{selectedLog.previousValue || "-"}</pre>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1">New Value</p>
                      <pre className="text-xs bg-muted rounded-lg p-3 overflow-x-auto max-h-40">{selectedLog.newValue || "-"}</pre>
                    </div>
                  </div>
                </Card>
              )}

              <Card className="glass-card rounded-xl p-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Fingerprint className="h-3.5 w-3.5" /> Metadata
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div><span className="text-muted-foreground">Session ID:</span> <span className="font-mono">{selectedLog.sessionId || "-"}</span></div>
                  <div><span className="text-muted-foreground">Correlation ID:</span> <span className="font-mono">{selectedLog.correlationId?.slice(0, 8) || "-"}</span></div>
                  <div><span className="text-muted-foreground">Department:</span> {selectedLog.department || "-"}</div>
                  <div><span className="text-muted-foreground">Security Alert:</span> {selectedLog.isSecurityAlert ? <Badge variant="destructive" className="text-[10px] ml-1">Yes</Badge> : "No"}</div>
                  {selectedLog.isSecurityAlert && (
                    <div><span className="text-muted-foreground">Acknowledged:</span> {selectedLog.isAcknowledged ? `Yes at ${new Date(selectedLog.acknowledgedAt || "").toLocaleString()}` : "No"}</div>
                  )}
                </div>
              </Card>
            </div>
          </motion.div>
        </div>
      )}

      {/* Security Alerts Tab */}
      <SecurityAlertsPanel onAcknowledge={fetchLogs} />
    </div>
  )
}

function SecurityAlertsPanel({ onAcknowledge }: { onAcknowledge: () => void }) {
  const [alerts, setAlerts] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)

  const fetchAlerts = useCallback(async () => {
    try {
      const data = await auditApi.securityAlerts({ acknowledged: false })
      setAlerts(data.items)
    } catch { }
    setLoading(false)
  }, [])

  useEffect(() => { fetchAlerts() }, [fetchAlerts])

  const handleAcknowledge = async (id: string) => {
    try {
      await auditApi.acknowledgeAlert(id)
      setAlerts((prev) => prev.filter((a) => a.id !== id))
      onAcknowledge()
    } catch { }
  }

  return (
    <Card className="glass-card rounded-2xl border-red-500/20">
      <CardHeader className="px-6 pt-5 pb-3 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-red-500" />
          <CardTitle className="text-base">Security Alerts {alerts.length > 0 && <span className="ml-1 text-red-500">({alerts.length})</span>}</CardTitle>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </Button>
      </CardHeader>
      {!collapsed && (
        <CardContent className="px-6 pb-5 pt-0">
          {loading ? (
            <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
          ) : alerts.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <CheckCircle className="h-4 w-4 text-green-500" /> No unacknowledged security alerts
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert, i) => (
                <motion.div key={alert.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-xl bg-red-500/5 border border-red-500/10"
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{alert.action} — {alert.module}</p>
                      <p className="text-xs text-muted-foreground">{alert.userName} · {alert.email} · {new Date(alert.createdAt).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{alert.resource} · IP: {alert.ipAddress}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="shrink-0" onClick={() => handleAcknowledge(alert.id)}>
                    <CheckCircle className="mr-1.5 h-3.5 w-3.5" /> Acknowledge
                  </Button>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
