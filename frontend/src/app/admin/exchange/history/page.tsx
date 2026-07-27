"use client"

import { useEffect, useState, useMemo } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { cn } from "@/lib/utils"
import { exchangeApi, type ExchangeRate } from "@/lib/exchange-api"
import {
  RefreshCw, Download, TrendingUp, TrendingDown, Minus,
  Clock, Search, DollarSign, ArrowUpDown,
} from "lucide-react"

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

function formatDateShort(d: string) {
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })
}

function formatRate(n: number) {
  return n.toFixed(4)
}

function formatSpread(n: number) {
  return n.toFixed(4)
}

export default function ExchangeHistoryPage() {
  const [rates, setRates] = useState<ExchangeRate[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedPair, setSelectedPair] = useState<string>("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  useEffect(() => {
    setLoading(true)
    exchangeApi.rates.getAll()
      .then(setRates)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const allPairs = useMemo(() => {
    const set = new Set(rates.map((r) => `${r.baseCurrency}/${r.quoteCurrency}`))
    return Array.from(set).sort()
  }, [rates])

  const filtered = useMemo(() => {
    let result = rates
    if (selectedPair) {
      const [base, quote] = selectedPair.split("/")
      result = result.filter((r) => r.baseCurrency === base && r.quoteCurrency === quote)
    }
    if (dateFrom) {
      result = result.filter((r) => new Date(r.createdAt) >= new Date(dateFrom))
    }
    if (dateTo) {
      const end = new Date(dateTo)
      end.setHours(23, 59, 59, 999)
      result = result.filter((r) => new Date(r.createdAt) <= end)
    }
    if (search) {
      const q = search.toLowerCase()
      result = result.filter((r) =>
        `${r.baseCurrency}/${r.quoteCurrency}`.toLowerCase().includes(q) ||
        r.source.toLowerCase().includes(q)
      )
    }
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [rates, selectedPair, dateFrom, dateTo, search])

  const groupedPairs = useMemo(() => {
    const map = new Map<string, ExchangeRate[]>()
    for (const rate of filtered) {
      const key = `${rate.baseCurrency}/${rate.quoteCurrency}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(rate)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  const chartData = useMemo(() => {
    if (!selectedPair && groupedPairs.length > 0) {
      const [_, rates] = groupedPairs[0]
      return rates.slice().reverse().map((r) => ({
        date: formatDateShort(r.createdAt),
        buy: r.buyRate,
        sell: r.sellRate,
        mid: r.midMarketRate,
      }))
    }
    if (selectedPair) {
      const [base, quote] = selectedPair.split("/")
      return rates
        .filter((r) => r.baseCurrency === base && r.quoteCurrency === quote)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .map((r) => ({
          date: formatDateShort(r.createdAt),
          buy: r.buyRate,
          sell: r.sellRate,
          mid: r.midMarketRate,
        }))
    }
    return []
  }, [rates, selectedPair, groupedPairs])

  const handleExportCSV = () => {
    const rows = [["Pair", "Base", "Quote", "Buy Rate", "Sell Rate", "Mid Rate", "Spread", "Source", "Date"]]
    for (const rate of filtered) {
      rows.push([
        `${rate.baseCurrency}/${rate.quoteCurrency}`,
        rate.baseCurrency,
        rate.quoteCurrency,
        String(rate.buyRate),
        String(rate.sellRate),
        String(rate.midMarketRate),
        String(rate.spread),
        rate.source,
        rate.createdAt,
      ])
    }
    const csv = rows.map((r) => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `exchange-rates-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Historical Exchange Rates</h1>
          <p className="text-sm text-muted-foreground">View and analyze exchange rate history</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={filtered.length === 0}>
            <Download className="mr-2 h-4 w-4" />Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setLoading(true); exchangeApi.rates.getAll().then(setRates).finally(() => setLoading(false)) }}>
            <RefreshCw className="mr-2 h-4 w-4" />Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="rounded-2xl bg-background/95 backdrop-blur-xl">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Rates</p>
            <p className="text-xl font-bold mt-1">{rates.length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl bg-background/95 backdrop-blur-xl">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Unique Pairs</p>
            <p className="text-xl font-bold mt-1">{allPairs.length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl bg-background/95 backdrop-blur-xl">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Filtered</p>
            <p className="text-xl font-bold mt-1">{filtered.length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl bg-background/95 backdrop-blur-xl">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Avg Records/Pair</p>
            <p className="text-xl font-bold mt-1">{allPairs.length ? (filtered.length / allPairs.length).toFixed(1) : "0"}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl bg-background/95 backdrop-blur-xl p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search pairs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
          <Select value={selectedPair} onValueChange={setSelectedPair}>
            <SelectTrigger className="w-36 h-9 text-xs">
              <SelectValue placeholder="All Pairs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Pairs</SelectItem>
              {allPairs.map((pair) => (
                <SelectItem key={pair} value={pair}>{pair}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 w-32 text-xs" />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 w-32 text-xs" />
        </div>
      </Card>

      {chartData.length > 0 && (
        <Card className="rounded-2xl bg-background/95 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Rate Trend — {selectedPair || (groupedPairs[0]?.[0] ?? "N/A")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" domain={["auto", "auto"]} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Line type="monotone" dataKey="buy" stroke="#10b981" strokeWidth={2} dot={false} name="Buy" />
                <Line type="monotone" dataKey="sell" stroke="#ef4444" strokeWidth={2} dot={false} name="Sell" />
                <Line type="monotone" dataKey="mid" stroke="#3b82f6" strokeWidth={2} dot={false} name="Mid" strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="rounded-2xl bg-background/95 backdrop-blur-xl">
              <CardContent className="p-5">
                <div className="space-y-3">
                  <Skeleton className="h-5 w-32" />
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <Skeleton className="h-16 rounded-xl" />
                    <Skeleton className="h-16 rounded-xl" />
                    <Skeleton className="h-16 rounded-xl" />
                    <Skeleton className="h-16 rounded-xl" />
                    <Skeleton className="h-16 rounded-xl" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : groupedPairs.length === 0 ? (
        <Card className="rounded-2xl bg-background/95 backdrop-blur-xl">
          <CardContent className="py-16 text-center text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No exchange rates found</p>
            <p className="text-sm">{search || selectedPair ? "Try different filters" : "No rates have been synced yet"}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groupedPairs.map(([pair, pairRates], gi) => {
            const latest = pairRates[0]
            const oldest = pairRates[pairRates.length - 1]
            const midChange = latest && oldest ? ((latest.midMarketRate - oldest.midMarketRate) / oldest.midMarketRate * 100) : 0
            const isUp = midChange >= 0
            return (
              <motion.div
                key={pair}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: gi * 0.04 }}
              >
                <Card className="rounded-2xl bg-background/95 backdrop-blur-xl overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold",
                          isUp ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500",
                        )}>
                          {pair.slice(0, 3)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-base">{pair}</h3>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {latest ? formatDate(latest.createdAt) : "N/A"}
                          </div>
                        </div>
                      </div>
                      <div className={cn(
                        "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
                        isUp ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500",
                      )}>
                        {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {midChange >= 0 ? "+" : ""}{midChange.toFixed(2)}%
                      </div>
                    </div>

                    {latest && (
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div className="bg-muted/30 rounded-xl p-3">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Buy Rate</p>
                          <p className="text-sm font-bold text-emerald-500">{formatRate(latest.buyRate)}</p>
                        </div>
                        <div className="bg-muted/30 rounded-xl p-3">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Sell Rate</p>
                          <p className="text-sm font-bold text-red-500">{formatRate(latest.sellRate)}</p>
                        </div>
                        <div className="bg-muted/30 rounded-xl p-3">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Mid Rate</p>
                          <p className="text-sm font-bold text-blue-500">{formatRate(latest.midMarketRate)}</p>
                        </div>
                        <div className="bg-muted/30 rounded-xl p-3">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Spread</p>
                          <p className="text-sm font-bold">{formatSpread(latest.spread)}</p>
                        </div>
                        <div className="bg-muted/30 rounded-xl p-3">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Records</p>
                          <p className="text-sm font-bold">{pairRates.length}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
