"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, MessageCircle, CheckCircle, Clock, AlertCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useState } from "react"

const tickets = [
  { id: "T-001", subject: "Withdrawal not processing", customer: "Thandi Mokoena", priority: "high", status: "open", agent: "Unassigned", created: "1 hour ago" },
  { id: "T-002", subject: "Currency exchange rate discrepancy", customer: "James Okafor", priority: "medium", status: "in-progress", agent: "Sarah M.", created: "3 hours ago" },
  { id: "T-003", subject: "Unable to upload KYC documents", customer: "Amina Diallo", priority: "high", status: "open", agent: "Unassigned", created: "5 hours ago" },
  { id: "T-004", subject: "Loan repayment schedule question", customer: "Kwame Asante", priority: "low", status: "resolved", agent: "John K.", created: "1 day ago" },
  { id: "T-005", subject: "Account access issue after 2FA reset", customer: "Naledi Khumalo", priority: "critical", status: "open", agent: "Unassigned", created: "2 days ago" },
  { id: "T-006", subject: "B2B marketplace listing approval", customer: "Lagos Traders Ltd", priority: "medium", status: "in-progress", agent: "Sarah M.", created: "2 days ago" },
  { id: "T-007", subject: "Invoice for import shipment", customer: "David Ochieng", priority: "low", status: "closed", agent: "John K.", created: "3 days ago" },
  { id: "T-008", subject: "API integration documentation", customer: "TechStart Inc", priority: "low", status: "resolved", agent: "Peter A.", created: "5 days ago" },
]

export default function AdminTicketsPage() {
  const [search, setSearch] = useState("")
  const statusIcons = { open: AlertCircle, "in-progress": Clock, resolved: CheckCircle, closed: CheckCircle }

  const filtered = tickets.filter((t) =>
    t.subject.toLowerCase().includes(search.toLowerCase()) || t.customer.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Support Tickets</h1>
        <p className="text-muted-foreground">Manage customer inquiries and support requests.</p>
      </div>

      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search tickets..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="space-y-3">
        {filtered.map((ticket) => {
          const StatusIcon = statusIcons[ticket.status as keyof typeof statusIcons]
          return (
            <Card key={ticket.id} className="hover:shadow-card-hover transition-all cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="gradient-bg text-white text-xs">
                        {ticket.customer.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{ticket.subject}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{ticket.customer}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <Badge
                          variant={ticket.priority === "critical" ? "destructive" : ticket.priority === "high" ? "default" : ticket.priority === "medium" ? "secondary" : "outline"}
                          className="text-[10px] capitalize"
                        >
                          {ticket.priority}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{ticket.created}</span>
                        <span className="text-[10px] text-muted-foreground">Agent: {ticket.agent}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <StatusIcon className={`h-4 w-4 ${
                        ticket.status === "open" ? "text-destructive" : ticket.status === "in-progress" ? "text-primary" : ticket.status === "resolved" ? "text-accent" : "text-muted-foreground"
                      }`} />
                      <span className="text-xs capitalize">{ticket.status}</span>
                    </div>
                    <MessageCircle className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
