"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Repeat, ArrowRight, Check, Loader2, TrendingUp, TrendingDown,
  RefreshCw, Clock, AlertCircle, ArrowLeft, History, ChevronDown,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { exchangeApi, type ExchangeQuoteResponse, type ExchangeResponse, type ExchangeRateResponse } from "@/lib/api"
import Link from "next/link"

const CURRENCIES = ["ZAR", "USD", "EUR", "GBP", "NGN", "KES", "BTC", "ETH", "USDT"]
const CURRENCY_FLAGS: Record<string, string> = {
  ZAR: "\u{1F1FF}\u{1F1E6}", USD: "\u{1F1FA}\u{1F1F8}", EUR: "\u{1F1EA}\u{1F1FA}",
  GBP: "\u{1F1EC}\u{1F1E7}", NGN: "\u{1F1F3}\u{1F1EC}", KES: "\u{1F1F0}\u{1F1EA}",
  BTC: "\u20BF", ETH: "\u2E19", USDT: "\u{1F4B5}",
}

function formatCurrency(amount: number, currency = "ZAR"): string {
  try {
    return new Intl.NumberFormat("en-ZA", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

function StepIndicator({ step }: { step: number }) {
  const steps = ["Details", "Review", "Processing", "Done"]
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div className={`flex items-center gap-2 ${i <= step ? "text-primary" : "text-muted-foreground"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              i < step ? "bg-primary text-primary-foreground" :
              i === step ? "bg-primary/20 text-primary border-2 border-primary" :
              "bg-muted text-muted-foreground"
            }`}>
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className="text-sm hidden sm:inline font-medium">{s}</span>
          </div>
          {i < steps.length - 1 && <div className={`w-8 h-0.5 ${i < step ? "bg-primary" : "bg-muted"}`} />}
        </div>
      ))}
    </div>
  )
}

