"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, Shield, UserCog, FileEdit, LogIn, Trash2 } from "lucide-react"
import { useState } from "react"

const logs = [
  { id: 1, action: "User login", user: "john@example.com", ip: "192.168.1.100", timestamp: "2026-07-22 14:32:01", type: "auth", details: "Successful login from Chrome on Windows" },
  { id: 2, action: "Loan approved", user: "admin@payafrika.com", ip: "10.0.0.5", timestamp: "2026-07-22 14:15:22", type: "loan", details: "Approved R250,000 loan for T. Mokoena" },
  { id: 3, action: "KYC documents verified", user: "admin@payafrika.com", ip: "10.0.0.5", timestamp: "2026-07-22 13:45:10", type: "kyc", details: "Verified passport for A. Diallo" },
  { id: 4, action: "User role changed", user: "admin@payafrika.com", ip: "10.0.0.5", timestamp: "2026-07-22 12:30:00", type: "admin", details: "Changed james@okafor.com from customer to business" },
  { id: 5, action: "Failed login attempt", user: "unknown", ip: "203.0.113.50", timestamp: "2026-07-22 12:15:33", type: "auth", details: "8 failed attempts for user@example.com" },
  { id: 6, action: "Payment refunded", user: "admin@payafrika.com", ip: "10.0.0.5", timestamp: "2026-07-22 11:20:15", type: "payment", details: "Refunded R45,000 to customer" },
  { id: 7, action: "User account deleted", user: "admin@payafrika.com", ip: "10.0.0.5", timestamp: "2026-07-22 10:05:00", type: "admin", details: "Deleted inactive account for sarah@test.com" },
  { id: 8, action: "System config updated", user: "admin@payafrika.com", ip: "10.0.0.5", timestamp: "2026-07-22 09:00:00", type: "config", details: "Updated exchange rate refresh interval" },
]

const typeIcons: Record<string, React.ElementType> = {
  auth: LogIn, loan: FileEdit, kyc: Shield, admin: UserCog, payment: FileEdit, config: Shield,
}

export default function AuditLogsPage() {
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")

  const filtered = logs.filter((log) => {
    const matchesSearch = log.action.toLowerCase().includes(search.toLowerCase()) || log.user.toLowerCase().includes(search.toLowerCase())
    const matchesType = typeFilter === "all" || log.type === typeFilter
    return matchesSearch && matchesType
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Audit Logs</h1>
        <p className="text-muted-foreground">Track all administrative actions and system events.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search logs..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", "auth", "loan", "kyc", "admin", "payment", "config"].map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-3 py-2 rounded-xl text-xs font-medium capitalize transition-all ${
                typeFilter === type ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map((log) => {
          const Icon = typeIcons[log.type] || Shield
          return (
            <Card key={log.id} className="hover:shadow-card-hover transition-all">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                    log.type === "auth" && log.action.includes("Failed") ? "bg-destructive/10" : "bg-primary/10"
                  }`}>
                    <Icon className={`h-4 w-4 ${log.type === "auth" && log.action.includes("Failed") ? "text-destructive" : "text-primary"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-medium">{log.action}</p>
                      <span className="text-xs text-muted-foreground shrink-0 font-mono">{log.timestamp}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{log.details}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[10px] text-muted-foreground font-mono">{log.user}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{log.ip}</span>
                      <Badge variant="secondary" className="text-[10px] capitalize">{log.type}</Badge>
                    </div>
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
