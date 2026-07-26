"use client"

import React, { useEffect, useState, useCallback, useMemo } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Users, UserPlus, UserCheck, UserX, Search, Shield, ShieldCheck, ShieldAlert,
  Mail, Phone, MapPin, Calendar, Clock, Globe, Wallet, CreditCard, Activity,
  Smartphone, Monitor, Laptop, Trash2, RefreshCw, Lock, Unlock, RotateCcw,
  Ban, CheckCircle, XCircle, ChevronLeft, ChevronRight, ChevronDown, MoreVertical,
  Download, Send, Plus, FileDown, AlertTriangle, TrendingUp, Eye, Settings,
} from "lucide-react"
import { adminUsersApi, type UserListItem, type UserDetail, type DashboardData, type UserActivity, type UserDevice, type UserTransaction } from "@/lib/admin-users-api"

const roleColors: Record<string, string> = {
  admin: "bg-red-500/10 text-red-500 border-red-500/20",
  super_admin: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  customer: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  business: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  affiliate: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  suspended: "bg-red-500/10 text-red-500 border-red-500/20",
  deleted: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  locked: "bg-orange-500/10 text-orange-500 border-orange-500/20",
}

const kycColors: Record<string, string> = {
  verified: "bg-emerald-500/10 text-emerald-500",
  pending: "bg-amber-500/10 text-amber-500",
  rejected: "bg-red-500/10 text-red-500",
  not_started: "bg-gray-500/10 text-gray-500",
}

