"use client"

import { useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { adminApi } from "@/lib/api"

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<object[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.auditLogs()
      .then(setLogs)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <div className="space-y-2">{[1,2,3,4].map((i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Audit Logs</h1>
        <p className="text-muted-foreground">System activity log</p>
      </div>
      {logs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">No audit logs available</div>
      ) : (
        <div className="space-y-2">
          {logs.map((log: any, i) => (
            <div key={i} className="p-4 rounded-xl bg-card border border-border">
              <pre className="text-sm">{JSON.stringify(log, null, 2)}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
