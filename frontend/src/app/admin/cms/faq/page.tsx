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
import { cmsApi, type FaqItem, type FaqCategory } from "@/lib/cms-api"
import { Plus, Pencil, Trash2, RefreshCw } from "lucide-react"

const statusVariant: Record<string, "success" | "secondary" | "destructive"> = {
  active: "success", published: "success",
  draft: "secondary",
  archived: "destructive", inactive: "destructive",
}

export default function FaqPage() {
  const [items, setItems] = useState<FaqItem[]>([])
  const [categories, setCategories] = useState<FaqCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<FaqItem | null>(null)
  const [form, setForm] = useState({ question: "", answer: "", category: "", order: 0, status: "draft" })
  const [filterCat, setFilterCat] = useState("all")

  const fetchItems = () => {
    setLoading(true)
    Promise.all([
      cmsApi.faq.getAll(),
      cmsApi.faqCategories.getAll(),
    ])
      .then(([faqs, cats]) => {
        setItems(faqs)
        setCategories(cats)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchItems() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ question: "", answer: "", category: "", order: 0, status: "draft" })
    setDialogOpen(true)
  }

  const openEdit = (item: FaqItem) => {
    setEditing(item)
    setForm({ question: item.question, answer: item.answer, category: item.category, order: item.order, status: item.status })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (editing) {
      await cmsApi.faq.update(editing.id, form)
    } else {
      await cmsApi.faq.create(form)
    }
    setDialogOpen(false)
    fetchItems()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return
    await cmsApi.faq.delete(id)
    fetchItems()
  }

  const filtered = filterCat === "all" ? items : items.filter((i) => i.category === filterCat)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">FAQs</h1>
          <p className="text-muted-foreground">Manage frequently asked questions.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchItems}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
          <Button size="sm" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Create FAQ</Button>
        </div>
      </div>

      <Card className="glass-card rounded-2xl p-6">
        <CardHeader className="px-0 pt-0">
          <div className="flex items-center justify-between">
            <CardTitle>All FAQs</CardTitle>
            <Select value={filterCat} onValueChange={setFilterCat}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Filter by category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.slug || cat.name}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {loading ? (
            <div className="space-y-3">{[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No FAQs found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Question</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item, i) => (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    <TableCell className="font-medium max-w-xs truncate">{item.question}</TableCell>
                    <TableCell><Badge variant="outline">{item.category || "General"}</Badge></TableCell>
                    <TableCell>{item.order}</TableCell>
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
            <DialogTitle>{editing ? "Edit FAQ" : "Create FAQ"}</DialogTitle>
            <DialogDescription>Fill in the FAQ details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Question</label>
              <Input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} placeholder="Question" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Answer</label>
              <Textarea value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} rows={5} placeholder="Answer..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Category</label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.slug || cat.name}>{cat.name}</SelectItem>
                    ))}
                    <SelectItem value="">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Display Order</label>
                <Input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} />
              </div>
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
