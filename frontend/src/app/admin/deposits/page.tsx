"use client"

import { useEffect, useState, useCallback } from "react"
import { motion } from "framer-motion"
import {
  Search, Eye, CheckCircle2, XCircle, AlertCircle,
  Clock, RefreshCw, Download, DollarSign, FileText, User,
  MessageSquare, Plus, Loader2, X, Shield,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { adminDepositsApi, type DepositResponse, type DepositStatsResponse } from "@/lib/api"
import { cn, formatCurrency, formatDate } from "@/lib/utils"

const REJECT_REASONS = [
  "Proof unreadable",
  "Deposit not received",
  "Wrong reference",
  "Duplicate submission",
  "Incorrect amount",
  "Fraud suspected",
  "Other",
]

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-600 border-yellow-200 dark:border-yellow-800",
    processing: "bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800",
    approved: "bg-green-500/10 text-green-600 border-green-200 dark:border-green-800",
    rejected: "bg-red-500/10 text-red-600 border-red-200 dark:border-red-800",
  }
  const icons: Record<string, React.ReactNode> = {
    pending: <Clock className="h-3 w-3" />,
    processing: <Loader2 className="h-3 w-3 animate-spin" />,
    approved: <CheckCircle2 className="h-3 w-3" />,
    rejected: <XCircle className="h-3 w-3" />,
  }
  return (
    <Badge variant="outline" className={cn("gap-1 capitalize", styles[status])}>
      {icons[status]} {status}
    </Badge>
  )
}

