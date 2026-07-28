"use client"

import { useEffect, useState } from "react"
import { FileText, Upload, Download, RefreshCw, Eye } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { loansApi, type LoanDocument } from "@/lib/api"

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "numeric" })
}

const statusBadge: Record<string, "success" | "secondary" | "destructive" | "default"> = {
  verified: "success",
  pending: "secondary",
  rejected: "destructive",
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<LoanDocument[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDocuments = async () => {
    setLoading(true)
    try {
      const data = await loansApi.documents()
      setDocuments(data)
    } catch {
      setDocuments([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDocuments() }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Documents</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchDocuments}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
          <Button variant="gradient" size="sm"><Upload className="mr-2 h-4 w-4" />Upload</Button>
        </div>
      </div>
      {loading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-16" />)}</div>
      ) : documents.length === 0 ? (
        <Card><CardContent className="text-center py-12 text-muted-foreground"><FileText className="h-12 w-12 mx-auto mb-4 opacity-50" /><p className="text-lg font-medium">No documents uploaded</p><p className="text-sm mt-1">Upload ID, proof of address, or other documents.</p></CardContent></Card>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Name</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden sm:table-cell">Type</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden md:table-cell">Size</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden lg:table-cell">Uploaded</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Status</th>
                <th className="text-right text-xs font-medium text-muted-foreground p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map(doc => (
                <tr key={doc.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center"><FileText className="h-4 w-4 text-primary" /></div>
                      <span className="text-sm font-medium">{doc.name}</span>
                    </div>
                  </td>
                  <td className="p-3 text-sm text-muted-foreground hidden sm:table-cell">{doc.type}</td>
                  <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">{formatFileSize(doc.size)}</td>
                  <td className="p-3 text-sm text-muted-foreground hidden lg:table-cell">{formatDate(doc.uploadedAt)}</td>
                  <td className="p-3"><Badge variant={statusBadge[doc.status] || "secondary"} className="text-[10px] capitalize">{doc.status}</Badge></td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {doc.url && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <a href={doc.url} target="_blank" rel="noopener noreferrer"><Eye className="h-4 w-4" /></a>
                        </Button>
                      )}
                      {doc.url && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <a href={doc.url} download><Download className="h-4 w-4" /></a>
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
