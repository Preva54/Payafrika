"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { adminApi, type AdminRoleGroup } from "@/lib/api"

const roleColors: Record<string, string> = {
  admin: "from-purple-500 to-pink-500",
  business: "from-accent to-green-500",
  customer: "from-payafrika-500 to-sky",
  affiliate: "from-amber-500 to-orange-500",
}

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<AdminRoleGroup[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.roles()
      .then(setRoles)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Roles & Permissions</h1>
        <p className="text-muted-foreground">{roles.reduce((s, r) => s + r.count, 0)} users across {roles.length} roles</p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground text-sm">No roles found</div>
        ) : (
          roles.map((role, i) => (
            <motion.div key={role.role} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.08 }}>
              <Card className="hover:shadow-card-hover transition-all">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${roleColors[role.role] ?? "from-gray-500 to-gray-400"} flex items-center justify-center text-white font-bold`}>
                      {role.role.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold capitalize">{role.role}</p>
                      <p className="text-xs text-muted-foreground">{role.count} user{role.count !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {role.users.slice(0, 5).map((u) => (
                      <div key={u.id} className="flex items-center justify-between text-sm">
                        <span className="truncate">{u.fullName}</span>
                        <span className="text-xs text-muted-foreground truncate">{u.email}</span>
                      </div>
                    ))}
                    {role.users.length > 5 && (
                      <p className="text-xs text-muted-foreground">+{role.users.length - 5} more</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
