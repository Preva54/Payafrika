"use client"

import { useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { adminApi } from "@/lib/api"

export default function AdminCmsPage() {
  const [data, setData] = useState<{ pages: object[]; blogPosts: object[] } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.cms()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <div className="space-y-2">{[1,2,3,4].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
      </div>
    )
  }

  const pages = data?.pages ?? []
  const blogPosts = data?.blogPosts ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Content Management</h1>
        <p className="text-muted-foreground">{pages.length} pages &middot; {blogPosts.length} blog posts</p>
      </div>
      {pages.length === 0 && blogPosts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">No content yet</div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h2 className="font-semibold">Pages ({pages.length})</h2>
            {pages.map((p: any, i) => (
              <div key={i} className="p-4 rounded-xl bg-card border border-border">
                <p className="font-medium text-sm">{p.title ?? "Untitled"}</p>
                <p className="text-xs text-muted-foreground">{p.status ?? "draft"}</p>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <h2 className="font-semibold">Blog Posts ({blogPosts.length})</h2>
            {blogPosts.map((b: any, i) => (
              <div key={i} className="p-4 rounded-xl bg-card border border-border">
                <p className="font-medium text-sm">{b.title ?? "Untitled"}</p>
                <p className="text-xs text-muted-foreground">{b.status ?? "draft"}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