function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    if (value === 0) { setDisplay(0); return }
    const duration = 800; const steps = 20; const inc = value / steps
    let cur = 0
    const t = setInterval(() => { cur += inc; if (cur >= value) { setDisplay(value); clearInterval(t) } else setDisplay(Math.floor(cur)) }, duration / steps)
    return () => clearInterval(t)
  }, [value])
  return <>{display.toLocaleString()}{suffix}</>
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleString("en-ZA", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

function Avatar({ name, url, className = "w-9 h-9 text-xs" }: { name: string; url?: string; className?: string }) {
  if (url) return <img src={url} alt="" className={`rounded-full object-cover ${className}`} />
  return <div className={`rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground flex items-center justify-center font-semibold ${className}`}>{getInitials(name)}</div>
}

export default function AdminUsersPage() {
  const [activeTab, setActiveTab] = useState("directory")
  const [users, setUsers] = useState<UserListItem[]>([])
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null)
  const [showProfile, setShowProfile] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [profileTab, setProfileTab] = useState("overview")
  const [activity, setActivity] = useState<UserActivity[]>([])
  const [devices, setDevices] = useState<UserDevice[]>([])
  const [transactions, setTransactions] = useState<UserTransaction[]>([])
  const [analytics, setAnalytics] = useState<{ dau: number; wau: number; mau: number; monthlyNew: { date: string; count: number }[]; countryDist: { label: string; value: number }[] } | null>(null)
  const [confirmAction, setConfirmAction] = useState<{ action: string; ids: string[] } | null>(null)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: "", fullName: "", role: "customer", country: "" })

  const limit = 50

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminUsersApi.list({ search, role: roleFilter || undefined, page, limit })
      setUsers(res.users)
      setTotal(res.total)
      setTotalPages(res.totalPages)
    } catch { /* ignore */ }
    setLoading(false)
  }, [search, roleFilter, page])

  useEffect(() => {
    if (activeTab === "directory") loadUsers()
    else if (activeTab === "dashboard") {
      adminUsersApi.dashboard().then(setDashboard).catch(() => {})
    } else if (activeTab === "analytics") {
      adminUsersApi.analytics().then(setAnalytics).catch(() => {})
    }
  }, [activeTab, loadUsers])

  const loadProfile = useCallback(async (id: string) => {
    try {
      const [user, acts, devs, txs] = await Promise.all([
        adminUsersApi.get(id),
        adminUsersApi.activity(id, 1, 20),
        adminUsersApi.devices(id),
        adminUsersApi.transactions(id, 1, 10),
      ])
      setSelectedUser(user)
      setActivity(acts.logs)
      setDevices(devs)
      setTransactions(txs.transactions)
      setShowProfile(true)
    } catch { /* ignore */ }
  }, [])

  const handleSuspend = async (id: string) => { await adminUsersApi.suspend(id); loadUsers() }
  const handleReactivate = async (id: string) => { await adminUsersApi.reactivate(id); loadUsers() }
  const handleDelete = async (id: string) => { await adminUsersApi.delete(id); loadUsers() }
  const handleRestore = async (id: string) => { await adminUsersApi.restore(id); loadUsers() }
  const handleResetPassword = async (id: string) => {
    try {
      const res = await adminUsersApi.resetPassword(id)
      alert(`Temporary password: ${res.temporaryPassword}`)
    } catch { /* ignore */ }
  }
  const handleVerifyEmail = async (id: string) => { await adminUsersApi.verifyEmail(id); loadUsers() }
  const handleLock = async (id: string) => { await adminUsersApi.lock(id); loadUsers() }
  const handleUnlock = async (id: string) => { await adminUsersApi.unlock(id); loadUsers() }

  const handleBulk = async () => {
    if (!confirmAction) return
    try {
      await adminUsersApi.bulk(confirmAction.ids, confirmAction.action)
      setSelectedIds(new Set())
      loadUsers()
    } catch { /* ignore */ }
    setConfirmAction(null)
  }

  const handleInvite = async () => {
    if (!inviteForm.email) return
    try {
      await adminUsersApi.invite(inviteForm)
      setShowInvite(false)
      setInviteForm({ email: "", fullName: "", role: "customer", country: "" })
    } catch { /* ignore */ }
  }

  const handleForceLogout = async (id: string) => { await adminUsersApi.forceLogout(id) }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === users.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(users.map((u) => u.id)))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-sm text-muted-foreground">Manage all platform users and accounts</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowInvite(true)}>
            <UserPlus className="w-4 h-4 mr-1" />Invite
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard">
            <Activity className="w-3.5 h-3.5 mr-1" />Dashboard
          </TabsTrigger>
          <TabsTrigger value="directory">
            <Users className="w-3.5 h-3.5 mr-1" />Directory
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <TrendingUp className="w-3.5 h-3.5 mr-1" />Analytics
          </TabsTrigger>
        </TabsList>

        {/* ─── Dashboard Tab ─── */}
        <TabsContent value="dashboard" className="space-y-6">
          {!dashboard ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Total Users", value: dashboard.total, icon: Users, color: "#3b82f6" },
                  { label: "Active (30d)", value: dashboard.active, icon: UserCheck, color: "#10b981" },
                  { label: "New Today", value: dashboard.newToday, icon: UserPlus, color: "#8b5cf6" },
                  { label: "Suspended", value: dashboard.suspended, icon: Ban, color: "#ef4444" },
                  { label: "Pending KYC", value: dashboard.pendingKyc, icon: ShieldAlert, color: "#f59e0b" },
                  { label: "Verified", value: dashboard.verified, icon: ShieldCheck, color: "#10b981" },
                  { label: "Deleted", value: dashboard.deleted, icon: Trash2, color: "#6b7280" },
                  { label: "Online Today", value: dashboard.newToday, icon: Users, color: "#06b6d4" },
                ].map((stat, i) => (
                  <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.04 }}>
                    <Card className="border-0 bg-gradient-to-br from-card to-muted/30 shadow-md">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">{stat.label}</span>
                          <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                        </div>
                        <div className="text-xl font-bold"><CountUp value={stat.value} /></div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Daily Registrations (30 days)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end gap-0.5 h-32">
                      {dashboard.dailyReg.map((d) => {
                        const max = Math.max(...dashboard.dailyReg.map((r) => r.count), 1)
                        return (
                          <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5">
                            <div
                              className="w-full rounded-t-sm bg-primary/60 hover:bg-primary transition-colors"
                              style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count > 0 ? 4 : 0 }}
                              title={`${d.date}: ${d.count}`}
                            />
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">User Type Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {dashboard.roleDist.map((r) => {
                        const max = Math.max(...dashboard.roleDist.map((d) => d.value), 1)
                        const pct = (r.value / max) * 100
                        return (
                          <div key={r.label} className="flex items-center gap-3">
                            <span className="text-xs w-20 truncate">{r.label || "unknown"}</span>
                            <div className="flex-1 h-5 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full bg-primary/60" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground w-10 text-right">{r.value}</span>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* ─── Directory Tab ─── */}
        <TabsContent value="directory" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1) }}>
              <SelectTrigger className="w-36"><SelectValue placeholder="All Roles" /></SelectTrigger>
              <SelectContent>
                <SelectItem value=" ">All Roles</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="business">Merchant</SelectItem>
                <SelectItem value="affiliate">Affiliate</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="locked">Locked</SelectItem>
                <SelectItem value="deleted">Deleted</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground self-center">{total} users</span>
          </div>

          {selectedIds.size > 0 && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
              <span className="text-sm font-medium">{selectedIds.size} selected</span>
              {["suspend", "activate", "delete", "restore", "verify_kyc", "lock"].map((action) => (
                <Button key={action} variant="outline" size="sm" onClick={() => setConfirmAction({ action, ids: Array.from(selectedIds) })}>
                  {action === "suspend" && <Ban className="w-3.5 h-3.5 mr-1" />}
                  {action === "activate" && <CheckCircle className="w-3.5 h-3.5 mr-1" />}
                  {action === "delete" && <Trash2 className="w-3.5 h-3.5 mr-1" />}
                  {action === "restore" && <RotateCcw className="w-3.5 h-3.5 mr-1" />}
                  {action === "verify_kyc" && <ShieldCheck className="w-3.5 h-3.5 mr-1" />}
                  {action === "lock" && <Lock className="w-3.5 h-3.5 mr-1" />}
                  {action.charAt(0).toUpperCase() + action.slice(1)}
                </Button>
              ))}
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                <XCircle className="w-3.5 h-3.5" />
              </Button>
            </motion.div>
          )}

          <div className="rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input type="checkbox" checked={selectedIds.size === users.length && users.length > 0} onChange={toggleSelectAll} className="rounded" />
                  </TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="hidden md:table-cell">KYC</TableHead>
                  <TableHead className="hidden lg:table-cell">Country</TableHead>
                  <TableHead className="hidden lg:table-cell">Wallet</TableHead>
                  <TableHead className="hidden md:table-cell">Joined</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}
                    </TableRow>
                  ))
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No users found</TableCell>
                  </TableRow>
                ) : (
                  users.map((user, i) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.15, delay: i * 0.015 }}
                      className="border-b border-border/50 hover:bg-muted/30 cursor-pointer"
                      onClick={() => loadProfile(user.id)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedIds.has(user.id)} onChange={() => toggleSelect(user.id)} className="rounded" />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar name={user.fullName} />
                          <div>
                            <p className="text-sm font-medium">{user.fullName}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] font-medium ${roleColors[user.role] || ""}`}>{user.role}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="secondary" className={`text-[10px] ${kycColors[user.kycStatus || ""] || ""}`}>{user.kycStatus || "—"}</Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{user.country || "—"}</TableCell>
                      <TableCell className="hidden lg:table-cell text-xs font-medium">R {(user.walletBalance || 0).toLocaleString()}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{formatDate(user.createdAt)}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          {user.role === "suspended" ? (
                            <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => handleReactivate(user.id)} title="Reactivate"><UserCheck className="w-3.5 h-3.5 text-emerald-500" /></Button>
                          ) : user.role === "deleted" ? (
                            <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => handleRestore(user.id)} title="Restore"><RotateCcw className="w-3.5 h-3.5 text-blue-500" /></Button>
                          ) : (
                            <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => handleSuspend(user.id)} title="Suspend"><Ban className="w-3.5 h-3.5 text-amber-500" /></Button>
                          )}
                          <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => handleDelete(user.id)} title="Delete"><Trash2 className="w-3.5 h-3.5 text-red-400" /></Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ─── Analytics Tab ─── */}
        <TabsContent value="analytics" className="space-y-6">
          {!analytics ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Daily Active (DAU)", value: analytics.dau, icon: Activity, color: "#3b82f6" },
                  { label: "Weekly Active (WAU)", value: analytics.wau, icon: Users, color: "#10b981" },
                  { label: "Monthly Active (MAU)", value: analytics.mau, icon: UserCheck, color: "#8b5cf6" },
                  { label: "Total Registered", value: analytics.total, icon: Users, color: "#f59e0b" },
                ].map((stat, i) => (
                  <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.05 }}>
                    <Card className="border-0 bg-gradient-to-br from-card to-muted/30 shadow-md">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">{stat.label}</span>
                          <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                        </div>
                        <div className="text-xl font-bold"><CountUp value={stat.value} /></div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Monthly Registrations</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex items-end gap-1 h-32">
                      {analytics.monthlyNew.map((m) => {
                        const max = Math.max(...analytics.monthlyNew.map((r) => r.count), 1)
                        return (
                          <div key={m.date} className="flex-1 flex flex-col items-center gap-0.5">
                            <div className="w-full rounded-t-sm bg-primary/60" style={{ height: `${(m.count / max) * 100}%`, minHeight: m.count > 0 ? 4 : 0 }} title={`${m.date}: ${m.count}`} />
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Top Countries</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {analytics.countryDist.map((c) => {
                        const max = Math.max(...analytics.countryDist.map((d) => d.value), 1)
                        return (
                          <div key={c.label} className="flex items-center gap-3">
                            <span className="text-xs w-20">{c.label}</span>
                            <div className="flex-1 h-5 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full bg-primary/60" style={{ width: `${(c.value / max) * 100}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground">{c.value}</span>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* ─── User Profile Dialog ─── */}
      <Dialog open={showProfile} onOpenChange={setShowProfile}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {selectedUser && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Avatar name={selectedUser.fullName} url={selectedUser.avatarUrl} className="w-10 h-10 text-sm" />
                  <div>
                    <span>{selectedUser.fullName}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className={`text-[10px] ${roleColors[selectedUser.role] || ""}`}>{selectedUser.role}</Badge>
                      <span className="text-xs text-muted-foreground">ID: {selectedUser.id.slice(0, 8)}</span>
                    </div>
                  </div>
                </DialogTitle>
                <DialogDescription className="sr-only">User profile details</DialogDescription>
              </DialogHeader>

              <div className="flex items-center gap-2 pb-3 border-b">
                {selectedUser.role === "suspended" ? (
                  <Button size="sm" variant="outline" onClick={() => handleReactivate(selectedUser.id)}><UserCheck className="w-3.5 h-3.5 mr-1" />Reactivate</Button>
                ) : selectedUser.role === "deleted" ? (
                  <Button size="sm" variant="outline" onClick={() => handleRestore(selectedUser.id)}><RotateCcw className="w-3.5 h-3.5 mr-1" />Restore</Button>
                ) : (
                  <>
                    <Button size="sm" variant="outline" onClick={() => handleSuspend(selectedUser.id)}><Ban className="w-3.5 h-3.5 mr-1" />Suspend</Button>
                    <Button size="sm" variant="outline" onClick={() => handleLock(selectedUser.id)}><Lock className="w-3.5 h-3.5 mr-1" />Lock</Button>
                  </>
                )}
                <Button size="sm" variant="outline" onClick={() => handleResetPassword(selectedUser.id)}><RefreshCw className="w-3.5 h-3.5 mr-1" />Reset Password</Button>
                <Button size="sm" variant="outline" onClick={() => handleVerifyEmail(selectedUser.id)}><Mail className="w-3.5 h-3.5 mr-1" />Verify Email</Button>
                {selectedUser.role !== "deleted" && selectedUser.role !== "suspended" && (
                  <Button size="sm" variant="outline" onClick={() => handleDelete(selectedUser.id)}><Trash2 className="w-3.5 h-3.5 mr-1 text-red-400" />Delete</Button>
                )}
              </div>

              <Tabs value={profileTab} onValueChange={setProfileTab}>
                <TabsList className="flex-wrap h-auto">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="wallet">Wallet</TabsTrigger>
                  <TabsTrigger value="transactions">Transactions</TabsTrigger>
                  <TabsTrigger value="devices">Devices</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Mail className="w-3 h-3" /> Email</div>
                      <p className="text-sm">{selectedUser.email}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Phone className="w-3 h-3" /> Phone</div>
                      <p className="text-sm">{selectedUser.phoneNumber || "—"}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground"><MapPin className="w-3 h-3" /> Country</div>
                      <p className="text-sm">{selectedUser.country || "—"}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Calendar className="w-3 h-3" /> Joined</div>
                      <p className="text-sm">{formatDateTime(selectedUser.createdAt)}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Shield className="w-3 h-3" /> Email Verified</div>
                      <Badge variant={selectedUser.isEmailVerified ? "default" : "secondary"} className="text-[10px]">{selectedUser.isEmailVerified ? "Yes" : "No"}</Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Shield className="w-3 h-3" /> 2FA</div>
                      <Badge variant={selectedUser.twoFactorEnabled ? "default" : "secondary"} className="text-[10px]">{selectedUser.twoFactorEnabled ? "Enabled" : "Disabled"}</Badge>
                    </div>
                  </div>

                  {selectedUser.business && (
                    <div className="rounded-lg border p-4 space-y-2">
                      <h4 className="text-sm font-semibold">Business Info</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="text-muted-foreground">Name:</span> {selectedUser.business.businessName || "—"}</div>
                        <div><span className="text-muted-foreground">Reg#:</span> {selectedUser.business.registrationNumber || "—"}</div>
                        <div><span className="text-muted-foreground">VAT:</span> {selectedUser.business.vatNumber || "—"}</div>
                        <div><span className="text-muted-foreground">Industry:</span> {selectedUser.business.industry || "—"}</div>
                        <div><span className="text-muted-foreground">Settlement:</span> {selectedUser.business.settlementPreference || "—"}</div>
                      </div>
                    </div>
                  )}

                  {selectedUser.roles && selectedUser.roles.length > 0 && (
                    <div className="rounded-lg border p-4 space-y-2">
                      <h4 className="text-sm font-semibold">Assigned Roles</h4>
                      {selectedUser.roles.map((r, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <Badge variant="outline" className="text-[10px]" style={{ borderColor: r.color }}>{r.name}</Badge>
                          {r.department && <span className="text-muted-foreground">{r.department}</span>}
                          {r.region && <span className="text-muted-foreground">{r.region}</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedUser.stats && (
                    <div className="grid grid-cols-3 gap-3">
                      <Card><CardContent className="p-3 text-center"><p className="text-lg font-bold">{selectedUser.stats.txCount}</p><p className="text-xs text-muted-foreground">Transactions</p></CardContent></Card>
                      <Card><CardContent className="p-3 text-center"><p className="text-lg font-bold">{selectedUser.stats.deviceCount}</p><p className="text-xs text-muted-foreground">Devices</p></CardContent></Card>
                      <Card><CardContent className="p-3 text-center"><p className="text-lg font-bold">{selectedUser.stats.ticketCount}</p><p className="text-xs text-muted-foreground">Tickets</p></CardContent></Card>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="wallet" className="space-y-4 pt-4">
                  {selectedUser.wallet ? (
                    <div className="grid grid-cols-3 gap-3">
                      <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-emerald-500">R {selectedUser.wallet.balance.toLocaleString()}</p><p className="text-xs text-muted-foreground">Balance ({selectedUser.wallet.currency})</p></CardContent></Card>
                    </div>
                  ) : <p className="text-sm text-muted-foreground py-8 text-center">No wallet found</p>}
                  {selectedUser.walletBalances && selectedUser.walletBalances.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Currency Balances</h4>
                      {selectedUser.walletBalances.map((wb, i) => (
                        <div key={i} className="flex justify-between text-sm p-2 rounded-lg bg-muted/30">
                          <span className="font-medium">{wb.currency}</span>
                          <span>R {wb.balance.toLocaleString()} (Reserved: R {wb.reservedBalance.toLocaleString()})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="transactions" className="space-y-4 pt-4">
                  {transactions.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">No transactions</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((tx) => (
                          <TableRow key={tx.id}>
                            <TableCell className="text-xs">{formatDate(tx.createdAt)}</TableCell>
                            <TableCell><Badge variant="secondary" className="text-[10px]">{tx.type}</Badge></TableCell>
                            <TableCell className="text-xs font-medium">R {tx.amount.toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge variant={tx.status === "completed" ? "default" : tx.status === "failed" ? "destructive" : "secondary"} className="text-[10px]">{tx.status}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>

                <TabsContent value="devices" className="space-y-4 pt-4">
                  {devices.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">No devices found</p>
                  ) : (
                    <div className="space-y-2">
                      {devices.map((d) => (
                        <div key={d.id} className="flex items-center justify-between p-3 rounded-lg border">
                          <div className="flex items-center gap-3">
                            {d.deviceType === "mobile" ? <Smartphone className="w-4 h-4 text-muted-foreground" /> : d.deviceType === "tablet" ? <Monitor className="w-4 h-4 text-muted-foreground" /> : <Laptop className="w-4 h-4 text-muted-foreground" />}
                            <div>
                              <p className="text-sm font-medium">{d.deviceName} {d.isCurrent && <Badge variant="default" className="text-[10px] ml-1">Current</Badge>}</p>
                              <p className="text-xs text-muted-foreground">{d.browser} on {d.os} · {d.ipAddress} · {d.location}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{formatDateTime(d.lastActiveAt)}</span>
                            <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => adminUsersApi.removeDevice(selectedUser.id, d.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                          </div>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={() => handleForceLogout(selectedUser.id)}><RefreshCw className="w-3.5 h-3.5 mr-1" />Force Logout All</Button>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="activity" className="space-y-4 pt-4">
                  {activity.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">No activity found</p>
                  ) : (
                    <div className="space-y-1">
                      {activity.map((a) => (
                        <div key={a.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/30">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium">{a.action}</p>
                            <p className="text-[10px] text-muted-foreground">{a.category} · {a.ipAddress || "—"}</p>
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0">{formatDateTime(a.createdAt)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Confirmation Dialog ─── */}
      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm {confirmAction?.action}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This will apply &quot;{confirmAction?.action}&quot; to {confirmAction?.ids.length} user(s). Are you sure?</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmAction(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleBulk}>Confirm</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Invite Dialog ─── */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Email *</label>
              <Input value={inviteForm.email} onChange={(e) => setInviteForm((p) => ({ ...p, email: e.target.value }))} placeholder="user@example.com" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Full Name</label>
              <Input value={inviteForm.fullName} onChange={(e) => setInviteForm((p) => ({ ...p, fullName: e.target.value }))} placeholder="John Doe" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Role</label>
                <Select value={inviteForm.role} onValueChange={(v) => setInviteForm((p) => ({ ...p, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="business">Merchant</SelectItem>
                    <SelectItem value="affiliate">Affiliate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Country</label>
                <Select value={inviteForm.country} onValueChange={(v) => setInviteForm((p) => ({ ...p, country: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ZA">South Africa</SelectItem>
                    <SelectItem value="NG">Nigeria</SelectItem>
                    <SelectItem value="KE">Kenya</SelectItem>
                    <SelectItem value="GH">Ghana</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button className="w-full" onClick={handleInvite} disabled={!inviteForm.email}>
              <Send className="w-4 h-4 mr-1" />Send Invitation
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
