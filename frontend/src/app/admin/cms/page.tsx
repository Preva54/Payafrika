"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Edit, Eye, Clock, Globe } from "lucide-react"

const pages = [
  { id: 1, title: "Homepage", slug: "/", status: "published", updated: "2 hours ago", author: "Admin" },
  { id: 2, title: "Services", slug: "/services", status: "published", updated: "1 day ago", author: "Admin" },
  { id: 3, title: "About Us", slug: "/about", status: "draft", updated: "3 days ago", author: "Admin" },
  { id: 4, title: "Blog", slug: "/blog", status: "published", updated: "5 hours ago", author: "Admin" },
  { id: 5, title: "Careers", slug: "/careers", status: "draft", updated: "1 week ago", author: "Admin" },
  { id: 6, title: "Privacy Policy", slug: "/privacy", status: "published", updated: "2 weeks ago", author: "Admin" },
  { id: 7, title: "Terms of Service", slug: "/terms", status: "published", updated: "2 weeks ago", author: "Admin" },
  { id: 8, title: "FAQ", slug: "/faq", status: "published", updated: "1 month ago", author: "Admin" },
]

const blogPosts = [
  { id: 1, title: "Transforming Cross-Border Trade in Africa", category: "Trade", status: "published", views: "1,847", updated: "3 days ago" },
  { id: 2, title: "The Future of Digital Payments in Africa", category: "Finance", status: "published", views: "2,341", updated: "1 week ago" },
  { id: 3, title: "Small Business Guide: Securing Your First Loan", category: "Business", status: "draft", views: "0", updated: "2 weeks ago" },
  { id: 4, title: "Cryptocurrency in Africa: Opportunities", category: "Crypto", status: "published", views: "1,203", updated: "2 weeks ago" },
  { id: 5, title: "Import/Export Documentation Guide", category: "Trade", status: "published", views: "892", updated: "3 weeks ago" },
  { id: 6, title: "Why Digital-First Banking is Winning", category: "Finance", status: "draft", views: "0", updated: "1 month ago" },
]

export default function AdminCMSPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">Content Management</h1>
        <p className="text-muted-foreground">Manage website pages and blog content.</p>
      </div>

      <div>
        <CardHeader className="px-0 pt-0">
          <CardTitle className="text-lg">Pages</CardTitle>
        </CardHeader>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground">Page</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground">Slug</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground">Updated</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground">Author</th>
                    <th className="text-right p-4 text-xs font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pages.map((page) => (
                    <tr key={page.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                      <td className="p-4 text-sm font-medium">{page.title}</td>
                      <td className="p-4 text-sm font-mono text-muted-foreground">{page.slug}</td>
                      <td className="p-4">
                        <Badge variant={page.status === "published" ? "success" : "secondary"} className="text-[10px] capitalize">{page.status}</Badge>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">{page.updated}</td>
                      <td className="p-4 text-sm text-muted-foreground">{page.author}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-secondary"><Edit className="h-4 w-4" /></button>
                          <button className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-secondary"><Eye className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <CardHeader className="px-0 pt-0">
          <CardTitle className="text-lg">Blog Posts</CardTitle>
        </CardHeader>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground">Title</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground">Category</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground">Views</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground">Updated</th>
                    <th className="text-right p-4 text-xs font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {blogPosts.map((post) => (
                    <tr key={post.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                      <td className="p-4 text-sm font-medium">{post.title}</td>
                      <td className="p-4"><Badge variant="secondary" className="text-[10px]">{post.category}</Badge></td>
                      <td className="p-4">
                        <Badge variant={post.status === "published" ? "success" : "secondary"} className="text-[10px] capitalize">{post.status}</Badge>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">{post.views}</td>
                      <td className="p-4 text-sm text-muted-foreground">{post.updated}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-secondary"><Edit className="h-4 w-4" /></button>
                          <button className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-secondary"><Eye className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline">New Page</Button>
        <Button variant="gradient">New Blog Post</Button>
      </div>
    </div>
  )
}
