"use client"

import { useEffect, useState, useCallback } from "react"
import { motion } from "framer-motion"
import {
  ArrowLeft, RefreshCw, Search, ExternalLink,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { exchangeApi, type ExchangeResponse, type ExchangeListResponse } from "@/lib/api"
import Link from "next/link"

function formatCurrency(amount: number, currency = "ZAR"): string {
  try {
    return new Intl.NumberFormat("en-ZA", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

const CURRENCY_FLAGS: Record<string, string> = {
  ZAR: "\u{1F1FF}\u{1F1E6}", USD: "\u{1F1FA}\u{1F1F8}", EUR: "\u{1F1EA}\u{1F1FA}",
  GBP: "\u{1F1EC}\u{1F1E7}", NGN: "\u{1F1F3}\u{1F1EC}", KES: "\u{1F1F0}\u{1F1EA}",
  BTC: "\u20BF", ETH: "\u2E19", USDT: "\u{1F4B5}",
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { label: string; variant: "default" | "destructive" | "secondary" | "outline" }> = {
    completed: { label: "Completed", variant: "default" },
    failed: { label: "Failed", variant: "destructive" },
    reversed: { label: "Reversed", variant: "secondary" },
    pending: { label: "Pending", variant: "outline" },
    processing: { label: "Processing", variant: "outline" },
  }
  const v = variants[status] || { label: status, variant: "outline" as const }
  return <Badge variant={v.variant}>{v.label}</Badge>
}

export default function ExchangeHistoryPage() {
  const [data, setData] = useState<ExchangeListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")

  const fetchData = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const res = await exchangeApi.list(p, 20)
      setData(res)
    } catch { }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData(page) }, [page, fetchData])

  const filtered = data?.data.filter((item) =>
    !search || item.reference.toLowerCase().includes(search.toLowerCase())
  ) ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard/exchange">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Exchange History</h1>
              <p className="text-sm text-muted-foreground">View all your currency exchange transactions</p>
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchData(page)}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by reference..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <ExternalLink className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium">No exchange history</p>
              <p className="text-sm text-muted-foreground mt-1">
                {search ? "No results match your search" : "You haven't made any exchanges yet"}
              </p>
              {!search && (
                <Link href="/dashboard/exchange">
                  <Button variant="gradient" className="mt-4">
                    Start an Exchange
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead className="text-right">Amount Sent</TableHead>
                    <TableHead className="text-right">Amount Received</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Fee</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item, i) => (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b transition-colors hover:bg-muted/50"
                    >
                      <TableCell className="text-xs whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleDateString("en-ZA", {
                          day: "2-digit", month: "short", year: "numeric",
                        })}
                        <br />
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(item.createdAt).toLocaleTimeString("en-ZA", {
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                          {item.reference.slice(0, 12)}...
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span>{CURRENCY_FLAGS[item.fromCurrency] || ""}</span>
                          <span className="text-sm font-medium">{item.fromCurrency}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span>{CURRENCY_FLAGS[item.toCurrency] || ""}</span>
                          <span className="text-sm font-medium">{item.toCurrency}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatCurrency(item.amount, item.fromCurrency)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-primary">
                        {formatCurrency(item.convertedAmount, item.toCurrency)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {item.rate.toFixed(6)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {formatCurrency(item.fee, item.fromCurrency)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={item.status} />
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>

              {data && data.totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {data.totalPages} ({data.total} total)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= (data.totalPages ?? 1)}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
