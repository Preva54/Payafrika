"use client"

import { useState, useEffect, useRef } from "react"
import { motion, useInView } from "framer-motion"
import { TrendingUp, TrendingDown } from "lucide-react"
import { currencies } from "@/data/mock-data"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

export function ExchangeSection() {
  const [prices, setPrices] = useState(currencies.map((c) => c.buyRate))
  const [fromAmount, setFromAmount] = useState("1000")
  const [fromCurrency, setFromCurrency] = useState("USD")
  const [toCurrency, setToCurrency] = useState("ZAR")
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true })

  useEffect(() => {
    const interval = setInterval(() => {
      setPrices((prev) =>
        prev.map((p) => {
          const change = (Math.random() - 0.5) * 0.02 * p
          return Math.max(p * 0.95, p + change)
        })
      )
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const getRate = (code: string) => {
    const idx = currencies.findIndex((c) => c.code === code)
    return prices[idx] || 0
  }

  const convertedAmount = (Number(fromAmount) || 0) * (getRate(fromCurrency) / getRate(toCurrency))

  return (
    <section id="exchange" ref={ref} className="relative py-20 md:py-28 bg-secondary/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <Badge variant="premium" className="mb-4">Live Exchange</Badge>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Real-Time{" "}
            <span className="gradient-text">Exchange Rates</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Live rates updated every 3 seconds. Best interbank rates across all major African currencies.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-4"
          >
            {currencies.slice(0, 4).map((currency, idx) => {
              const currentPrice = prices[idx]
              const change = currency.change24h

              return (
                <div
                  key={currency.code}
                  className="glass-card rounded-2xl p-5 flex items-center justify-between hover:shadow-card-hover transition-all duration-300"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{currency.flag}</span>
                    <div>
                      <p className="font-semibold">{currency.code}</p>
                      <p className="text-xs text-muted-foreground">{currency.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Buy</span>
                      <motion.span
                        key={currentPrice}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="font-bold text-lg tabular-nums"
                      >
                        {currentPrice.toFixed(currency.code === "BTC" || currency.code === "ETH" ? 0 : 2)}
                      </motion.span>
                    </div>
                    <div className={cn(
                      "flex items-center gap-1 text-xs",
                      change >= 0 ? "text-accent" : "text-destructive"
                    )}>
                      {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {change >= 0 ? "+" : ""}{change}%
                    </div>
                  </div>
                </div>
              )
            })}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="glass-card rounded-3xl p-6 md:p-8"
          >
            <h3 className="text-lg font-semibold mb-6">Currency Converter</h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Amount</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={fromAmount}
                    onChange={(e) => setFromAmount(e.target.value)}
                    className="flex-1"
                  />
                  <select
                    value={fromCurrency}
                    onChange={(e) => setFromCurrency(e.target.value)}
                    className="h-11 rounded-xl border border-input bg-transparent px-3 text-sm"
                  >
                    {currencies.map((c) => (
                      <option key={c.code} value={c.code}>{c.code}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={() => {
                    const temp = fromCurrency
                    setFromCurrency(toCurrency)
                    setToCurrency(temp)
                  }}
                  className="h-10 w-10 rounded-xl border border-border flex items-center justify-center hover:bg-secondary transition-colors"
                >
                  ⇄
                </button>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Converted To</label>
                <div className="flex gap-2">
                  <div className="flex-1 h-11 rounded-xl border border-input bg-secondary/50 px-4 flex items-center">
                    <motion.span
                      key={`${fromAmount}-${fromCurrency}-${toCurrency}`}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="font-semibold"
                    >
                      {convertedAmount.toFixed(2)}
                    </motion.span>
                  </div>
                  <select
                    value={toCurrency}
                    onChange={(e) => setToCurrency(e.target.value)}
                    className="h-11 rounded-xl border border-input bg-transparent px-3 text-sm"
                  >
                    {currencies.map((c) => (
                      <option key={c.code} value={c.code}>{c.code}</option>
                    ))}
                  </select>
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center pt-2">
                1 {fromCurrency} = {(getRate(fromCurrency) / getRate(toCurrency)).toFixed(4)} {toCurrency}
              </p>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8"
        >
          {currencies.slice(4).map((currency, idx) => {
            const currentPrice = prices[idx + 4]
            const change = currency.change24h

            return (
              <div key={currency.code} className="glass-card rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{currency.flag}</span>
                  <p className="font-semibold">{currency.code}</p>
                </div>
                <div className="text-right">
                  <motion.p
                    key={currentPrice}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="font-bold text-sm tabular-nums"
                  >
                    {currentPrice.toFixed(0)}
                  </motion.p>
                  <p className={cn("text-xs", change >= 0 ? "text-accent" : "text-destructive")}>
                    {change >= 0 ? "+" : ""}{change}%
                  </p>
                </div>
              </div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
