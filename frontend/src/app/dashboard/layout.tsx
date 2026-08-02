"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar"
import { useAuthStore } from "@/stores/use-auth-store"
import { kycApi } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { ShieldCheck, X, ArrowRight } from "lucide-react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isAuthenticated, isLoading, fetchUser } = useAuthStore()
  const [kycStatus, setKycStatus] = useState<string | null>(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)

  useEffect(() => {
    if (isAuthenticated && !user) {
      fetchUser()
    }
  }, [isAuthenticated, user, fetchUser])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/auth/login")
    }
  }, [isLoading, isAuthenticated, router])

  useEffect(() => {
    let active = true
    if (isAuthenticated && user) {
      kycApi.getStatus()
        .then((res) => { if (active) setKycStatus(res.status) })
        .catch(() => { if (active) setKycStatus(null) })
    }
    return () => { active = false }
  }, [isAuthenticated, user])

  const showBanner = !bannerDismissed &&
    kycStatus !== null &&
    kycStatus !== "approved" &&
    !pathname?.startsWith("/dashboard/kyc")

  const bannerCopy = kycStatus === "under_review"
    ? { title: "Your KYC verification is under review", desc: "Estimated time: 24-48 hours. You'll be notified once complete.", action: "View status" }
    : kycStatus === "rejected" || kycStatus === "additional_info"
    ? { title: "Action needed: KYC verification requires attention", desc: "Please review the feedback and re-submit your documents.", action: "Re-apply" }
    : kycStatus === "not_started"
    ? { title: "Verify your identity to unlock all features", desc: "Complete KYC to access higher limits, loans and international services.", action: "Start verification" }
    : { title: "Complete your KYC verification", desc: "Finish the remaining steps to get fully verified.", action: "Continue" }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 w-80">
          <div className="flex justify-center">
            <div className="h-10 w-10 rounded-xl gradient-bg flex items-center justify-center">
              <span className="text-white font-bold">P</span>
            </div>
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4 mx-auto" />
            <Skeleton className="h-4 w-1/2 mx-auto" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      <DashboardSidebar type={user.role === "business" ? "business" : "customer"} />
      <main className="flex-1 overflow-auto">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          {showBanner && (
            <div className="flex items-center gap-3 glass rounded-2xl px-4 py-3 mb-6 border-primary/20">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{bannerCopy.title}</p>
                <p className="text-xs text-muted-foreground">{bannerCopy.desc}</p>
              </div>
              <Link
                href="/dashboard/kyc"
                className="text-sm font-medium text-primary hover:underline shrink-0 flex items-center gap-1"
              >
                {bannerCopy.action} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <button
                onClick={() => setBannerDismissed(true)}
                className="text-muted-foreground hover:text-foreground shrink-0"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  )
}
