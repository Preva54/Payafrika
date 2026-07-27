"use client"

import { useEffect, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Wallet, ArrowRight, Check, Clock, RefreshCw,
  Landmark, Banknote, Search, Loader2, AlertTriangle,
  CheckCircle2, XCircle, ChevronRight, ChevronLeft,
  Filter, Download, Eye, Ban,
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
import { adminWithdrawalsApi, type WithdrawalResponse, type WithdrawalStatsResponse } from "@/lib/api"
import { cn, formatCurrency } from "@/lib/utils"

function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-ZA", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(date))
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-600 border-yellow-200 dark:border-yellow-800",
    processing: "bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800",
    approved: "bg-green-500/10 text-green-600 border-green-200 dark:border-green-800",
    rejected: "bg-red-500/10 text-red-600 border-red-200 dark:border-red-800",
    paid: "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800",
    cancelled: "bg-gray-500/10 text-gray-600 border-gray-200 dark:border-gray-800",
  }
  const icons: Record<string, React.ReactNode> = {
    pending: <Clock className="h-3 w-3" />,
    processing: <Loader2 className="h-3 w-3 animate-spin" />,
    approved: <CheckCircle2 className="h-3 w-3" />,
    rejected: <XCircle className="h-3 w-3" />,
    paid: <CheckCircle2 className="h-3 w-3" />,
    cancelled: <Ban className="h-3 w-3" />,
  }
  return (
    <Badge variant="outline" className={cn("gap-1 capitalize", styles[status])}>
      {icons[status]} {status}
    </Badge>
  )
}

