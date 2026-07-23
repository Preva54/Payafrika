"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { adminApi, type AdminPayment } from "@/lib/api"

const statusVariant: Record<string, "success" | "secondary" | "destructive" | "default"> = {
  completed: "success",
  pending: "secondary",
  failed: "destructive",
  refunded: "default",
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<AdminPayment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.payments()
      .then(setPayments)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-48" />
        <div className="space-y-2">{[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Payments</h1>
        <p className="text-muted-foreground">{payments.length} transactions</p>
      </div>
      <div className="space-y-2">
        {payments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">No payments yet</div>
        ) : (
          payments.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: i * 0.03 }}
              className="flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:shadow-card-hover transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                  {p.userName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-sm">{p.userName}</p>
                  <p className="text-xs text-muted-foreground">{p.description ?? p.type}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-sm">R {p.amount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</span>
                <Badge variant="secondary" className="text-[10px]">{p.type}</Badge>
                <Badge variant={statusVariant[p.status] ?? "secondary"} className="text-[10px]">{p.status}</Badge>
                <span className="text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleDateString()}</span>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
