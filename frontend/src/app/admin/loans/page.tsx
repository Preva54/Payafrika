"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Check, X, Eye } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useState } from "react"

const loans = [
  { id: "L-001", user: "Thandi Mokoena", amount: "R250,000", purpose: "Business Expansion", rate: "12.5%", term: "24 months", status: "pending", date: "2026-07-20" },
  { id: "L-002", user: "James Okafor", amount: "R500,000", purpose: "Import Financing", rate: "11.0%", term: "36 months", status: "approved", date: "2026-07-18" },
  { id: "L-003", user: "Amina Diallo", amount: "R75,000", purpose: "Personal Loan", rate: "15.0%", term: "12 months", status: "active", date: "2026-07-15" },
  { id: "L-004", user: "Kwame Asante", amount: "R1,200,000", purpose: "Equipment Purchase", rate: "10.5%", term: "48 months", status: "pending", date: "2026-07-14" },
  { id: "L-005", user: "Naledi Khumalo", amount: "R50,000", purpose: "Debt Consolidation", rate: "14.0%", term: "6 months", status: "rejected", date: "2026-07-12" },
  { id: "L-006", user: "David Ochieng", amount: "R350,000", purpose: "Trade Finance", rate: "11.5%", term: "24 months", status: "active", date: "2026-07-10" },
  { id: "L-007", user: "Grace Nkosi", amount: "R180,000", purpose: "Home Improvement", rate: "13.0%", term: "18 months", status: "paid", date: "2026-06-28" },
  { id: "L-008", user: "Peter Mensah", amount: "R900,000", purpose: "Business Startup", rate: "10.0%", term: "60 months", status: "pending", date: "2026-06-25" },
]

export default function AdminLoansPage() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const filtered = loans.filter((l) => {
    const matchesSearch = l.user.toLowerCase().includes(search.toLowerCase()) || l.id.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === "all" || l.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const stats = [
    { label: "Total Loans", value: "R 3.5M", count: "48 loans" },
    { label: "Pending Approval", value: "R 2.3M", count: "3 applications" },
    { label: "Active Loans", value: "R 1.1M", count: "2 active" },
    { label: "Default Rate", value: "1.2%", count: "↓ 0.3% from last month" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Loan Management</h1>
        <p className="text-muted-foreground">Review, approve, and manage loan applications.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
              <p className="text-xl font-bold">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{stat.count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search loans..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", "pending", "approved", "active", "rejected", "paid"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-2 rounded-xl text-xs font-medium capitalize transition-all ${
                statusFilter === status ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground">ID</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground">Applicant</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground">Amount</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground">Purpose</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground">Rate</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground">Term</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-right p-4 text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((loan) => (
                  <tr key={loan.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                    <td className="p-4 text-sm font-mono text-xs">{loan.id}</td>
                    <td className="p-4 text-sm font-medium">{loan.user}</td>
                    <td className="p-4 text-sm font-semibold">{loan.amount}</td>
                    <td className="p-4 text-sm text-muted-foreground">{loan.purpose}</td>
                    <td className="p-4 text-sm">{loan.rate}</td>
                    <td className="p-4 text-sm text-muted-foreground">{loan.term}</td>
                    <td className="p-4">
                      <Badge
                        variant={loan.status === "approved" || loan.status === "paid" ? "success" : loan.status === "rejected" ? "destructive" : loan.status === "active" ? "default" : "secondary"}
                        className="text-[10px] capitalize"
                      >
                        {loan.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-secondary" title="View details">
                          <Eye className="h-4 w-4" />
                        </button>
                        {loan.status === "pending" && (
                          <>
                            <button className="h-8 w-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center hover:bg-accent/20" title="Approve">
                              <Check className="h-4 w-4" />
                            </button>
                            <button className="h-8 w-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20" title="Reject">
                              <X className="h-4 w-4" />
                            </button>
                          </>
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
