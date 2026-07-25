"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cmsApi, type FooterConfig } from "@/lib/cms-api"
import { Save, RefreshCw } from "lucide-react"

export default function FooterPage() {
  const [config, setConfig] = useState<FooterConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [content, setContent] = useState("")
  const [status, setStatus] = useState("draft")

  const fetchConfig = () => {
    setLoading(true)
    cmsApi.footer.get()
      .then((data) => {
        if (data) {
          setConfig(data)
          setContent(data.content)
          setStatus(data.status)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchConfig() }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const result = await cmsApi.footer.update({ content, status } as Partial<FooterConfig>)
      setConfig(result)
    } catch {}
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">Footer Configuration</h1>
          <p className="text-muted-foreground">Edit the website footer content.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchConfig}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />{saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <Card className="glass-card rounded-2xl p-6">
        <CardHeader className="px-0 pt-0"><CardTitle>Footer Content</CardTitle></CardHeader>
        <CardContent className="px-0 pb-0 space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Content (HTML/JSON)</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={16}
              className="font-mono text-sm"
              placeholder="Footer content..."
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="w-48">
              <label className="text-sm font-medium mb-1 block">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {config && (
              <Badge variant={status === "active" ? "success" : status === "inactive" ? "destructive" : "secondary"}>
                {status}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
