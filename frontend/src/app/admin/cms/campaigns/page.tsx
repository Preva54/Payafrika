"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cmsApi, type Campaign } from "@/lib/cms-api"
import { Plus, Pencil, Trash2, RefreshCw } from "lucide-react"

const statusVariant: Record<string, "success" | "secondary" | "destructive"> = {
  active: "success",
  draft: "secondary",
  ended: "destructive", archived: "destructive", paused: "secondary",
}

export default function CampaignsPage() {
  const [items, setItems] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Campaign | null>(null)
  const [form, setForm] = useState({ name: "", slug: "", description: "", type: "promotional", startDate: "", endDate: "", budget: 0, status: "draft" })

  const fetchItems = () => {
    setLoading(true)
    cmsApi.campaigns.getAll()
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchItems() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ name: "", slug: "", description: "", type: "promotional", startDate: "", endDate: "", budget: 0, status: "draft" })
    setDialogOpen(true)
  }

  const openEdit = (item: Campaign) => {
    setEditing(item)
    setForm({
      name: item.name, slug: item.slug, description: item.description, type: item.type,
      startDate: item.startDate ? item.startDate.slice(0, 10) : "",
      endDate: item.endDate ? item.endDate.slice(0, 10) : "",
      budget: item.budget || 0, status: item.status,
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (editing) {
      await cmsApi.campaigns.update(editing.id, form)
    } else {
      await cmsApi.campaigns.create(form)
    }
    setDialogOpen(false)
    fetchItems()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return
    await cmsApi.campaigns.delete(id)
    fetchItems()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">Campaigns</h1>
          <p className="text-muted-foreground">Manage marketing campaigns.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchItems}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
          <Button size="sm" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Create Campaign</Button>
        </div>
      </div>

      <Card className="glass-card rounded-2xl p-6">
        <CardHeader className="px-0 pt-0"><CardTitle>All Campaigns</CardTitle></CardHeader>
        <CardContent className="px-0 pb-0">
          {loading ? (
            <div className="space-y-3">{[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No campaigns yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, i) => (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell><Badge variant="outline">{item.type}</Badge></TableCell>
                    <TableCell>{item.budget ? `R ${item.budget.toLocaleString()}` : "-"}</TableCell>
                    <TableCell><Badge variant={statusVariant[item.status] || "secondary"}>{item.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
            <DialogTitle>{editing ? "Edit Campaign" : "Create Campaign"}</DialogTitle>
            <DialogDescription>Fill in the campaign details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Name</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Campaign name" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Slug</label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="campaign-slug" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Campaign description..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Type</label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="promotional">Promotional</SelectItem>
                    <SelectItem value="seasonal">Seasonal</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="social">Social Media</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Budget (ZAR)</label>
                <Input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Start Date</label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">End Date</label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Status</label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="ended">Ended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave}>{editing ? "Update" : "Create"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
