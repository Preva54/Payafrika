"use client"

import { useEffect, useState, useRef } from "react"
import { motion, useInView, animate } from "framer-motion"
import {
  RefreshCw, Globe, Activity, Users, AlertTriangle, 
  ArrowUpRight, ArrowDownRight, DollarSign, Clock, 
  TrendingUp, TrendingDown
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { exchangeApi, type FxDashboard, type LiveRate } from "@/lib/exchange-api"

function CountUp({ value, duration = 2, decimals = 0 }: { value: number; duration?: number; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (!inView) return
    const node = ref.current
    if (!node) return
    const controls = animate(0, value, {
      duration,
      ease: "easeOut",
      onUpdate(v) {
        node.textContent = v.toFixed(decimals)
      },
    })
    return () => controls.stop()
  }, [inView, value, duration, decimals])

  return <span ref={ref}>{value.toFixed(decimals)}</span>
}

export default function ExchangeDashboardPage() {
  const [data, setData] = useState<FxDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const tickerRef = useRef<HTMLDivElement>(null)
  const tickerInView = useInView(tickerRef, { once: true })

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await exchangeApi.reports.dashboard()
      setData(result)
    } catch {
      setError("Failed to load exchange dashboard data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const kpiCards = [
    { label: "Supported Currencies", value: data?.supportedCurrencies ?? 0, icon: Globe, accent: true },
    { label: "Active Exchange Rates", value: data?.activeRates ?? 0, icon: Activity, accent: true },
    { label: "Active Providers", value: data?.activeProviders ?? 0, icon: Users, accent: true },
    { label: "Degraded Providers", value: data?.degradedProviders ?? 0, icon: AlertTriangle, accent: false },
    { label: "Currency Pairs", value: data?.currencyPairs ?? 0, icon: DollarSign, accent: true },
    { label: "Failed Updates", value: data?.failedUpdates ?? 0, icon: AlertTriangle, accent: false },
  ]

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-6 space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-20" />
                <Skeleton className="h-3 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">Exchange Dashboard</h1>
            <p className="text-muted-foreground">Real-time FX overview</p>
          </div>
        </div>
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-6 flex items-center gap-4">
            <AlertTriangle className="h-6 w-6 text-destructive shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-destructive">Error</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="mr-2 h-4 w-4" /> Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">Exchange Dashboard</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            Real-time FX overview
            {data?.lastSync && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Last sync: {new Date(data.lastSync).toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpiCards.map((kpi, i) => {
          const Icon = kpi.icon
          return (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.06 }}
            >
              <Card className="glass hover:shadow-card-hover transition-all overflow-hidden relative">
                <div className={cn(
                  "absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl",
                  kpi.accent ? "bg-primary/10" : "bg-destructive/10"
                )} />
                <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {kpi.label}
                  </CardTitle>
                  <div className={cn(
                    "h-9 w-9 rounded-xl flex items-center justify-center",
                    kpi.accent ? "gradient-bg" : "bg-destructive/10"
                  )}>
                    <Icon className={cn("h-5 w-5", kpi.accent ? "text-white" : "text-destructive")} />
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <div className="text-3xl font-bold">
                    <CountUp value={kpi.value} />
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className={cn(
                      "text-xs",
                      kpi.accent ? "text-accent" : "text-destructive"
                    )}>
                      {kpi.accent ? "Operational" : "Attention needed"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <motion.div
        ref={tickerRef}
        initial={{ opacity: 0, y: 20 }}
        animate={tickerInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5 text-primary" />
              Live Market Ticker
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {(data?.liveRates ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground col-span-full text-center py-8">
                  No live rates available
                </p>
              )}
              {(data?.liveRates ?? []).map((rate: LiveRate) => {
                const isUp = rate.direction === "up" || rate.change >= 0
                return (
                  <div
                    key={rate.pair}
                    className="glass rounded-2xl p-4 flex items-center justify-between hover:shadow-card-hover transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-9 w-9 rounded-xl flex items-center justify-center text-sm font-bold",
                        isUp ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive"
                      )}>
                        {rate.pair.slice(0, 3)}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{rate.pair}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(rate.updatedAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <motion.p
                        key={rate.rate}
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="font-bold tabular-nums"
                      >
                        {rate.rate.toFixed(4)}
                      </motion.p>
                      <div className={cn(
                        "flex items-center gap-1 text-xs",
                        isUp ? "text-accent" : "text-destructive"
                      )}>
                        {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {rate.change >= 0 ? "+" : ""}{rate.change.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
