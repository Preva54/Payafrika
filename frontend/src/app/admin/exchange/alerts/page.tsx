"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { exchangeApi, type ExchangeAlert } from "@/lib/exchange-api"
import {
  Plus, Pencil, Trash2, RefreshCw, AlertTriangle, Bell,
  Mail, MessageSquare, Smartphone, Globe, Zap, Activity, Search,
} from "lucide-react"

const alertTypeColors: Record<string, string> = {
  large_rate_change: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  provider_failure: "bg-red-500/10 text-red-500 border-red-500/20",
  manual_override: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  unusual_activity: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  high_spread: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  sync_failure: "bg-red-500/10 text-red-500 border-red-500/20",
}

const channelColors: Record<string, string> = {
  email: "bg-blue-500/10 text-blue-500",
  sms: "bg-green-500/10 text-green-500",
  push: "bg-purple-500/10 text-purple-500",
  slack: "bg-gray-500/10 text-gray-500",
  teams: "bg-indigo-500/10 text-indigo-500",
}

const alertTypeOptions = [
  { value: "large_rate_change", label: "Large Rate Change" },
  { value: "provider_failure", label: "Provider Failure" },
  { value: "manual_override", label: "Manual Override" },
  { value: "unusual_activity", label: "Unusual Activity" },
  { value: "high_spread", label: "High Spread" },
  { value: "sync_failure", label: "Sync Failure" },
]

const channelOptions = [
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
  { value: "push", label: "Push" },
  { value: "slack", label: "Slack" },
  { value: "teams", label: "Teams" },
]

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

const alertTypeDescriptions: Record<string, string> = {
  large_rate_change: "Triggers when an exchange rate changes by more than the threshold percentage",
  provider_failure: "Triggers when a rate provider fails to respond or returns an error",
  manual_override: "Triggers when an admin manually overrides an exchange rate",
  unusual_activity: "Triggers when unusual conversion patterns are detected",
  high_spread: "Triggers when the buy/sell spread exceeds the threshold",
  sync_failure: "Triggers when rate synchronization with a provider fails",
}

export default function ExchangeAlertsPage() {
  const [alerts, setAlerts] = useState<ExchangeAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ExchangeAlert | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ alertType: "", channel: "", threshold: 0, isEnabled: true })

  const filtered = alerts.filter((a) => {
    if (filterType && filterType !== "all" && a.alertType !== filterType) return false
    if (search) {
      const q = search.toLowerCase()
      if (!a.alertType.toLowerCase().includes(q) && !a.channel.toLowerCase().includes(q)) return false
    }
    return true
  })

  const fetchAlerts = () => {
    setLoading(true)
    exchangeApi.alerts.getAll()
      .then(setAlerts)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchAlerts() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ alertType: "large_rate_change", channel: "email", threshold: 0, isEnabled: true })
    setDialogOpen(true)
  }

  const openEdit = (a: ExchangeAlert) => {
    setEditing(a)
    setForm({ alertType: a.alertType, channel: a.channel, threshold: a.threshold, isEnabled: a.isEnabled })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.alertType || !form.channel) return
    setSaving(true)
    try {
      if (editing) {
        await exchangeApi.alerts.update(editing.id, form)
      } else {
        await exchangeApi.alerts.create(form)
      }
      setDialogOpen(false)
      fetchAlerts()
    } catch { /* ignore */ }
    setSaving(false)
  }

  const handleToggle = async (id: string) => {
    try {
      await exchangeApi.alerts.toggle(id)
      setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, isEnabled: !a.isEnabled } : a))
    } catch { /* ignore */ }
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await exchangeApi.alerts.delete(deleting)
      setDeleting(null)
      fetchAlerts()
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Exchange Alerts</h1>
          <p className="text-sm text-muted-foreground">Configure exchange rate monitoring and notifications</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchAlerts}>
            <RefreshCw className="mr-2 h-4 w-4" />Refresh
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />Add Alert
          </Button>
        </div>
      </div>

      <Card className="rounded-2xl bg-background/95 backdrop-blur-xl p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search alerts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-36 h-9 text-xs">
              <SelectValue placeholder="Alert Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {alertTypeOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="rounded-2xl bg-background/95 backdrop-blur-xl">
        <CardHeader className="px-6 pt-6 pb-0">
          <CardTitle className="text-lg font-semibold">
            All Alerts
            <span className="text-muted-foreground font-normal ml-2">({filtered.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Bell className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-lg font-medium">No alerts found</p>
              <p className="text-sm">{search || filterType ? "Try different filter criteria" : "Click Add Alert to create your first monitoring rule"}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Alert Type</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Threshold</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-36">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a, i) => (
                  <motion.tr
                    key={a.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b transition-colors hover:bg-muted/30"
                  >
                    <TableCell>
                      <Badge variant="outline" className={cn("text-xs font-medium", alertTypeColors[a.alertType] || "")}>
                        {a.alertType.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn("text-xs", channelColors[a.channel] || "")}>
                        {a.channel}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{a.threshold}</TableCell>
                    <TableCell>
                      <Switch checked={a.isEnabled} onCheckedChange={() => handleToggle(a.id)} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(a.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-0.5">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(a)} title="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleting(a.id)} title="Delete">
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Alert" : "Add Alert"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update the alert configuration." : "Configure a new exchange monitoring alert."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Alert Type</label>
              <Select value={form.alertType} onValueChange={(v) => setForm({ ...form, alertType: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select alert type" />
                </SelectTrigger>
                <SelectContent>
                  {alertTypeOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Channel</label>
              <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  {channelOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Threshold</label>
              <Input
                type="number"
                value={form.threshold}
                onChange={(e) => setForm({ ...form, threshold: Number(e.target.value) })}
                placeholder="Enter threshold value"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Enabled</label>
              <Switch checked={form.isEnabled} onCheckedChange={(v) => setForm({ ...form, isEnabled: v })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !form.alertType || !form.channel}>
                {saving ? "Saving..." : editing ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Alert</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this alert? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
