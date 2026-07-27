"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  Repeat, ArrowRight, Clock, CheckCircle2, XCircle, Loader2,
  ChevronRight, Shield, Banknote, TrendingUp,
  RefreshCw, AlertTriangle, Check,
  BarChart3, Globe,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { exchangeApi, walletApi, type CurrencyWalletResponse, type ExchangeRateResponse, type ExchangeQuoteResponse, type ExchangeResponse } from "@/lib/api"
import { cn, formatCurrency } from "@/lib/utils"

const CURRENCY_FLAGS: Record<string, string> = {
  ZAR: "\uD83C\uDDFF\uD83C\uDDE6", USD: "\uD83C\uDDFA\uD83C\uDDF8", EUR: "\uD83C\uDDEA\uD83C\uDDFA",
  GBP: "\uD83C\uDDEC\uD83C\uDDE7", NGN: "\uD83C\uDDF3\uD83C\uDDEC", KES: "\uD83C\uDDF0\uD83C\uDDEA",
  BTC: "\u20BF", ETH: "\u27A0", USDT: "\uD83D\uDCB5",
}

const CURRENCY_NAMES: Record<string, string> = {
  ZAR: "South African Rand", USD: "US Dollar", EUR: "Euro",
  GBP: "British Pound", NGN: "Nigerian Naira", KES: "Kenyan Shilling",
  BTC: "Bitcoin", ETH: "Ethereum", USDT: "Tether",
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days} Days Ago`
  return date.toLocaleDateString("en-ZA", { day: "numeric", month: "short" })
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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: "bg-green-500/10 text-green-600 border-green-200 dark:border-green-800",
    pending: "bg-yellow-500/10 text-yellow-600 border-yellow-200 dark:border-yellow-800",
    failed: "bg-red-500/10 text-red-600 border-red-200 dark:border-red-800",
    cancelled: "bg-gray-500/10 text-gray-600 border-gray-200 dark:border-gray-800",
  }
  const icons: Record<string, React.ReactNode> = {
    completed: <CheckCircle2 className="h-3 w-3" />,
    pending: <Clock className="h-3 w-3 animate-pulse" />,
    failed: <XCircle className="h-3 w-3" />,
    cancelled: <XCircle className="h-3 w-3" />,
  }
  return (
    <Badge variant="outline" className={cn("gap-1 capitalize text-[10px]", styles[status])}>
      {icons[status]} {status}
    </Badge>
  )
}

export default function ExchangeCurrencySection() {
  const [balances, setBalances] = useState<CurrencyWalletResponse[]>([])
  const [rates, setRates] = useState<ExchangeRateResponse[]>([])
  const [exchanges, setExchanges] = useState<ExchangeResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [exchanging, setExchanging] = useState(false)
  const [calculating, setCalculating] = useState(false)

  const [fromCurrency, setFromCurrency] = useState("ZAR")
  const [toCurrency, setToCurrency] = useState("USD")
  const [amount, setAmount] = useState("")
  const [quote, setQuote] = useState<ExchangeQuoteResponse | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [exchangeSuccess, setExchangeSuccess] = useState(false)
  const [successData, setSuccessData] = useState<ExchangeResponse | null>(null)
  const [error, setError] = useState("")

  const fetchAll = async () => {
    try {
      const [bals, rateData, excData] = await Promise.all([
        walletApi.balances(),
        exchangeApi.rates().catch(() => []),
        exchangeApi.list(1, 20).catch(() => ({ data: [] })),
      ])
      setBalances(bals)
      setRates(rateData)
      setExchanges(excData.data)
      setLastUpdated(new Date())
      if (bals.length > 0) {
        const nonZAR = bals.find(b => b.currency !== "ZAR")
        if (nonZAR) setToCurrency(nonZAR.currency)
      }
    } catch { /* silently fail */ }
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

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
    setQuote(null)
    setError("")
  }

  const fetchQuote = async () => {
    if (numAmount <= 0) return
    setCalculating(true)
    setError("")
    try {
      const q = await exchangeApi.quote({ amount: numAmount, fromCurrency, toCurrency })
      setQuote(q)
    } catch {
      setQuote(null)
    }
    setCalculating(false)
  }

  useEffect(() => {
    const timer = setTimeout(fetchQuote, 400)
    return () => clearTimeout(timer)
  }, [amount, fromCurrency, toCurrency])

  const handleExchange = async () => {
    if (numAmount <= 0 || !hasSufficientBalance) return
    setConfirmOpen(true)
  }

  const confirmExchange = async () => {
    if (!confirmed) return
    setExchanging(true)
    setError("")
    try {
      const res = await exchangeApi.submit({ amount: numAmount, fromCurrency, toCurrency })
      setSuccessData(res)
      setExchangeSuccess(true)
      setConfirmOpen(false)
      setConfirmed(false)
      setAmount("")
      setQuote(null)
      fetchAll()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Exchange failed")
      setConfirmOpen(false)
    } finally {
      setExchanging(false)
    }
  }

  const timelineExchanges = exchanges.slice(0, 5)

  if (loading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="grid lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-48 w-full" />
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
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <Card className="glass-card overflow-hidden border-primary/10">
        <CardHeader className="border-b border-border/50">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-lg">Exchange Currency</CardTitle>
              <CardDescription className="mt-1">
                Convert funds between your PayAfrika wallets instantly using live exchange rates.
                Exchange rates and fees are displayed before you confirm.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="gap-1 text-xs">
              <Globe className="h-3 w-3" />
              Live Rates
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {exchangeSuccess && successData ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-10 text-center space-y-4"
            >
              <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Exchange Successful</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Your currency exchange has been completed successfully.
                </p>
              </div>
              <div className="max-w-xs mx-auto rounded-xl bg-muted/40 border border-border/50 p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reference</span>
                  <span className="font-mono">{successData.reference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sent</span>
                  <span className="font-semibold">{formatCurrency(successData.amount, successData.fromCurrency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Received</span>
                  <span className="font-semibold text-primary">{formatCurrency(successData.convertedAmount, successData.toCurrency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rate</span>
                  <span className="font-mono">1 {successData.fromCurrency} = {successData.rate.toFixed(4)} {successData.toCurrency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time</span>
                  <span>{new Date(successData.completedAt ?? successData.createdAt).toLocaleTimeString()}</span>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setExchangeSuccess(false)}>
                  Exchange Again
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href="/dashboard/exchange/history">View History</a>
                </Button>
              </div>
            </motion.div>
          ) : (
            <div className="grid lg:grid-cols-5 gap-6">
              {/* Left: Exchange Form */}
              <div className="lg:col-span-3 space-y-6">
                {/* Currency Selectors */}
                <div className="grid grid-cols-[1fr,auto,1fr] gap-3 items-center">
                  <div className="rounded-xl bg-muted/40 border border-border/50 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-xs text-muted-foreground">From Wallet</Label>
                      {fromBalance && (
                        <span className="text-[10px] text-muted-foreground">
                          Available: {formatCurrency(fromBalance.availableBalance, fromCurrency)}
                        </span>
                      )}
                    </div>
                    <Select value={fromCurrency} onValueChange={v => { setFromCurrency(v); setQuote(null) }}>
                      <SelectTrigger className="border-0 p-0 h-auto shadow-none text-base font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {balances.map(b => (
                          <SelectItem key={b.currency} value={b.currency} disabled={b.currency === toCurrency}>
                            <span className="flex items-center gap-2">
                              <span>{CURRENCY_FLAGS[b.currency] || b.flag}</span>
                              <span>{b.currency}</span>
                              <span className="text-muted-foreground font-normal">
                                {formatCurrency(b.availableBalance, b.currency)}
                              </span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button variant="ghost" size="icon" className="mt-6" onClick={handleSwap}>
                    <Repeat className="h-5 w-5" />
                  </Button>

                  <div className="rounded-xl bg-muted/40 border border-border/50 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-xs text-muted-foreground">To Wallet</Label>
                      {toBalance && (
                        <span className="text-[10px] text-muted-foreground">
                          Balance: {formatCurrency(toBalance.balance, toCurrency)}
                        </span>
                      )}
                    </div>
                    <Select value={toCurrency} onValueChange={v => { setToCurrency(v); setQuote(null) }}>
                      <SelectTrigger className="border-0 p-0 h-auto shadow-none text-base font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {balances.map(b => (
                          <SelectItem key={b.currency} value={b.currency} disabled={b.currency === fromCurrency}>
                            <span className="flex items-center gap-2">
                              <span>{CURRENCY_FLAGS[b.currency] || b.flag}</span>
                              <span>{b.currency}</span>
                              <span className="text-muted-foreground font-normal">
                                {formatCurrency(b.balance, b.currency)}
                              </span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Amount Input */}
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="exchange-amount">Amount to Exchange</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        {CURRENCY_FLAGS[fromCurrency] || fromCurrency}
                      </span>
                      <Input
                        id="exchange-amount"
                        type="number"
                        placeholder="0.00"
                        className="pl-10 text-lg"
                        value={amount}
                        onChange={e => { setAmount(e.target.value); setError(""); setExchangeSuccess(false) }}
                      />
                    </div>
                    {!hasSufficientBalance && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Insufficient {fromCurrency} balance
                      </p>
                    )}
                  </div>

                  {/* Live Rate Display */}
                  <div className="rounded-xl bg-muted/30 border border-border/50 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Live Rate</span>
                        {calculating && <Loader2 className="h-3 w-3 animate-spin" />}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold font-mono">
                          1 {fromCurrency} = {rate > 0 ? rate.toFixed(4) : "---"} {toCurrency}
                        </span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { fetchAll(); fetchQuote() }}>
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-muted-foreground">
                        Updated {formatRelativeTime(lastUpdated.toISOString())}
                      </span>
                      {exchangeRate && (
                        <Badge variant="outline" className="text-[10px] gap-0.5 border-green-500/30 text-green-600 bg-green-500/5">
                          <TrendingUp className="h-2.5 w-2.5" /> +{exchangeRate.spread.toFixed(2)}%
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Exchange Summary */}
                  {numAmount > 0 && rate > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl bg-primary/5 border border-primary/10 p-4 space-y-2"
                    >
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">You Send</span>
                        <span className="font-semibold">{formatCurrency(numAmount, fromCurrency)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Exchange Rate</span>
                        <span className="font-mono">1 {fromCurrency} = {rate.toFixed(4)} {toCurrency}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Platform Fee (0.5%)</span>
                        <span className="font-mono">{formatCurrency(fee, fromCurrency)}</span>
                      </div>
                      <Separator className="my-1" />
                      <div className="flex justify-between font-semibold">
                        <span>You&apos;ll Receive</span>
                        <span className="text-base text-primary font-mono">
                          {formatCurrency(convertedAmount, toCurrency)}
                        </span>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="gradient"
                    size="lg"
                    className="gap-1.5"
                    disabled={!numAmount || numAmount <= 0 || !hasSufficientBalance || exchanging}
                    onClick={handleExchange}
                  >
                    {exchanging ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
                    ) : (
                      <><Repeat className="h-4 w-4" /> Exchange Now</>
                    )}
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={handleSwap}>
                    <Repeat className="h-4 w-4" /> Swap Currencies
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-1.5" asChild>
                    <a href="/dashboard/exchange/history">
                      View History <ChevronRight className="h-3 w-3" />
                    </a>
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-1.5" asChild>
                    <a href="/dashboard/exchange">
                      Live Rates <BarChart3 className="h-3 w-3" />
                    </a>
                  </Button>
                </div>

                {error && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> {error}
                  </p>
                )}
              </div>

              {/* Right: Balances + Timeline */}
              <div className="lg:col-span-2 space-y-6">
                {/* Multi-Currency Wallets */}
                <div>
                  <h4 className="text-sm font-semibold mb-3">Your Wallets</h4>
                  <div className="space-y-1.5">
                    {balances.map((bal, i) => (
                      <motion.div
                        key={bal.currency}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className={cn(
                          "flex items-center justify-between rounded-xl p-3 border transition-all",
                          bal.currency === fromCurrency || bal.currency === toCurrency
                            ? "border-primary/30 bg-primary/5" : "border-border/50 bg-muted/20",
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{CURRENCY_FLAGS[bal.currency] || bal.flag}</span>
                          <div>
                            <p className="text-sm font-medium">{bal.currency}</p>
                            <p className="text-[10px] text-muted-foreground">
                              Available: {formatCurrency(bal.availableBalance, bal.currency)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold font-mono">{formatCurrency(bal.balance, bal.currency)}</p>
                          {bal.reservedBalance > 0 && (
                            <p className="text-[10px] text-muted-foreground">
                              Reserved: {formatCurrency(bal.reservedBalance, bal.currency)}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Recent Exchanges */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold">Recent Exchanges</h4>
                    <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" asChild>
                      <a href="/dashboard/exchange/history">View All <ArrowRight className="h-3 w-3" /></a>
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {timelineExchanges.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground">
                        <Repeat className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-xs">No exchanges yet</p>
                      </div>
                    ) : (
                      timelineExchanges.map((exc, i) => (
                        <motion.div
                          key={exc.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="flex items-center justify-between rounded-xl p-3 hover:bg-muted/40 transition-all cursor-default"
                        >
                          <div className="flex items-center gap-3">
                            <div className="rounded-full bg-blue-500/10 p-2">
                              <Repeat className="h-4 w-4 text-blue-500" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">
                                  {exc.fromCurrency} → {exc.toCurrency}
                                </p>
                                <StatusBadge status={exc.status} />
                              </div>
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <span className="font-mono">{formatCurrency(exc.amount, exc.fromCurrency)}</span>
                                <ArrowRight className="h-3 w-3" />
                                <span className="font-mono">{formatCurrency(exc.convertedAmount, exc.toCurrency)}</span>
                                <span>·</span>
                                <span>{formatDateLabel(exc.createdAt)}</span>
                              </p>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                            <a href={`/dashboard/exchange/history`}>
                              <ChevronRight className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>

                {/* Balance Preview */}
                {numAmount > 0 && rate > 0 && fromBalance && toBalance && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                  >
                    <h4 className="text-sm font-semibold mb-3">Balance Preview</h4>
                    <div className="rounded-xl bg-muted/40 border border-border/50 overflow-hidden">
                      <div className="p-3 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>{fromCurrency}</span>
                          <span className="font-mono">
                            {formatCurrency(fromBalance.balance, fromCurrency)}
                            <span className="text-muted-foreground"> → </span>
                            <span className="text-destructive">{formatCurrency(fromBalance.balance - numAmount, fromCurrency)}</span>
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>{toCurrency}</span>
                          <span className="font-mono">
                            {formatCurrency(toBalance.balance, toCurrency)}
                            <span className="text-muted-foreground"> → </span>
                            <span className="text-accent">{formatCurrency(toBalance.balance + convertedAmount, toCurrency)}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Exchange</DialogTitle>
            <DialogDescription>Review your exchange details before confirming.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl bg-muted/40 border border-border/50 divide-y divide-border/30">
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-sm text-muted-foreground">Source Wallet</span>
                <span className="text-sm font-semibold">{fromCurrency}</span>
              </div>
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-sm text-muted-foreground">Destination Wallet</span>
                <span className="text-sm font-semibold">{toCurrency}</span>
              </div>
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-sm text-muted-foreground">Amount</span>
                <span className="text-sm font-mono">{formatCurrency(numAmount, fromCurrency)}</span>
              </div>
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-sm text-muted-foreground">Exchange Rate</span>
                <span className="text-sm font-mono">1 {fromCurrency} = {rate.toFixed(4)} {toCurrency}</span>
              </div>
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-sm text-muted-foreground">Fee (0.5%)</span>
                <span className="text-sm font-mono">{formatCurrency(fee, fromCurrency)}</span>
              </div>
              <div className="flex justify-between px-4 py-2.5 font-semibold">
                <span className="text-sm">You&apos;ll Receive</span>
                <span className="text-sm text-primary font-mono">{formatCurrency(convertedAmount, toCurrency)}</span>
              </div>
            </div>

            {fromBalance && toBalance && (
              <div className="rounded-xl bg-muted/40 border border-border/50 p-3 space-y-1.5 text-xs">
                <p className="text-muted-foreground font-medium mb-1">Updated Balances</p>
                <div className="flex justify-between">
                  <span>{fromCurrency}</span>
                  <span>{formatCurrency(fromBalance.balance - numAmount, fromCurrency)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{toCurrency}</span>
                  <span>{formatCurrency(toBalance.balance + convertedAmount, toCurrency)}</span>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2">
              <Checkbox id="confirm-exchange" checked={confirmed} onCheckedChange={c => setConfirmed(c === true)} />
              <Label htmlFor="confirm-exchange" className="text-xs leading-tight">
                I understand that exchange rates may fluctuate before confirmation and I agree to the current rate.
              </Label>
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button variant="gradient" disabled={!confirmed || exchanging} onClick={confirmExchange}>
              {exchanging ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing...</> : "Confirm Exchange"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