function Timeline({ status, createdAt, approvedAt }: { status: string; createdAt: string; approvedAt?: string | null }) {
  const isPending = status === "pending" || status === "processing"
  const isApproved = status === "approved"
  const isRejected = status === "rejected"
  const isDone = isApproved || isRejected
  const steps = [
    { label: "Submitted", done: true, time: createdAt },
    { label: "Awaiting Verification", active: isPending, done: isDone },
    { label: isRejected ? "Rejected" : "Approved", active: isDone, done: isDone, time: approvedAt },
    { label: "Wallet Updated", done: isApproved },
  ]

  return (
    <div className="space-y-0">
      {steps.map((item, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <div className={cn(
              "w-3 h-3 rounded-full border-2 shrink-0",
              item.active && !item.done ? "border-yellow-500 bg-yellow-500 animate-pulse" :
              item.done ? "border-green-500 bg-green-500" : "border-muted-foreground bg-muted"
            )} />
            {i < steps.length - 1 && <div className={cn("w-0.5 h-6", item.done ? "bg-green-500" : "bg-border")} />}
          </div>
          <div className="pb-3">
            <p className={cn("text-sm", item.active ? "font-medium text-foreground" : item.done ? "text-green-600" : "text-muted-foreground")}>
              {item.label}
            </p>
            {item.time && <p className="text-[10px] text-muted-foreground">{formatDate(item.time)}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AdminDepositsPage() {
  const [deposits, setDeposits] = useState<DepositResponse[]>([])
  const [stats, setStats] = useState<DepositStatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)

  const [statusFilter, setStatusFilter] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [bankFilter, setBankFilter] = useState("")

  const [selectedDeposit, setSelectedDeposit] = useState<DepositResponse | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const [approveOpen, setApproveOpen] = useState(false)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [approving, setApproving] = useState(false)

  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectCategory, setRejectCategory] = useState("")
  const [rejectReason, setRejectReason] = useState("")
  const [rejecting, setRejecting] = useState(false)

  const [requestingInfo, setRequestingInfo] = useState(false)
  const [actionMsg, setActionMsg] = useState("")

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [s, res] = await Promise.all([
        adminDepositsApi.stats(),
        adminDepositsApi.list({ page, limit, status: statusFilter || undefined, search: searchQuery || undefined, bank: bankFilter || undefined }),
      ])
      setStats(s)
      setDeposits(res.data)
      setTotal(res.total)
    } catch { }
    setLoading(false)
  }, [page, limit, statusFilter, searchQuery, bankFilter])

  useEffect(() => { fetchData() }, [fetchData])

  const handleView = async (id: string) => {
    try {
      const d = await adminDepositsApi.get(id)
      setSelectedDeposit(d)
      setDetailOpen(true)
    } catch { }
  }

  const handleApprove = async () => {
    if (!approvingId) return
    setApproving(true)
    try {
      await adminDepositsApi.approve(approvingId)
      setActionMsg("Deposit approved successfully. Wallet credited.")
      setApproveOpen(false)
      fetchData()
      if (selectedDeposit?.id === approvingId) {
        const updated = await adminDepositsApi.get(approvingId)
        setSelectedDeposit(updated)
      }
    } catch { }
    setApproving(false)
  }

  const handleReject = async () => {
    if (!rejectingId || !rejectCategory) return
    setRejecting(true)
    try {
      await adminDepositsApi.reject(rejectingId, { category: rejectCategory, reason: rejectReason || undefined })
      setActionMsg("Deposit rejected.")
      setRejectOpen(false)
      fetchData()
      if (selectedDeposit?.id === rejectingId) {
        const updated = await adminDepositsApi.get(rejectingId)
        setSelectedDeposit(updated)
      }
    } catch { }
    setRejecting(false); setRejectCategory(""); setRejectReason("")
  }

  const handleRequestInfo = async () => {
    if (!selectedDeposit) return
    setRequestingInfo(true)
    try {
      await adminDepositsApi.requestInfo(selectedDeposit.id)
      setActionMsg("More information requested from customer.")
      setDetailOpen(false)
      fetchData()
    } catch { }
    setRequestingInfo(false)
  }

  const handleDownloadProof = (d: DepositResponse) => {
    if (d.proofFileName) {
      const url = adminDepositsApi.getProofUrl(d.id)
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
      fetch(url, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } })
        .then(res => res.blob())
        .then(blob => {
          const a = document.createElement("a")
          a.href = URL.createObjectURL(blob)
          a.download = d.proofFileName || "proof"
          a.click()
          URL.revokeObjectURL(a.href)
        })
        .catch(() => { window.open(url, "_blank") })
    }
  }

  const statsCards = stats ? [
    { label: "Pending Deposits", value: stats.pendingDeposits, change: `${formatCurrency(stats.pendingValue)} pending`, icon: Clock, color: "text-yellow-500", bg: "bg-yellow-500/10" },
    { label: "Today's Deposits", value: stats.todaysDeposits, change: "Submitted today", icon: Plus, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Approved Today", value: stats.approvedToday, change: "Approved", icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10" },
    { label: "Rejected Today", value: stats.rejectedToday, change: "Rejected", icon: XCircle, color: "text-red-500", bg: "bg-red-500/10" },
    { label: "Total Deposit Value", value: formatCurrency(stats.totalDepositValue), change: "All time approved", icon: DollarSign, color: "text-primary", bg: "gradient-bg" },
  ] : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Finance - Deposits</h1>
          <p className="text-muted-foreground">Manage and verify customer deposit requests</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="mr-2 h-4 w-4" />Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {loading ? [...Array(5)].map((_, i) => (
          <Card key={i}><CardContent className="p-6"><Skeleton className="h-10 w-16" /><Skeleton className="h-4 w-20 mt-2" /></CardContent></Card>
        )) : statsCards.map((stat, i) => {
          const Icon = stat.icon
          return (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                  <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center", stat.bg)}>
                    <Icon className={cn("h-5 w-5", stat.color === "text-primary" ? "text-white" : stat.color)} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs mb-1 block">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Reference, name, or email..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setPage(1) }}
                />
              </div>
            </div>
            <div className="w-40">
              <Label className="text-xs mb-1 block">Status</Label>
              <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1) }}>
                <SelectTrigger><SelectValue placeholder="All Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value=" ">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-40">
              <Label className="text-xs mb-1 block">Bank</Label>
              <Input placeholder="Filter by bank" value={bankFilter} onChange={e => { setBankFilter(e.target.value); setPage(1) }} />
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(""); setStatusFilter(""); setBankFilter(""); setPage(1) }}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Deposits Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deposit ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead>Proof</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deposits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      No deposits found matching your filters.
                    </TableCell>
                  </TableRow>
                ) : deposits.map((d) => (
                  <TableRow key={d.id} className="group">
                    <TableCell className="font-mono text-xs">{d.id.slice(0, 8)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{d.userName}</p>
                          <p className="text-xs text-muted-foreground">{d.userEmail}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{d.reference}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(d.amount, d.currency)}</TableCell>
                    <TableCell className="text-xs">{d.bankName}</TableCell>
                    <TableCell>
                      {d.proofFileName ? (
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleDownloadProof(d)}>
                          <Download className="h-3 w-3 mr-1" />View
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{formatDate(d.createdAt)}</TableCell>
                    <TableCell><StatusBadge status={d.status} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleView(d.id)} title="View">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {d.status === "pending" && (
                          <>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-green-600" onClick={() => { setApprovingId(d.id); setApproveOpen(true) }} title="Approve">
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600" onClick={() => { setRejectingId(d.id); setRejectOpen(true) }} title="Reject">
                              <XCircle className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-blue-600" onClick={async () => { try { await adminDepositsApi.requestInfo(d.id); setActionMsg("Info requested."); fetchData() } catch {} }} title="Request Info">
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {d.status === "processing" && (
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-blue-600" onClick={async () => { try { await adminDepositsApi.requestInfo(d.id); setActionMsg("Info re-requested."); fetchData() } catch {} }} title="Request Info">
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {total > limit && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * limit + 1}-{Math.min(page * limit, total)} of {total}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page * limit >= total} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Message Toast */}
      {actionMsg && (
        <div className="fixed bottom-4 right-4 z-50 p-4 rounded-xl bg-green-500/10 border border-green-200 dark:border-green-800 text-sm flex items-center gap-2 shadow-lg backdrop-blur-sm">
          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
          <span>{actionMsg}</span>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-2 shrink-0" onClick={() => setActionMsg("")}><X className="h-3 w-3" /></Button>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Deposit Details</DialogTitle>
            <DialogDescription>Reference: {selectedDeposit?.reference}</DialogDescription>
          </DialogHeader>
          {selectedDeposit && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <StatusBadge status={selectedDeposit.status} />
                <span className="text-2xl font-bold">{formatCurrency(selectedDeposit.amount, selectedDeposit.currency)}</span>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-3 p-4 rounded-xl bg-muted/50">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Customer Details</p>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{selectedDeposit.userName}</p>
                      <p className="text-xs text-muted-foreground">{selectedDeposit.userEmail}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3 p-4 rounded-xl bg-muted/50">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Deposit Info</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Reference</span><span className="font-mono">{selectedDeposit.reference}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Submitted</span><span>{formatDate(selectedDeposit.createdAt)}</span></div>
                    {selectedDeposit.approvedByName && (
                      <div className="flex justify-between"><span className="text-muted-foreground">Approved By</span><span>{selectedDeposit.approvedByName}</span></div>
                    )}
                    {selectedDeposit.approvedAt && (
                      <div className="flex justify-between"><span className="text-muted-foreground">Approved At</span><span>{formatDate(selectedDeposit.approvedAt)}</span></div>
                    )}
                  </div>
                </div>
                <div className="space-y-3 p-4 rounded-xl bg-muted/50">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Bank Details</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Bank</span><span>{selectedDeposit.bankName}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Holder</span><span>{selectedDeposit.accountHolderName}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Reference Used</span><span className="font-mono">{selectedDeposit.referenceUsed}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Transfer Date</span><span>{formatDate(selectedDeposit.transferDate)}</span></div>
                  </div>
                </div>
              </div>

              {/* Status Details + Proof */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-3 p-4 rounded-xl bg-muted/50">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Status Details</p>
                  {selectedDeposit.rejectionCategory && (
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Rejection Reason</span><span className="text-destructive">{selectedDeposit.rejectionCategory}</span></div>
                      {selectedDeposit.rejectionReason && <p className="text-xs text-muted-foreground mt-1">{selectedDeposit.rejectionReason}</p>}
                    </div>
                  )}
                  {selectedDeposit.notes && (
                    <div className="space-y-1 text-sm">
                      <p className="text-muted-foreground">Customer Notes</p>
                      <p className="text-xs">{selectedDeposit.notes}</p>
                    </div>
                  )}
                </div>
                <div className="space-y-3 p-4 rounded-xl bg-muted/50">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Proof of Payment</p>
                  {selectedDeposit.proofFileName ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="flex-1 truncate">{selectedDeposit.proofFileName}</span>
                        <Button variant="outline" size="sm" className="h-7" onClick={() => handleDownloadProof(selectedDeposit)}>
                          <Download className="h-3 w-3 mr-1" />Download
                        </Button>
                      </div>
                      {selectedDeposit.proofContentType?.startsWith("image/") && (
                        <div className="mt-2 rounded-lg overflow-hidden border">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={adminDepositsApi.getProofUrl(selectedDeposit.id)}
                            alt="Proof of Payment"
                            className="w-full h-48 object-contain bg-muted cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(adminDepositsApi.getProofUrl(selectedDeposit.id), "_blank")}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No proof uploaded yet.</p>
                  )}
                </div>
              </div>

              {/* Duplicate Detection */}
              <div className={cn("p-4 rounded-xl border", selectedDeposit.hasDuplicate ? "bg-red-500/5 border-red-200 dark:border-red-800" : "bg-muted/30")}>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Risk Assessment</p>
                <div className="flex items-center gap-4 text-sm flex-wrap">
                  {selectedDeposit.hasDuplicate ? (
                    <div className="flex items-center gap-1.5 text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      <span className="font-medium">Duplicate detected!</span>
                      {selectedDeposit.duplicateWarning && <span className="text-xs">- {selectedDeposit.duplicateWarning}</span>}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-green-600">
                      <Shield className="h-4 w-4" />
                      <span>No duplicates detected</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-yellow-600">
                    <AlertCircle className="h-4 w-4" />
                    <span>Manual review required</span>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Status Timeline</p>
                <Timeline
                  status={selectedDeposit.status}
                  createdAt={selectedDeposit.createdAt}
                  approvedAt={selectedDeposit.approvedAt}
                />
              </div>

              {/* Action Buttons */}
              {selectedDeposit.status === "pending" && (
                <div className="flex gap-3">
                  <Button variant="gradient" className="flex-1" onClick={() => { setDetailOpen(false); setApprovingId(selectedDeposit.id); setApproveOpen(true) }}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />Approve Deposit
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => { setDetailOpen(false); setRejectingId(selectedDeposit.id); setRejectOpen(true) }}>
                    <XCircle className="mr-2 h-4 w-4 text-destructive" />Reject Deposit
                  </Button>
                  <Button variant="outline" size="sm" disabled={requestingInfo} onClick={handleRequestInfo}>
                    <MessageSquare className="mr-2 h-4 w-4" />{requestingInfo ? "Requesting..." : "Request Info"}
                  </Button>
                </div>
              )}
              {selectedDeposit.status === "processing" && (
                <div className="flex gap-3">
                  <Button variant="gradient" className="flex-1" onClick={() => { setDetailOpen(false); setApprovingId(selectedDeposit.id); setApproveOpen(true) }}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />Approve Deposit
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => { setDetailOpen(false); setRejectingId(selectedDeposit.id); setRejectOpen(true) }}>
                    <XCircle className="mr-2 h-4 w-4 text-destructive" />Reject Deposit
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Approve Deposit</DialogTitle>
            <DialogDescription>This will credit the customer&apos;s wallet immediately.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-muted/50 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Amount</span>
                <span className="text-lg font-bold">{selectedDeposit ? formatCurrency(selectedDeposit.amount, selectedDeposit.currency) : ""}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Customer</span>
                <span className="text-sm font-medium">{selectedDeposit?.userName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Reference</span>
                <span className="text-sm font-mono">{selectedDeposit?.reference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Bank</span>
                <span className="text-sm">{selectedDeposit?.bankName}</span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-200 dark:border-amber-800 text-sm">
              <p className="font-medium text-amber-600 dark:text-amber-400">What happens next</p>
              <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                <li>✓ Customer wallet will be credited</li>
                <li>✓ Transaction record will be created</li>
                <li>✓ Audit log will be written</li>
                <li>✓ Customer will be notified</li>
              </ul>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setApproveOpen(false)}>Cancel</Button>
            <Button variant="gradient" disabled={approving} onClick={handleApprove}>
              {approving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : "Approve & Credit Wallet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Deposit</DialogTitle>
            <DialogDescription>The customer will be notified of the rejection reason.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium">{selectedDeposit ? formatCurrency(selectedDeposit.amount, selectedDeposit.currency) : ""}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reason Category</Label>
              <Select value={rejectCategory} onValueChange={setRejectCategory}>
                <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                <SelectContent>
                  {REJECT_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Additional Comments (optional)</Label>
              <Textarea placeholder="Add details for the customer..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="h-20" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={rejecting || !rejectCategory} onClick={handleReject}>
              {rejecting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Rejecting...</> : "Reject Deposit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
