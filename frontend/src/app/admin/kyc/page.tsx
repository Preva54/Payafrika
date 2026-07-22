"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Check, X, Eye, Download, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useState } from "react"

const kycApplications = [
  { id: "1", name: "Amina Diallo", email: "amina@diallo.com", type: "Passport", status: "pending", submitted: "2 hours ago", country: "SN" },
  { id: "2", name: "John Mwangi", email: "john@mwangi.com", type: "National ID", status: "pending", submitted: "5 hours ago", country: "KE" },
  { id: "3", name: "Fatima Yusuf", email: "fatima@yusuf.com", type: "Driver's License", status: "pending", submitted: "1 day ago", country: "NG" },
  { id: "4", name: "David Ochieng", email: "david@ochieng.com", type: "Passport", status: "reviewed", submitted: "2 days ago", country: "KE" },
  { id: "5", name: "Grace Nkosi", email: "grace@nkosi.com", type: "National ID", status: "pending", submitted: "3 days ago", country: "ZA" },
  { id: "6", name: "Peter Mensah", email: "peter@mensah.com", type: "Passport", status: "approved", submitted: "1 week ago", country: "GH" },
  { id: "7", name: "Zara Kone", email: "zara@kone.com", type: "Driver's License", status: "rejected", submitted: "1 week ago", country: "CI" },
  { id: "8", name: "Samuel Gebre", email: "samuel@gebre.com", type: "National ID", status: "pending", submitted: "1 week ago", country: "ET" },
]

export default function AdminKYCPage() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const filtered = kycApplications.filter((k) => {
    const matchesSearch = k.name.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === "all" || k.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">KYC Verification</h1>
        <p className="text-muted-foreground">Review and verify identity documents.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search applicants..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2">
          {["all", "pending", "reviewed", "approved", "rejected"].map((status) => (
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

      <div className="grid gap-4">
        {filtered.map((application) => (
          <Card key={application.id} className="hover:shadow-card-hover transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="gradient-bg text-white text-xs">
                      {application.name.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold">{application.name}</p>
                    <p className="text-xs text-muted-foreground">{application.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right text-xs">
                    <p className="text-muted-foreground">Document</p>
                    <p className="font-medium">{application.type}</p>
                  </div>
                  <div className="text-right text-xs">
                    <p className="text-muted-foreground">Submitted</p>
                    <p className="font-medium">{application.submitted}</p>
                  </div>
                  <Badge
                    variant={application.status === "approved" ? "success" : application.status === "rejected" ? "destructive" : application.status === "reviewed" ? "default" : "secondary"}
                    className="text-[10px] capitalize"
                  >
                    {application.status}
                  </Badge>
                  <div className="flex gap-1">
                    <button className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-secondary" title="View documents">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-secondary" title="Download">
                      <Download className="h-4 w-4" />
                    </button>
                    <button className="h-8 w-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center hover:bg-accent/20" title="Approve">
                      <Check className="h-4 w-4" />
                    </button>
                    <button className="h-8 w-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20" title="Reject">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
