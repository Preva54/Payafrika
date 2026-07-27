"use client"

import { useEffect, useState, useCallback } from "react"
import { motion } from "framer-motion"
import {
  Search, Plus, Pencil, Trash2, RefreshCw, AlertTriangle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { exchangeApi, type SettlementCurrency } from "@/lib/exchange-api"
import { cn } from "@/lib/utils"

const frequencyColors: Record<string, string> = {
  daily: "bg-blue-500/10 text-blue-500",
  weekly: "bg-purple-500/10 text-purple-500",
  monthly: "bg-emerald-500/10 text-emerald-500",
}

interface SettlementFormData {
  currency: string
  isDefaultSettlement: boolean
  autoConversion: boolean
  settlementFrequency: string
  marginPercent: string
  feePercent: string
  isActive: boolean
}

const emptyForm: SettlementFormData = {
  currency: "", isDefaultSettlement: false, autoConversion: false,
  settlementFrequency: "daily", marginPercent: "", feePercent: "", isActive: true,
}

export default function SettlementCurrenciesPage() {
  const [currencies, setCurrencies] = useState<SettlementCurrency[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showDialog, setShowDialog] = useState(false)
  const [editing, setEditing] = useState<SettlementCurrency | null>(null)
  const [formData, setFormData] = useState<SettlementFormData>(emptyForm)
  const [deleteConfirm, setDeleteConfirm] = useState<SettlementCurrency | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await exchangeApi.settlement.getAll()
      setCurrencies(data)
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = currencies.filter((c) =>
    c.currency.toLowerCase().includes(search.toLowerCase())
  )

  const openCreate = () => {
    setEditing(null)
    setFormData(emptyForm)
    setShowDialog(true)
  }

  const openEdit = (item: SettlementCurrency) => {
    setEditing(item)
    setFormData({
      currency: item.currency,
      isDefaultSettlement: item.isDefaultSettlement,
      autoConversion: item.autoConversion,
      settlementFrequency: item.settlementFrequency,
      marginPercent: item.marginPercent?.toString() ?? "",
      feePercent: item.feePercent?.toString() ?? "",
      isActive: item.isActive,
    })
    setShowDialog(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        currency: formData.currency,
        isDefaultSettlement: formData.isDefaultSettlement,
        autoConversion: formData.autoConversion,
        settlementFrequency: formData.settlementFrequency,
        marginPercent: formData.marginPercent ? Number(formData.marginPercent) : 0,
        feePercent: formData.feePercent ? Number(formData.feePercent) : 0,
        isActive: formData.isActive,
      }
      if (editing) {
        await exchangeApi.settlement.update(editing.id, payload)
      } else {
        await exchangeApi.settlement.create(payload)
      }
      setShowDialog(false)
      fetchData()
    } catch { /* ignore */ }
    setSaving(false)
  }

  const handleToggle = async (item: SettlementCurrency) => {
    try {
      await exchangeApi.settlement.toggle(item.id)
      fetchData()
    } catch { /* ignore */ }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    try {
      await exchangeApi.settlement.delete(deleteConfirm.id)
      setDeleteConfirm(null)
      fetchData()
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Settlement Currencies</h1>
          <p className="text-sm text-muted-foreground">Configure settlement currency rules and fees</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-1" />Refresh
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" />Add Currency
          </Button>
        </div>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search currencies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                {["Currency", "Default", "Auto Conv", "Frequency", "Margin %", "Fee %", "Active", "Actions"].map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">{search ? "No currencies match your search." : "No settlement currencies configured."}</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Currency</TableHead>
                <TableHead>Default Settlement</TableHead>
                <TableHead className="hidden md:table-cell">Auto Conversion</TableHead>
                <TableHead className="hidden md:table-cell">Frequency</TableHead>
                <TableHead className="hidden lg:table-cell">Margin %</TableHead>
                <TableHead className="hidden lg:table-cell">Fee %</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item, i) => (
                <motion.tr
                  key={item.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.15, delay: i * 0.02 }}
                  className="border-b border-border/50 hover:bg-muted/30"
                >
                  <TableCell className="font-medium">{item.currency}</TableCell>
                  <TableCell>
                    {item.isDefaultSettlement ? (
                      <Badge variant="default" className="text-[10px]">Default</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Switch checked={item.autoConversion} disabled />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="secondary" className={cn("text-[10px]", frequencyColors[item.settlementFrequency])}>
                      {item.settlementFrequency}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">{item.marginPercent}%</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">{item.feePercent}%</TableCell>
                  <TableCell>
                    <Switch checked={item.isActive} onCheckedChange={() => handleToggle(item)} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(item)} title="Edit">
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={() => setDeleteConfirm(item)} title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Settlement Currency" : "Add Settlement Currency"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update the settlement currency configuration." : "Configure a new settlement currency."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Currency Code</label>
              <Input
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
                placeholder="e.g. ZAR, USD, NGN"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Default Settlement</label>
                <div className="flex items-center gap-2 pt-1">
                  <Switch
                    checked={formData.isDefaultSettlement}
                    onCheckedChange={(v) => setFormData({ ...formData, isDefaultSettlement: v })}
                  />
                  <span className="text-sm">{formData.isDefaultSettlement ? "Yes" : "No"}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Auto Conversion</label>
                <div className="flex items-center gap-2 pt-1">
                  <Switch
                    checked={formData.autoConversion}
                    onCheckedChange={(v) => setFormData({ ...formData, autoConversion: v })}
                  />
                  <span className="text-sm">{formData.autoConversion ? "Enabled" : "Disabled"}</span>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Settlement Frequency</label>
              <Select value={formData.settlementFrequency} onValueChange={(v) => setFormData({ ...formData, settlementFrequency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Margin %</label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={formData.marginPercent}
                  onChange={(e) => setFormData({ ...formData, marginPercent: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Fee %</label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={formData.feePercent}
                  onChange={(e) => setFormData({ ...formData, feePercent: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Active</label>
              <div className="flex items-center gap-2 pt-1">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(v) => setFormData({ ...formData, isActive: v })}
                />
                <span className="text-sm">{formData.isActive ? "Enabled" : "Disabled"}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!formData.currency || saving}>
              {saving ? "Saving..." : editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete Settlement Currency
            </DialogTitle>
            <DialogDescription>
              Remove &quot;{deleteConfirm?.currency}&quot; from settlement currencies. Are you sure?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
