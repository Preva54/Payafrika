"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Key, Edit, Plus } from "lucide-react"

const roles = [
  {
    name: "Super Admin",
    users: 3,
    permissions: ["All Access"],
    color: "from-purple-500 to-pink-500",
  },
  {
    name: "Admin",
    users: 8,
    permissions: ["Users", "Loans", "KYC", "Payments", "Tickets", "Content"],
    color: "from-payafrika-500 to-sky",
  },
  {
    name: "Moderator",
    users: 12,
    permissions: ["KYC Review", "Tickets", "Content"],
    color: "from-accent to-green-500",
  },
  {
    name: "Support Agent",
    users: 15,
    permissions: ["Tickets", "Read Users", "Read Loans"],
    color: "from-amber-500 to-orange-500",
  },
  {
    name: "Analyst",
    users: 5,
    permissions: ["Read Reports", "Read Analytics"],
    color: "from-gray-500 to-gray-400",
  },
  {
    name: "Finance",
    users: 4,
    permissions: ["Payments", "Loans", "Refunds", "Reports"],
    color: "from-emerald-500 to-teal-500",
  },
]

const allPermissions = [
  "Users", "Loans", "KYC", "Payments", "Tickets", "Content",
  "Reports", "Analytics", "Affiliates", "Audit Logs", "Roles",
  "Settings", "Refunds", "Blog", "CMS",
]

export default function AdminRolesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">Roles & Permissions</h1>
          <p className="text-muted-foreground">Define user roles and access levels.</p>
        </div>
        <Button variant="gradient">
          <Plus className="mr-2 h-4 w-4" />
          New Role
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map((role) => (
          <Card key={role.name} className="hover:shadow-card-hover transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${role.color} flex items-center justify-center`}>
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold">{role.name}</p>
                    <p className="text-xs text-muted-foreground">{role.users} users</p>
                  </div>
                </div>
                <button className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-secondary">
                  <Edit className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-2">
                {role.permissions.map((perm) => (
                  <div key={perm} className="flex items-center gap-2 text-sm">
                    <Key className="h-3 w-3 text-primary" />
                    <span>{perm}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Available Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {allPermissions.map((perm) => (
              <Badge key={perm} variant="secondary" className="text-xs px-3 py-1.5">
                {perm}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
