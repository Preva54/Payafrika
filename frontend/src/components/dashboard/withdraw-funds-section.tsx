"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  Landmark, ArrowUpRight, Clock, CheckCircle2, XCircle, Loader2,
  ChevronRight, Shield, Banknote, CreditCard, AlertTriangle,
  Info, Check, Plus, ArrowRight,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { walletApi, withdrawalsApi, type LinkedBankResponse, type WithdrawalResponse, type WalletOverviewResponse } from "@/lib/api"
import { cn, formatCurrency } from "@/lib/utils"

const WITHDRAWAL_FEE = 10
const PROCESSING_FEE_RATE = 0.005
const PROCESSING_TIME = "1\u201324 Hours"

function maskAccountNumber(num: string): string {
  if (num.length < 4) return num
  const last4 = num.slice(-4)
  const masked = "*".repeat(Math.min(num.length - 4, 8))
  const spaced = []
  for (let i = 0; i < masked.length; i += 4) spaced.push(masked.slice(i, i + 4))
  spaced.push(last4)
  return spaced.join(" ")
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days} Days Ago`
  if (date.getFullYear() === now.getFullYear()) return date.toLocaleDateString("en-ZA", { day: "numeric", month: "short" })
  return date.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-600 border-yellow-200 dark:border-yellow-800",
    processing: "bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800",
    completed: "bg-green-500/10 text-green-600 border-green-200 dark:border-green-800",
    rejected: "bg-red-500/10 text-red-600 border-red-200 dark:border-red-800",
    cancelled: "bg-gray-500/10 text-gray-600 border-gray-200 dark:border-gray-800",
  }
  const icons: Record<string, React.ReactNode> = {
    pending: <Clock className="h-3 w-3 animate-pulse" />,
    processing: <Loader2 className="h-3 w-3 animate-spin" />,
    completed: <CheckCircle2 className="h-3 w-3" />,
    rejected: <XCircle className="h-3 w-3" />,
    cancelled: <XCircle className="h-3 w-3" />,
  }
  return (
    <Badge variant="outline" className={cn("gap-1 capitalize text-[10px]", styles[status])}>
      {icons[status]} {status}
    </Badge>
  )
}

export default function WithdrawFundsSection() {
  const [overview, setOverview] = useState<WalletOverviewResponse | null>(null)
  const [linkedBanks, setLinkedBanks] = useState<LinkedBankResponse[]>([])
  const [withdrawals, setWithdrawals] = useState<WithdrawalResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [withdrawing, setWithdrawing] = useState(false)

  const [amount, setAmount] = useState("")
  const [customerRef, setCustomerRef] = useState("")
  const [notes, setNotes] = useState("")
  const [selectedBankId, setSelectedBankId] = useState("")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [withdrawSuccess, setWithdrawSuccess] = useState(false)
  const [error, setError] = useState("")

  const fetchData = async () => {
    try {
      const [ov, banks, wd] = await Promise.all([
        walletApi.overview(),
        walletApi.linkedBanks(),
        withdrawalsApi.list(1, 20),
      ])
      setOverview(ov)
      setLinkedBanks(banks)
      setWithdrawals(wd.data)
      const primary = banks.find(b => b.isPrimary) || banks[0]
      if (primary) setSelectedBankId(primary.id)
    } catch { /* silently fail */ }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const primaryBank = linkedBanks.find(b => b.id === selectedBankId) || linkedBanks.find(b => b.isPrimary) || linkedBanks[0]
  const hasVerifiedBank = linkedBanks.some(b => b.isVerified && b.isPrimary)

  const numAmount = parseFloat(amount) || 0
  const processingFee = numAmount * PROCESSING_FEE_RATE
  const totalFee = WITHDRAWAL_FEE + processingFee
  const netAmount = Math.max(0, numAmount - totalFee)

  const pendingWithdrawals = withdrawals.filter(w => w.status === "pending")
  const processingWithdrawals = withdrawals.filter(w => w.status === "processing")
  const completedWithdrawals = withdrawals.filter(w => w.status === "completed")
  const rejectedWithdrawals = withdrawals.filter(w => w.status === "rejected")
  const totalWithdrawnThisMonth = completedWithdrawals.reduce((s, w) => s + w.amount, 0)

  const timelineWithdrawals = [...withdrawals]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  const handleSubmitWithdrawal = async () => {
    if (!primaryBank || !numAmount || numAmount <= 0) return
    if (numAmount > (overview?.availableBalance ?? 0)) {
      setError("Amount exceeds available balance")
      return
    }
    setConfirmOpen(true)
  }

  const confirmWithdrawal = async () => {
    if (!primaryBank || !confirmed) return
    setWithdrawing(true)
    setError("")
    try {
      await withdrawalsApi.submit({
        amount: numAmount,
        bankId: primaryBank.id,
        currency: "ZAR",
        customerReference: customerRef || undefined,
        purpose: notes || undefined,
      })
      setWithdrawSuccess(true)
      setAmount("")
      setCustomerRef("")
      setNotes("")
      setConfirmOpen(false)
      setConfirmed(false)
      fetchData()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Withdrawal failed")
      setConfirmOpen(false)
    } finally {
      setWithdrawing(false)
    }
  }

  const availableBalance = overview?.availableBalance ?? 0
  const reservedBalance = overview?.reservedBalance ?? 0
  const dailyLimitRemaining = Math.max(0, 50000 - completedWithdrawals.reduce((s, w) => s + w.amount, 0))

  if (loading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="grid lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <Card className="glass-card overflow-hidden border-primary/10">
        <CardHeader className="border-b border-border/50">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-lg">Withdraw Funds</CardTitle>
              <CardDescription className="mt-1">
                Transfer money from your PayAfrika Wallet to your verified bank account.
                Withdrawals are reviewed by our Finance Team before being processed.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1 text-xs">
                <Shield className="h-3 w-3" />
                Secure Withdrawal
              </Badge>
              <Badge variant="secondary" className="gap-1 text-xs">
                <Clock className="h-3 w-3" />
                {PROCESSING_TIME}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {withdrawSuccess ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-10 text-center space-y-4"
            >
              <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Withdrawal Submitted</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Your withdrawal request has been received and is pending review by our Finance Team.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setWithdrawSuccess(false)}>
                Make Another Withdrawal
              </Button>
            </motion.div>
          ) : (
            <div className="grid lg:grid-cols-5 gap-6">
              {/* Left: Form */}
              <div className="lg:col-span-3 space-y-6">
                {/* Balance Summary */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="rounded-xl bg-primary/5 border border-primary/10 p-3 col-span-2">
                    <p className="text-xs text-muted-foreground">Available Balance</p>
                    <p className="text-lg font-bold text-primary">{formatCurrency(availableBalance)}</p>
                  </div>
                  <div className="rounded-xl bg-muted/50 border border-border/50 p-3">
                    <p className="text-xs text-muted-foreground">Reserved</p>
                    <p className="text-lg font-bold">{formatCurrency(reservedBalance)}</p>
                  </div>
                  <div className="rounded-xl bg-muted/50 border border-border/50 p-3">
                    <p className="text-xs text-muted-foreground">Daily Limit</p>
                    <p className="text-sm font-bold">{formatCurrency(dailyLimitRemaining)}</p>
                  </div>
                </div>

                {/* Destination Bank Account */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Landmark className="h-4 w-4 text-primary" />
                      Destination Bank Account
                    </h4>
                    <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" asChild>
                      <a href="/dashboard/settings">
                        <CreditCard className="h-3 w-3" />
                        Manage
                      </a>
                    </Button>
                  </div>

                  {hasVerifiedBank && primaryBank ? (
                    <div className="rounded-xl bg-muted/40 border border-border/50 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Landmark className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{primaryBank.bankName}</p>
                            <p className="text-xs text-muted-foreground">{primaryBank.accountName}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="gap-1 text-[10px] border-green-500/30 text-green-600 bg-green-500/5">
                          <Check className="h-3 w-3" /> Verified
                        </Badge>
                      </div>
                      <div className="text-sm font-mono text-muted-foreground">
                        {maskAccountNumber(primaryBank.accountNumber)}
                      </div>
                      {primaryBank.accountType && (
                        <p className="text-xs text-muted-foreground mt-1">{primaryBank.accountType}</p>
                      )}
                      {linkedBanks.length > 1 && (
                        <div className="mt-3 flex gap-2">
                          {linkedBanks.filter(b => b.id !== primaryBank.id).slice(0, 3).map(bank => (
                            <Button
                              key={bank.id}
                              variant="outline"
                              size="sm"
                              className="text-xs h-7 gap-1"
                              onClick={() => setSelectedBankId(bank.id)}
                            >
                              <Landmark className="h-3 w-3" />
                              {bank.bankName}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4 text-center space-y-3">
                      <AlertTriangle className="h-8 w-8 mx-auto text-amber-500" />
                      <div>
                        <p className="text-sm font-medium">No Verified Bank Account</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          You must add and verify a bank account before you can withdraw funds.
                        </p>
                      </div>
                      <Button variant="outline" size="sm" className="gap-1.5" asChild>
                        <a href="/dashboard/settings">
                          <Plus className="h-4 w-4" /> Add Bank Account
                        </a>
                      </Button>
                    </div>
                  )}
                </div>

                {/* Withdrawal Form */}
                {hasVerifiedBank && primaryBank && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold">Withdrawal Details</h4>
                    <div className="space-y-2">
                      <Label htmlFor="withdraw-amount">Withdrawal Amount</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R</span>
                        <Input
                          id="withdraw-amount"
                          type="number"
                          placeholder="0.00"
                          className="pl-8 text-lg"
                          value={amount}
                          onChange={e => { setAmount(e.target.value); setError(""); setWithdrawSuccess(false) }}
                        />
                      </div>
                    </div>

                    {numAmount > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="rounded-xl bg-muted/40 border border-border/50 p-3 space-y-1.5 text-sm"
                      >
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Withdrawal Fee</span>
                          <span className="font-mono">{formatCurrency(WITHDRAWAL_FEE)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Processing Fee ({(PROCESSING_FEE_RATE * 100).toFixed(1)}%)</span>
                          <span className="font-mono">{formatCurrency(processingFee)}</span>
                        </div>
                        <Separator className="my-1" />
                        <div className="flex justify-between font-semibold">
                          <span>You&apos;ll Receive</span>
                          <span className="font-mono text-primary">{formatCurrency(netAmount)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Estimated Processing Time</span>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{PROCESSING_TIME}</span>
                        </div>
                      </motion.div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="withdraw-ref">Reference (Optional)</Label>
                      <Input
                        id="withdraw-ref"
                        placeholder="e.g. Savings withdrawal"
                        value={customerRef}
                        onChange={e => setCustomerRef(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="withdraw-notes">Notes (Optional)</Label>
                      <Textarea
                        id="withdraw-notes"
                        placeholder="Any additional information..."
                        className="min-h-[60px]"
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                      />
                    </div>

                    {error && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> {error}
                      </p>
                    )}

                    <Button
                      variant="gradient"
                      className="w-full gap-1.5"
                      size="lg"
                      disabled={!numAmount || numAmount <= 0 || numAmount > availableBalance || withdrawing}
                      onClick={handleSubmitWithdrawal}
                    >
                      {withdrawing ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
                      ) : (
                        <><ArrowUpRight className="h-4 w-4" /> Submit Withdrawal</>
                      )}
                    </Button>

                    {numAmount > availableBalance && (
                      <p className="text-xs text-destructive text-center">
                        Amount exceeds your available balance of {formatCurrency(availableBalance)}
                      </p>
                    )}

                    {/* Quick Actions */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8" asChild>
                        <a href="/dashboard/withdrawals">
                          View History <ChevronRight className="h-3 w-3" />
                        </a>
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8" asChild>
                        <a href="/dashboard/settings">
                          <CreditCard className="h-3 w-3" /> Manage Banks
                        </a>
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Status + Timeline */}
              <div className="lg:col-span-2 space-y-6">
                {/* Withdrawal Status Widget */}
                <div>
                  <h4 className="text-sm font-semibold mb-3">Withdrawal Status</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-yellow-500/5 border border-yellow-500/20 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Pending</span>
                        <Clock className="h-3.5 w-3.5 text-yellow-500" />
                      </div>
                      <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{pendingWithdrawals.length}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatCurrency(pendingWithdrawals.reduce((s, w) => s + w.amount, 0))}
                      </p>
                    </div>
                    <div className="rounded-xl bg-blue-500/5 border border-blue-500/20 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Processing</span>
                        <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />
                      </div>
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{processingWithdrawals.length}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatCurrency(processingWithdrawals.reduce((s, w) => s + w.amount, 0))}
                      </p>
                    </div>
                    <div className="rounded-xl bg-green-500/5 border border-green-500/20 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Completed</span>
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                      </div>
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">{completedWithdrawals.length}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatCurrency(completedWithdrawals.reduce((s, w) => s + w.amount, 0))}
                      </p>
                    </div>
                    <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Rejected</span>
                        <XCircle className="h-3.5 w-3.5 text-red-500" />
                      </div>
                      <p className="text-lg font-bold text-red-600 dark:text-red-400">{rejectedWithdrawals.length}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatCurrency(rejectedWithdrawals.reduce((s, w) => s + w.amount, 0))}
                      </p>
                    </div>
                    <div className="col-span-2 rounded-xl bg-primary/5 border border-primary/20 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Total Withdrawn This Month</span>
                        <Banknote className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <p className="text-lg font-bold text-primary">{formatCurrency(totalWithdrawnThisMonth)}</p>
                    </div>
                  </div>
                </div>

                {/* Recent Withdrawals Timeline */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold">Recent Withdrawals</h4>
                    <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" asChild>
                      <a href="/dashboard/withdrawals">View All <ArrowRight className="h-3 w-3" /></a>
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {timelineWithdrawals.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground">
                        <Banknote className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-xs">No withdrawals yet</p>
                        <p className="text-[10px] mt-1">Your withdrawal history will appear here</p>
                      </div>
                    ) : (
                      timelineWithdrawals.map((withdrawal, i) => {
                        const icon = withdrawal.status === "completed" ? CheckCircle2 :
                          withdrawal.status === "rejected" || withdrawal.status === "cancelled" ? XCircle : Clock
                        const color = withdrawal.status === "completed" ? "text-green-500" :
                          withdrawal.status === "rejected" || withdrawal.status === "cancelled" ? "text-red-500" : "text-yellow-500"
                        const bg = withdrawal.status === "completed" ? "bg-green-500/10" :
                          withdrawal.status === "rejected" || withdrawal.status === "cancelled" ? "bg-red-500/10" : "bg-yellow-500/10"
                        const Icon = icon
                        return (
                          <motion.div
                            key={withdrawal.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="flex items-center justify-between rounded-xl p-3 hover:bg-muted/40 transition-all cursor-default"
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn("rounded-full p-2", bg)}>
                                <Icon className={cn("h-4 w-4", color)} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium capitalize">
                                    {withdrawal.status === "completed" ? "Withdrawal Completed" :
                                     withdrawal.status === "processing" ? "Processing" :
                                     withdrawal.status === "rejected" ? "Withdrawal Rejected" :
                                     withdrawal.status === "cancelled" ? "Withdrawal Cancelled" : "Pending"}
                                  </p>
                                  <StatusBadge status={withdrawal.status} />
                                </div>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <span className="font-mono text-primary font-semibold">
                                    {formatCurrency(withdrawal.amount)}
                                  </span>
                                  <span>·</span>
                                  <span>{formatDateLabel(withdrawal.createdAt)}</span>
                                </p>
                              </div>
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                              <a href={`/dashboard/withdrawals/${withdrawal.id}`}>
                                <ChevronRight className="h-3.5 w-3.5" />
                              </a>
                            </Button>
                          </motion.div>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Withdrawal</DialogTitle>
            <DialogDescription>Please review your withdrawal details before confirming.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl bg-muted/40 border border-border/50 divide-y divide-border/30">
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-sm text-muted-foreground">Withdrawal Amount</span>
                <span className="text-sm font-semibold font-mono">{formatCurrency(numAmount)}</span>
              </div>
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-sm text-muted-foreground">Withdrawal Fee</span>
                <span className="text-sm font-mono">{formatCurrency(WITHDRAWAL_FEE)}</span>
              </div>
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-sm text-muted-foreground">Processing Fee</span>
                <span className="text-sm font-mono">{formatCurrency(processingFee)}</span>
              </div>
              <div className="flex justify-between px-4 py-2.5 font-semibold">
                <span className="text-sm">You&apos;ll Receive</span>
                <span className="text-sm font-mono text-primary">{formatCurrency(netAmount)}</span>
              </div>
            </div>

            {primaryBank && (
              <div className="rounded-xl bg-muted/40 border border-border/50 p-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Landmark className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{primaryBank.bankName}</p>
                  <p className="text-xs font-mono text-muted-foreground">{maskAccountNumber(primaryBank.accountNumber)}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Estimated processing time: {PROCESSING_TIME}
            </div>

            <div className="flex items-start gap-2">
              <Checkbox id="confirm-bank" checked={confirmed} onCheckedChange={c => setConfirmed(c === true)} />
              <Label htmlFor="confirm-bank" className="text-xs leading-tight">
                I confirm my bank details are correct and I authorise this withdrawal.
              </Label>
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button variant="gradient" disabled={!confirmed || withdrawing} onClick={confirmWithdrawal}>
              {withdrawing ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing...</> : "Confirm Withdrawal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
