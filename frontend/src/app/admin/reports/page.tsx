"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { adminApi, type AdminReports } from "@/lib/api"

export default function AdminReportsPage() {
  const [data, setData] = useState<AdminReports | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.reports()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    )
  }

  const stats = [
    { label: "Total Users", value: data?.totalUsers.toLocaleString() ?? "0" },
    { label: "Total Loans", value: data?.totalLoans.toLocaleString() ?? "0" },
    { label: "Active Loans", value: data?.activeLoans.toLocaleString() ?? "0" },
    { label: "Total Deposits", value: `R ${(data?.totalDeposits ?? 0).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}` },
    { label: "Total Withdrawals", value: `R ${(data?.totalWithdrawals ?? 0).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}` },
    { label: "Loan Volume", value: `R ${(data?.loanVolume ?? 0).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}` },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Reports</h1>
        <p className="text-muted-foreground">Platform analytics and summaries</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.08 }}>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{s.value}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
