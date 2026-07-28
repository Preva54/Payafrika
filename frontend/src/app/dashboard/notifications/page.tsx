"use client"

import { useEffect, useState } from "react"
import { Bell, CheckCheck, RefreshCw } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { walletApi, type WalletNotificationResponse } from "@/lib/api"

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<WalletNotificationResponse[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const data = await walletApi.notifications()
      setNotifications(data)
    } catch {
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchNotifications() }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchNotifications}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
          {notifications.some(n => !n.read) && (
            <Button variant="outline" size="sm" disabled><CheckCheck className="mr-2 h-4 w-4" />Mark All Read</Button>
          )}
        </div>
      </div>
      {loading ? (
        <div className="space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-20" />)}</div>
      ) : notifications.length === 0 ? (
        <Card><CardContent className="text-center py-12 text-muted-foreground"><Bell className="h-12 w-12 mx-auto mb-4 opacity-50" /><p className="text-lg font-medium">No notifications</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div key={n.id} className={`rounded-xl border p-4 flex items-start gap-4 transition-colors ${n.read ? "border-border" : "border-primary/20 bg-primary/5"}`}>
              <div className={`rounded-full p-2 ${n.read ? "bg-muted" : "bg-primary/10"}`}>
                <Bell className={`h-4 w-4 ${n.read ? "text-muted-foreground" : "text-primary"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${n.read ? "" : "font-semibold"}`}>{n.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{formatRelativeTime(n.createdAt)}</p>
              </div>
              {!n.read && <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
