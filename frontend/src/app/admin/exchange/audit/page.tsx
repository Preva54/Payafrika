"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { exchangeApi, type FxAuditLog } from "@/lib/exchange-api"
import {
  Search, RefreshCw, Filter, ChevronLeft, ChevronRight,
  Eye, AlertTriangle, History, FileText,
} from "lucide-react"

const entityTypeColors: Record<string, string> = {
  exchange_rate: "bg-blue-500/10 text-blue-500",
  currency_pair: "bg-emerald-500/10 text-emerald-500",
  provider: "bg-purple-500/10 text-purple-500",
  margin: "bg-amber-500/10 text-amber-500",
  conversion_rule: "bg-cyan-500/10 text-cyan-500",
  alert: "bg-orange-500/10 text-orange-500",
  currency: "bg-pink-500/10 text-pink-500",
}

const entityTypeOptions = [
  { value: "", label: "All Types" },
  { value: "exchange_rate", label: "Exchange Rate" },
  { value: "currency_pair", label: "Currency Pair" },
  { value: "provider", label: "Provider" },
  { value: "margin", label: "Margin" },
  { value: "conversion_rule", label: "Conversion Rule" },
  { value: "alert", label: "Alert" },
  { value: "currency", label: "Currency" },
]

const actionOptions = [
  { value: "", label: "All Actions" },
  { value: "create", label: "Create" },
  { value: "update", label: "Update" },
  { value: "delete", label: "Delete" },
  { value: "toggle", label: "Toggle" },
  { value: "sync", label: "Sync" },
  { value: "lock", label: "Lock" },
  { value: "unlock", label: "Unlock" },
]

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-ZA", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit",
  })
}

function JsonViewer({ label, json }: { label: string; json?: string | null }) {
  let parsed: unknown = null
  if (json) {
    try { parsed = JSON.parse(json) } catch { parsed = json }
  }
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
      <pre className="bg-muted/50 rounded-lg p-3 text-xs font-mono overflow-auto max-h-48 whitespace-pre-wrap">
        {parsed ? JSON.stringify(parsed, null, 2) : <span className="text-muted-foreground italic">None</span>}
      </pre>
    </div>
  )
}

export default function ExchangeAuditPage() {
  const [logs, setLogs] = useState<FxAuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [loading, setLoading] = useState(true)
  const [entityType, setEntityType] = useState("")
  const [action, setAction] = useState("")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [selected, setSelected] = useState<FxAuditLog | null>(null)

  const fetchLogs = (p = page) => {
    setLoading(true)
    exchangeApi.auditLogs.getAll({
      entityType: entityType || undefined,
      action: action || undefined,
      from: fromDate || undefined,
      to: toDate || undefined,
      page: p,
      pageSize,
    })
      .then((res) => {
        setLogs(res.logs)
        setTotal(res.total)
        setPage(res.page)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchLogs() }, [])

  const handleFilter = () => {
    setPage(1)
    fetchLogs(1)
  }

  const handleReset = () => {
    setEntityType("")
    setAction("")
    setFromDate("")
    setToDate("")
    setPage(1)
    fetchLogs(1)
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">FX Audit Logs</h1>
          <p className="text-sm text-muted-foreground">Track all exchange rate and configuration changes</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchLogs()}>
          <RefreshCw className="mr-2 h-4 w-4" />Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="rounded-2xl bg-background/95 backdrop-blur-xl">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Logs</p>
            <p className="text-xl font-bold mt-1">{total}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl bg-background/95 backdrop-blur-xl">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Unique Users</p>
            <p className="text-xl font-bold mt-1">{new Set(logs.map((l) => l.userName)).size}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl bg-background/95 backdrop-blur-xl">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Entity Types</p>
            <p className="text-xl font-bold mt-1">{new Set(logs.map((l) => l.entityType)).size}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl bg-background/95 backdrop-blur-xl">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Current Page</p>
            <p className="text-xl font-bold mt-1">{page} / {totalPages || 1}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl bg-background/95 backdrop-blur-xl p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={entityType} onValueChange={setEntityType}>
              <SelectTrigger className="w-32 h-9 text-xs">
                <SelectValue placeholder="Entity Type" />
              </SelectTrigger>
              <SelectContent>
                {entityTypeOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger className="w-28 h-9 text-xs">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                {actionOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-9 w-34 text-xs" />
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-9 w-34 text-xs" />
          <Button variant="default" size="sm" onClick={handleFilter}>
            <Search className="w-3.5 h-3.5 mr-1" /> Search
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Reset
          </Button>
        </div>
      </Card>

      <Card className="rounded-2xl bg-background/95 backdrop-blur-xl">
        <CardHeader className="px-6 pt-6 pb-0">
          <CardTitle className="text-lg font-semibold">
            Audit Logs
            <span className="text-muted-foreground font-normal ml-2">({total})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <History className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-lg font-medium">No audit logs found</p>
              <p className="text-sm">{action || entityType || fromDate ? "Try different filter criteria" : "No changes have been recorded yet"}</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity Type</TableHead>
                    <TableHead className="hidden md:table-cell">Entity ID</TableHead>
                    <TableHead className="hidden md:table-cell">IP Address</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log, i) => (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.015 }}
                      className="border-b transition-colors hover:bg-muted/30 cursor-pointer"
                      onClick={() => setSelected(log)}
                    >
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(log.createdAt)}</TableCell>
                      <TableCell className="text-sm font-medium">{log.userName}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px] font-mono">{log.action}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-[10px] font-medium", entityTypeColors[log.entityType] || "")}>
                          {log.entityType.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs font-mono text-muted-foreground">{log.entityId || "—"}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{log.ipAddress || "—"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setSelected(log) }} title="View Details">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <span className="text-xs text-muted-foreground">
                    Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => fetchLogs(page - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground px-2">{page} / {totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => fetchLogs(page + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
            <DialogDescription>Full change details for this audit entry</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Timestamp</label>
                  <p className="text-sm">{formatDate(selected.createdAt)}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">User</label>
                  <p className="text-sm font-medium">{selected.userName}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Action</label>
                  <Badge variant="secondary" className="text-xs mt-1">{selected.action}</Badge>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Entity Type</label>
                  <p className="text-sm">{selected.entityType}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Entity ID</label>
                  <p className="text-sm font-mono text-muted-foreground">{selected.entityId || "—"}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">IP Address</label>
                  <p className="text-sm font-mono text-muted-foreground">{selected.ipAddress || "—"}</p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <JsonViewer label="Previous Value" json={selected.previousValueJson} />
                <JsonViewer label="New Value" json={selected.newValueJson} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
