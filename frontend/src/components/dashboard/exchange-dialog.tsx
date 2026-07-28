"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  Repeat, ArrowRight, Clock, CheckCircle2, Loader2,
  Shield, AlertTriangle, RefreshCw, TrendingUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { exchangeApi, walletApi, type CurrencyWalletResponse, type ExchangeRateResponse, type ExchangeQuoteResponse } from "@/lib/api"
import { cn, formatCurrency } from "@/lib/utils"

const CURRENCY_FLAGS: Record<string, string> = {
  ZAR: "\uD83C\uDDFF\uD83C\uDDE6", USD: "\uD83C\uDDFA\uD83C\uDDF8", EUR: "\uD83C\uDDEA\uD83C\uDDFA",
  GBP: "\uD83C\uDDEC\uD83C\uDDE7", NGN: "\uD83C\uDDF3\uD83C\uDDEC", KES: "\uD83C\uDDF0\uD83C\uDDEA",
  BTC: "\u20BF", ETH: "\u27A0", USDT: "\uD83D\uDCB5",
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 5) return "Just now"
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function ExchangeDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}) {
  const [balances, setBalances] = useState<CurrencyWalletResponse[]>([])
  const [rates, setRates] = useState<ExchangeRateResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [fromCurrency, setFromCurrency] = useState("ZAR")
  const [toCurrency, setToCurrency] = useState("USD")
  const [amount, setAmount] = useState("")
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [successRef, setSuccessRef] = useState("")
  const [error, setError] = useState("")
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [calculating, setCalculating] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [bals, rateData] = await Promise.all([walletApi.balances(), exchangeApi.rates().catch(() => [])])
      setBalances(bals)
      setRates(rateData)
      setLastUpdated(new Date())
      if (bals.length > 0) {
        const nonZAR = bals.find(b => b.currency !== "ZAR")
        if (nonZAR) setToCurrency(nonZAR.currency)
      }
    } catch { /* silently fail */ }
    setLoading(false)
  }

  useEffect(() => {
    if (open) {
      setAmount(""); setConfirming(false); setConfirmed(false); setSuccess(false); setSuccessRef(""); setError("")
      fetchData()
    }
  }, [open])

  const fromBalance = balances.find(b => b.currency === fromCurrency)
  const toBalance = balances.find(b => b.currency === toCurrency)
  const exchangeRate = rates.find(r => r.from === fromCurrency && r.to === toCurrency)

  const numAmount = parseFloat(amount) || 0
  const hasSufficientBalance = !fromBalance || numAmount <= fromBalance.availableBalance
  const rate = exchangeRate?.rate ?? 0
  const fee = numAmount * 0.005
  const convertedAmount = rate > 0 ? (numAmount - fee) / rate : 0

  const currencies = balances.map(b => b.currency)

  const handleSwap = () => {
    setFromCurrency(toCurrency)
    setToCurrency(fromCurrency)
  }

  const handleSubmit = async () => {
    if (numAmount <= 0 || !hasSufficientBalance) { setError("Invalid amount"); return }
    if (!confirming) { setConfirming(true); return }
    if (!confirmed) { setError("Please confirm the exchange"); return }
    setSubmitting(true)
    setError("")
    try {
      const res = await exchangeApi.submit({ amount: numAmount, fromCurrency, toCurrency })
      setSuccessRef(res.reference)
      setSuccess(true)
      onSuccess?.()
      setTimeout(() => onClose(), 2000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Exchange failed")
    }
    setSubmitting(false)
  }

  return (
    <Dialog open={open} onOpenChange={o => { if (!o && !submitting) onClose() }}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Exchange Currency</DialogTitle>
          <DialogDescription>
            Convert between your wallets using live exchange rates.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : success ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-8 text-center space-y-3">
            <div className="mx-auto w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-green-500" />
            </div>
            <div>
              <h3 className="font-bold">Exchange Successful</h3>
              <p className="text-sm text-muted-foreground">Reference: {successRef}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatCurrency(numAmount, fromCurrency)} → {formatCurrency(convertedAmount, toCurrency)}
              </p>
            </div>
          </motion.div>
        ) : !confirming ? (
          <div className="space-y-4">
            {/* Currency Selectors */}
            <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-center">
              <div className="rounded-xl bg-muted/40 border border-border/50 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-muted-foreground">From</span>
                  {fromBalance && <span className="text-[10px] text-muted-foreground">Avail: {formatCurrency(fromBalance.availableBalance, fromCurrency)}</span>}
                </div>
                <Select value={fromCurrency} onValueChange={setFromCurrency}>
                  <SelectTrigger className="border-0 p-0 h-auto shadow-none text-sm font-semibold"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {balances.map(b => (
                      <SelectItem key={b.currency} value={b.currency} disabled={b.currency === toCurrency}>
                        <span className="flex items-center gap-2"><span>{CURRENCY_FLAGS[b.currency]}</span><span>{b.currency}</span></span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="ghost" size="icon" className="mt-5" onClick={handleSwap}><Repeat className="h-4 w-4" /></Button>
              <div className="rounded-xl bg-muted/40 border border-border/50 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-muted-foreground">To</span>
                  {toBalance && <span className="text-[10px] text-muted-foreground">Bal: {formatCurrency(toBalance.balance, toCurrency)}</span>}
                </div>
                <Select value={toCurrency} onValueChange={setToCurrency}>
                  <SelectTrigger className="border-0 p-0 h-auto shadow-none text-sm font-semibold"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {balances.map(b => (
                      <SelectItem key={b.currency} value={b.currency} disabled={b.currency === fromCurrency}>
                        <span className="flex items-center gap-2"><span>{CURRENCY_FLAGS[b.currency]}</span><span>{b.currency}</span></span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <Label>Amount to Exchange</Label>
              <Input type="number" placeholder="0.00" className="text-lg" value={amount} onChange={e => { setAmount(e.target.value); setError("") }} />
              {!hasSufficientBalance && <p className="text-xs text-destructive">Insufficient {fromCurrency} balance</p>}
            </div>

            {/* Rate */}
            <div className="rounded-xl bg-muted/30 border border-border/50 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Rate</span>
                <span className="font-semibold font-mono">1 {fromCurrency} = {rate > 0 ? rate.toFixed(4) : "---"} {toCurrency}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-muted-foreground">Updated {formatRelativeTime(lastUpdated.toISOString())}</span>
                {exchangeRate && (
                  <Badge variant="outline" className="text-[10px] gap-0.5 border-green-500/30 text-green-600 bg-green-500/5">
                    <TrendingUp className="h-2.5 w-2.5" /> +{exchangeRate.spread.toFixed(2)}%
                  </Badge>
                )}
              </div>
            </div>

            {/* Summary */}
            {numAmount > 0 && rate > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl bg-primary/5 border border-primary/10 p-3 space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">You Send</span><span className="font-semibold">{formatCurrency(numAmount, fromCurrency)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Fee (0.5%)</span><span className="font-mono">{formatCurrency(fee, fromCurrency)}</span></div>
                <Separator className="my-1" />
                <div className="flex justify-between font-semibold"><span>You&apos;ll Receive</span><span className="text-primary font-mono">{formatCurrency(convertedAmount, toCurrency)}</span></div>
              </motion.div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm font-medium">Confirm Exchange</p>
            <div className="rounded-xl bg-muted/40 border border-border/50 divide-y divide-border/30 text-sm">
              <div className="flex justify-between px-4 py-2.5"><span className="text-muted-foreground">From</span><span className="font-mono">{fromCurrency}</span></div>
              <div className="flex justify-between px-4 py-2.5"><span className="text-muted-foreground">To</span><span className="font-mono">{toCurrency}</span></div>
              <div className="flex justify-between px-4 py-2.5"><span className="text-muted-foreground">Amount</span><span className="font-mono">{formatCurrency(numAmount, fromCurrency)}</span></div>
              <div className="flex justify-between px-4 py-2.5"><span className="text-muted-foreground">Rate</span><span className="font-mono">1 {fromCurrency} = {rate.toFixed(4)} {toCurrency}</span></div>
              <div className="flex justify-between px-4 py-2.5"><span className="text-muted-foreground">Fee</span><span className="font-mono">{formatCurrency(fee, fromCurrency)}</span></div>
              <div className="flex justify-between px-4 py-2.5 font-semibold"><span>You&apos;ll Receive</span><span className="text-primary font-mono">{formatCurrency(convertedAmount, toCurrency)}</span></div>
            </div>
            {fromBalance && toBalance && (
              <div className="rounded-xl bg-muted/40 border border-border/50 p-3 text-xs space-y-1">
                <p className="text-muted-foreground font-medium mb-1">Updated Balances</p>
                <div className="flex justify-between"><span>{fromCurrency}</span><span>{formatCurrency(fromBalance.balance - numAmount, fromCurrency)}</span></div>
                <div className="flex justify-between"><span>{toCurrency}</span><span>{formatCurrency(toBalance.balance + convertedAmount, toCurrency)}</span></div>
              </div>
            )}
            <div className="flex items-start gap-2">
              <Checkbox id="confirm-exchange" checked={confirmed} onCheckedChange={c => setConfirmed(c === true)} />
              <Label htmlFor="confirm-exchange" className="text-xs leading-tight">
                I understand that exchange rates may fluctuate before confirmation.
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
            <Button
              variant="gradient"
              size="sm"
              disabled={!numAmount || numAmount <= 0 || !hasSufficientBalance || (confirming && !confirmed) || submitting}
              onClick={handleSubmit}
            >
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Processing...</> : confirming ? "Confirm Exchange" : "Continue"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
