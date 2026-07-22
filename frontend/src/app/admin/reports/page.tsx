"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, TrendingUp, Users, DollarSign, Activity, ArrowUp, ArrowDown } from "lucide-react"

const monthlyData = [
  { month: "Feb", revenue: 380000, users: 1800, loans: 42, transactions: 1250 },
  { month: "Mar", revenue: 410000, users: 1700, loans: 38, transactions: 1340 },
  { month: "Apr", revenue: 450000, users: 1700, loans: 45, transactions: 1480 },
  { month: "May", revenue: 490000, users: 2600, loans: 52, transactions: 1620 },
  { month: "Jun", revenue: 520000, users: 3047, loans: 48, transactions: 1750 },
]

const reports = [
  { name: "Monthly Financial Statement", type: "PDF", date: "July 2026", size: "2.4 MB" },
  { name: "User Growth Report", type: "PDF", date: "Q2 2026", size: "1.8 MB" },
  { name: "Loan Portfolio Summary", type: "XLSX", date: "Weekly - July 22", size: "856 KB" },
  { name: "Transaction Volume Analysis", type: "PDF", date: "Daily - July 22", size: "1.2 MB" },
  { name: "KYC Verification Report", type: "CSV", date: "July 2026", size: "624 KB" },
  { name: "Fraud Detection Summary", type: "PDF", date: "Q2 2026", size: "3.1 MB" },
]

export default function AdminReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">Reports & Analytics</h1>
          <p className="text-muted-foreground">Platform performance metrics and downloadable reports.</p>
        </div>
        <Button variant="gradient">
          <Download className="mr-2 h-4 w-4" />
          Generate Report
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Monthly Revenue", value: "R 520K", change: "+12.4%", icon: DollarSign, positive: true },
          { label: "New Users", value: "3,047", change: "+17.2%", icon: Users, positive: true },
          { label: "Avg. Loan Size", value: "R 145K", change: "+5.8%", icon: TrendingUp, positive: true },
          { label: "Churn Rate", value: "2.1%", change: "-0.4%", icon: Activity, positive: true },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <div className="h-8 w-8 rounded-xl gradient-bg flex items-center justify-center">
                    <stat.icon className="h-4 w-4 text-white" />
                  </div>
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <div className="flex items-center gap-1 mt-1">
                  {stat.positive ? <ArrowUp className="h-3 w-3 text-accent" /> : <ArrowDown className="h-3 w-3 text-destructive" />}
                  <span className={`text-xs ${stat.positive ? "text-accent" : "text-destructive"}`}>{stat.change}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            {monthlyData.map((item, i) => (
              <div key={item.month} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium w-12">{item.month}</span>
                  <span className="text-muted-foreground">R{item.revenue.toLocaleString()}</span>
                </div>
                <div className="flex gap-1 h-3">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(item.revenue / 550000) * 100}%` }}
                    transition={{ duration: 0.6, delay: i * 0.1 }}
                    className="h-full rounded-full gradient-bg"
                  />
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(item.transactions / 2000) * 100}%` }}
                    transition={{ duration: 0.6, delay: i * 0.1 + 0.2 }}
                    className="h-full rounded-full bg-sky"
                  />
                </div>
                <div className="flex gap-4 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-primary" /> Revenue</span>
                  <span className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-sky" /> Transactions</span>
                  <span className="ml-auto">{item.users} new users</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Available Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {reports.map((report) => (
              <div key={report.name} className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-secondary/50 transition-colors">
                <div>
                  <p className="text-sm font-medium">{report.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <Badge variant="secondary" className="text-[10px]">{report.type}</Badge>
                    <span className="text-[10px] text-muted-foreground">{report.date}</span>
                    <span className="text-[10px] text-muted-foreground">{report.size}</span>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-3 w-3" />
                  Download
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
