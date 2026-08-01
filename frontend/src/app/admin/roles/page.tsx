"use client"

import React, { useEffect, useState, useCallback } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { rbacApi, type RoleDefinition, type Permission, type UserAssignment, type Invitation, type RoleDashboard } from "@/lib/rbac-api"
import { Shield, Users, UserPlus, Settings, Copy, Plus, Pencil, Trash2, RefreshCw, Search, Check, X, Mail, Clock, Globe, Monitor, Smartphone, Laptop, Key, Fingerprint, Calendar, AlertTriangle, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, LucideIcon } from "lucide-react"

const moduleIcons: Record<string, typeof Shield> = {
  dashboard: Monitor, users: Users, roles: Shield, payments: Globe,
  kyc: Fingerprint, reports: Settings, affiliates: Users, cms: Settings,
  tickets: Mail, loans: Globe, settings: Settings,
}

const defaultColors = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444", "#14b8a6"]
const defaultIcons = ["Shield", "Users", "Settings", "Key", "Globe", "Monitor", "Smartphone", "Laptop"]

function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    if (value === 0) { setDisplay(0); return }
    const duration = 800
    const steps = 20
    const increment = value / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= value) { setDisplay(value); clearInterval(timer) }
      else setDisplay(Math.floor(current))
    }, duration / steps)
    return () => clearInterval(timer)
  }, [value])
  return <>{display.toLocaleString()}{suffix}</>
}

function getModuleActions(permissions: Permission[]): Record<string, Permission[]> {
  const grouped: Record<string, Permission[]> = {}
  for (const p of permissions) {
    if (!grouped[p.module]) grouped[p.module] = []
    grouped[p.module].push(p)
  }
  return grouped
}

function hasPermission(rolePerms: { module: string; action: string }[], module: string, action: string): boolean {
  return rolePerms.some((p) => p.module === module && p.action === action)
}

