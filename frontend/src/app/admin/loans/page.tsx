"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { adminApi, type AdminLoan } from "@/lib/api"

const statusVariant: Record<string, "success" | "secondary" | "destructive" | "default"> = {
  approved: "success",
  pending: "secondary",
  active: "default",
  rejected: "destructive",
  completed: "success",
}

export default function AdminLoansPage() {
  const [loans, setLoans] = useState<AdminLoan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.loans()
      .then(setLoans)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Loans</h1>
        <p className="text-muted-foreground">{loans.length} loan applications</p>
      </div>

      <div className="space-y-2">
        {loans.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">No loans found</div>
        ) : (
          loans.map((loan, i) => (
            <motion.div
              key={loan.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.03 }}
              className="flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:shadow-card-hover transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                  {loan.userName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-sm">{loan.userName}</p>
                  <p className="text-xs text-muted-foreground">{loan.userEmail}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-sm">R {loan.amount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</span>
                <Badge variant={statusVariant[loan.status] ?? "secondary"} className="text-[10px]">{loan.status}</Badge>
                <span className="text-xs text-muted-foreground">{new Date(loan.createdAt).toLocaleDateString()}</span>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
