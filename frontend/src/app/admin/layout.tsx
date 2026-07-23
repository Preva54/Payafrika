"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { useAdminAuthStore } from "@/stores/use-admin-auth-store"
import { Skeleton } from "@/components/ui/skeleton"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isAuthenticated, isLoading, fetchUser } = useAdminAuthStore()

  useEffect(() => {
    if (isAuthenticated && !user) {
      fetchUser()
    }
  }, [isAuthenticated, user, fetchUser])

  useEffect(() => {
    if (pathname === "/admin/login") return
    if (!isLoading && !isAuthenticated) {
      router.replace("/admin/login")
    }
  }, [isLoading, isAuthenticated, router, pathname])

  if (pathname === "/admin/login") {
    return <>{children}</>
  }

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
    <div className="min-h-screen flex bg-secondary/20">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
