"use client"

import { useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { adminApi } from "@/lib/api"

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<object[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.tickets()
      .then(setTickets)
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Support Tickets</h1>
        <p className="text-muted-foreground">{tickets.length} open tickets</p>
      </div>
      {tickets.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">No support tickets</div>
      ) : (
        <div className="space-y-2">
          {tickets.map((ticket: any, i) => (
            <div key={i} className="p-4 rounded-xl bg-card border border-border">
              <pre className="text-sm">{JSON.stringify(ticket, null, 2)}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
