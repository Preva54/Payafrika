"use client"

import { RefreshCw } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function PaymentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Payments</h1>
        <Button variant="outline" size="sm"><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
      </div>
      <Card><CardContent className="text-center py-12 text-muted-foreground"><p className="text-lg font-medium">No payments yet</p></CardContent></Card>
    </div>
  )
}
