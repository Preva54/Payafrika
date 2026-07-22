"use client"

import { useState } from "react"
import { Search, MoreHorizontal, Shield, ShieldOff, Mail, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const users = [
  { id: "1", name: "Thandi Mokoena", email: "thandi@mokoena.com", role: "customer", kyc: "verified", status: "active", country: "ZA", joined: "2026-01-15" },
  { id: "2", name: "James Okafor", email: "james@okafor.com", role: "business", kyc: "verified", status: "active", country: "NG", joined: "2026-02-20" },
  { id: "3", name: "Amina Diallo", email: "amina@diallo.com", role: "customer", kyc: "pending", status: "active", country: "SN", joined: "2026-03-10" },
  { id: "4", name: "Kwame Asante", email: "kwame@asante.com", role: "business", kyc: "verified", status: "suspended", country: "GH", joined: "2026-01-05" },
  { id: "5", name: "Naledi Khumalo", email: "naledi@khumalo.com", role: "customer", kyc: "rejected", status: "active", country: "BW", joined: "2026-04-01" },
  { id: "6", name: "John Doe", email: "john@example.com", role: "admin", kyc: "verified", status: "active", country: "ZA", joined: "2025-11-01" },
  { id: "7", name: "Sarah Chen", email: "sarah@chen.com", role: "customer", kyc: "verified", status: "inactive", country: "ZA", joined: "2026-03-22" },
]

export default function AdminUsersPage() {
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")

  const filtered = users.filter((u) => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
    const matchesRole = roleFilter === "all" || u.role === roleFilter
    return matchesSearch && matchesRole
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Users</h1>
        <p className="text-muted-foreground">Manage all registered users on the platform.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2">
          {["all", "customer", "business", "admin"].map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-3 py-2 rounded-xl text-xs font-medium capitalize transition-all ${
                roleFilter === role ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"
              }`}
            >
              {role}
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
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground">User</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground">Role</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground">KYC</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground">Country</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground">Joined</th>
                  <th className="text-right p-4 text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="gradient-bg text-white text-xs">
                            {user.name.split(" ").map(n => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant={user.role === "admin" ? "premium" : "secondary"} className="text-[10px] capitalize">{user.role}</Badge>
                    </td>
                    <td className="p-4">
                      <Badge variant={user.kyc === "verified" ? "success" : user.kyc === "pending" ? "default" : "destructive"} className="text-[10px]">
                        {user.kyc}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        <div className={`h-2 w-2 rounded-full ${
                          user.status === "active" ? "bg-accent" : user.status === "inactive" ? "bg-muted-foreground" : "bg-destructive"
                        }`} />
                        <span className="text-sm capitalize">{user.status}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm">{user.country}</td>
                    <td className="p-4 text-sm text-muted-foreground">{user.joined}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button className="h-8 w-8 rounded-lg hover:bg-secondary flex items-center justify-center" title="Send email">
                          <Mail className="h-4 w-4" />
                        </button>
                        <button className="h-8 w-8 rounded-lg hover:bg-secondary flex items-center justify-center" title="Toggle status">
                          {user.status === "active" ? <ShieldOff className="h-4 w-4 text-destructive" /> : <Shield className="h-4 w-4 text-accent" />}
                        </button>
                        <button className="h-8 w-8 rounded-lg hover:bg-secondary flex items-center justify-center" title="More">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Showing {filtered.length} of {users.length} users</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>Previous</Button>
          <Button variant="outline" size="sm">Next</Button>
        </div>
      </div>
    </div>
  )
}
