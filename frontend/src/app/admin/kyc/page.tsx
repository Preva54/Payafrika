"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { adminApi, type AdminKyc } from "@/lib/api"

export default function AdminKycPage() {
  const [apps, setApps] = useState<AdminKyc[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.kyc()
      .then(setApps)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <div className="space-y-2">{[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">KYC Verification</h1>
        <p className="text-muted-foreground">{apps.length} applications</p>
      </div>
      <div className="space-y-2">
        {apps.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">No KYC applications</div>
        ) : (
          apps.map((a, i) => (
            <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: i * 0.03 }}
              className="flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:shadow-card-hover transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full gradient-bg flex items-center justify-center text-white font-semibold text-sm">
                  {a.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-sm">{a.fullName}</p>
                  <p className="text-xs text-muted-foreground">{a.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{a.country ?? "—"}</span>
                <Badge variant={a.kycStatus === "verified" ? "success" : a.kycStatus === "rejected" ? "destructive" : "secondary"} className="text-[10px]">
                  {a.kycStatus}
                </Badge>
                {a.updatedAt && <span className="text-xs text-muted-foreground">{new Date(a.updatedAt).toLocaleDateString()}</span>}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
