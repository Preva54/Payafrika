"use client"

import { motion } from "framer-motion"
import { Building2, Wallet, ArrowLeftRight, FileText, TrendingUp, Users, Package, Shield } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const stats = [
  { label: "Revenue", value: "R 2.4M", change: "+18.2%", icon: TrendingUp, positive: true },
  { label: "Trade Volume", value: "R 850K", change: "+12.5%", icon: Package, positive: true },
  { label: "Active Employees", value: "24", change: "+3 this month", icon: Users, positive: true },
  { label: "Pending Orders", value: "8", change: "2 urgent", icon: FileText, positive: false },
]

const tradeRequests = [
  { id: "1", partner: "Lagos Traders Ltd", type: "Import", amount: "R450,000", status: "in-review" },
  { id: "2", partner: "Accra Exports Co", type: "Export", amount: "R280,000", status: "shipped" },
  { id: "3", partner: "Nairobi Supplies", type: "Import", amount: "R125,000", status: "pending" },
]

export default function BusinessDashboardPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">Business Dashboard</h1>
          <p className="text-muted-foreground">Manage your trade, payments, and team.</p>
        </div>
        <Button variant="gradient">New Trade Request</Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.1 }}
            >
              <Card className="hover:shadow-card-hover transition-all">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                  <div className="h-8 w-8 rounded-xl gradient-bg flex items-center justify-center">
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <span className={`text-xs ${stat.positive ? "text-accent" : "text-destructive"}`}>
                    {stat.change}
                  </span>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Trade Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tradeRequests.map((req) => (
                <div key={req.id} className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-secondary/50 transition-colors">
                  <div>
                    <p className="text-sm font-medium">{req.partner}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-[10px]">{req.type}</Badge>
                      <span className="text-xs text-muted-foreground">{req.amount}</span>
                    </div>
                  </div>
                  <Badge
                    variant={req.status === "shipped" ? "success" : req.status === "in-review" ? "default" : "secondary"}
                    className="text-[10px]"
                  >
                    {req.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Business Verification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-accent/10">
              <Shield className="h-8 w-8 text-accent" />
              <div>
                <p className="font-semibold text-sm">Business Verified</p>
                <p className="text-xs text-muted-foreground">Your business profile is complete</p>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { label: "Business Registration", status: "verified" },
                { label: "Tax Clearance", status: "verified" },
                { label: "Director KYC", status: "verified" },
                { label: "Bank Account", status: "verified" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-sm">{item.label}</span>
                  <Badge variant="success" className="text-[10px]">{item.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
