"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Plus, Search, RefreshCw, Activity, Power, PowerOff,
  Edit, Trash2, Globe, HeartPulse, CheckCircle, AlertTriangle,
  HelpCircle, XCircle, Eye, EyeOff, Loader2, HardDrive,
  Shield, Wifi, WifiOff
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogTrigger, DialogClose
} from "@/components/ui/dialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { exchangeApi, type ExchangeRateProvider } from "@/lib/exchange-api"

const healthConfig: Record<string, { label: string; variant: "success" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle }> = {
  healthy: { label: "Healthy", variant: "success", icon: CheckCircle },
  degraded: { label: "Degraded", variant: "secondary", icon: AlertTriangle },
  down: { label: "Down", variant: "destructive", icon: XCircle },
  unknown: { label: "Unknown", variant: "outline", icon: HelpCircle },
}

const emptyProvider: Partial<ExchangeRateProvider> = {
  name: "",
  apiEndpoint: "",
  apiKeyEncrypted: "",
  priority: 0,
  isActive: true,
  isPrimary: false,
  isFallback: false,
  healthStatus: "unknown",
  configJson: "{}",
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
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-5 w-12" />
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
          <Globe className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-1">No providers configured</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm text-center">
          Add your first exchange rate provider to start fetching live FX rates.
        </p>
        <Button onClick={onAdd}>
          <Plus className="mr-2 h-4 w-4" /> Add Provider
        </Button>
      </CardContent>
    </Card>
  )
}

export default function ExchangeProvidersPage() {
  const [providers, setProviders] = useState<ExchangeRateProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ExchangeRateProvider | null>(null)
  const [form, setForm] = useState<Partial<ExchangeRateProvider>>(emptyProvider)
  const [saving, setSaving] = useState(false)
  const [healthCheckId, setHealthCheckId] = useState<string | null>(null)

  const fetchProviders = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await exchangeApi.providers.getAll()
      setProviders(res)
    } catch {
      setError("Failed to load exchange providers")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProviders() }, [])

  const filtered = providers.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.apiEndpoint.toLowerCase().includes(search.toLowerCase())
  )

  const openAdd = () => {
    setEditing(null)
    setForm(emptyProvider)
    setDialogOpen(true)
  }

  const openEdit = (p: ExchangeRateProvider) => {
    setEditing(p)
    setForm({ ...p })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editing) {
        const updated = await exchangeApi.providers.update(editing.id, form)
        setProviders((prev) => prev.map((p) => (p.id === editing.id ? updated : p)))
      } else {
        const created = await exchangeApi.providers.create(form)
        setProviders((prev) => [...prev, created])
      }
      setDialogOpen(false)
    } catch {
      // handled by toast in production
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (p: ExchangeRateProvider) => {
    try {
      await exchangeApi.providers.toggle(p.id)
      setProviders((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, isActive: !x.isActive } : x))
      )
    } catch {
      // handled by toast in production
    }
  }

  const handleCheckHealth = async (id: string) => {
    setHealthCheckId(id)
    try {
      const res = await exchangeApi.providers.checkHealth(id)
      setProviders((prev) =>
        prev.map((x) =>
          x.id === id ? { ...x, healthStatus: (res as unknown as { healthStatus: string }).healthStatus ?? "unknown", lastHealthCheck: new Date().toISOString() } : x
        )
      )
    } catch {
      setProviders((prev) =>
        prev.map((x) =>
          x.id === id ? { ...x, healthStatus: "down", lastHealthCheck: new Date().toISOString() } : x
        )
      )
    } finally {
      setHealthCheckId(null)
    }
  }

  if (loading) return <LoadingSkeleton />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">Exchange Providers</h1>
          <p className="text-muted-foreground">Manage third-party rate providers</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchProviders}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button size="sm" onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" /> Add Provider
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search providers..."
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
            <Button variant="outline" size="sm" onClick={fetchProviders}>Retry</Button>
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
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Primary</TableHead>
                  <TableHead>Fallback</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead>Last Check</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence mode="popLayout">
                  {filtered.map((provider) => {
                    const health = healthConfig[provider.healthStatus] ?? healthConfig.unknown
                    const HealthIcon = health.icon
                    return (
                      <motion.tr
                        key={provider.id}
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
                              provider.isActive ? "gradient-bg" : "bg-muted"
                            )}>
                              <Globe className={cn("h-4 w-4", provider.isActive ? "text-white" : "text-muted-foreground")} />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{provider.name}</p>
                              <p className="text-xs text-muted-foreground">ID: {provider.id.slice(0, 8)}...</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded-lg max-w-[200px] block truncate">
                            {provider.apiEndpoint}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{provider.priority}</Badge>
                        </TableCell>
                        <TableCell>
                          {provider.isPrimary ? (
                            <Badge variant="success" className="gap-1">
                              <CheckCircle className="h-3 w-3" /> Primary
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {provider.isFallback ? (
                            <Badge variant="secondary" className="gap-1">
                              <Shield className="h-3 w-3" /> Fallback
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={health.variant} className="gap-1">
                            <HealthIcon className="h-3 w-3" /> {health.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {provider.lastHealthCheck ? (
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(provider.lastHealthCheck).toLocaleDateString(undefined, {
                                month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                              })}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Never</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={provider.isActive}
                              onCheckedChange={() => handleToggle(provider)}
                            />
                            {provider.isActive ? (
                              <Wifi className="h-3 w-3 text-accent" />
                            ) : (
                              <WifiOff className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleCheckHealth(provider.id)}
                              disabled={healthCheckId === provider.id}
                            >
                              {healthCheckId === provider.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <HeartPulse className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEdit(provider)}
                            >
                              <Edit className="h-4 w-4" />
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
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Provider" : "Add Provider"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update the exchange rate provider configuration." : "Configure a new exchange rate provider."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  placeholder="Provider name"
                  value={form.name ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={form.priority ?? 0}
                  onChange={(e) => setForm((f) => ({ ...f, priority: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">API Endpoint</label>
              <Input
                placeholder="https://api.provider.com/v1/rates"
                value={form.apiEndpoint ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, apiEndpoint: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">API Key</label>
              <Input
                type="password"
                placeholder={editing ? "Leave blank to keep existing" : "Enter API key"}
                value={form.apiKeyEncrypted ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, apiKeyEncrypted: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Config JSON</label>
              <Textarea
                placeholder='{"timeout": 5000, "retries": 3}'
                rows={3}
                value={form.configJson ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, configJson: e.target.value }))}
              />
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={form.isPrimary ?? false}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, isPrimary: v, isFallback: v ? f.isFallback : f.isFallback }))}
                />
                Is Primary
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={form.isFallback ?? false}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, isFallback: v }))}
                />
                Is Fallback
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={form.isActive ?? true}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
                />
                Active
              </label>
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
    </div>
  )
}
