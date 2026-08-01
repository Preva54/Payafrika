"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RefreshCw, Building2, Undo2, Loader2, Search } from "lucide-react"
import { adminApi, adminTransfersApi, type AdminPayment, type AdminTransferResponse, type TransferStatsResponse } from "@/lib/api"

const statusVariant: Record<string, "success" | "secondary" | "destructive" | "default" | "outline"> = {
  completed: "success",
  pending: "secondary",
  failed: "destructive",
  refunded: "default",
  successful: "success",
  reversed: "outline",
}

function formatMoney(amount: number, currency = "NGN"): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(amount)
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<AdminPayment[]>([])
  const [transfers, setTransfers] = useState<AdminTransferResponse[]>([])
  const [stats, setStats] = useState<TransferStatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [reversingId, setReversingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [reason, setReason] = useState("")
  const [actionError, setActionError] = useState("")

  const fetchAll = () => {
    setLoading(true)
    Promise.all([
      adminApi.payments().catch(() => [] as AdminPayment[]),
      adminTransfersApi.list().catch(() => [] as AdminTransferResponse[]),
      adminTransfersApi.stats().catch(() => null),
    ])
      .then(([p, t, s]) => {
        setPayments(p)
        setTransfers(t)
        setStats(s)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchAll() }, [])

  const reverseTransfer = async (id: string) => {
    if (reversingId) return
    setReversingId(id)
    setActionError("")
    try {
      await adminTransfersApi.reverse(id, reason || "Reversed by admin")
      setTransfers(prev => prev.map(t => t.id === id ? { ...t, status: "reversed" } : t))
      setConfirmId(null)
      setReason("")
      fetchAll()
    } catch {
      setActionError("Reversal failed. Only successful transfers can be reversed.")
    } finally {
      setReversingId(null)
    }
  }

  if (loading && payments.length === 0 && transfers.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-48" />
        <div className="space-y-2">{[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
      </div>
    )
  }

  const filteredTransfers = transfers.filter(t => {
    if (search && !`${t.accountName} ${t.bankName} ${t.reference} ${t.userName}`.toLowerCase().includes(search.toLowerCase())) return false
    if (statusFilter && t.status !== statusFilter) return false
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">Payments</h1>
          <p className="text-muted-foreground">{payments.length} transactions • {transfers.length} bank transfers</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAll}>
          <RefreshCw className="mr-2 h-4 w-4" />Refresh
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: "Total", value: stats.totalTransfers },
            { label: "Successful", value: stats.successful },
            { label: "Pending", value: stats.pending },
            { label: "Failed", value: stats.failed },
            { label: "Reversed", value: stats.reversed },
            { label: "Volume", value: formatMoney(stats.totalValue) },
            { label: "Fees", value: formatMoney(stats.feesCollected) },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-border p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
              <p className="font-semibold text-sm truncate">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search transfers (user, bank, account, reference)..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2">
          {["", "successful", "pending", "failed", "reversed"].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"}`}
            >
              {s ? s.charAt(0).toUpperCase() + s.slice(1) : "All"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Building2 className="h-5 w-5" />Bank Transfers
        </h2>
        {actionError && <p className="text-xs text-destructive mb-2">{actionError}</p>}
        <div className="space-y-2">
          {filteredTransfers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm rounded-xl border border-dashed">No bank transfers found</div>
          ) : (
            filteredTransfers.map((t, i) => (
              <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: i * 0.03 }}
                className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-card border border-border hover:shadow-card-hover transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{t.accountName} <span className="text-muted-foreground">• {t.userName}</span></p>
                    <p className="text-xs text-muted-foreground">
                      {t.bankName} • ****{t.accountNumber.slice(-4)} • {t.reference}
                    </p>
                    {t.failureReason && <p className="text-xs text-destructive mt-0.5">{t.failureReason}</p>}
                    {t.reversalReason && <p className="text-xs text-muted-foreground mt-0.5">Reversal: {t.reversalReason}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-semibold text-sm">{formatMoney(t.totalDebit, t.currency)}</p>
                    <p className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleString()}</p>
                  </div>
                  <Badge variant={statusVariant[t.status] ?? "secondary"} className="text-[10px]">{t.status}</Badge>
                  {t.status === "successful" && (
                    confirmId === t.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          className="w-36 h-8 text-xs"
                          placeholder="Reason (optional)"
                          value={reason}
                          onChange={e => setReason(e.target.value)}
                        />
                        <Button size="sm" variant="destructive" onClick={() => reverseTransfer(t.id)} disabled={!!reversingId}>
                          {reversingId === t.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Undo2 className="h-3 w-3" />}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setConfirmId(null); setReason("") }}>Cancel</Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setConfirmId(t.id)}>
                        <Undo2 className="mr-2 h-3 w-3" />Reverse
                      </Button>
                    )
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Wallet Transactions</h2>
        <div className="space-y-2">
          {payments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">No payments yet</div>
          ) : (
            payments.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: i * 0.03 }}
                className="flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:shadow-card-hover transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                    {p.userName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{p.userName}</p>
                    <p className="text-xs text-muted-foreground">{p.description ?? p.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-sm">R {p.amount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</span>
                  <Badge variant="secondary" className="text-[10px]">{p.type}</Badge>
                  <Badge variant={statusVariant[p.status] ?? "secondary"} className="text-[10px]">{p.status}</Badge>
                  <span className="text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleDateString()}</span>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
