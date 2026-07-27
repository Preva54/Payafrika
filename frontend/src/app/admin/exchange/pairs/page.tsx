"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Plus, Search, RefreshCw, Edit, Trash2, Power, PowerOff,
  Loader2, AlertTriangle, Coins, Percent, GripVertical,
  ArrowLeftRight, DollarSign, BadgePercent
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogTrigger, DialogClose
} from "@/components/ui/dialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { exchangeApi, type CurrencyPair } from "@/lib/exchange-api"

const emptyPair: Partial<CurrencyPair> = {
  baseCurrency: "",
  quoteCurrency: "",
  isEnabled: true,
  minBuySpread: 0,
  maxBuySpread: 0,
  minSellSpread: 0,
  maxSellSpread: 0,
  dailyBuyLimit: 0,
  dailySellLimit: 0,
  buyFee: 0,
  sellFee: 0,
  feeType: "percentage",
  sortOrder: 0,
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-10 w-24" />
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-4 flex items-center gap-4">
                <Skeleton className="h-10 w-16 rounded-lg shrink-0" />
                <div className="flex-1 grid grid-cols-4 gap-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <ArrowLeftRight className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-1">No currency pairs</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm text-center">
          Create your first currency pair to enable FX conversions.
        </p>
        <Button onClick={onAdd}>
          <Plus className="mr-2 h-4 w-4" /> Add Pair
        </Button>
      </CardContent>
    </Card>
  )
}

export default function CurrencyPairsPage() {
  const [pairs, setPairs] = useState<CurrencyPair[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [editing, setEditing] = useState<CurrencyPair | null>(null)
  const [form, setForm] = useState<Partial<CurrencyPair>>(emptyPair)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fetchPairs = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await exchangeApi.pairs.getAll()
      setPairs(res)
    } catch {
      setError("Failed to load currency pairs")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPairs() }, [])

  const filtered = pairs.filter(
    (p) =>
      p.baseCurrency.toLowerCase().includes(search.toLowerCase()) ||
      p.quoteCurrency.toLowerCase().includes(search.toLowerCase())
  )

  const openAdd = () => {
    setEditing(null)
    setForm(emptyPair)
    setDialogOpen(true)
  }

  const openEdit = (p: CurrencyPair) => {
    setEditing(p)
    setForm({ ...p })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editing) {
        const updated = await exchangeApi.pairs.update(editing.id, form)
        setPairs((prev) => prev.map((p) => (p.id === editing.id ? updated : p)))
      } else {
        const created = await exchangeApi.pairs.create(form)
        setPairs((prev) => [...prev, created])
      }
      setDialogOpen(false)
    } catch {
      // handled by toast in production
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (p: CurrencyPair) => {
    try {
      await exchangeApi.pairs.toggle(p.id)
      setPairs((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, isEnabled: !x.isEnabled } : x))
      )
    } catch {
      // handled by toast in production
    }
  }

  const handleDelete = async (id: string) => {
    setDeleting(true)
    try {
      await exchangeApi.pairs.delete(id)
      setPairs((prev) => prev.filter((p) => p.id !== id))
      setConfirmDelete(null)
    } catch {
      // handled by toast in production
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <LoadingSkeleton />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">Currency Pairs</h1>
          <p className="text-muted-foreground">Manage FX trading pairs and fees</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchPairs}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button size="sm" onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" /> Add Pair
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by base or quote currency..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm flex-1">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchPairs}>Retry</Button>
          </CardContent>
        </Card>
      )}

      {!error && filtered.length === 0 && (
        <EmptyState onAdd={openAdd} />
      )}

      {filtered.length > 0 && (
        <Card className="glass overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pair</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Buy Spread</TableHead>
                  <TableHead>Sell Spread</TableHead>
                  <TableHead>Daily Buy Limit</TableHead>
                  <TableHead>Daily Sell Limit</TableHead>
                  <TableHead>Buy Fee</TableHead>
                  <TableHead>Sell Fee</TableHead>
                  <TableHead>Fee Type</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence mode="popLayout">
                  {filtered.map((pair) => (
                    <motion.tr
                      key={pair.id}
                      layout
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.2 }}
                      className="border-b border-border/50 group"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "h-10 rounded-xl flex items-center justify-center px-3 text-sm font-bold shrink-0",
                            pair.isEnabled ? "gradient-bg text-white" : "bg-muted text-muted-foreground"
                          )}>
                            {pair.baseCurrency}/{pair.quoteCurrency}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={pair.isEnabled ? "success" : "secondary"}>
                          {pair.isEnabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="text-xs">Min: {pair.minBuySpread}%</p>
                          <p className="text-xs text-muted-foreground">Max: {pair.maxBuySpread}%</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="text-xs">Min: {pair.minSellSpread}%</p>
                          <p className="text-xs text-muted-foreground">Max: {pair.maxSellSpread}%</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm tabular-nums">
                          {pair.dailyBuyLimit.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm tabular-nums">
                          {pair.dailySellLimit.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{pair.buyFee}%</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{pair.sellFee}%</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize gap-1">
                          {pair.feeType === "percentage" ? (
                            <Percent className="h-3 w-3" />
                          ) : (
                            <DollarSign className="h-3 w-3" />
                          )}
                          {pair.feeType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 justify-end">
                          <Switch
                            checked={pair.isEnabled}
                            onCheckedChange={() => handleToggle(pair)}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(pair)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setConfirmDelete(pair.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Currency Pair" : "Add Currency Pair"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update the currency pair configuration." : "Configure a new currency trading pair."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Base Currency</label>
                <Input
                  placeholder="USD"
                  value={form.baseCurrency ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, baseCurrency: e.target.value.toUpperCase() }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Quote Currency</label>
                <Input
                  placeholder="ZAR"
                  value={form.quoteCurrency ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, quoteCurrency: e.target.value.toUpperCase() }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Min Buy Spread (%)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={form.minBuySpread ?? 0}
                  onChange={(e) => setForm((f) => ({ ...f, minBuySpread: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Max Buy Spread (%)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={form.maxBuySpread ?? 0}
                  onChange={(e) => setForm((f) => ({ ...f, maxBuySpread: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Min Sell Spread (%)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={form.minSellSpread ?? 0}
                  onChange={(e) => setForm((f) => ({ ...f, minSellSpread: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Max Sell Spread (%)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={form.maxSellSpread ?? 0}
                  onChange={(e) => setForm((f) => ({ ...f, maxSellSpread: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Daily Buy Limit</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={form.dailyBuyLimit ?? 0}
                  onChange={(e) => setForm((f) => ({ ...f, dailyBuyLimit: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Daily Sell Limit</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={form.dailySellLimit ?? 0}
                  onChange={(e) => setForm((f) => ({ ...f, dailySellLimit: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Buy Fee (%)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={form.buyFee ?? 0}
                  onChange={(e) => setForm((f) => ({ ...f, buyFee: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Sell Fee (%)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={form.sellFee ?? 0}
                  onChange={(e) => setForm((f) => ({ ...f, sellFee: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Fee Type</label>
                <Select
                  value={form.feeType ?? "percentage"}
                  onValueChange={(v) => setForm((f) => ({ ...f, feeType: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Sort Order</label>
              <Input
                type="number"
                placeholder="0"
                value={form.sortOrder ?? 0}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={form.isEnabled ?? true}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isEnabled: v }))}
              />
              <span className="text-sm">Enabled</span>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={(o) => { if (!o) setConfirmDelete(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Currency Pair</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this pair? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-destructive/5 border border-destructive/20">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm text-muted-foreground">
              All associated rates and configurations will be permanently removed.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
              disabled={deleting}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
