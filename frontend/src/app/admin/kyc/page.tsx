"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { kycApi, type KycAdminApp, type KycAnalytics } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { motion } from "framer-motion"
import { Shield, Search, Filter, ArrowRight, Clock, CheckCircle2, XCircle, Loader2, Users, AlertTriangle, BarChart3 } from "lucide-react"

export default function AdminKycPage() {
  const router = useRouter()
  const [apps, setApps] = useState<KycAdminApp[]>([])
  const [analytics, setAnalytics] = useState<KycAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [filterCountry, setFilterCountry] = useState("")

  useEffect(() => {
    Promise.all([
      kycApi.getApplications(),
      kycApi.getAnalytics(),
    ]).then(([appsRes, analyticsRes]) => {
      setApps(appsRes)
      setAnalytics(analyticsRes)
      setLoading(false)
    })
  }, [])

  const filtered = apps.filter((a) => {
    if (search && !a.fullName.toLowerCase().includes(search.toLowerCase()) && !a.email.toLowerCase().includes(search.toLowerCase())) return false
    if (filterStatus && a.status !== filterStatus) return false
    if (filterCountry && a.country !== filterCountry) return false
    return true
  })

  if (loading) return (
    <div className="space-y-6">
      <div className="h-8 bg-muted rounded w-48 animate-pulse" />
      <div className="grid grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="glass-card rounded-2xl p-6 animate-pulse"><div className="h-8 bg-muted rounded w-full" /></div>)}</div>
      <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}</div>
    </div>
  )

  const statusColor = (s: string) => {
    switch (s) {
      case "approved": return "bg-green-500/10 text-green-500 border-green-500/20"
      case "rejected": return "bg-red-500/10 text-red-500 border-red-500/20"
      case "under_review": case "pending": return "bg-blue-500/10 text-blue-500 border-blue-500/20"
      case "additional_info": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
      default: return "bg-muted/50 text-muted-foreground border-border"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">KYC Applications</h1>
          <p className="text-muted-foreground">{apps.length} total applications</p>
        </div>
      </div>

      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total", value: analytics.totalApplications, icon: <Users className="h-4 w-4" />, color: "text-primary" },
            { label: "Pending Review", value: analytics.pendingReview, icon: <Clock className="h-4 w-4" />, color: "text-blue-500" },
            { label: "Approved", value: analytics.approved, icon: <CheckCircle2 className="h-4 w-4" />, color: "text-green-500" },
            { label: "Rejected", value: analytics.rejected, icon: <XCircle className="h-4 w-4" />, color: "text-red-500" },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="glass-card rounded-2xl p-4"
            >
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <span className={stat.color}>{stat.icon}</span>
                {stat.label}
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
            </motion.div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email..." className="rounded-xl pl-10" />
        </div>
        <select className="glass rounded-xl px-3 py-2.5 text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="under_review">Under Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="additional_info">Additional Info</option>
        </select>
        <select className="glass rounded-xl px-3 py-2.5 text-sm" value={filterCountry} onChange={(e) => setFilterCountry(e.target.value)}>
          <option value="">All Countries</option>
          {[...new Set(apps.map((a) => a.country).filter(Boolean))].map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No applications found</p>
          </div>
        ) : (
          filtered.map((app, i) => (
            <motion.div
              key={app.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              onClick={() => router.push(`/admin/kyc/${app.id}`)}
              className="flex items-center justify-between p-4 glass rounded-xl hover:shadow-card-hover transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full gradient-bg flex items-center justify-center text-white font-semibold text-sm">
                  {app.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{app.fullName}</p>
                    <Badge className={`${statusColor(app.status)} text-[10px]`}>
                      {app.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{app.email} · {app.applicationType}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right text-xs text-muted-foreground hidden sm:block">
                  <p>{app.country || "—"}</p>
                  <p>{app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : "—"}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all" />
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}