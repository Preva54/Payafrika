"use client"

import React, { useEffect, useState, useCallback, useMemo } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Save, Globe, Building2, Palette, Key, Shield, CreditCard, Wallet, Store, Users,
  ShieldCheck, AlertTriangle, Percent, ArrowLeftRight, Bell, Mail, MessageSquare,
  Code2, Puzzle, FileText, UsersRound, Search, MapPin, Wrench, HardDrive, Zap,
  Flag, Terminal, RefreshCw, Download, Upload, RotateCcw, History, Check, X,
  Sun, Moon, ChevronRight, Search as SearchIcon,
} from "lucide-react"
import { adminSettingsApi, type PlatformSettingsCategory, type PlatformSettingsField, type SettingChangeLogEntry } from "@/lib/admin-settings-api"

const iconMap: Record<string, React.ElementType> = {
  Globe, Building2, Palette, Key, Shield, CreditCard, Wallet, Store, Users,
  ShieldCheck, AlertTriangle, Percent, ArrowLeftRight, Bell, Mail, MessageSquare,
  Code2, Puzzle, FileText, UsersRound, MapPin, Wrench, HardDrive, Zap, Flag, Terminal,
}

const categoryIcons: Record<string, React.ElementType> = {
  general: Globe, company: Building2, branding: Palette, authentication: Key,
  security: Shield, payment_gateway: CreditCard, wallet: Wallet, merchant: Store,
  customer: Users, kyc_compliance: ShieldCheck, fraud_risk: AlertTriangle,
  fees_pricing: Percent, exchange_rates: ArrowLeftRight, notifications: Bell,
  email: Mail, sms: MessageSquare, api_webhooks: Code2, integrations: Puzzle,
  cms: FileText, affiliate: UsersRound, audit: Search, regional: MapPin,
  maintenance: Wrench, backup: HardDrive, performance: Zap, feature_flags: Flag,
  developer: Terminal,
}

function SectionSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
    </div>
  )
}

