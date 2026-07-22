"use client"

import { motion } from "framer-motion"
import { Users, HandCoins, CreditCard, ShieldAlert, TrendingUp, DollarSign, Activity, UserCheck, ArrowUp, ArrowDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const stats = [
  { label: "Total Revenue", value: "R 4,847,230", change: "+22.3%", icon: DollarSign, positive: true },
  { label: "Total Users", value: "52,847", change: "+1,240 this week", icon: Users, positive: true },
  { label: "Active Loans", value: "R 18.2M", change: "342 active", icon: HandCoins, positive: true },
  { label: "Fraud Alerts", value: "3", change: "-2 from yesterday", icon: ShieldAlert, positive: false },
]

const chartData = [
  { month: "Jan", revenue: 320000, users: 42000 },
  { month: "Feb", revenue: 380000, users: 43800 },
  { month: "Mar", revenue: 410000, users: 45500 },
  { month: "Apr", revenue: 450000, users: 47200 },
  { month: "May", revenue: 490000, users: 49800 },
  { month: "Jun", revenue: 520000, users: 52847 },
]

const recentActivity = [
  { action: "New user registration", user: "john.doe@example.com", time: "2 min ago", type: "user" },
  { action: "Loan approved - R250,000", user: "Thandi Mokoena", time: "15 min ago", type: "loan" },
  { action: "KYC documents verified", user: "Amina Diallo", time: "1 hour ago", type: "kyc" },
  { action: "Large withdrawal flagged - R1.2M", user: "Review required", time: "2 hours ago", type: "alert" },
  { action: "Business registered", user: "Lagos Traders Ltd", time: "3 hours ago", type: "business" },
  { action: "Payment reversed - R45,000", user: "Customer dispute", time: "5 hours ago", type: "payment" },
]

const pendingItems = [
  { label: "KYC Applications", count: 12, urgency: "high" },
  { label: "Loan Applications", count: 8, urgency: "high" },
  { label: "Support Tickets", count: 5, urgency: "medium" },
  { label: "Withdrawal Requests", count: 14, urgency: "low" },
  { label: "Dispute Cases", count: 3, urgency: "high" },
  { label: "New Affiliates", count: 7, urgency: "low" },
]

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">Admin Dashboard</h1>
          <p className="text-muted-foreground">Real-time overview of the PayAfrika platform.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">Download Report</Button>
          <Button variant="gradient" size="sm">
            <Activity className="mr-2 h-4 w-4" />
            Refresh Data
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
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${
                    stat.positive ? "gradient-bg" : "bg-destructive/10"
                  }`}>
                    <Icon className={`h-5 w-5 ${stat.positive ? "text-white" : "text-destructive"}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="flex items-center gap-1 mt-1">
                    {stat.positive ? (
                      <ArrowUp className="h-3 w-3 text-accent" />
                    ) : (
                      <ArrowDown className="h-3 w-3 text-destructive" />
                    )}
                    <span className={`text-xs ${stat.positive ? "text-accent" : "text-destructive"}`}>
                      {stat.change}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {chartData.map((item) => (
                <div key={item.month} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{item.month}</span>
                    <span className="text-muted-foreground">R{item.revenue.toLocaleString()}</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(item.revenue / 550000) * 100}%` }}
                      transition={{ duration: 0.8, delay: chartData.indexOf(item) * 0.1 }}
                      className="h-full rounded-full gradient-bg"
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingItems.map((item) => (
                <div key={item.label} className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
                  <span className="text-sm">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-lg">{item.count}</span>
                    <Badge
                      variant={item.urgency === "high" ? "destructive" : item.urgency === "medium" ? "default" : "secondary"}
                      className="text-[10px]"
                    >
                      {item.urgency}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Platform Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {recentActivity.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors">
                  <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${
                    item.type === "alert" ? "bg-destructive/10" : "bg-primary/10"
                  }`}>
                    {item.type === "user" ? <UserCheck className="h-4 w-4 text-primary" /> :
                     item.type === "loan" ? <HandCoins className="h-4 w-4 text-primary" /> :
                     item.type === "kyc" ? <ShieldAlert className="h-4 w-4 text-primary" /> :
                     item.type === "business" ? <Users className="h-4 w-4 text-primary" /> :
                     item.type === "payment" ? <CreditCard className="h-4 w-4 text-destructive" /> :
                     <Activity className="h-4 w-4 text-destructive" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.action}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.user}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{item.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fraud Detection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl border border-destructive/20 bg-destructive/5">
                <div>
                  <p className="text-sm font-semibold">High Risk Transaction</p>
                  <p className="text-xs text-muted-foreground">R1,240,000 - Suspicious pattern detected</p>
                </div>
                <Badge variant="destructive">Flagged</Badge>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
                <div>
                  <p className="text-sm font-semibold">Multiple Failed Logins</p>
                  <p className="text-xs text-muted-foreground">user@example.com - 8 attempts in 5 min</p>
                </div>
                <Badge variant="default">Warn</Badge>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-secondary/50">
                <div>
                  <p className="text-sm font-semibold">New Device Login</p>
                  <p className="text-xs text-muted-foreground">Lagos, NG - Chrome on Windows</p>
                </div>
                <Badge variant="secondary">Info</Badge>
              </div>
              <Button variant="outline" className="w-full">View All Alerts</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
