"use client"

import { useEffect, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  RefreshCw, Search, Eye, ChevronLeft, ChevronRight,
  ArrowUpRight, ArrowDownRight, Clock, Loader2,
  XCircle, Ban, CheckCircle2, Filter, AlertTriangle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { exchangeApi, type CustomerExchange, type AdminExchangeStats } from "@/lib/exchange-api"
import { cn, formatCurrency } from "@/lib/utils"

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: "bg-green-500/10 text-green-600 border-green-200 dark:border-green-800",
    failed: "bg-red-500/10 text-red-600 border-red-200 dark:border-red-800",
    reversed: "bg-yellow-500/10 text-yellow-600 border-yellow-200 dark:border-yellow-800",
  }
  const icons: Record<string, React.ReactNode> = {
    completed: <CheckCircle2 className="h-3 w-3" />,
    failed: <XCircle className="h-3 w-3" />,
    reversed: <Ban className="h-3 w-3" />,
  }
  return (
    <Badge variant="outline" className={cn("gap-1 capitalize", styles[status])}>
      {icons[status]} {status}
    </Badge>
  )
}

export default function AdminManagedExchangesPage() {
  const [stats, setStats] = useState<AdminExchangeStats | null>(null)
  const [exchanges, setExchanges] = useState<CustomerExchange[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [limit] = useState(15)

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const [selected, setSelected] = useState<CustomerExchange | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [showReverse, setShowReverse] = useState(false)
  const [reverseReason, setReverseReason] = useState("")
  const [actionLoading, setActionLoading] = useState(false)
  const [actionMessage, setActionMessage] = useState("")

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [sRes, eRes] = await Promise.all([
        exchangeApi.exchanges.stats(),
        exchangeApi.exchanges.list({
          page, limit,
          status: statusFilter || undefined,
          search: search || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        }),
      ])
      setStats(sRes)
      setExchanges(eRes.data)
      setTotal(eRes.total)
    } catch {}
    setLoading(false)
  }, [page, limit, statusFilter, search, dateFrom, dateTo])

  useEffect(() => { fetchData() }, [fetchData])

  const showMsg = (msg: string) => {
    setActionMessage(msg)
    setTimeout(() => setActionMessage(""), 4000)
  }

  const handleReverse = async () => {
    if (!selected || !reverseReason) return
    setActionLoading(true)
    try {
      await exchangeApi.exchanges.reverse(selected.id, { reason: reverseReason })
      showMsg(`Exchange ${selected.reference} has been reversed.`)
      setShowReverse(false)
      setReverseReason("")
      setSelected(null)
      fetchData()
    } catch (err: unknown) {
      showMsg(err instanceof Error ? err.message : "Failed to reverse exchange")
    }
    setActionLoading(false)
  }

  const openDetail = (e: CustomerExchange) => {
    setSelected(e)
    setShowDetail(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customer Exchanges</h1>
          <p className="text-muted-foreground">Monitor and manage all currency exchanges</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { label: "Today's Exchanges", value: stats?.todaysExchanges ?? 0, color: "text-blue-500", format: false },
          { label: "Total FX Volume", value: stats?.totalFxVolume ?? 0, color: "text-green-500", format: true },
          { label: "FX Revenue", value: stats?.fxRevenue ?? 0, color: "text-emerald-500", format: true },
          { label: "Avg Exchange Size", value: stats?.averageExchangeSize ?? 0, color: "text-purple-500", format: true },
          { label: "Failed", value: stats?.failedExchanges ?? 0, color: "text-red-500", format: false },
          { label: "Top Pair", value: stats?.mostTradedPair ?? "N/A", color: "text-orange-500", format: false },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className={cn("text-xl font-bold truncate", item.color)}>
                {item.format ? formatCurrency(Number(item.value)) : String(item.value)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by reference or customer..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-1" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="reversed">Reversed</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1) }} className="w-[150px]" />
            <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1) }} className="w-[150px]" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : exchanges.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <RefreshCw className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No exchanges found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Amount Sent</TableHead>
                  <TableHead>Amount Received</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exchanges.map((exc) => (
                  <TableRow key={exc.id}>
                    <TableCell className="font-mono text-xs">{exc.reference}</TableCell>
                    <TableCell className="text-sm">{exc.user?.fullName ?? "—"}</TableCell>
                    <TableCell>{exc.fromCurrency}</TableCell>
                    <TableCell>{exc.toCurrency}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(exc.amount)}</TableCell>
                    <TableCell>{formatCurrency(exc.convertedAmount)}</TableCell>
                    <TableCell className="font-mono text-xs">{exc.rate.toFixed(4)}</TableCell>
                    <TableCell><StatusBadge status={exc.status} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(exc.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openDetail(exc)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        {total > limit && (
          <CardFooter className="flex justify-between p-4">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {Math.ceil(total / limit)}
            </span>
            <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / limit)} onClick={() => setPage((p) => p + 1)}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardFooter>
        )}
      </Card>

      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Exchange Details</DialogTitle>
            <DialogDescription>Reference: {selected?.reference}</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <StatusBadge status={selected.status} />
                <span className="text-xs text-muted-foreground">{formatDate(selected.createdAt)}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="glass rounded-xl p-4">
                  <p className="text-xs text-muted-foreground mb-1">From</p>
                  <p className="text-lg font-bold">{selected.fromCurrency}</p>
                  <p className="text-sm text-muted-foreground">-{formatCurrency(selected.amount)}</p>
                </div>
                <div className="glass rounded-xl p-4">
                  <p className="text-xs text-muted-foreground mb-1">To</p>
                  <p className="text-lg font-bold">{selected.toCurrency}</p>
                  <p className="text-sm text-green-500">+{formatCurrency(selected.convertedAmount)}</p>
                </div>
              </div>

              <div className="glass rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Exchange Rate</span>
                  <span className="font-mono">1 {selected.fromCurrency} = {selected.rate.toFixed(4)} {selected.toCurrency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fee</span>
                  <span>{formatCurrency(selected.fee)}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Source Balance Before</span>
                  <span>{formatCurrency(selected.sourceBalanceBefore)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Source Balance After</span>
                  <span>{formatCurrency(selected.sourceBalanceAfter)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dest Balance Before</span>
                  <span>{formatCurrency(selected.destBalanceBefore)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dest Balance After</span>
                  <span>{formatCurrency(selected.destBalanceAfter)}</span>
                </div>
              </div>

              {selected.notes && (
                <div className="bg-blue-500/10 rounded-xl p-4 text-sm">
                  <p className="font-medium text-blue-500 mb-1">Notes</p>
                  <p>{selected.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {selected?.status === "completed" && (
              <Button variant="destructive" onClick={() => { setShowDetail(false); setShowReverse(true) }}>
                <Ban className="h-4 w-4 mr-1" /> Reverse Exchange
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showReverse} onOpenChange={setShowReverse}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Reverse Exchange</DialogTitle>
            <DialogDescription>
              This will reverse the exchange {selected?.reference}. Source and destination balances will be restored.
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="glass rounded-xl p-4 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">From</span>
                  <span>{selected.fromCurrency} {formatCurrency(selected.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">To</span>
                  <span>{selected.toCurrency} {formatCurrency(selected.convertedAmount)}</span>
                </div>
              </div>
              <div>
                <Label>Reason for Reversal *</Label>
                <Textarea
                  placeholder="Required: explain why this exchange is being reversed"
                  value={reverseReason}
                  onChange={(e) => setReverseReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReverse(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReverse} disabled={actionLoading || !reverseReason}>
              {actionLoading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Reversing...</> : "Confirm Reversal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AnimatePresence>
        {actionMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 right-6 bg-primary text-primary-foreground px-4 py-3 rounded-xl shadow-lg text-sm font-medium z-50"
          >
            {actionMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
