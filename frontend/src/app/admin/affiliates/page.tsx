"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, TrendingUp, Users, DollarSign } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useState } from "react"

const affiliates = [
  { id: "A-001", name: "TechBiz Africa", email: "partners@techbiz.africa", referrals: 45, earnings: "R 125,000", tier: "gold", status: "active", joined: "2026-03-15" },
  { id: "A-002", name: "Digital Solutions KE", email: "info@digitalsolutions.ke", referrals: 28, earnings: "R 72,000", tier: "silver", status: "active", joined: "2026-04-01" },
  { id: "A-003", name: "Growth Partners NG", email: "hello@growthpartners.ng", referrals: 12, earnings: "R 31,000", tier: "bronze", status: "active", joined: "2026-05-10" },
  { id: "A-004", name: "AfriTrade GH", email: "contact@afritrade.gh", referrals: 8, earnings: "R 18,500", tier: "bronze", status: "suspended", joined: "2026-05-20" },
  { id: "A-005", name: "Sahara Ventures", email: "ventures@sahara.com", referrals: 67, earnings: "R 210,000", tier: "platinum", status: "active", joined: "2026-01-05" },
  { id: "A-006", name: "Cape Connect ZA", email: "info@capeconnect.za", referrals: 31, earnings: "R 89,000", tier: "silver", status: "active", joined: "2026-02-14" },
]

const tierColors: Record<string, string> = {
  platinum: "from-purple-500 to-pink-500",
  gold: "from-amber-500 to-yellow-500",
  silver: "from-gray-400 to-gray-300",
  bronze: "from-orange-500 to-amber-600",
}

export default function AdminAffiliatesPage() {
  const [search, setSearch] = useState("")

  const filtered = affiliates.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()) || a.email.toLowerCase().includes(search.toLowerCase())
  )

  const totalStats = [
    { label: "Total Affiliates", value: "186", icon: Users },
    { label: "Total Referrals", value: "8,247", icon: TrendingUp },
    { label: "Commissions Paid", value: "R 1.2M", icon: DollarSign },
    { label: "Avg. Conversion", value: "12.4%", icon: TrendingUp },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Affiliate Management</h1>
        <p className="text-muted-foreground">Manage affiliate partners and track performance.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {totalStats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl gradient-bg flex items-center justify-center">
                <stat.icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-lg font-bold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search affiliates..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground">Partner</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground">Referrals</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground">Earnings</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground">Tier</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground">Joined</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className={`bg-gradient-to-br ${tierColors[a.tier]} text-white text-xs`}>
                            {a.name.split(" ").map(n => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{a.name}</p>
                          <p className="text-xs text-muted-foreground">{a.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm font-semibold">{a.referrals}</td>
                    <td className="p-4 text-sm font-semibold">{a.earnings}</td>
                    <td className="p-4">
                      <Badge variant="premium" className="text-[10px] capitalize">{a.tier}</Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        <div className={`h-2 w-2 rounded-full ${a.status === "active" ? "bg-accent" : "bg-destructive"}`} />
                        <span className="text-sm capitalize">{a.status}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">{a.joined}</td>
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
