"use client"

import { useEffect, useState, useCallback } from "react"
import { motion } from "framer-motion"
import {
  Search, Plus, Pencil, Trash2, RefreshCw, AlertTriangle, Globe
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { exchangeApi, type RegionalCurrencyRule } from "@/lib/exchange-api"
import { cn } from "@/lib/utils"

function parseJsonSafe(value: string): string {
  try { return JSON.stringify(JSON.parse(value), null, 2) } catch { return value }
}

function formatJsonDisplay(value: string | undefined | null): string {
  if (!value) return "[]"
  try { return JSON.stringify(JSON.parse(value), null, 2) } catch { return value }
}

interface RegionalFormData {
  country: string
  defaultCurrency: string
  supportedCurrenciesJson: string
  allowedPairsJson: string
  restrictionsJson: string
  localPaymentMethodsJson: string
  isActive: boolean
}

const emptyForm: RegionalFormData = {
  country: "", defaultCurrency: "", supportedCurrenciesJson: "[]",
  allowedPairsJson: "[]", restrictionsJson: "{}", localPaymentMethodsJson: "[]", isActive: true,
}

export default function RegionalCurrencyRulesPage() {
  const [rules, setRules] = useState<RegionalCurrencyRule[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showDialog, setShowDialog] = useState(false)
  const [editing, setEditing] = useState<RegionalCurrencyRule | null>(null)
  const [formData, setFormData] = useState<RegionalFormData>(emptyForm)
  const [deleteConfirm, setDeleteConfirm] = useState<RegionalCurrencyRule | null>(null)
  const [saving, setSaving] = useState(false)
  const [jsonError, setJsonError] = useState("")

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await exchangeApi.regional.getAll()
      setRules(data)
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = rules.filter((r) =>
    r.country.toLowerCase().includes(search.toLowerCase()) ||
    r.defaultCurrency.toLowerCase().includes(search.toLowerCase())
  )

  const openCreate = () => {
    setEditing(null)
    setFormData(emptyForm)
    setJsonError("")
    setShowDialog(true)
  }

  const openEdit = (rule: RegionalCurrencyRule) => {
    setEditing(rule)
    setFormData({
      country: rule.country,
      defaultCurrency: rule.defaultCurrency,
      supportedCurrenciesJson: formatJsonDisplay(rule.supportedCurrenciesJson),
      allowedPairsJson: formatJsonDisplay(rule.allowedPairsJson),
      restrictionsJson: formatJsonDisplay(rule.restrictionsJson),
      localPaymentMethodsJson: formatJsonDisplay(rule.localPaymentMethodsJson),
      isActive: rule.isActive,
    })
    setJsonError("")
    setShowDialog(true)
  }

  const validateJsons = (): boolean => {
    const fields = [
      { key: "supportedCurrenciesJson", label: "Supported Currencies" },
      { key: "allowedPairsJson", label: "Allowed Pairs" },
      { key: "restrictionsJson", label: "Restrictions" },
      { key: "localPaymentMethodsJson", label: "Local Payment Methods" },
    ] as const
    for (const field of fields) {
      try {
        JSON.parse(formData[field.key])
      } catch {
        setJsonError(`Invalid JSON in "${field.label}"`)
        return false
      }
    }
    setJsonError("")
    return true
  }

  const handleSave = async () => {
    if (!validateJsons()) return
    setSaving(true)
    try {
      const payload = {
        country: formData.country,
        defaultCurrency: formData.defaultCurrency,
        supportedCurrenciesJson: JSON.stringify(JSON.parse(formData.supportedCurrenciesJson)),
        allowedPairsJson: JSON.stringify(JSON.parse(formData.allowedPairsJson)),
        restrictionsJson: JSON.stringify(JSON.parse(formData.restrictionsJson)),
        localPaymentMethodsJson: JSON.stringify(JSON.parse(formData.localPaymentMethodsJson)),
        isActive: formData.isActive,
      }
      if (editing) {
        await exchangeApi.regional.update(editing.id, payload)
      } else {
        await exchangeApi.regional.create(payload)
      }
      setShowDialog(false)
      fetchData()
    } catch { /* ignore */ }
    setSaving(false)
  }

  const handleToggle = async (rule: RegionalCurrencyRule) => {
    try {
      await exchangeApi.regional.toggle(rule.id)
      fetchData()
    } catch { /* ignore */ }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    try {
      await exchangeApi.regional.delete(deleteConfirm.id)
      setDeleteConfirm(null)
      fetchData()
    } catch { /* ignore */ }
  }

  const renderCurrencies = (jsonStr: string | undefined | null) => {
    if (!jsonStr) return "—"
    try {
      const arr = JSON.parse(jsonStr)
      if (!Array.isArray(arr)) return jsonStr
      return arr.slice(0, 4).join(", ") + (arr.length > 4 ? ` +${arr.length - 4}` : "")
    } catch { return jsonStr || "—" }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Regional Currency Rules</h1>
          <p className="text-sm text-muted-foreground">Manage region-specific currency configurations</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
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
          placeholder="Search by country or currency..."
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
                {["Country", "Default Currency", "Supported Currencies", "Active", "Actions"].map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">{search ? "No rules match your search." : "No regional rules defined yet."}</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Country</TableHead>
                <TableHead>Default Currency</TableHead>
                <TableHead className="hidden md:table-cell">Supported Currencies</TableHead>
                <TableHead>Active</TableHead>
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
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{rule.country}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] font-medium">{rule.defaultCurrency}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-[200px] truncate">
                    {renderCurrencies(rule.supportedCurrenciesJson)}
                  </TableCell>
                  <TableCell>
                    <Switch checked={rule.isActive} onCheckedChange={() => handleToggle(rule)} />
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
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Regional Rule" : "Add Regional Rule"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update the regional currency configuration." : "Define a new regional currency rule."}
            </DialogDescription>
          </DialogHeader>
          {jsonError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {jsonError}
            </div>
          )}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Country</label>
                <Input
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="e.g. South Africa, Nigeria"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Default Currency</label>
                <Input
                  value={formData.defaultCurrency}
                  onChange={(e) => setFormData({ ...formData, defaultCurrency: e.target.value.toUpperCase() })}
                  placeholder="e.g. ZAR, NGN"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Supported Currencies <span className="text-muted-foreground">(JSON array)</span></label>
              <Textarea
                value={formData.supportedCurrenciesJson}
                onChange={(e) => setFormData({ ...formData, supportedCurrenciesJson: e.target.value })}
                placeholder='["ZAR", "USD", "EUR"]'
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Allowed Pairs <span className="text-muted-foreground">(JSON array)</span></label>
              <Textarea
                value={formData.allowedPairsJson}
                onChange={(e) => setFormData({ ...formData, allowedPairsJson: e.target.value })}
                placeholder='["ZAR/USD", "ZAR/EUR"]'
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Restrictions <span className="text-muted-foreground">(JSON object)</span></label>
              <Textarea
                value={formData.restrictionsJson}
                onChange={(e) => setFormData({ ...formData, restrictionsJson: e.target.value })}
                placeholder='{"maxDailyAmount": 100000, "requireKyc": true}'
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Local Payment Methods <span className="text-muted-foreground">(JSON array)</span></label>
              <Textarea
                value={formData.localPaymentMethodsJson}
                onChange={(e) => setFormData({ ...formData, localPaymentMethodsJson: e.target.value })}
                placeholder='["EFT", "Mobile Money", "Card"]'
                rows={3}
              />
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
            <Button onClick={handleSave} disabled={!formData.country || !formData.defaultCurrency || saving}>
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
              Delete Regional Rule
            </DialogTitle>
            <DialogDescription>
              Remove rule for &quot;{deleteConfirm?.country}&quot; ({deleteConfirm?.defaultCurrency}). This action cannot be undone.
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
