"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  Landmark, ArrowUpRight, Clock, CheckCircle2, Loader2,
  Shield, AlertTriangle, Check, X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { walletApi, withdrawalsApi, type LinkedBankResponse, type WalletOverviewResponse } from "@/lib/api"
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

export default function WithdrawDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}) {
  const [overview, setOverview] = useState<WalletOverviewResponse | null>(null)
  const [linkedBanks, setLinkedBanks] = useState<LinkedBankResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [amount, setAmount] = useState("")
  const [customerRef, setCustomerRef] = useState("")
  const [notes, setNotes] = useState("")
  const [selectedBankId, setSelectedBankId] = useState("")
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  const fetchData = async () => {
    setLoading(true)
    try {
      const [ov, banks] = await Promise.all([walletApi.overview(), walletApi.linkedBanks()])
      setOverview(ov)
      setLinkedBanks(banks)
      const primary = banks.find(b => b.isPrimary) || banks[0]
      if (primary) setSelectedBankId(primary.id)
    } catch { /* silently fail */ }
    setLoading(false)
  }

  useEffect(() => {
    if (open) {
      setAmount(""); setCustomerRef(""); setNotes(""); setConfirming(false); setConfirmed(false); setSuccess(false); setError("")
      fetchData()
    }
  }, [open])

  const primaryBank = linkedBanks.find(b => b.id === selectedBankId) || linkedBanks.find(b => b.isPrimary) || linkedBanks[0]
  const hasVerifiedBank = linkedBanks.some(b => b.isVerified)

  const numAmount = parseFloat(amount) || 0
  const processingFee = numAmount * PROCESSING_FEE_RATE
  const totalFee = WITHDRAWAL_FEE + processingFee
  const netAmount = Math.max(0, numAmount - totalFee)
  const availableBalance = overview?.availableBalance ?? 0

  const handleSubmit = async () => {
    if (!primaryBank || !numAmount || numAmount <= 0) return
    if (numAmount > availableBalance) { setError("Amount exceeds available balance"); return }
    if (!confirming) { setConfirming(true); return }
    if (!confirmed) { setError("Please confirm your bank details"); return }
    setSubmitting(true)
    setError("")
    try {
      await withdrawalsApi.submit({ amount: numAmount, bankId: primaryBank.id, customerReference: customerRef || undefined, purpose: notes || undefined })
      setSuccess(true)
      onSuccess?.()
      setTimeout(() => onClose(), 2000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Withdrawal failed")
    }
    setSubmitting(false)
  }

  return (
    <Dialog open={open} onOpenChange={o => { if (!o && !submitting) onClose() }}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Withdraw Funds</DialogTitle>
          <DialogDescription>
            Transfer money from your PayAfrika Wallet to your verified bank account.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : success ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-8 text-center space-y-3">
            <div className="mx-auto w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-green-500" />
            </div>
            <div>
              <h3 className="font-bold">Withdrawal Submitted</h3>
              <p className="text-sm text-muted-foreground">Your withdrawal request is pending review.</p>
            </div>
          </motion.div>
        ) : !confirming ? (
          <div className="space-y-4">
            {/* Balance + Bank */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-primary/5 border border-primary/10 p-3">
                <p className="text-[10px] text-muted-foreground">Available Balance</p>
                <p className="text-lg font-bold text-primary">{formatCurrency(availableBalance)}</p>
              </div>
              <div className="rounded-xl bg-muted/50 border border-border/50 p-3">
                <p className="text-[10px] text-muted-foreground">Processing Time</p>
                <p className="text-sm font-bold flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{PROCESSING_TIME}</p>
              </div>
            </div>

            {hasVerifiedBank && primaryBank ? (
              <div className="rounded-xl bg-muted/40 border border-border/50 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{primaryBank.bankName}</span>
                  </div>
                  <Badge variant="outline" className="gap-1 text-[10px] border-green-500/30 text-green-600 bg-green-500/5">
                    <Check className="h-3 w-3" /> Verified
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{primaryBank.accountName}</p>
                <p className="text-sm font-mono">{maskAccountNumber(primaryBank.accountNumber)}</p>
                {primaryBank.accountType && <p className="text-[10px] text-muted-foreground mt-0.5">{primaryBank.accountType}</p>}
                {linkedBanks.length > 1 && (
                  <div className="flex gap-1.5 mt-2">
                    {linkedBanks.filter(b => b.id !== primaryBank.id).slice(0, 3).map(b => (
                      <Button key={b.id} variant="outline" size="sm" className="text-[10px] h-6 px-2" onClick={() => setSelectedBankId(b.id)}>
                        {b.bankName}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-3 text-center space-y-2">
                <AlertTriangle className="h-6 w-6 mx-auto text-amber-500" />
                <p className="text-xs">Add and verify a bank account before withdrawing.</p>
                <Button variant="outline" size="sm" asChild><a href="/dashboard/settings">Add Bank Account</a></Button>
              </div>
            )}

            {hasVerifiedBank && (
              <>
                <div className="space-y-1.5">
                  <Label>Withdrawal Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R</span>
                    <Input type="number" placeholder="0.00" className="pl-8 text-lg" value={amount} onChange={e => { setAmount(e.target.value); setError("") }} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Reference (Optional)</Label>
                  <Input placeholder="e.g. Savings withdrawal" value={customerRef} onChange={e => setCustomerRef(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Notes (Optional)</Label>
                  <Textarea placeholder="Any additional information..." className="min-h-[60px]" value={notes} onChange={e => setNotes(e.target.value)} />
                </div>

                {numAmount > 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl bg-muted/40 border border-border/50 p-3 space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Withdrawal Fee</span><span className="font-mono">{formatCurrency(WITHDRAWAL_FEE)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Processing Fee ({(PROCESSING_FEE_RATE * 100).toFixed(1)}%)</span><span className="font-mono">{formatCurrency(processingFee)}</span></div>
                    <Separator className="my-1" />
                    <div className="flex justify-between font-semibold"><span>You&apos;ll Receive</span><span className="text-primary font-mono">{formatCurrency(netAmount)}</span></div>
                  </motion.div>
                )}

                {numAmount > availableBalance && <p className="text-xs text-destructive">Exceeds available balance</p>}
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm font-medium">Confirm Withdrawal</p>
            <div className="rounded-xl bg-muted/40 border border-border/50 divide-y divide-border/30 text-sm">
              <div className="flex justify-between px-4 py-2.5"><span className="text-muted-foreground">Amount</span><span className="font-mono">{formatCurrency(numAmount)}</span></div>
              <div className="flex justify-between px-4 py-2.5"><span className="text-muted-foreground">Fee</span><span className="font-mono">{formatCurrency(totalFee)}</span></div>
              <div className="flex justify-between px-4 py-2.5 font-semibold"><span>You&apos;ll Receive</span><span className="text-primary font-mono">{formatCurrency(netAmount)}</span></div>
            </div>
            {primaryBank && (
              <div className="rounded-xl bg-muted/40 border border-border/50 p-3 flex items-center gap-3">
                <Landmark className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium">{primaryBank.bankName}</p>
                  <p className="text-xs font-mono text-muted-foreground">{maskAccountNumber(primaryBank.accountNumber)}</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-2">
              <Checkbox id="confirm-withdraw" checked={confirmed} onCheckedChange={c => setConfirmed(c === true)} />
              <Label htmlFor="confirm-withdraw" className="text-xs leading-tight">
                I confirm my bank details are correct and I authorise this withdrawal.
              </Label>
            </div>
          </div>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}

        {!success && (
          <div className="flex items-center justify-between gap-3 mt-4">
            <Button variant="outline" size="sm" onClick={confirming ? () => setConfirming(false) : onClose}>
              {confirming ? "Back" : "Cancel"}
            </Button>
            {hasVerifiedBank && (
              <Button variant="gradient" size="sm" disabled={!numAmount || numAmount <= 0 || numAmount > availableBalance || (confirming && !confirmed) || submitting} onClick={handleSubmit}>
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Processing...</> : confirming ? "Confirm Withdrawal" : "Continue"}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
