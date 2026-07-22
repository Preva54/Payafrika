"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Eye, RotateCcw, MoreHorizontal } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useState } from "react"

const payments = [
  { id: "PAY-001", user: "Thandi Mokoena", amount: "R 250,000", method: "Flutterwave", status: "completed", date: "2026-07-21", type: "Loan Disbursement" },
  { id: "PAY-002", user: "James Okafor", amount: "R 12,500", method: "Paystack", status: "completed", date: "2026-07-20", type: "Cross-Border Payment" },
  { id: "PAY-003", user: "Amina Diallo", amount: "R 3,200", method: "Ozow", status: "pending", date: "2026-07-19", type: "Currency Exchange" },
  { id: "PAY-004", user: "Kwame Asante", amount: "R 450,000", method: "Flutterwave", status: "failed", date: "2026-07-18", type: "Trade Payment" },
  { id: "PAY-005", user: "Naledi Khumalo", amount: "R 150", method: "Peach Payments", status: "completed", date: "2026-07-18", type: "Service Fee" },
  { id: "PAY-006", user: "David Ochieng", amount: "R 85,000", method: "Paystack", status: "refunded", date: "2026-07-17", type: "Refund" },
  { id: "PAY-007", user: "Grace Nkosi", amount: "R 1,200,000", method: "Flutterwave", status: "flagged", date: "2026-07-16", type: "Withdrawal" },
  { id: "PAY-008", user: "Peter Mensah", amount: "R 28,000", method: "Ozow", status: "completed", date: "2026-07-15", type: "Loan Repayment" },
]

const stats = [
  { label: "Total Volume", value: "R 4.2M", change: "+18%" },
  { label: "Success Rate", value: "94.2%", change: "+2.1%" },
  { label: "Failed", value: "12", change: "3 today" },
  { label: "Avg. Processing", value: "1.4s", change: "0.3s faster" },
]

export default function AdminPaymentsPage() {
  const [search, setSearch] = useState("")

  const filtered = payments.filter((p) =>
    p.user.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Payments & Transactions</h1>
        <p className="text-muted-foreground">Monitor all financial transactions on the platform.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
              <p className="text-xl font-bold">{stat.value}</p>
              <p className="text-[10px] text-accent mt-1">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search payments..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground">ID</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground">User</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground">Amount</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground">Method</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground">Type</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground">Date</th>
                  <th className="text-right p-4 text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                    <td className="p-4 text-sm font-mono text-xs">{p.id}</td>
                    <td className="p-4 text-sm font-medium">{p.user}</td>
                    <td className="p-4 text-sm font-semibold">{p.amount}</td>
                    <td className="p-4 text-sm text-muted-foreground">{p.method}</td>
                    <td className="p-4 text-sm text-muted-foreground">{p.type}</td>
                    <td className="p-4">
                      <Badge
                        variant={p.status === "completed" ? "success" : p.status === "failed" ? "destructive" : p.status === "flagged" ? "default" : p.status === "refunded" ? "secondary" : "outline"}
                        className="text-[10px] capitalize"
                      >
                        {p.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">{p.date}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-secondary">
                          <Eye className="h-4 w-4" />
                        </button>
                        {p.status === "failed" && (
                          <button className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-secondary">
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
