"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { adminApi, type AdminUser } from "@/lib/api"

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.users()
      .then(setUsers)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Users</h1>
        <p className="text-muted-foreground">{users.length} registered users</p>
      </div>

      <div className="space-y-2">
        {users.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">No users found</div>
        ) : (
          users.map((user, i) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.03 }}
              className="flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:shadow-card-hover transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full gradient-bg flex items-center justify-center text-white font-semibold text-sm">
                  {user.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-sm">{user.fullName}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="text-[10px]">{user.role}</Badge>
                <Badge variant={user.kycStatus === "verified" ? "success" : "secondary"} className="text-[10px]">
                  {user.kycStatus}
                </Badge>
                <span className="text-xs text-muted-foreground">{new Date(user.createdAt).toLocaleDateString()}</span>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
