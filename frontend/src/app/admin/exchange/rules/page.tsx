"use client"

import { useEffect, useState, useCallback } from "react"
import { motion } from "framer-motion"
import {
  Search, Plus, Pencil, Trash2, RefreshCw, ToggleLeft, ToggleRight,
  ArrowUpDown, Filter, X, AlertTriangle
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
import { exchangeApi, type ConversionRule } from "@/lib/exchange-api"
import { cn } from "@/lib/utils"

const ruleTypeColors: Record<string, string> = {
  auto: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  manual: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  customer_preference: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  merchant_settlement: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  multi_wallet: "bg-rose-500/10 text-rose-500 border-rose-500/20",
}

const roundingRuleColors: Record<string, string> = {
  standard: "bg-slate-500/10 text-slate-500",
  round_up: "bg-orange-500/10 text-orange-500",
  round_down: "bg-teal-500/10 text-teal-500",
  truncate: "bg-red-500/10 text-red-500",
}

interface RuleFormData {
  name: string
  ruleType: string
  roundingRule: string
  decimalPrecision: number
  minAmount: string
  maxAmount: string
  isActive: boolean
  priority: number
}

const emptyForm: RuleFormData = {
  name: "", ruleType: "auto", roundingRule: "standard", decimalPrecision: 2,
  minAmount: "", maxAmount: "", isActive: true, priority: 0,
}

export default function ConversionRulesPage() {
  const [rules, setRules] = useState<ConversionRule[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showDialog, setShowDialog] = useState(false)
  const [editingRule, setEditingRule] = useState<ConversionRule | null>(null)
  const [formData, setFormData] = useState<RuleFormData>(emptyForm)
  const [deleteConfirm, setDeleteConfirm] = useState<ConversionRule | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchRules = useCallback(async () => {
    setLoading(true)
    try {
      const data = await exchangeApi.rules.getAll()
      setRules(data)
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { fetchRules() }, [fetchRules])

  const filtered = rules.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  )

  const openCreate = () => {
    setEditingRule(null)
    setFormData(emptyForm)
    setShowDialog(true)
  }

  const openEdit = (rule: ConversionRule) => {
    setEditingRule(rule)
    setFormData({
      name: rule.name,
      ruleType: rule.ruleType,
      roundingRule: rule.roundingRule,
      decimalPrecision: rule.decimalPrecision,
      minAmount: rule.minAmount?.toString() ?? "",
      maxAmount: rule.maxAmount?.toString() ?? "",
      isActive: rule.isActive,
      priority: rule.priority,
    })
    setShowDialog(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        name: formData.name,
        ruleType: formData.ruleType,
        roundingRule: formData.roundingRule,
        decimalPrecision: formData.decimalPrecision,
        minAmount: formData.minAmount ? Number(formData.minAmount) : undefined,
        maxAmount: formData.maxAmount ? Number(formData.maxAmount) : undefined,
        isActive: formData.isActive,
        priority: formData.priority,
      }
      if (editingRule) {
        await exchangeApi.rules.update(editingRule.id, payload)
      } else {
        await exchangeApi.rules.create(payload)
      }
      setShowDialog(false)
      fetchRules()
    } catch { /* ignore */ }
    setSaving(false)
  }

  const handleToggle = async (rule: ConversionRule) => {
    try {
      await exchangeApi.rules.toggle(rule.id)
      fetchRules()
    } catch { /* ignore */ }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    try {
      await exchangeApi.rules.delete(deleteConfirm.id)
      setDeleteConfirm(null)
      fetchRules()
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Conversion Rules</h1>
          <p className="text-sm text-muted-foreground">Manage FX conversion rounding and precision rules</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchRules}>
            <RefreshCw className="w-4 h-4 mr-1" />Refresh
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" />Add Rule
          </Button>
        </div>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search rules..."
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
                {["Name", "Type", "Rounding", "Precision", "Min", "Max", "Active", "Priority", "Actions"].map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 9 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">{search ? "No rules match your search." : "No conversion rules defined yet."}</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="hidden md:table-cell">Rounding</TableHead>
                <TableHead className="hidden md:table-cell">Precision</TableHead>
                <TableHead className="hidden lg:table-cell">Min Amt</TableHead>
                <TableHead className="hidden lg:table-cell">Max Amt</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((rule, i) => (
                <motion.tr
                  key={rule.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.15, delay: i * 0.02 }}
                  className="border-b border-border/50 hover:bg-muted/30"
                >
                  <TableCell className="font-medium">{rule.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-[10px] font-medium", ruleTypeColors[rule.ruleType])}>
                      {rule.ruleType.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="secondary" className={cn("text-[10px]", roundingRuleColors[rule.roundingRule])}>
                      {rule.roundingRule.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{rule.decimalPrecision}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">{rule.minAmount ?? "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">{rule.maxAmount ?? "—"}</TableCell>
                  <TableCell>
                    <Switch checked={rule.isActive} onCheckedChange={() => handleToggle(rule)} />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">{rule.priority}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(rule)} title="Edit">
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={() => setDeleteConfirm(rule)} title="Delete">
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
            <DialogTitle>{editingRule ? "Edit Rule" : "Add Rule"}</DialogTitle>
            <DialogDescription>
              {editingRule ? "Update the conversion rule details below." : "Define a new FX conversion rule."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Standard Retail Conversion"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Rule Type</label>
                <Select value={formData.ruleType} onValueChange={(v) => setFormData({ ...formData, ruleType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="customer_preference">Customer Preference</SelectItem>
                    <SelectItem value="merchant_settlement">Merchant Settlement</SelectItem>
                    <SelectItem value="multi_wallet">Multi Wallet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Rounding Rule</label>
                <Select value={formData.roundingRule} onValueChange={(v) => setFormData({ ...formData, roundingRule: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="round_up">Round Up</SelectItem>
                    <SelectItem value="round_down">Round Down</SelectItem>
                    <SelectItem value="truncate">Truncate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Decimal Precision</label>
                <Input
                  type="number"
                  min={0}
                  max={10}
                  value={formData.decimalPrecision}
                  onChange={(e) => setFormData({ ...formData, decimalPrecision: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Min Amount</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.minAmount}
                  onChange={(e) => setFormData({ ...formData, minAmount: e.target.value })}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Max Amount</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.maxAmount}
                  onChange={(e) => setFormData({ ...formData, maxAmount: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Priority</label>
                <Input
                  type="number"
                  min={0}
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1.5 flex flex-col justify-end">
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!formData.name || saving}>
              {saving ? "Saving..." : editingRule ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete Rule
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteConfirm?.name}&quot;? This action cannot be undone.
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
