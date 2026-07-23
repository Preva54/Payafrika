"use client"

import { Bell } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <Button variant="outline" size="sm" disabled>Mark All Read</Button>
      </div>
      <Card><CardContent className="text-center py-12 text-muted-foreground"><Bell className="h-12 w-12 mx-auto mb-4 opacity-50" /><p className="text-lg font-medium">No notifications</p></CardContent></Card>
    </div>
  )
}
