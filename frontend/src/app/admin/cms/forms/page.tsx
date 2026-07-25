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
import { cmsApi, type CmsForm } from "@/lib/cms-api"
import { Plus, Pencil, Trash2, RefreshCw } from "lucide-react"

const statusVariant: Record<string, "success" | "secondary" | "destructive"> = {
  active: "success", published: "success",
  draft: "secondary",
  archived: "destructive", inactive: "destructive",
}

export default function FormsPage() {
  const [items, setItems] = useState<CmsForm[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CmsForm | null>(null)
  const [form, setForm] = useState({ name: "", slug: "", fields: "[]", settings: "{}", status: "draft" })

  const fetchItems = () => {
    setLoading(true)
    cmsApi.forms.getAll()
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchItems() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ name: "", slug: "", fields: JSON.stringify([{ label: "Name", type: "text", required: true }], null, 2), settings: "{}", status: "draft" })
    setDialogOpen(true)
  }

  const openEdit = (item: CmsForm) => {
    setEditing(item)
    setForm({ name: item.name, slug: item.slug, fields: item.fields, settings: item.settings, status: item.status })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    try { JSON.parse(form.fields) } catch { alert("Invalid JSON in fields"); return }
    try { JSON.parse(form.settings) } catch { alert("Invalid JSON in settings"); return }
    if (editing) {
      await cmsApi.forms.update(editing.id, form)
    } else {
      await cmsApi.forms.create(form)
    }
    setDialogOpen(false)
    fetchItems()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return
    await cmsApi.forms.delete(id)
    fetchItems()
  }

  const formatJson = (field: "fields" | "settings") => {
    try {
      setForm({ ...form, [field]: JSON.stringify(JSON.parse(form[field]), null, 2) })
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">Forms</h1>
          <p className="text-muted-foreground">Manage dynamic forms.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchItems}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
          <Button size="sm" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Create Form</Button>
        </div>
      </div>

      <Card className="glass-card rounded-2xl p-6">
        <CardHeader className="px-0 pt-0"><CardTitle>All Forms</CardTitle></CardHeader>
        <CardContent className="px-0 pb-0">
          {loading ? (
            <div className="space-y-3">{[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No forms yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated At</TableHead>
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
                    <TableCell className="text-muted-foreground">/{item.slug}</TableCell>
                    <TableCell><Badge variant={statusVariant[item.status] || "secondary"}>{item.status}</Badge></TableCell>
                    <TableCell className="text-muted-foreground text-sm">{new Date(item.updatedAt).toLocaleDateString()}</TableCell>
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
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Form" : "Create Form"}</DialogTitle>
            <DialogDescription>Configure the form.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Name</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Form name" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Slug</label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="form-slug" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium">Fields (JSON)</label>
                <Button variant="ghost" size="sm" onClick={() => formatJson("fields")}>Format JSON</Button>
              </div>
              <Textarea
                value={form.fields}
                onChange={(e) => setForm({ ...form, fields: e.target.value })}
                rows={8}
                className="font-mono text-xs"
                placeholder='[{"label": "Name", "type": "text", "required": true}]'
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium">Settings (JSON)</label>
                <Button variant="ghost" size="sm" onClick={() => formatJson("settings")}>Format JSON</Button>
              </div>
              <Textarea
                value={form.settings}
                onChange={(e) => setForm({ ...form, settings: e.target.value })}
                rows={4}
                className="font-mono text-xs"
                placeholder='{"submitButton": "Submit", "successMessage": "Thank you"}'
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Status</label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
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
