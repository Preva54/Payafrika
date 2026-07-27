"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { exchangeApi, type ExchangeRate, type ExchangeRateProvider } from "@/lib/exchange-api"
import {
  Plus, Pencil, Trash2, RefreshCw, Search, Lock, Unlock,
  ArrowUpDown, RefreshCw as SyncIcon, Globe, Database, Wifi, Download,
  Clock, TrendingUp, TrendingDown, Minus, AlertCircle,
} from "lucide-react"

const sourceColors: Record<string, string> = {
  manual: "bg-blue-500/10 text-blue-500",
  sync: "bg-emerald-500/10 text-emerald-500",
  seed: "bg-amber-500/10 text-amber-500",
  provider: "bg-violet-500/10 text-violet-500",
}

const emptyForm = {
  baseCurrency: "",
  quoteCurrency: "",
  buyRate: 0,
  sellRate: 0,
  providerId: "",
  lockedUntil: "",
}

type FormData = typeof emptyForm

function formatRate(n: number) {
  return n.toLocaleString("en-ZA", { minimumFractionDigits: 6, maximumFractionDigits: 6 })
}

function formatSpread(n: number) {
  return `${n.toFixed(4)}%`
}

export default function AdminExchangeRatesPage() {
  const [rates, setRates] = useState<ExchangeRate[]>([])
  const [providers, setProviders] = useState<ExchangeRateProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ExchangeRate | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<ExchangeRate | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchAll = () => {
    setLoading(true)
    Promise.all([
      exchangeApi.rates.getAll(),
      exchangeApi.providers.getAll(),
    ])
      .then(([r, p]) => {
        setRates(r)
        setProviders(p)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchAll() }, [])

  const filtered = rates.filter((r) =>
    `${r.baseCurrency}/${r.quoteCurrency} ${r.provider?.name || ""} ${r.source}`
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (r: ExchangeRate) => {
    setEditing(r)
    setForm({
      baseCurrency: r.baseCurrency,
      quoteCurrency: r.quoteCurrency,
      buyRate: r.buyRate,
      sellRate: r.sellRate,
      providerId: r.providerId || "",
      lockedUntil: r.lockedUntil ? r.lockedUntil.slice(0, 16) : "",
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        ...form,
        providerId: form.providerId || undefined,
        lockedUntil: form.lockedUntil || undefined,
      }
      if (editing) {
        await exchangeApi.rates.update(editing.id, payload)
      } else {
        await exchangeApi.rates.create(payload)
      }
      setDialogOpen(false)
      fetchAll()
    } catch { /* ignore */ }
    setSaving(false)
  }

  const handleLock = async (id: string) => {
    try {
      await exchangeApi.rates.lock(id)
      fetchAll()
    } catch { /* ignore */ }
  }

  const handleUnlock = async (id: string) => {
    try {
      await exchangeApi.rates.unlock(id)
      fetchAll()
    } catch { /* ignore */ }
  }

  const handleSync = async () => {
    const primary = providers.find((p) => p.isPrimary)
    if (!primary) return
    setSyncing(true)
    try {
      await exchangeApi.rates.sync(primary.id)
      fetchAll()
    } catch { /* ignore */ }
    setSyncing(false)
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await exchangeApi.rates.delete(confirmDelete.id)
      setConfirmDelete(null)
      fetchAll()
    } catch { /* ignore */ }
    setDeleting(false)
  }

  const activeProviders = providers.filter((p) => p.isActive)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Exchange Rate Management</h1>
          <p className="text-sm text-muted-foreground">Manage live exchange rates, providers, and rate locking</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSync} disabled={syncing || activeProviders.length === 0}>
            <SyncIcon className={cn("mr-2 h-4 w-4", syncing && "animate-spin")} />
            {syncing ? "Syncing..." : "Sync from Provider"}
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />Add Rate
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by pair, provider, or source..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={fetchAll}>
          <RefreshCw className="mr-2 h-4 w-4" />Refresh
        </Button>
      </div>

      <Card className="rounded-2xl bg-background/95 backdrop-blur-xl">
        <CardHeader className="px-6 pt-6 pb-0">
          <CardTitle className="text-lg font-semibold">
            Exchange Rates
            <span className="text-muted-foreground font-normal ml-2">({filtered.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {loading ? (
            <div className="space-y-3">
              {[1,2,3,4,5,6].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Globe className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-lg font-medium">No exchange rates found</p>
              <p className="text-sm">
                {search ? "Try a different search term" : "Click Add Rate or sync from a provider"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pair</TableHead>
                    <TableHead>Buy Rate</TableHead>
                    <TableHead>Sell Rate</TableHead>
                    <TableHead className="hidden md:table-cell">Mid-Market</TableHead>
                    <TableHead className="hidden md:table-cell">Spread</TableHead>
                    <TableHead className="hidden lg:table-cell">Provider</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="hidden lg:table-cell">Locked</TableHead>
                    <TableHead className="hidden lg:table-cell">Updated</TableHead>
                    <TableHead className="w-28">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r, i) => {
                    const isLocked = !!r.lockedUntil && new Date(r.lockedUntil) > new Date()
                    return (
                      <motion.tr
                        key={r.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className="border-b transition-colors hover:bg-muted/30"
                      >
                        <TableCell>
                          <span className="font-mono font-semibold text-sm">
                            {r.baseCurrency}/{r.quoteCurrency}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-sm text-emerald-500 font-medium">
                          {formatRate(r.buyRate)}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-red-500 font-medium">
                          {formatRate(r.sellRate)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell font-mono text-sm text-muted-foreground">
                          {formatRate(r.midMarketRate)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="secondary" className="text-xs font-mono">
                            {formatSpread(r.spread)}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {r.provider?.name || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn("text-xs", sourceColors[r.source] || "")}
                          >
                            {r.source === "manual" && <Wifi className="h-3 w-3 mr-1" />}
                            {r.source === "sync" && <RefreshCw className="h-3 w-3 mr-1" />}
                            {r.source === "seed" && <Database className="h-3 w-3 mr-1" />}
                            {r.source === "provider" && <Download className="h-3 w-3 mr-1" />}
                            {r.source}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {isLocked ? (
                            <Badge variant="default" className="text-xs bg-amber-500 hover:bg-amber-600">
                              <Lock className="h-3 w-3 mr-1" />Locked
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              <Unlock className="h-3 w-3 mr-1" />Unlocked
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-xs text-muted-foreground whitespace-nowrap">
                          {r.updatedAt ? new Date(r.updatedAt).toLocaleDateString("en-ZA", {
                            day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                          }) : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-0.5">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)} title="Edit">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            {isLocked ? (
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleUnlock(r.id)} title="Unlock">
                                <Unlock className="h-3.5 w-3.5 text-emerald-500" />
                              </Button>
                            ) : (
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleLock(r.id)} title="Lock">
                                <Lock className="h-3.5 w-3.5 text-amber-500" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setConfirmDelete(r)} title="Delete">
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Exchange Rate" : "Add Exchange Rate"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update the exchange rate details below." : "Fill in the details to add a new rate."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Base Currency *</label>
                <Input
                  value={form.baseCurrency}
                  onChange={(e) => setForm({ ...form, baseCurrency: e.target.value.toUpperCase().slice(0, 3) })}
                  placeholder="USD"
                  className="uppercase font-mono"
                  disabled={!!editing}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Quote Currency *</label>
                <Input
                  value={form.quoteCurrency}
                  onChange={(e) => setForm({ ...form, quoteCurrency: e.target.value.toUpperCase().slice(0, 3) })}
                  placeholder="ZAR"
                  className="uppercase font-mono"
                  disabled={!!editing}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Buy Rate *</label>
                <Input
                  type="number"
                  step="0.000001"
                  value={form.buyRate}
                  onChange={(e) => setForm({ ...form, buyRate: Number(e.target.value) })}
                  placeholder="18.500000"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Sell Rate *</label>
                <Input
                  type="number"
                  step="0.000001"
                  value={form.sellRate}
                  onChange={(e) => setForm({ ...form, sellRate: Number(e.target.value) })}
                  placeholder="18.800000"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Provider</label>
                <Select
                  value={form.providerId}
                  onValueChange={(v) => setForm({ ...form, providerId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=" ">None</SelectItem>
                    {providers.map((p) => (
                      <SelectItem key={p.id} value={p.id} disabled={!p.isActive}>
                        {p.name} {!p.isActive ? "(inactive)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Locked Until</label>
                <Input
                  type="datetime-local"
                  value={form.lockedUntil}
                  onChange={(e) => setForm({ ...form, lockedUntil: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !form.baseCurrency || !form.quoteCurrency || !form.buyRate || !form.sellRate}>
                {saving ? "Saving..." : editing ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Exchange Rate</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the rate for{" "}
              <strong>{confirmDelete?.baseCurrency}/{confirmDelete?.quoteCurrency}</strong>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