function LiveRatesSidebar({ rates }: { rates: ExchangeRateResponse[] }) {
  return (
    <Card className="glass rounded-xl border-border/50 bg-background/50 backdrop-blur-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Live Exchange Rates</CardTitle>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            Live
          </div>
        </div>
        <CardDescription>Updated every 30 seconds</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {rates.length === 0 ? (
          <>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between p-3">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-24" />
              </div>
            ))}
          </>
        ) : (
          rates.map((rate, i) => (
            <motion.div
              key={`${rate.from}-${rate.to}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between rounded-lg p-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{CURRENCY_FLAGS[rate.from] || rate.from}</span>
                <span className="text-sm font-medium">{rate.from}/{rate.to}</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-mono font-medium">{rate.rate.toFixed(4)}</p>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(rate.lastUpdated).toLocaleTimeString()}
                </p>
              </div>
            </motion.div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

export default function ExchangePage() {
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0)
  const [fromCurrency, setFromCurrency] = useState("ZAR")
  const [toCurrency, setToCurrency] = useState("USD")
  const [amount, setAmount] = useState("")
  const [quote, setQuote] = useState<ExchangeQuoteResponse | null>(null)
  const [result, setResult] = useState<ExchangeResponse | null>(null)
  const [rates, setRates] = useState<ExchangeRateResponse[]>([])
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const fetchRates = useCallback(async () => {
    try {
      const data = await exchangeApi.rates()
      setRates(data)
    } catch { }
  }, [])

  useEffect(() => {
    fetchRates()
    const interval = setInterval(fetchRates, 30000)
    return () => clearInterval(interval)
  }, [fetchRates])

  const getQuote = useCallback(async (amt: string, from: string, to: string) => {
    const num = parseFloat(amt)
    if (isNaN(num) || num <= 0 || from === to) return
    try {
      const q = await exchangeApi.quote({ amount: num, fromCurrency: from, toCurrency: to })
      setQuote(q)
      setError("")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to get quote")
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!amount || parseFloat(amount) <= 0 || fromCurrency === toCurrency) return
    debounceRef.current = setTimeout(() => getQuote(amount, fromCurrency, toCurrency), 500)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [amount, fromCurrency, toCurrency, getQuote])

  const handleSwap = () => {
    const t = fromCurrency
    setFromCurrency(toCurrency)
    setToCurrency(t)
  }

  const handleGetQuote = async () => {
    const num = parseFloat(amount)
    if (isNaN(num) || num <= 0) { setError("Enter a valid amount"); return }
    if (fromCurrency === toCurrency) { setError("Currencies must differ"); return }
    setError("")
    try {
      const q = await exchangeApi.quote({ amount: num, fromCurrency, toCurrency })
      setQuote(q)
      setStep(1)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to get quote")
    }
  }

  const handleConfirm = async () => {
    const num = parseFloat(amount)
    if (isNaN(num) || num <= 0) return
    setSubmitting(true)
    setStep(2)
    try {
      const res = await exchangeApi.submit({ amount: num, fromCurrency, toCurrency })
      setResult(res)
      setStep(3)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Exchange failed")
      setStep(1)
    }
    setSubmitting(false)
  }

  const handleReset = () => {
    setStep(0)
    setAmount("")
    setQuote(null)
    setResult(null)
    setError("")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Currency Exchange</h1>
          <p className="text-sm text-muted-foreground">Convert between currencies at competitive rates</p>
        </div>
        <Link href="/dashboard/exchange/history">
          <Button variant="outline" size="sm">
            <History className="mr-2 h-4 w-4" />
            Exchange History
          </Button>
        </Link>
      </div>

      <StepIndicator step={step} />

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                <Card className="glass rounded-xl border-border/50 bg-background/50 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-base">Enter Exchange Details</CardTitle>
                    <CardDescription>Select currencies and enter the amount you want to exchange</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label>You Send</Label>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <Input
                            type="number"
                            placeholder="0.00"
                            className="text-lg h-12"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                          />
                        </div>
                        <Select value={fromCurrency} onValueChange={setFromCurrency}>
                          <SelectTrigger className="w-28 h-12">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CURRENCIES.map((c) => (
                              <SelectItem key={c} value={c}>
                                <span className="flex items-center gap-2">
                                  <span>{CURRENCY_FLAGS[c]}</span>
                                  <span>{c}</span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex justify-center -my-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 rounded-full border-2"
                        onClick={handleSwap}
                      >
                        <Repeat className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label>You Receive</Label>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <motion.div
                            key={`${quote?.convertedAmount ?? 0}-${toCurrency}`}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="h-12 rounded-xl border border-input bg-muted/50 px-4 flex items-center text-lg font-mono"
                          >
                            {quote ? formatCurrency(quote.convertedAmount, toCurrency) : amount ? "Fetching..." : "0.00"}
                          </motion.div>
                        </div>
                        <Select value={toCurrency} onValueChange={setToCurrency}>
                          <SelectTrigger className="w-28 h-12">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CURRENCIES.map((c) => (
                              <SelectItem key={c} value={c}>
                                <span className="flex items-center gap-2">
                                  <span>{CURRENCY_FLAGS[c]}</span>
                                  <span>{c}</span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Separator />

                    {quote ? (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm"
                      >
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Exchange Rate</span>
                          <span className="font-mono font-medium">
                            1 {fromCurrency} = {quote.rate.toFixed(4)} {toCurrency}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Platform Fee (0.5%)</span>
                          <span className="font-mono">{formatCurrency(quote.fee, fromCurrency)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">FX Margin (0.5%)</span>
                          <span className="font-mono">{formatCurrency(quote.fxMargin, fromCurrency)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-medium text-base">
                          <span>You Receive</span>
                          <span className="font-mono text-primary">
                            {formatCurrency(quote.convertedAmount, toCurrency)}
                          </span>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="rounded-lg bg-muted/30 p-4 text-center text-sm text-muted-foreground">
                        {fromCurrency === toCurrency
                          ? "Select different currencies"
                          : "Enter an amount to see the exchange rate"}
                      </div>
                    )}

                    <Button
                      variant="gradient"
                      className="w-full h-12 text-base"
                      disabled={!amount || parseFloat(amount) <= 0 || fromCurrency === toCurrency}
                      onClick={handleGetQuote}
                    >
                      Get Quote
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {step === 1 && quote && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                <Card className="glass rounded-xl border-border/50 bg-background/50 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-base">Review Exchange</CardTitle>
                    <CardDescription>Please review the details of your exchange before confirming</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="rounded-lg bg-muted/30 p-4 space-y-1">
                        <p className="text-xs text-muted-foreground">You Send</p>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{CURRENCY_FLAGS[fromCurrency]}</span>
                          <div>
                            <p className="font-bold text-lg">{formatCurrency(quote.amount, fromCurrency)}</p>
                            <p className="text-xs text-muted-foreground">{fromCurrency}</p>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-lg bg-muted/30 p-4 space-y-1">
                        <p className="text-xs text-muted-foreground">You Receive</p>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{CURRENCY_FLAGS[toCurrency]}</span>
                          <div>
                            <p className="font-bold text-lg text-primary">{formatCurrency(quote.convertedAmount, toCurrency)}</p>
                            <p className="text-xs text-muted-foreground">{toCurrency}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg bg-muted/30 p-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Exchange Rate</span>
                        <span className="font-mono font-medium">1 {fromCurrency} = {quote.rate.toFixed(6)} {toCurrency}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fee (0.5%)</span>
                        <span className="font-mono">{formatCurrency(quote.fee, fromCurrency)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">FX Margin (0.5%)</span>
                        <span className="font-mono">{formatCurrency(quote.fxMargin, fromCurrency)}</span>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button variant="outline" className="flex-1" onClick={() => setStep(0)}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                      </Button>
                      <Button variant="gradient" className="flex-1" disabled={submitting} onClick={handleConfirm}>
                        Confirm Exchange
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-20"
              >
                <div className="flex gap-3 mb-6">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-4 h-4 rounded-full bg-primary"
                      animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
                    />
                  ))}
                </div>
                <p className="text-lg font-medium">Exchanging your funds...</p>
                <p className="text-sm text-muted-foreground mt-1">Please wait while we process your exchange</p>
              </motion.div>
            )}

            {step === 3 && result && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                <Card className="glass rounded-xl border-border/50 bg-background/50 backdrop-blur-xl">
                  <CardContent className="p-8 text-center space-y-6">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
                      className="mx-auto w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center"
                    >
                      <Check className="h-10 w-10 text-green-500" />
                    </motion.div>

                    <div>
                      <h2 className="text-2xl font-bold">Exchange Successful!</h2>
                      <p className="text-sm text-muted-foreground mt-1">Your currency exchange has been completed</p>
                    </div>

                    <div className="max-w-md mx-auto rounded-lg bg-muted/30 p-4 space-y-3 text-sm text-left">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sent</span>
                        <span className="font-medium">{formatCurrency(result.amount, result.fromCurrency)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Received</span>
                        <span className="font-medium text-primary">{formatCurrency(result.convertedAmount, result.toCurrency)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Rate</span>
                        <span className="font-mono">1 {result.fromCurrency} = {result.rate.toFixed(6)} {result.toCurrency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fee</span>
                        <span className="font-mono">{formatCurrency(result.fee, result.fromCurrency)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Reference</span>
                        <span className="font-mono text-xs">{result.reference}</span>
                      </div>
                    </div>

                    <div className="flex gap-3 justify-center">
                      <Link href="/dashboard/exchange/history">
                        <Button variant="outline">
                          <History className="mr-2 h-4 w-4" />
                          View Exchange History
                        </Button>
                      </Link>
                      <Button variant="gradient" onClick={handleReset}>
                        <Repeat className="mr-2 h-4 w-4" />
                        New Exchange
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <LiveRatesSidebar rates={rates} />
      </div>
    </div>
  )
}
