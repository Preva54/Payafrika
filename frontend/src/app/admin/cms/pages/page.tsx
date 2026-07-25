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
import { cmsApi, type ContentPage } from "@/lib/cms-api"
import { Plus, Pencil, Trash2, RefreshCw } from "lucide-react"

const statusVariant: Record<string, "success" | "secondary" | "destructive"> = {
  published: "success",
  draft: "secondary",
  archived: "destructive",
}

export default function CmsPagesPage() {
  const [items, setItems] = useState<ContentPage[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ContentPage | null>(null)
  const [form, setForm] = useState({ title: "", slug: "", content: "", status: "draft", template: "default" })

  const fetchItems = () => {
    setLoading(true)
    cmsApi.pages.getAll()
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchItems() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ title: "", slug: "", content: "", status: "draft", template: "default" })
    setDialogOpen(true)
  }

  const openEdit = (item: ContentPage) => {
    setEditing(item)
    setForm({ title: item.title, slug: item.slug, content: item.content, status: item.status, template: item.template })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (editing) {
      await cmsApi.pages.update(editing.id, form)
    } else {
      await cmsApi.pages.create(form)
    }
    setDialogOpen(false)
    fetchItems()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return
    await cmsApi.pages.delete(id)
    fetchItems()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">Content Pages</h1>
          <p className="text-muted-foreground">Manage static pages on the website.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchItems}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
          <Button size="sm" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Create Page</Button>
        </div>
      </div>

      <Card className="glass-card rounded-2xl p-6">
        <CardHeader className="px-0 pt-0"><CardTitle>All Pages</CardTitle></CardHeader>
        <CardContent className="px-0 pb-0">
          {loading ? (
            <div className="space-y-3">{[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No pages yet. Create your first page.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
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
                    <TableCell className="font-medium">{item.title}</TableCell>
                    <TableCell className="text-muted-foreground">/{item.slug}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[item.status] || "secondary"}>{item.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(item.updatedAt).toLocaleDateString()}
                    </TableCell>
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
            <DialogTitle>{editing ? "Edit Page" : "Create Page"}</DialogTitle>
            <DialogDescription>Fill in the details below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Title</label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Page title" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Slug</label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="page-slug" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Content</label>
              <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={6} placeholder="Page content..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Template</label>
                <Select value={form.template} onValueChange={(v) => setForm({ ...form, template: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="full-width">Full Width</SelectItem>
                    <SelectItem value="landing">Landing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
