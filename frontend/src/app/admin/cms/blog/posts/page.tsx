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
import { cmsApi, type BlogPost, type BlogCategory } from "@/lib/cms-api"
import { Plus, Pencil, Trash2, RefreshCw } from "lucide-react"

const statusVariant: Record<string, "success" | "secondary" | "destructive"> = {
  published: "success",
  draft: "secondary",
  archived: "destructive",
}

export default function BlogPostsPage() {
  const [items, setItems] = useState<BlogPost[]>([])
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<BlogPost | null>(null)
  const [form, setForm] = useState({
    title: "", slug: "", content: "", excerpt: "", featuredImage: "",
    categoryId: "", tags: "", status: "draft",
    metaTitle: "", metaDescription: "",
  })

  const fetchItems = () => {
    setLoading(true)
    Promise.all([
      cmsApi.blogPosts.getAll(),
      cmsApi.blogCategories.getAll(),
    ])
      .then(([posts, cats]) => {
        setItems(posts)
        setCategories(cats)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchItems() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ title: "", slug: "", content: "", excerpt: "", featuredImage: "", categoryId: "", tags: "", status: "draft", metaTitle: "", metaDescription: "" })
    setDialogOpen(true)
  }

  const openEdit = (item: BlogPost) => {
    setEditing(item)
    setForm({
      title: item.title, slug: item.slug, content: item.content, excerpt: item.excerpt || "",
      featuredImage: item.featuredImage || "", categoryId: item.categoryId || "",
      tags: (item.tags || []).join(", "), status: item.status,
      metaTitle: item.metaTitle || "", metaDescription: item.metaDescription || "",
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    const payload = { ...form, tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean) }
    if (editing) {
      await cmsApi.blogPosts.update(editing.id, payload)
    } else {
      await cmsApi.blogPosts.create(payload)
    }
    setDialogOpen(false)
    fetchItems()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return
    await cmsApi.blogPosts.delete(id)
    fetchItems()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">Blog Posts</h1>
          <p className="text-muted-foreground">Manage blog content.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchItems}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
          <Button size="sm" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Create Post</Button>
        </div>
      </div>

      <Card className="glass-card rounded-2xl p-6">
        <CardHeader className="px-0 pt-0"><CardTitle>All Posts</CardTitle></CardHeader>
        <CardContent className="px-0 pb-0">
          {loading ? (
            <div className="space-y-3">{[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No blog posts yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Published At</TableHead>
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
                    <TableCell className="text-muted-foreground">{item.category?.name || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[item.status] || "secondary"}>{item.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : "-"}
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
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Post" : "Create Post"}</DialogTitle>
            <DialogDescription>Fill in the blog post details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Title</label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Post title" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Slug</label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="post-slug" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Content</label>
              <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={8} placeholder="Post content..." />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Excerpt</label>
              <Textarea value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} rows={2} placeholder="Short excerpt..." />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Featured Image URL</label>
              <Input value={form.featuredImage} onChange={(e) => setForm({ ...form, featuredImage: e.target.value })} placeholder="https://..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Category</label>
                <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Tags (comma separated)</label>
              <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="tag1, tag2, tag3" />
            </div>
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold mb-3">SEO Settings</h4>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Meta Title</label>
                  <Input value={form.metaTitle} onChange={(e) => setForm({ ...form, metaTitle: e.target.value })} placeholder="SEO title" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Meta Description</label>
                  <Textarea value={form.metaDescription} onChange={(e) => setForm({ ...form, metaDescription: e.target.value })} rows={2} placeholder="SEO description..." />
                </div>
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