function SettingsField({ field, value, onChange }: { field: PlatformSettingsField; value: string; onChange: (key: string, value: string, type: string) => void }) {
  const displayValue = field.isEncrypted && !value ? "••••••••" : value

  if (field.type === "switch") {
    return (
      <div className="flex items-center justify-between py-3">
        <div className="space-y-0.5">
          <p className="text-sm font-medium">{field.label}</p>
          {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
        </div>
        <Switch checked={value === "true"} onCheckedChange={(c) => onChange(field.key, c ? "true" : "false", field.type)} />
      </div>
    )
  }

  if (field.type === "select" && field.options) {
    return (
      <div className="space-y-1.5 py-2">
        <Label className="text-sm">{field.label}</Label>
        {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
        <Select value={value || field.defaultValue || ""} onValueChange={(v) => onChange(field.key, v, field.type)}>
          <SelectTrigger className="w-full max-w-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {field.options.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    )
  }

  if (field.type === "textarea") {
    return (
      <div className="space-y-1.5 py-2">
        <Label className="text-sm">{field.label}</Label>
        {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
        <Textarea value={displayValue} onChange={(e) => onChange(field.key, e.target.value, field.type)} className="min-h-[80px]" placeholder={field.placeholder} />
      </div>
    )
  }

  if (field.type === "color") {
    return (
      <div className="flex items-center gap-3 py-2">
        <div className="space-y-0.5 flex-1">
          <Label className="text-sm">{field.label}</Label>
          {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <input type="color" value={value || field.defaultValue || "#0057FF"} onChange={(e) => onChange(field.key, e.target.value, field.type)} className="w-9 h-9 rounded-lg border cursor-pointer" />
          <span className="text-xs font-mono text-muted-foreground w-20">{value || field.defaultValue || "#0057FF"}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1.5 py-2">
      <Label className="text-sm">{field.label}</Label>
      {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
      <Input
        type={field.type === "password" ? "password" : field.type || "text"}
        value={displayValue}
        onChange={(e) => onChange(field.key, e.target.value, field.type)}
        placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
        className="max-w-sm"
      />
    </div>
  )
}

export default function AdminSettingsPage() {
  const [categories, setCategories] = useState<PlatformSettingsCategory[]>([])
  const [activeCategory, setActiveCategory] = useState("general")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [showChangelog, setShowChangelog] = useState(false)
  const [changelog, setChangelog] = useState<SettingChangeLogEntry[]>([])
  const [localValues, setLocalValues] = useState<Record<string, Record<string, string>>>({})
  const [dirty, setDirty] = useState(false)
  const [dashboard, setDashboard] = useState<AdminSettingsDashboard | null>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      adminSettingsApi.getAll(),
      adminSettingsApi.dashboard(),
    ]).then(([cats, dash]) => {
      setCategories(cats)
      setDashboard(dash)
      const vals: Record<string, Record<string, string>> = {}
      for (const cat of cats) {
        vals[cat.id] = {}
        for (const f of cat.fields) {
          vals[cat.id][f.key] = f.value
        }
      }
      setLocalValues(vals)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories
    const q = searchQuery.toLowerCase()
    return categories.filter((cat) => {
      if (cat.label.toLowerCase().includes(q) || cat.description.toLowerCase().includes(q)) return true
      return cat.fields.some((f) => f.label.toLowerCase().includes(q) || f.key.toLowerCase().includes(q))
    })
  }, [categories, searchQuery])

  const activeData = useMemo(() => {
    return categories.find((c) => c.id === activeCategory)
  }, [categories, activeCategory])

  const handleValueChange = useCallback((fieldKey: string, value: string, _type: string) => {
    setLocalValues((prev) => ({
      ...prev,
      [activeCategory]: {
        ...(prev[activeCategory] || {}),
        [fieldKey]: value,
      },
    }))
    setDirty(true)
  }, [activeCategory])

  const handleSave = useCallback(async () => {
    if (!activeData) return
    setSaving(true)
    const fields = activeData.fields.map((f) => ({
      key: f.key,
      value: localValues[activeCategory]?.[f.key] ?? f.value,
      type: f.type,
    }))
    try {
      await adminSettingsApi.updateCategory(activeCategory, fields)
      setSaved(true)
      setDirty(false)
      setTimeout(() => setSaved(false), 2000)
    } catch { /* ignore */ }
    setSaving(false)
  }, [activeCategory, activeData, localValues])

  const handleRestoreDefaults = useCallback(async () => {
    try {
      await adminSettingsApi.restoreDefaults(activeCategory)
      const cats = await adminSettingsApi.getAll()
      setCategories(cats)
      const vals: Record<string, Record<string, string>> = {}
      for (const cat of cats) {
        vals[cat.id] = {}
        for (const f of cat.fields) vals[cat.id][f.key] = f.value
      }
      setLocalValues(vals)
      setDirty(false)
    } catch { /* ignore */ }
  }, [activeCategory])

  const handleExport = useCallback(async () => {
    try {
      const blob = await adminSettingsApi.exportConfig()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url; a.download = `payafrika-config-${new Date().toISOString().split("T")[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch { /* ignore */ }
  }, [])

  const handleImport = useCallback(async () => {
    const input = document.createElement("input")
    input.type = "file"; input.accept = ".json"
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const text = await file.text()
      try {
        await adminSettingsApi.importConfig(text)
        const cats = await adminSettingsApi.getAll()
        setCategories(cats)
        const vals: Record<string, Record<string, string>> = {}
        for (const cat of cats) {
          vals[cat.id] = {}
          for (const f of cat.fields) vals[cat.id][f.key] = f.value
        }
        setLocalValues(vals)
      } catch { /* ignore */ }
    }
    input.click()
  }, [])

  const loadChangelog = useCallback(async () => {
    try {
      const res = await adminSettingsApi.changelog(activeCategory)
      setChangelog(res.logs)
    } catch { /* ignore */ }
  }, [activeCategory])

  useEffect(() => {
    if (showChangelog) loadChangelog()
  }, [showChangelog, loadChangelog])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">System configuration and platform preferences</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {dirty && (
            <Badge variant="secondary" className="gap-1 text-xs">
              <X className="w-3 h-3" /> Unsaved changes
            </Badge>
          )}
          {saved && (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
              <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30 gap-1 text-xs">
                <Check className="w-3 h-3" /> Saved
              </Badge>
            </motion.div>
          )}
          {dashboard && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-[10px]">v{dashboard.currentVersion}</Badge>
              <Badge variant={dashboard.maintenanceMode ? "destructive" : "secondary"} className="text-[10px]">
                {dashboard.maintenanceMode ? "Maintenance" : "Live"}
              </Badge>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-0 rounded-xl border bg-card overflow-hidden min-h-[600px]">
        {/* Sidebar */}
        <div className="w-56 shrink-0 border-r bg-muted/20 flex flex-col">
          <div className="p-2 border-b">
            <div className="relative">
              <SearchIcon className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search settings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-0.5">
              {loading
                ? Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-8 rounded-lg" />)
                : filteredCategories.map((cat) => {
                    const Icon = categoryIcons[cat.id] || Globe
                    return (
                      <button
                        key={cat.id}
                        onClick={() => { setActiveCategory(cat.id); setShowChangelog(false) }}
                        className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors text-left ${
                          activeCategory === cat.id && !showChangelog
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{cat.label}</span>
                      </button>
                    )
                  })}
              <Separator className="my-2" />
              <button
                onClick={() => { setShowChangelog(true); loadChangelog() }}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  showChangelog ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <History className="w-3.5 h-3.5" />
                Change History
              </button>
            </div>
          </ScrollArea>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {showChangelog ? (
            <div className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Change History {activeCategory && `- ${activeData?.label || activeCategory}`}</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowChangelog(false)}><X className="w-4 h-4" /></Button>
              </div>
              {changelog.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No changes recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {changelog.map((log) => (
                    <Card key={log.id}>
                      <CardContent className="p-3 text-xs space-y-1">
                        <div className="flex justify-between text-muted-foreground">
                          <span className="font-medium text-foreground">{log.key}</span>
                          <span>{new Date(log.changedAt).toLocaleString("en-ZA")}</span>
                        </div>
                        <div className="flex gap-3">
                          <span className="text-red-400 line-through truncate">{log.oldValue || "(empty)"}</span>
                          <ChevronRight className="w-3 h-3 shrink-0 text-muted-foreground" />
                          <span className="text-emerald-400 truncate">{log.newValue || "(empty)"}</span>
                        </div>
                        <p className="text-muted-foreground">by {log.changedByName || "System"}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-6">
              {loading ? (
                <SectionSkeleton />
              ) : activeData ? (
                <motion.div key={activeCategory} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold flex items-center gap-2">
                        {categoryIcons[activeData.id] && React.createElement(categoryIcons[activeData.id], { className: "w-5 h-5 text-primary" })}
                        {activeData.label}
                      </h2>
                      <p className="text-sm text-muted-foreground">{activeData.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={handleRestoreDefaults}>
                        <RotateCcw className="w-3.5 h-3.5 mr-1" />Defaults
                      </Button>
                      <Button size="sm" onClick={handleSave} disabled={saving}>
                        <Save className="w-3.5 h-3.5 mr-1" />{saving ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </div>
                  <Card>
                    <CardContent className="p-5 divide-y divide-border/50">
                      {activeData.fields.map((field) => (
                        <SettingsField
                          key={field.key}
                          field={field}
                          value={localValues[activeCategory]?.[field.key] ?? field.value}
                          onChange={handleValueChange}
                        />
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Search className="w-12 h-12 mb-3 opacity-30" />
                  <p>No settings found for &quot;{searchQuery}&quot;</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom toolbar */}
      <div className="flex items-center justify-between p-3 rounded-xl border bg-card">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>{categories.length} setting categories</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleImport}>
            <Upload className="w-3.5 h-3.5 mr-1" />Import
          </Button>
          <Button variant="ghost" size="sm" onClick={handleExport}>
            <Download className="w-3.5 h-3.5 mr-1" />Export
          </Button>
        </div>
      </div>
    </div>
  )
}