function RolePermissionMatrix({
  permissions,
  selected,
  onChange,
}: {
  permissions: Permission[]
  selected: { module: string; action: string }[]
  onChange: (perms: { module: string; action: string }[]) => void
}) {
  const grouped = getModuleActions(permissions)

  const togglePermission = (module: string, action: string) => {
    const exists = hasPermission(selected, module, action)
    if (exists) onChange(selected.filter((p) => !(p.module === module && p.action === action)))
    else onChange([...selected, { module, action }])
  }

  const toggleModule = (module: string, perms: Permission[]) => {
    const allSelected = perms.every((p) => hasPermission(selected, module, p.action))
    if (allSelected) onChange(selected.filter((p) => p.module !== module))
    else {
      const existing = selected.filter((p) => p.module !== module)
      onChange([...existing, ...perms.map((p) => ({ module, action: p.action }))])
    }
  }

  const moduleEntries = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b))

  return (
    <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
      {moduleEntries.map(([module, perms]) => {
        const allSelected = perms.every((p) => hasPermission(selected, module, p.action))
        const someSelected = perms.some((p) => hasPermission(selected, module, p.action))
        return (
          <div key={module} className="border rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected }}
                onChange={() => toggleModule(module, perms)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm font-medium capitalize">{module.replace(/_/g, " ")}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 ml-6">
              {perms.sort((a, b) => a.sortOrder - b.sortOrder).map((p) => (
                <label key={p.id} className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasPermission(selected, module, p.action)}
                    onChange={() => togglePermission(module, p.action)}
                    className="h-3.5 w-3.5 rounded border-gray-300"
                  />
                  <span className="text-muted-foreground">{p.action.replace(/_/g, " ")}</span>
                </label>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function StatsCard({
  label,
  value,
  icon: Icon,
  delay,
}: {
  label: string
  value: number
  icon: LucideIcon
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <Card className="hover:shadow-card-hover transition-all">
        <CardContent className="p-5 flex items-start gap-4">
          <div className="h-10 w-10 rounded-xl gradient-bg flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold"><CountUp value={value} /></p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default function AdminRolesPage() {
  const [activeTab, setActiveTab] = useState("roles")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">Roles & Permissions</h1>
          <p className="text-muted-foreground">Manage roles, permissions, assignments, and invitations.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="roles"><Shield className="mr-2 h-4 w-4" />Roles</TabsTrigger>
          <TabsTrigger value="assignments"><Users className="mr-2 h-4 w-4" />Assignments</TabsTrigger>
          <TabsTrigger value="invitations"><Mail className="mr-2 h-4 w-4" />Invitations</TabsTrigger>
          <TabsTrigger value="permissions"><Key className="mr-2 h-4 w-4" />Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-6"><RolesTab /></TabsContent>
        <TabsContent value="assignments" className="space-y-6"><AssignmentsTab /></TabsContent>
        <TabsContent value="invitations" className="space-y-6"><InvitationsTab /></TabsContent>
        <TabsContent value="permissions" className="space-y-6"><PermissionsTab /></TabsContent>
      </Tabs>
    </div>
  )
}

function RolesTab() {
  const [roles, setRoles] = useState<RoleDefinition[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [dashboard, setDashboard] = useState<RoleDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [editingRole, setEditingRole] = useState<RoleDefinition | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showDetail, setShowDetail] = useState<RoleDefinition | null>(null)
  const [detailAssignments, setDetailAssignments] = useState<UserAssignment[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "", description: "", department: "", color: "#6366f1", icon: "Shield",
    priority: 0, parentRoleId: "",
  })
  const [formPermissions, setFormPermissions] = useState<{ module: string; action: string }[]>([])

  const fetchData = useCallback(() => {
    setLoading(true)
    setError("")
    Promise.all([
      rbacApi.getAll(),
      rbacApi.permissions(),
      rbacApi.dashboard(),
    ])
      .then(([r, p, d]) => { setRoles(r); setPermissions(p); setDashboard(d) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const resetForm = () => {
    setFormData({ name: "", description: "", department: "", color: "#6366f1", icon: "Shield", priority: 0, parentRoleId: "" })
    setFormPermissions([])
    setEditingRole(null)
  }

  const openCreate = () => {
    resetForm()
    setShowCreateDialog(true)
  }

  const openEdit = (role: RoleDefinition) => {
    setEditingRole(role)
    setFormData({
      name: role.name, description: role.description, department: role.department || "",
      color: role.color || "#6366f1", icon: role.icon || "Shield",
      priority: role.priority, parentRoleId: role.parentRoleId || "",
    })
    setFormPermissions(role.permissions || [])
    setShowCreateDialog(true)
  }

  const handleSave = () => {
    const data = {
      name: formData.name,
      description: formData.description || undefined,
      department: formData.department || undefined,
      color: formData.color,
      icon: formData.icon,
      priority: formData.priority,
      parentRoleId: formData.parentRoleId || undefined,
      permissions: formPermissions,
    }
    const action = editingRole
      ? rbacApi.update(editingRole.id, data)
      : rbacApi.create(data)

    action
      .then(() => { setShowCreateDialog(false); resetForm(); fetchData() })
      .catch(() => {})
  }

  const handleClone = (id: string) => {
    rbacApi.clone(id).then(() => fetchData()).catch(() => {})
  }

  const handleDelete = (id: string) => {
    rbacApi.delete(id).then(() => fetchData()).catch(() => {})
  }

  const openDetail = (role: RoleDefinition) => {
    setShowDetail(role)
    setDetailLoading(true)
    rbacApi.assignments(role.id)
      .then(setDetailAssignments)
      .catch(() => setDetailAssignments([]))
      .finally(() => setDetailLoading(false))
  }

  const filteredRoles = roles.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.description?.toLowerCase().includes(search.toLowerCase()) ||
      r.department?.toLowerCase().includes(search.toLowerCase())
  )

  const dashboardStats = dashboard
    ? [
        { label: "Total Roles", value: dashboard.totalRoles, icon: Shield },
        { label: "Custom Roles", value: dashboard.customRoles, icon: Settings },
        { label: "Active Admins", value: dashboard.activeAdmins, icon: Users },
        { label: "Pending Invites", value: dashboard.pendingInvites, icon: Mail },
        { label: "System Roles", value: dashboard.systemRoles, icon: Key },
        { label: "Recently Modified", value: dashboard.recentlyModified, icon: RefreshCw },
        { label: "Privileged", value: dashboard.privileged, icon: Fingerprint },
        { label: "Inactive Users", value: dashboard.inactiveUsers, icon: AlertTriangle },
      ]
    : []

  if (loading && roles.length === 0) {
    return (
      <div className="space-y-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4,5,6,7,8].map((i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-10 w-16" /><Skeleton className="h-4 w-24 mt-2" /></CardContent></Card>
          ))}
        </div>
        <Skeleton className="h-10 w-48" />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map((i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (error && roles.length === 0) {
    return <div className="text-center py-12 text-destructive">{error}</div>
  }

  return (
    <>
      {dashboardStats.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {dashboardStats.map((stat, i) => (
            <StatsCard key={stat.label} label={stat.label} value={stat.value} icon={stat.icon} delay={i * 0.05} />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search roles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
          <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Create Role</Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRoles.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground text-sm">
            {search ? "No roles match your search." : "No roles created yet."}
          </div>
        ) : (
          filteredRoles.map((role, i) => (
            <motion.div
              key={role.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
            >
              <Card
                className="hover:shadow-card-hover transition-all cursor-pointer"
                onClick={() => openDetail(role)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                        style={{ background: role.color || "#6366f1" }}
                      >
                        {role.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{role.name}</p>
                        <p className="text-xs text-muted-foreground">{role.department || "No department"}</p>
                      </div>
                    </div>
                    {role.isSystem && <Badge variant="secondary" className="text-[10px]">System</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3 min-h-[2rem]">
                    {role.description || "No description"}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{role.permissions?.length || 0} permission{(role.permissions?.length || 0) !== 1 ? "s" : ""}</span>
                    <span>{role.userCount} user{(role.userCount || 0) !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex gap-1.5 mt-3 pt-3 border-t">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); openEdit(role) }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); handleClone(role.id) }}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    {!role.isSystem && (
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(role.id) }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateDialog(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-background border rounded-2xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 pb-2">
              <h2 className="text-lg font-semibold">{editingRole ? "Edit Role" : "Create Role"}</h2>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setShowCreateDialog(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6 pt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Name</label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Role name" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Department</label>
                  <Input value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} placeholder="Department" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Description</label>
                <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Role description" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Color</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {defaultColors.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`h-7 w-7 rounded-lg border-2 ${formData.color === c ? "border-foreground" : "border-transparent"}`}
                        style={{ background: c }}
                        onClick={() => setFormData({ ...formData, color: c })}
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Icon</label>
                  <Select value={formData.icon} onValueChange={(v) => setFormData({ ...formData, icon: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {defaultIcons.map((ic) => (
                        <SelectItem key={ic} value={ic}>{ic}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Priority</label>
                  <Input type="number" value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Parent Role</label>
                <Select value={formData.parentRoleId} onValueChange={(v) => setFormData({ ...formData, parentRoleId: v })}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value=" ">None</SelectItem>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium">Permissions</label>
                <RolePermissionMatrix
                  permissions={permissions}
                  selected={formPermissions}
                  onChange={setFormPermissions}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-6 pt-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={!formData.name}>{editingRole ? "Update" : "Create"}</Button>
            </div>
          </motion.div>
        </div>
      )}

      {showDetail && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" onClick={() => setShowDetail(null)}>
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="w-full max-w-lg bg-background border-l h-full overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-background border-b z-10 flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold"
                  style={{ background: showDetail.color || "#6366f1" }}
                >
                  {showDetail.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-semibold">{showDetail.name}</h2>
                  <p className="text-xs text-muted-foreground">{showDetail.department || "No department"}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setShowDetail(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Description</p>
                <p className="text-sm">{showDetail.description || "No description"}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">Users</p>
                  <p className="text-lg font-bold">{showDetail.userCount}</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">Permissions</p>
                  <p className="text-lg font-bold">{showDetail.permissions?.length || 0}</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">Priority</p>
                  <p className="text-lg font-bold">{showDetail.priority}</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">System</p>
                  <p className="text-lg font-bold">{showDetail.isSystem ? "Yes" : "No"}</p>
                </div>
              </div>
              {showDetail.parentRoleId && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Parent Role</p>
                  <p className="text-sm">{roles.find((r) => r.id === showDetail.parentRoleId)?.name || showDetail.parentRoleId}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium mb-2">Permissions</p>
                {showDetail.permissions && showDetail.permissions.length > 0 ? (
                  <div className="space-y-1.5">
                    {Object.entries(
                      showDetail.permissions.reduce<Record<string, string[]>>((acc, p) => {
                        if (!acc[p.module]) acc[p.module] = []
                        acc[p.module].push(p.action)
                        return acc
                      }, {})
                    ).map(([module, actions]) => (
                      <div key={module} className="bg-muted/50 rounded-xl p-3">
                        <p className="text-xs font-medium capitalize mb-1">{module.replace(/_/g, " ")}</p>
                        <div className="flex flex-wrap gap-1">
                          {actions.map((a) => (
                            <Badge key={a} variant="secondary" className="text-[10px]">{a.replace(/_/g, " ")}</Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No permissions assigned</p>
                )}
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Assigned Users</p>
                {detailLoading ? (
                  <div className="space-y-2">
                    {[1,2,3].map((i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
                  </div>
                ) : detailAssignments.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No users assigned to this role.</p>
                ) : (
                  <div className="space-y-1.5">
                    {detailAssignments.map((a) => (
                      <div key={a.id} className="flex items-center justify-between bg-muted/50 rounded-xl p-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full gradient-bg flex items-center justify-center text-white font-semibold text-xs">
                            {a.user.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{a.user.fullName}</p>
                            <p className="text-xs text-muted-foreground">{a.user.email}</p>
                          </div>
                        </div>
                        <Badge variant={a.status === "active" ? "success" : "secondary"} className="text-[10px]">{a.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </>
  )
}

function AssignmentsTab() {
  const [assignments, setAssignments] = useState<UserAssignment[]>([])
  const [roles, setRoles] = useState<RoleDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [assignForm, setAssignForm] = useState({
    userId: "", roleId: "", department: "", region: "", expiresAt: "", notes: "",
  })
  const [selectedRole, setSelectedRole] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")

  const fetchData = useCallback(() => {
    setLoading(true)
    setError("")
    Promise.all([
      rbacApi.assignments(),
      rbacApi.getAll(),
    ])
      .then(([a, r]) => { setAssignments(a); setRoles(r) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleAssign = () => {
    rbacApi.assign({
      userId: assignForm.userId,
      roleId: assignForm.roleId,
      department: assignForm.department || undefined,
      region: assignForm.region || undefined,
      expiresAt: assignForm.expiresAt || undefined,
      notes: assignForm.notes || undefined,
    })
      .then(() => { setShowAssignDialog(false); setAssignForm({ userId: "", roleId: "", department: "", region: "", expiresAt: "", notes: "" }); fetchData() })
      .catch(() => {})
  }

  const handleRemove = (assignmentId: string) => {
    rbacApi.removeAssignment(assignmentId)
      .then(() => fetchData())
      .catch(() => {})
  }

  const filteredAssignments = assignments.filter((a) => {
    if (selectedRole !== "all" && a.roleId !== selectedRole) return false
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      return (
        a.user.fullName.toLowerCase().includes(q) ||
        a.user.email.toLowerCase().includes(q) ||
        a.department?.toLowerCase().includes(q)
      )
    }
    return true
  })

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-24" />
        </div>
        {[1,2,3,4].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
    )
  }

  if (error) return <div className="text-center py-12 text-destructive">{error}</div>

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-3 flex-wrap">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All Roles" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {roles.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
          <Button size="sm" onClick={() => setShowAssignDialog(true)}><UserPlus className="h-4 w-4 mr-1" />Assign User</Button>
        </div>
      </div>

      {filteredAssignments.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">No assignments found.</div>
      ) : (
        <div className="space-y-2">
          {filteredAssignments.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.03 }}
              className="flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:shadow-card-hover transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full gradient-bg flex items-center justify-center text-white font-semibold text-sm">
                  {a.user.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-sm">{a.user.fullName}</p>
                  <p className="text-xs text-muted-foreground">{a.user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <Badge
                  className="text-[10px] text-white"
                  style={{ background: a.role.color || "#6366f1" }}
                >
                  {a.role.name}
                </Badge>
                <Badge variant={a.status === "active" ? "success" : "secondary"} className="text-[10px]">{a.status}</Badge>
                {a.department && <span className="text-xs text-muted-foreground">{a.department}</span>}
                {a.region && <span className="text-xs text-muted-foreground">{a.region}</span>}
                {a.expiresAt && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />{new Date(a.expiresAt).toLocaleDateString()}
                  </span>
                )}
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => handleRemove(a.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {showAssignDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowAssignDialog(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-background border rounded-2xl shadow-lg w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 pb-2">
              <h2 className="text-lg font-semibold">Assign User</h2>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setShowAssignDialog(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6 pt-4 space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">User Email or ID</label>
                <Input value={assignForm.userId} onChange={(e) => setAssignForm({ ...assignForm, userId: e.target.value })} placeholder="user@example.com" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Role</label>
                <Select value={assignForm.roleId} onValueChange={(v) => setAssignForm({ ...assignForm, roleId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Department</label>
                  <Input value={assignForm.department} onChange={(e) => setAssignForm({ ...assignForm, department: e.target.value })} placeholder="Department" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Region</label>
                  <Input value={assignForm.region} onChange={(e) => setAssignForm({ ...assignForm, region: e.target.value })} placeholder="Region" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Expires At</label>
                <Input type="date" value={assignForm.expiresAt} onChange={(e) => setAssignForm({ ...assignForm, expiresAt: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Notes</label>
                <Textarea value={assignForm.notes} onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })} placeholder="Optional notes" />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-6 pt-2">
              <Button variant="outline" onClick={() => setShowAssignDialog(false)}>Cancel</Button>
              <Button onClick={handleAssign} disabled={!assignForm.userId || !assignForm.roleId}>Assign</Button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  )
}

function InvitationsTab() {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [roles, setRoles] = useState<RoleDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: "", roleId: "", department: "" })

  const fetchData = useCallback(() => {
    setLoading(true)
    setError("")
    Promise.all([
      rbacApi.invitations(),
      rbacApi.getAll(),
    ])
      .then(([i, r]) => { setInvitations(i); setRoles(r) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleInvite = () => {
    rbacApi.invite({
      email: inviteForm.email,
      roleId: inviteForm.roleId,
      department: inviteForm.department || undefined,
    })
      .then(() => { setShowInviteDialog(false); setInviteForm({ email: "", roleId: "", department: "" }); fetchData() })
      .catch(() => {})
  }

  const handleCancel = (id: string) => {
    rbacApi.cancelInvitation(id)
      .then(() => fetchData())
      .catch(() => {})
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-32" />
        {[1,2,3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
    )
  }

  if (error) return <div className="text-center py-12 text-destructive">{error}</div>

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-muted-foreground">{invitations.length} invitation{invitations.length !== 1 ? "s" : ""}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
          <Button size="sm" onClick={() => setShowInviteDialog(true)}><Mail className="h-4 w-4 mr-1" />Invite User</Button>
        </div>
      </div>

      {invitations.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">No invitations sent yet.</div>
      ) : (
        <div className="space-y-2">
          {invitations.map((inv, i) => (
            <motion.div
              key={inv.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.03 }}
              className="flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:shadow-card-hover transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-sm">{inv.email}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {inv.department && <span>{inv.department}</span>}
                    <span>{new Date(inv.createdAt).toLocaleDateString()}</span>
                    {inv.expiresAt && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />{new Date(inv.expiresAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={inv.status === "pending" ? "secondary" : "success"} className="text-[10px]">{inv.status}</Badge>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => handleCancel(inv.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {showInviteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowInviteDialog(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-background border rounded-2xl shadow-lg w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 pb-2">
              <h2 className="text-lg font-semibold">Invite User</h2>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setShowInviteDialog(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6 pt-4 space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Email</label>
                <Input type="email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} placeholder="user@example.com" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Role</label>
                <Select value={inviteForm.roleId} onValueChange={(v) => setInviteForm({ ...inviteForm, roleId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Department</label>
                <Input value={inviteForm.department} onChange={(e) => setInviteForm({ ...inviteForm, department: e.target.value })} placeholder="Department" />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-6 pt-2">
              <Button variant="outline" onClick={() => setShowInviteDialog(false)}>Cancel</Button>
              <Button onClick={handleInvite} disabled={!inviteForm.email || !inviteForm.roleId}>Send Invitation</Button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  )
}

function PermissionsTab() {
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")

  const fetchData = useCallback(() => {
    setLoading(true)
    setError("")
    rbacApi.permissions()
      .then(setPermissions)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const grouped = getModuleActions(permissions)
  const filteredEntries = Object.entries(grouped).filter(([module]) =>
    module.toLowerCase().includes(search.toLowerCase())
  ).sort(([a], [b]) => a.localeCompare(b))

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        {[1,2,3,4].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
      </div>
    )
  }

  if (error) return <div className="text-center py-12 text-destructive">{error}</div>

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search modules..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
      </div>

      {filteredEntries.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {search ? "No modules match your search." : "No permissions defined yet."}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filteredEntries.map(([module, perms], i) => (
            <motion.div
              key={module}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.03 }}
            >
              <Card className="hover:shadow-card-hover transition-all">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium capitalize flex items-center gap-2">
                    {moduleIcons[module] ? (
                      <span className="h-6 w-6 rounded-lg gradient-bg flex items-center justify-center">
                        {React.createElement(moduleIcons[module], { className: "h-3.5 w-3.5 text-white" })}
                      </span>
                    ) : (
                      <span className="h-6 w-6 rounded-lg bg-muted flex items-center justify-center text-xs">M</span>
                    )}
                    {module.replace(/_/g, " ")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    {perms.sort((a, b) => a.sortOrder - b.sortOrder).map((p) => (
                      <Badge key={p.id} variant="outline" className="text-[10px]">
                        {p.action.replace(/_/g, " ")}
                        {p.description && (
                          <span className="ml-1 text-muted-foreground">- {p.description}</span>
                        )}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </>
  )
}