function Timeline({ status, approvedAt, paidAt, createdAt }: { status: string; approvedAt?: string | null; paidAt?: string | null; createdAt: string }) {
  const steps = [
    { label: "Submitted", date: createdAt, done: true },
    { label: "Approved", date: approvedAt, done: !!approvedAt },
    { label: "Paid", date: paidAt, done: status === "paid" },
  ]
  return (
    <div className="space-y-3">
      {steps.map((step, i) => (
        <div key={step.label} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className={cn(
              "h-3 w-3 rounded-full border-2",
              step.done ? "bg-primary border-primary" : "bg-muted border-muted-foreground/30"
            )}>
              {step.done && <Check className="h-3 w-3 text-white" />}
            </div>
            {i < steps.length - 1 && <div className={cn("w-0.5 h-8", step.done ? "bg-primary" : "bg-muted-foreground/20")} />}
          </div>
          <div className="pb-2">
            <p className={cn("text-sm font-medium", step.done ? "text-foreground" : "text-muted-foreground")}>{step.label}</p>
            {step.date && <p className="text-xs text-muted-foreground">{formatDate(step.date)}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AdminWithdrawalsPage() {
  const [stats, setStats] = useState<WithdrawalStatsResponse | null>(null)
  const [withdrawals, setWithdrawals] = useState<WithdrawalResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [limit] = useState(15)

  const [statusFilter, setStatusFilter] = useState("")
  const [search, setSearch] = useState("")
  const [bankFilter, setBankFilter] = useState("")

  const [selected, setSelected] = useState<WithdrawalResponse | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [showApprove, setShowApprove] = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [showMarkPaid, setShowMarkPaid] = useState(false)

  const [rejectCategory, setRejectCategory] = useState("insufficient-funds")
  const [rejectReason, setRejectReason] = useState("")
  const [bankPaymentRef, setBankPaymentRef] = useState("")
  const [actionLoading, setActionLoading] = useState(false)
  const [actionMessage, setActionMessage] = useState("")

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [sRes, wRes] = await Promise.all([
        adminWithdrawalsApi.stats(),
        adminWithdrawalsApi.list({ page, limit, status: statusFilter || undefined, search: search || undefined, bank: bankFilter || undefined }),
      ])
      setStats(sRes)
      setWithdrawals(wRes.data)
      setTotal(wRes.total)
    } catch {}
    setLoading(false)
  }, [page, limit, statusFilter, search, bankFilter])

  useEffect(() => { fetchData() }, [fetchData])

  const showMessage = (msg: string) => {
    setActionMessage(msg)
    setTimeout(() => setActionMessage(""), 4000)
  }

  const handleApprove = async () => {
    if (!selected) return
    setActionLoading(true)
    try {
      await adminWithdrawalsApi.approve(selected.id)
      showMessage(`Withdrawal ${selected.reference} has been approved.`)
      setShowApprove(false)
      setSelected(null)
      fetchData()
    } catch (err: unknown) {
      showMessage(err instanceof Error ? err.message : "Failed to approve")
    }
    setActionLoading(false)
  }

  const handleReject = async () => {
    if (!selected) return
    setActionLoading(true)
    try {
      await adminWithdrawalsApi.reject(selected.id, { category: rejectCategory, reason: rejectReason || undefined })
      showMessage(`Withdrawal ${selected.reference} has been rejected.`)
      setShowReject(false)
      setRejectCategory("insufficient-funds")
      setRejectReason("")
      setSelected(null)
      fetchData()
    } catch (err: unknown) {
      showMessage(err instanceof Error ? err.message : "Failed to reject")
    }
    setActionLoading(false)
  }

  const handleMarkPaid = async () => {
    if (!selected) return
    setActionLoading(true)
    try {
      await adminWithdrawalsApi.markPaid(selected.id, { bankPaymentReference: bankPaymentRef || undefined })
      showMessage(`Withdrawal ${selected.reference} marked as paid.`)
      setShowMarkPaid(false)
      setBankPaymentRef("")
      setSelected(null)
      fetchData()
    } catch (err: unknown) {
      showMessage(err instanceof Error ? err.message : "Failed to mark paid")
    }
    setActionLoading(false)
  }

  const openDetail = (w: WithdrawalResponse) => {
    setSelected(w)
    setShowDetail(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Withdrawal Requests</h1>
          <p className="text-muted-foreground">Manage customer withdrawal requests</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Pending", value: stats?.pendingWithdrawals ?? 0, color: "text-yellow-500" },
          { label: "Approved Today", value: stats?.approvedToday ?? 0, color: "text-green-500" },
          { label: "Rejected Today", value: stats?.rejectedToday ?? 0, color: "text-red-500" },
          { label: "Completed Today", value: stats?.completedToday ?? 0, color: "text-emerald-500" },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className={cn("text-2xl font-bold", item.color)}>{item.value}</p>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Pending Value</p>
            <p className="text-2xl font-bold">R {stats?.pendingValue.toFixed(2) ?? "0.00"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Withdrawn</p>
            <p className="text-2xl font-bold">R {stats?.totalWithdrawalValue.toFixed(2) ?? "0.00"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Avg Processing Time</p>
            <p className="text-2xl font-bold">{stats?.averageProcessingTimeHours.toFixed(1) ?? "0.0"}h</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by reference, name, or bank..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-1" />
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : withdrawals.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Wallet className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No withdrawals found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withdrawals.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="font-mono text-xs">{w.reference}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{w.userName}</p>
                        <p className="text-xs text-muted-foreground">{w.userEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">R {w.amount.toFixed(2)}</TableCell>
                    <TableCell className="text-sm">{w.bankName}</TableCell>
                    <TableCell><StatusBadge status={w.status} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(w.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openDetail(w)}>
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

      {/* Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Withdrawal Details</DialogTitle>
            <DialogDescription>Reference: {selected?.reference}</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <StatusBadge status={selected.status} />
                <span className="text-xs text-muted-foreground">{formatDate(selected.createdAt)}</span>
              </div>

              <div className="glass rounded-xl p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-bold text-lg">R {selected.amount.toFixed(2)}</span>
                </div>
                {selected.fee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Fee</span>
                    <span>R {selected.fee.toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Net Amount</span>
                  <span className="font-bold">R {selected.netAmount.toFixed(2)}</span>
                </div>
              </div>

              <div className="glass rounded-xl p-4 space-y-2 text-sm">
                <p className="font-medium mb-2">Bank Account</p>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bank</span>
                  <span>{selected.bankName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account Holder</span>
                  <span>{selected.accountHolderName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account Number</span>
                  <span className="font-mono">{selected.accountNumber}</span>
                </div>
                {selected.branchCode && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Branch Code</span>
                    <span>{selected.branchCode}</span>
                  </div>
                )}
                {selected.accountType && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Account Type</span>
                    <span className="capitalize">{selected.accountType}</span>
                  </div>
                )}
              </div>

              <div className="glass rounded-xl p-4 space-y-2 text-sm">
                <p className="font-medium mb-2">User</p>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span>{selected.userName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span>{selected.userEmail}</span>
                </div>
              </div>

              <Timeline status={selected.status} approvedAt={selected.approvedAt} paidAt={selected.paidAt} createdAt={selected.createdAt} />

              {selected.rejectionReason && (
                <div className="bg-red-500/10 rounded-xl p-4 text-sm">
                  <p className="font-medium text-red-500 mb-1">Rejection Reason</p>
                  <p>{selected.rejectionReason}</p>
                  {selected.rejectionCategory && <p className="text-xs text-muted-foreground mt-1">Category: {selected.rejectionCategory}</p>}
                </div>
              )}

              {selected.bankPaymentReference && (
                <div className="bg-blue-500/10 rounded-xl p-4 text-sm">
                  <p className="font-medium text-blue-500 mb-1">Bank Payment Reference</p>
                  <p className="font-mono">{selected.bankPaymentReference}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex gap-2">
            {selected?.status === "pending" && (
              <>
                <Button variant="outline" className="flex-1" onClick={() => { setShowDetail(false); setShowReject(true) }}>
                  <XCircle className="h-4 w-4 mr-1" /> Reject
                </Button>
                <Button variant="gradient" className="flex-1" onClick={() => { setShowDetail(false); setShowApprove(true) }}>
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                </Button>
              </>
            )}
            {selected?.status === "approved" && (
              <Button variant="gradient" className="w-full" onClick={() => { setShowDetail(false); setShowMarkPaid(true) }}>
                <Check className="h-4 w-4 mr-1" /> Mark as Paid
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={showApprove} onOpenChange={setShowApprove}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Approve Withdrawal</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve withdrawal {selected?.reference} for R {selected?.amount.toFixed(2)}?
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="glass rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">User</span>
                <span>{selected.userName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium">R {selected.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bank</span>
                <span>{selected.bankName} - {selected.accountNumber}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprove(false)}>Cancel</Button>
            <Button variant="gradient" onClick={handleApprove} disabled={actionLoading}>
              {actionLoading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Approving...</> : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showReject} onOpenChange={setShowReject}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Reject Withdrawal</DialogTitle>
            <DialogDescription>Select a reason for rejecting {selected?.reference}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Rejection Category</Label>
              <Select value={rejectCategory} onValueChange={setRejectCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="insufficient-funds">Insufficient Funds</SelectItem>
                  <SelectItem value="suspicious-activity">Suspicious Activity</SelectItem>
                  <SelectItem value="kyc-not-verified">KYC Not Verified</SelectItem>
                  <SelectItem value="bank-verification-failed">Bank Verification Failed</SelectItem>
                  <SelectItem value="duplicate-request">Duplicate Request</SelectItem>
                  <SelectItem value="exceeds-limit">Exceeds Limit</SelectItem>
                  <SelectItem value="technical-error">Technical Error</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Additional Notes (Optional)</Label>
              <Textarea
                placeholder="Provide more details..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReject(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={actionLoading}>
              {actionLoading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Rejecting...</> : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Paid Dialog */}
      <Dialog open={showMarkPaid} onOpenChange={setShowMarkPaid}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Mark as Paid</DialogTitle>
            <DialogDescription>
              Confirm that withdrawal {selected?.reference} has been sent to the customer's bank.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="glass rounded-xl p-4 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium">R {selected?.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bank</span>
                <span>{selected?.bankName} - {selected?.accountNumber}</span>
              </div>
            </div>
            <div>
              <Label>Bank Payment Reference (Optional)</Label>
              <Input
                placeholder="e.g. EFT reference or SWIFT ID"
                value={bankPaymentRef}
                onChange={(e) => setBankPaymentRef(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMarkPaid(false)}>Cancel</Button>
            <Button variant="gradient" onClick={handleMarkPaid} disabled={actionLoading}>
              {actionLoading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Processing...</> : "Confirm Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Message Toast */}
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
