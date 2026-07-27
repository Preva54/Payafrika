"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
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
import { exchangeApi, type Currency } from "@/lib/exchange-api"
import {
  Plus, Pencil, Trash2, RefreshCw, Search, Star, Power, PowerOff,
  Flag, Globe, Hash, ArrowUpDown, Coins, Eye, EyeOff,
} from "lucide-react"

const emptyForm = {
  code: "",
  name: "",
  symbol: "",
  country: "",
  flagEmoji: "",
  decimalPlaces: 2,
  sortOrder: 0,
}

type FormData = typeof emptyForm

export default function AdminCurrenciesPage() {
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Currency | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Currency | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchCurrencies = () => {
    setLoading(true)
    exchangeApi.currencies.getAll()
      .then(setCurrencies)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchCurrencies() }, [])

  const filtered = currencies.filter((c) =>
    `${c.code} ${c.name} ${c.country}`.toLowerCase().includes(search.toLowerCase())
  )

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (c: Currency) => {
    setEditing(c)
    setForm({
      code: c.code,
      name: c.name,
      symbol: c.symbol,
      country: c.country,
      flagEmoji: c.flagEmoji,
      decimalPlaces: c.decimalPlaces,
      sortOrder: c.sortOrder,
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editing) {
        await exchangeApi.currencies.update(editing.id, form)
      } else {
        await exchangeApi.currencies.create(form)
      }
      setDialogOpen(false)
      fetchCurrencies()
    } catch { /* ignore */ }
    setSaving(false)
  }

  const handleToggle = async (id: string) => {
    try {
      await exchangeApi.currencies.toggle(id)
      fetchCurrencies()
    } catch { /* ignore */ }
  }

  const handleSetDefault = async (id: string) => {
    try {
      await exchangeApi.currencies.setDefault(id)
      fetchCurrencies()
    } catch { /* ignore */ }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await exchangeApi.currencies.delete(confirmDelete.id)
      setConfirmDelete(null)
      fetchCurrencies()
    } catch { /* ignore */ }
    setDeleting(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Currency Management</h1>
          <p className="text-sm text-muted-foreground">Manage supported currencies across the exchange platform</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />Add Currency
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by code, name, or country..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={fetchCurrencies}>
          <RefreshCw className="mr-2 h-4 w-4" />Refresh
        </Button>
      </div>

      <Card className="rounded-2xl bg-background/95 backdrop-blur-xl">
        <CardHeader className="px-6 pt-6 pb-0">
          <CardTitle className="text-lg font-semibold">
            All Currencies
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
              <Coins className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-lg font-medium">No currencies found</p>
              <p className="text-sm">
                {search ? "Try a different search term" : "Click Add Currency to get started"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Flag</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead className="hidden md:table-cell">Country</TableHead>
                  <TableHead className="hidden md:table-cell">Decimals</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20">Default</TableHead>
                  <TableHead className="w-28">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c, i) => (
                  <motion.tr
                    key={c.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b transition-colors hover:bg-muted/30"
                  >
                    <TableCell className="text-lg">{c.flagEmoji || "—"}</TableCell>
                    <TableCell className="font-mono font-semibold uppercase">{c.code}</TableCell>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.symbol}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />{c.country || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="secondary" className="text-xs">{c.decimalPlaces}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.isActive ? "default" : "secondary"} className="text-xs">
                        {c.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {c.isDefault && (
                        <Badge variant="default" className="text-xs bg-amber-500 hover:bg-amber-600">
                          <Star className="h-3 w-3 mr-1 fill-current" />Default
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-0.5">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)} title="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleToggle(c.id)}
                          title={c.isActive ? "Deactivate" : "Activate"}
                        >
                          {c.isActive ? <PowerOff className="h-3.5 w-3.5 text-destructive" /> : <Power className="h-3.5 w-3.5 text-emerald-500" />}
                        </Button>
                        {!c.isDefault && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleSetDefault(c.id)} title="Set as Default">
                            <Star className="h-3.5 w-3.5 text-amber-500" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setConfirmDelete(c)} title="Archive">
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Currency" : "Add Currency"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update the currency details below." : "Fill in the details to add a new currency."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Code *</label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().slice(0, 3) })}
                  placeholder="USD"
                  maxLength={3}
                  className="uppercase font-mono"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Symbol</label>
                <Input
                  value={form.symbol}
                  onChange={(e) => setForm({ ...form, symbol: e.target.value })}
                  placeholder="$"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Name *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="US Dollar"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Country</label>
                <Input
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  placeholder="United States"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Flag Emoji</label>
                <Input
                  value={form.flagEmoji}
                  onChange={(e) => setForm({ ...form, flagEmoji: e.target.value })}
                  placeholder="🇺🇸"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Decimal Places</label>
                <Input
                  type="number"
                  min={0}
                  max={8}
                  value={form.decimalPlaces}
                  onChange={(e) => setForm({ ...form, decimalPlaces: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Sort Order</label>
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !form.code || !form.name}>
                {saving ? "Saving..." : editing ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Archive Currency</DialogTitle>
            <DialogDescription>
              Are you sure you want to archive <strong>{confirmDelete?.code} — {confirmDelete?.name}</strong>?
              This will hide it but retain historical data.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Archiving..." : "Archive"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
