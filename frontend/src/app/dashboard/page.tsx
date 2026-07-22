"use client"

import { motion } from "framer-motion"
import { Wallet, ArrowLeftRight, HandCoins, CreditCard, TrendingUp, TrendingDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const stats = [
  { label: "Wallet Balance", value: "R 124,850.00", change: "+12.5%", icon: Wallet, positive: true },
  { label: "Total Spent", value: "R 45,230.00", change: "-8.2%", icon: ArrowLeftRight, positive: false },
  { label: "Active Loans", value: "R 250,000.00", change: "2 loans", icon: HandCoins, positive: true },
  { label: "Next Payment", value: "R 8,450.00", change: "Due in 5 days", icon: CreditCard, positive: true },
]

const recentTransactions = [
  { id: "1", description: "Loan Disbursement", amount: "+R250,000.00", status: "completed", date: "Today" },
  { id: "2", description: "Cross-Border Payment", amount: "-R12,500.00", status: "completed", date: "Yesterday" },
  { id: "3", description: "Currency Exchange", amount: "+R3,200.00", status: "completed", date: "2 days ago" },
  { id: "4", description: "Service Fee", amount: "-R150.00", status: "pending", date: "3 days ago" },
]

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">Welcome back, Thandi</h1>
        <p className="text-muted-foreground">Here&apos;s your financial overview for today.</p>
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
              <Card className="hover:shadow-card-hover transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </CardTitle>
                  <div className="h-8 w-8 rounded-xl gradient-bg flex items-center justify-center">
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="flex items-center gap-1 mt-1">
                    {stat.positive ? (
                      <TrendingUp className="h-3 w-3 text-accent" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-destructive" />
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

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">{tx.description}</p>
                    <p className="text-xs text-muted-foreground">{tx.date}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-semibold ${
                      tx.amount.startsWith("+") ? "text-accent" : ""
                    }`}>
                      {tx.amount}
                    </span>
                    <div className="mt-1">
                      <Badge variant={tx.status === "completed" ? "success" : "secondary"} className="text-[10px]">
                        {tx.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>KYC Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/50">
              <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <div className="h-6 w-6 rounded-full bg-accent" />
              </div>
              <div>
                <p className="font-semibold text-sm">Verification Complete</p>
                <p className="text-xs text-muted-foreground">Your identity has been verified</p>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { label: "Government ID", status: "verified" },
                { label: "Proof of Address", status: "verified" },
                { label: "Selfie Verification", status: "verified" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-sm">{item.label}</span>
                  <Badge variant="success" className="text-[10px]">
                    {item.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
