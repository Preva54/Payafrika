"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Users, HandCoins, CreditCard, TrendingUp, DollarSign, Activity, ArrowUp, ArrowDown, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { adminApi, type AdminDashboard } from "@/lib/api"

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboard | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    try {
      const result = await adminApi.dashboard()
      setData(result)
    } catch {
      // handled by auth guard
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-12 w-24" /><Skeleton className="h-4 w-16 mt-2" /></CardContent></Card>
          ))}
        </div>
      </div>
    )
  }

  const stats = [
    { label: "Total Revenue", value: `R ${(data?.totalRevenue ?? 0).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`, change: "From all transactions", icon: DollarSign, positive: true },
    { label: "Total Users", value: (data?.totalUsers ?? 0).toLocaleString(), change: "Registered users", icon: Users, positive: true },
    { label: "Total Loans", value: (data?.totalLoans ?? 0).toLocaleString(), change: `${data?.pendingLoans ?? 0} pending`, icon: HandCoins, positive: true },
    { label: "Transactions", value: (data?.totalTransactions ?? 0).toLocaleString(), change: "All time", icon: CreditCard, positive: true },
  ]

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">Admin Dashboard</h1>
          <p className="text-muted-foreground">Real-time overview of the PayAfrika platform.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.08 }}
            >
              <Card className="hover:shadow-card-hover transition-all">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${stat.positive ? "gradient-bg" : "bg-destructive/10"}`}>
                    <Icon className={`h-5 w-5 ${stat.positive ? "text-white" : "text-destructive"}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="flex items-center gap-1 mt-1">
                    {stat.positive ? <ArrowUp className="h-3 w-3 text-accent" /> : <ArrowDown className="h-3 w-3 text-destructive" />}
                    <span className={`text-xs ${stat.positive ? "text-accent" : "text-destructive"}`}>{stat.change}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Platform Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Revenue per User", value: data && data.totalUsers > 0 ? `R ${(data.totalRevenue / data.totalUsers).toFixed(0)}` : "R 0", sub: "Average" },
                { label: "Loan Approval Rate", value: data && data.totalLoans > 0 ? `${((1 - data.pendingLoans / data.totalLoans) * 100).toFixed(0)}%` : "0%", sub: "Of total applications" },
                { label: "Pending Reviews", value: data?.pendingLoans ?? 0, sub: "Awaiting decision" },
                { label: "Transaction Volume", value: data?.totalTransactions ?? 0, sub: "Total processed" },
              ].map((item) => (
                <div key={item.label} className="p-4 rounded-xl bg-secondary/50">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-xl font-bold mt-1">{item.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.sub}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
