"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Plus, Search, RefreshCw, Edit, Trash2, Power, PowerOff,
  Loader2, AlertTriangle, Percent, GripVertical,
  Layers, Globe, Users, Store, Flag, Tag
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
import { exchangeApi, type FxMargin } from "@/lib/exchange-api"

const typeConfig: Record<string, { label: string; variant: "default" | "secondary" | "success" | "premium" | "outline" }> = {
  global: { label: "Global", variant: "default" },
  merchant: { label: "Merchant", variant: "secondary" },
  customer: { label: "Customer", variant: "success" },
  country: { label: "Country", variant: "premium" },
  pair: { label: "Pair", variant: "outline" },
}

const typeIcons: Record<string, typeof Layers> = {
  global: Layers,
  merchant: Store,
  customer: Users,
  country: Flag,
  pair: Tag,
}

const marginTypeConfig: Record<string, { label: string; variant: "default" | "secondary" | "premium" }> = {
  percentage: { label: "Percentage", variant: "default" },
  fixed: { label: "Fixed", variant: "secondary" },
  tiered: { label: "Tiered", variant: "premium" },
}

const emptyMargin: Partial<FxMargin> = {
  name: "",
  type: "global",
  entityId: "",
  marginType: "percentage",
  value: 0,
  minValue: undefined,
  maxValue: undefined,
  isActive: true,
  priority: 0,
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
                <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
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
          <Percent className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-1">No FX margins configured</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm text-center">
          Define margin rules to control FX rate markups across different entities and segments.
        </p>
        <Button onClick={onAdd}>
          <Plus className="mr-2 h-4 w-4" /> Add Margin
        </Button>
      </CardContent>
    </Card>
  )
}

export default function FxMarginsPage() {
  const [margins, setMargins] = useState<FxMargin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [editing, setEditing] = useState<FxMargin | null>(null)
  const [form, setForm] = useState<Partial<FxMargin>>(emptyMargin)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fetchMargins = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await exchangeApi.margins.getAll()
      setMargins(res)
    } catch {
      setError("Failed to load FX margins")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchMargins() }, [])

  const filtered = margins.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.type.toLowerCase().includes(search.toLowerCase()) ||
      m.marginType.toLowerCase().includes(search.toLowerCase())
  )

  const openAdd = () => {
    setEditing(null)
    setForm(emptyMargin)
    setDialogOpen(true)
  }

  const openEdit = (m: FxMargin) => {
    setEditing(m)
    setForm({ ...m })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editing) {
        const updated = await exchangeApi.margins.update(editing.id, form)
        setMargins((prev) => prev.map((m) => (m.id === editing.id ? updated : m)))
      } else {
        const created = await exchangeApi.margins.create(form)
        setMargins((prev) => [...prev, created])
      }
      setDialogOpen(false)
    } catch {
      // handled by toast in production
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (m: FxMargin) => {
    try {
      await exchangeApi.margins.toggle(m.id)
      setMargins((prev) =>
        prev.map((x) => (x.id === m.id ? { ...x, isActive: !x.isActive } : x))
      )
    } catch {
      // handled by toast in production
    }
  }

  const handleDelete = async (id: string) => {
    setDeleting(true)
    try {
      await exchangeApi.margins.delete(id)
      setMargins((prev) => prev.filter((m) => m.id !== id))
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
          <h1 className="text-2xl font-bold mb-1">FX Margins</h1>
          <p className="text-muted-foreground">Configure margin rules for FX rates</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchMargins}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button size="sm" onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" /> Add Margin
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search margins..."
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
            <Button variant="outline" size="sm" onClick={fetchMargins}>Retry</Button>
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
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Margin Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Min Value</TableHead>
                  <TableHead>Max Value</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence mode="popLayout">
                  {filtered.map((margin) => {
                    const typeCfg = typeConfig[margin.type] ?? typeConfig.global
                    const TypeIcon = typeIcons[margin.type] ?? Layers
                    const mtCfg = marginTypeConfig[margin.marginType] ?? marginTypeConfig.percentage
                    return (
                      <motion.tr
                        key={margin.id}
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
                              "h-9 w-9 rounded-xl flex items-center justify-center shrink-0",
                              margin.isActive ? "gradient-bg" : "bg-muted"
                            )}>
                              <TypeIcon className={cn("h-4 w-4", margin.isActive ? "text-white" : "text-muted-foreground")} />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{margin.name}</p>
                              {margin.entityId && (
                                <p className="text-xs text-muted-foreground">Entity: {margin.entityId}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={typeCfg.variant} className="gap-1">
                            <TypeIcon className="h-3 w-3" />
                            {typeCfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={mtCfg.variant} className="capitalize">
                            {margin.marginType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm font-semibold tabular-nums">
                            {margin.marginType === "percentage" ? `${margin.value}%` : margin.value.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {margin.minValue != null ? (
                            <span className="text-sm tabular-nums">{margin.minValue}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {margin.maxValue != null ? (
                            <span className="text-sm tabular-nums">{margin.maxValue}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={margin.isActive}
                              onCheckedChange={() => handleToggle(margin)}
                            />
                            {margin.isActive ? (
                              <span className="text-xs text-accent">On</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">Off</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{margin.priority}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEdit(margin)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setConfirmDelete(margin.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    )
                  })}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Margin" : "Add Margin"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update the FX margin rule configuration." : "Define a new FX margin rule."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  placeholder="Standard merchant margin"
                  value={form.name ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <Select
                  value={form.type ?? "global"}
                  onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global</SelectItem>
                    <SelectItem value="merchant">Merchant</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="country">Country</SelectItem>
                    <SelectItem value="pair">Pair</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Margin Type</label>
                <Select
                  value={form.marginType ?? "percentage"}
                  onValueChange={(v) => setForm((f) => ({ ...f, marginType: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed</SelectItem>
                    <SelectItem value="tiered">Tiered</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Value</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="2.5"
                  value={form.value ?? 0}
                  onChange={(e) => setForm((f) => ({ ...f, value: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Entity ID (optional)</label>
              <Input
                placeholder="Leave empty for global rules"
                value={form.entityId ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, entityId: e.target.value || undefined }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Min Value</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={form.minValue ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, minValue: e.target.value ? parseFloat(e.target.value) : undefined }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Max Value</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="100"
                  value={form.maxValue ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, maxValue: e.target.value ? parseFloat(e.target.value) : undefined }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={form.priority ?? 0}
                  onChange={(e) => setForm((f) => ({ ...f, priority: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={form.isActive ?? true}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
                  />
                  Active
                </label>
              </div>
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
            <DialogTitle>Delete Margin</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this margin rule? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-destructive/5 border border-destructive/20">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm text-muted-foreground">
              This will remove the margin rule from all associated FX conversions.
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
