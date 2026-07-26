"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { adminAffiliateApi, type Affiliate, type Payout, type FraudFlag, type Commission, type CommissionRule, type AffiliateCampaign, type LeaderboardEntry, type BonusAward, type MarketingAsset, type AffiliateDashboardStats } from "@/lib/affiliate-api"
import { LayoutDashboard, Users, HandCoins, Shield, ScrollText, Trophy, Award, Image, Plus, Pencil, Trash2, RefreshCw, Search, Check, X, Flag, DollarSign, Clock, UserCheck, Megaphone, Rocket } from "lucide-react"

const statusVariant: Record<string, "success" | "secondary" | "destructive" | "default"> = {
  active: "success", approved: "success", completed: "success", paid: "success", resolved: "success",
  pending: "secondary",
  rejected: "destructive", inactive: "destructive", failed: "destructive", flagged: "destructive",
}

export default function AdminAffiliatesPage() {
  const [activeTab, setActiveTab] = useState("dashboard")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">Affiliates Management</h1>
          <p className="text-muted-foreground">Manage affiliate partners, payouts, commissions, and more.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="dashboard"><LayoutDashboard className="mr-2 h-4 w-4" />Dashboard</TabsTrigger>
          <TabsTrigger value="affiliates"><Users className="mr-2 h-4 w-4" />Affiliates</TabsTrigger>
          <TabsTrigger value="payouts"><HandCoins className="mr-2 h-4 w-4" />Payouts</TabsTrigger>
          <TabsTrigger value="fraud"><Shield className="mr-2 h-4 w-4" />Fraud Flags</TabsTrigger>
          <TabsTrigger value="commissions"><DollarSign className="mr-2 h-4 w-4" />Commissions</TabsTrigger>
          <TabsTrigger value="rules"><ScrollText className="mr-2 h-4 w-4" />Commission Rules</TabsTrigger>
          <TabsTrigger value="campaigns"><Megaphone className="mr-2 h-4 w-4" />Campaigns</TabsTrigger>
          <TabsTrigger value="leaderboard"><Trophy className="mr-2 h-4 w-4" />Leaderboard</TabsTrigger>
          <TabsTrigger value="bonuses"><Award className="mr-2 h-4 w-4" />Bonuses</TabsTrigger>
          <TabsTrigger value="assets"><Image className="mr-2 h-4 w-4" />Marketing Assets</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard"><DashboardTab /></TabsContent>
        <TabsContent value="affiliates"><AffiliatesTab /></TabsContent>
        <TabsContent value="payouts"><PayoutsTab /></TabsContent>
        <TabsContent value="fraud"><FraudFlagsTab /></TabsContent>
        <TabsContent value="commissions"><CommissionsTab /></TabsContent>
        <TabsContent value="rules"><CommissionRulesTab /></TabsContent>
        <TabsContent value="campaigns"><CampaignsTab /></TabsContent>
        <TabsContent value="leaderboard"><LeaderboardTab /></TabsContent>
        <TabsContent value="bonuses"><BonusesTab /></TabsContent>
        <TabsContent value="assets"><MarketingAssetsTab /></TabsContent>
      </Tabs>
    </div>
  )
}

function DashboardTab() {
  const [data, setData] = useState<AffiliateDashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = () => {
    setLoading(true)
    adminAffiliateApi.dashboard()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4,5,6,7].map((i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-10 w-20" /><Skeleton className="h-4 w-16 mt-2" /></CardContent></Card>
          ))}
        </div>
      </div>
    )
  }

  if (!data) return <div className="text-center py-12 text-muted-foreground">No dashboard data available.</div>

  const stats = [
    { label: "Total Affiliates", value: data.totalAffiliates, icon: Users },
    { label: "Active Affiliates", value: data.activeAffiliates, icon: UserCheck },
    { label: "Pending Approvals", value: data.pendingApprovals, icon: Clock },
    { label: "Total Referrals", value: data.totalReferrals, icon: Users },
    { label: "Total Commissions", value: `R ${data.totalCommissions.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`, icon: DollarSign },
    { label: "Pending Payouts", value: `R ${data.pendingPayouts.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`, icon: Clock },
    { label: "Open Fraud Flags", value: data.openFraudFlags, icon: Flag },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Overview of the affiliate program.</p>
        <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon
          return (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.05 }}>
              <Card className="hover:shadow-card-hover transition-all">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                  <div className="h-9 w-9 rounded-xl gradient-bg flex items-center justify-center">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Recent Referrals</CardTitle></CardHeader>
          <CardContent>
            {data.recentReferrals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No recent referrals</div>
            ) : (
              <div className="space-y-3">
                {data.recentReferrals.slice(0, 5).map((r, i) => (
                  <motion.div key={r.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">{r.referredEmail || "Anonymous"}</p>
                      <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</p>
                    </div>
                    <Badge variant={statusVariant[r.status] || "secondary"}>{r.status}</Badge>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Top Affiliates</CardTitle></CardHeader>
          <CardContent>
            {data.topAffiliates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No top affiliates yet</div>
            ) : (
              <div className="space-y-3">
                {data.topAffiliates.map((a, i) => (
                  <motion.div key={a.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-muted-foreground w-5">#{i + 1}</span>
                      <p className="text-sm font-medium">{a.name}</p>
                    </div>
                    <div className="text-right text-sm">
                      <span>{a.referrals} refs</span>
                      <span className="text-muted-foreground ml-3">R {a.commissions.toFixed(2)}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function AffiliatesTab() {
  const [items, setItems] = useState<Affiliate[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Affiliate | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const fetchItems = () => {
    setLoading(true)
    adminAffiliateApi.affiliates()
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchItems() }, [])

  const filtered = items.filter((a) =>
    a.userId.toLowerCase().includes(search.toLowerCase()) ||
    (a.businessName || "").toLowerCase().includes(search.toLowerCase()) ||
    a.referralCode.toLowerCase().includes(search.toLowerCase())
  )

  const handleApprove = async (id: string) => {
    await adminAffiliateApi.updateAffiliate(id, { status: "active" }).catch(() => {})
    fetchItems()
  }

  const handleReject = async (id: string) => {
    await adminAffiliateApi.updateAffiliate(id, { status: "rejected" }).catch(() => {})
    fetchItems()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search affiliates..." className="w-64" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button variant="outline" size="sm" onClick={fetchItems}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
      </div>
      <Card className="glass-card rounded-2xl p-6">
        <CardHeader className="px-0 pt-0"><CardTitle>All Affiliates ({filtered.length})</CardTitle></CardHeader>
        <CardContent className="px-0 pb-0">
          {loading ? (
            <div className="space-y-3">{[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No affiliates found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referral Code</TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Referrals</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead className="w-28">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item, i) => (
                  <motion.tr key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    <TableCell className="font-mono text-sm">{item.referralCode}</TableCell>
                    <TableCell>
                      <p className="font-medium text-sm">{item.businessName || "—"}</p>
                      <p className="text-xs text-muted-foreground">{item.userId.slice(0, 8)}...</p>
                    </TableCell>
                    <TableCell><Badge variant={statusVariant[item.status] || "secondary"}>{item.status}</Badge></TableCell>
                    <TableCell className="text-sm">R {item.availableBalance.toFixed(2)}</TableCell>
                    <TableCell className="text-sm">{item.lifetimeReferrals}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.country || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setSelected(item); setDialogOpen(true) }}><Pencil className="h-4 w-4" /></Button>
                        {item.status === "pending" && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => handleApprove(item.id)}><Check className="h-4 w-4 text-accent" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleReject(item.id)}><X className="h-4 w-4 text-destructive" /></Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Affiliate Details</DialogTitle>
            <DialogDescription>Viewing details for {selected?.businessName || selected?.referralCode}</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-muted-foreground">Referral Code</p><p className="font-mono font-medium">{selected.referralCode}</p></div>
                <div><p className="text-muted-foreground">Status</p><Badge variant={statusVariant[selected.status] || "secondary"}>{selected.status}</Badge></div>
                <div><p className="text-muted-foreground">Business Name</p><p>{selected.businessName || "—"}</p></div>
                <div><p className="text-muted-foreground">Country</p><p>{selected.country || "—"}</p></div>
                <div><p className="text-muted-foreground">Available Balance</p><p className="font-bold">R {selected.availableBalance.toFixed(2)}</p></div>
                <div><p className="text-muted-foreground">Pending Balance</p><p>R {selected.pendingBalance.toFixed(2)}</p></div>
                <div><p className="text-muted-foreground">Total Earned</p><p>R {selected.totalEarned.toFixed(2)}</p></div>
                <div><p className="text-muted-foreground">Lifetime Referrals</p><p>{selected.lifetimeReferrals}</p></div>
                <div><p className="text-muted-foreground">Conversion Rate</p><p>{(selected.conversionRate * 100).toFixed(1)}%</p></div>
                <div><p className="text-muted-foreground">Avg Commission</p><p>R {selected.averageCommission.toFixed(2)}</p></div>
              </div>
              <div className="pt-2 border-t"><p className="text-muted-foreground">Created</p><p>{new Date(selected.createdAt).toLocaleString()}</p></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PayoutsTab() {
  const [items, setItems] = useState<Payout[]>([])
  const [loading, setLoading] = useState(true)
  const [updateDialog, setUpdateDialog] = useState(false)
  const [selected, setSelected] = useState<Payout | null>(null)
  const [updateStatus, setUpdateStatus] = useState("")
  const [updateRef, setUpdateRef] = useState("")

  const fetchItems = () => {
    setLoading(true)
    adminAffiliateApi.payouts()
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchItems() }, [])

  const handleUpdate = async () => {
    if (!selected) return
    await adminAffiliateApi.updatePayout(selected.id, { status: updateStatus, transactionReference: updateRef }).catch(() => {})
    setUpdateDialog(false)
    fetchItems()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{items.length} total payouts</p>
        <Button variant="outline" size="sm" onClick={fetchItems}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
      </div>
      <Card className="glass-card rounded-2xl p-6">
        <CardHeader className="px-0 pt-0"><CardTitle>All Payouts</CardTitle></CardHeader>
        <CardContent className="px-0 pb-0">
          {loading ? (
            <div className="space-y-3">{[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No payouts yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Amount</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Transaction Ref</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, i) => (
                  <motion.tr key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    <TableCell className="font-medium">R {item.amount.toFixed(2)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">R {item.fee.toFixed(2)}</TableCell>
                    <TableCell className="text-sm">{item.method}</TableCell>
                    <TableCell><Badge variant={statusVariant[item.status] || "secondary"}>{item.status}</Badge></TableCell>
                    <TableCell className="text-sm font-mono">{item.transactionReference || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(item.requestedAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => {
                        setSelected(item); setUpdateStatus(item.status); setUpdateRef(item.transactionReference || ""); setUpdateDialog(true)
                      }}><Pencil className="h-4 w-4" /></Button>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Dialog open={updateDialog} onOpenChange={setUpdateDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Payout</DialogTitle>
            <DialogDescription>Change the status and transaction reference.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Status</label>
              <Select value={updateStatus} onValueChange={setUpdateStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Transaction Reference</label>
              <Input value={updateRef} onChange={(e) => setUpdateRef(e.target.value)} placeholder="Ref..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setUpdateDialog(false)}>Cancel</Button>
              <Button onClick={handleUpdate}>Update</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function FraudFlagsTab() {
  const [items, setItems] = useState<FraudFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ affiliateId: "", type: "suspicious_activity", reason: "", evidence: "" })

  const fetchItems = () => {
    setLoading(true)
    adminAffiliateApi.fraudFlags()
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchItems() }, [])

  const handleCreate = async () => {
    await adminAffiliateApi.createFraudFlag(form).catch(() => {})
    setCreateOpen(false)
    setForm({ affiliateId: "", type: "suspicious_activity", reason: "", evidence: "" })
    fetchItems()
  }

  const handleResolve = async (id: string) => {
    await adminAffiliateApi.updateFraudFlag(id, { status: "resolved" }).catch(() => {})
    fetchItems()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{items.filter((f) => f.status === "open").length} open flags</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchItems}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />New Flag</Button>
        </div>
      </div>
      <Card className="glass-card rounded-2xl p-6">
        <CardHeader className="px-0 pt-0"><CardTitle>Fraud Flags</CardTitle></CardHeader>
        <CardContent className="px-0 pb-0">
          {loading ? (
            <div className="space-y-3">{[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No fraud flags yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Affiliate ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, i) => (
                  <motion.tr key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    <TableCell className="font-mono text-xs">{item.affiliateId.slice(0, 12)}...</TableCell>
                    <TableCell><Badge variant="destructive">{item.type}</Badge></TableCell>
                    <TableCell className="text-sm max-w-xs truncate">{item.reason}</TableCell>
                    <TableCell><Badge variant={statusVariant[item.status] || "secondary"}>{item.status}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(item.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {item.status === "open" && (
                        <Button variant="ghost" size="icon" onClick={() => handleResolve(item.id)}><Check className="h-4 w-4 text-accent" /></Button>
                      )}
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Fraud Flag</DialogTitle>
            <DialogDescription>Flag an affiliate for suspicious activity.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Affiliate ID</label>
              <Input value={form.affiliateId} onChange={(e) => setForm({ ...form, affiliateId: e.target.value })} placeholder="Affiliate ID..." />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Type</label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="suspicious_activity">Suspicious Activity</SelectItem>
                  <SelectItem value="fake_referrals">Fake Referrals</SelectItem>
                  <SelectItem value="policy_violation">Policy Violation</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Reason</label>
              <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Reason..." />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Evidence (optional)</label>
              <Input value={form.evidence} onChange={(e) => setForm({ ...form, evidence: e.target.value })} placeholder="Evidence URL or description..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate}>Create Flag</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CommissionsTab() {
  const [items, setItems] = useState<Commission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    adminAffiliateApi.commissions()
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{items.length} total commissions</p>
      <Card className="glass-card rounded-2xl p-6">
        <CardHeader className="px-0 pt-0"><CardTitle>All Commissions</CardTitle></CardHeader>
        <CardContent className="px-0 pb-0">
          {loading ? (
            <div className="space-y-3">{[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No commissions yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Amount</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Earned</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, i) => (
                  <motion.tr key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    <TableCell className="font-medium">R {item.amount.toFixed(2)}</TableCell>
                    <TableCell className="text-sm">{item.rate}%</TableCell>
                    <TableCell className="text-sm">{item.type}</TableCell>
                    <TableCell><Badge variant={statusVariant[item.status] || "secondary"}>{item.status}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.source || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(item.earnedAt).toLocaleDateString()}</TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function CommissionRulesTab() {
  const api = adminAffiliateApi.rules
  const [items, setItems] = useState<CommissionRule[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CommissionRule | null>(null)
  const [form, setForm] = useState({ name: "", type: "percentage", rate: 0, productCategory: "", minAmount: 0, maxAmount: 0, isActive: true, priority: 0, conditions: "" })

  const fetchItems = () => {
    setLoading(true)
    api.getAll()
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchItems() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ name: "", type: "percentage", rate: 0, productCategory: "", minAmount: 0, maxAmount: 0, isActive: true, priority: 0, conditions: "" })
    setDialogOpen(true)
  }

  const openEdit = (item: CommissionRule) => {
    setEditing(item)
    setForm({ name: item.name, type: item.type, rate: item.rate, productCategory: item.productCategory || "", minAmount: item.minAmount || 0, maxAmount: item.maxAmount || 0, isActive: item.isActive, priority: item.priority, conditions: item.conditions || "" })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (editing) {
      await api.update(editing.id, form).catch(() => {})
    } else {
      await api.create(form).catch(() => {})
    }
    setDialogOpen(false)
    fetchItems()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return
    await api.delete(id).catch(() => {})
    fetchItems()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{items.length} rules configured</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchItems}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
          <Button size="sm" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />New Rule</Button>
        </div>
      </div>
      <Card className="glass-card rounded-2xl p-6">
        <CardHeader className="px-0 pt-0"><CardTitle>Commission Rules</CardTitle></CardHeader>
        <CardContent className="px-0 pb-0">
          {loading ? (
            <div className="space-y-3">{[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No commission rules yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, i) => (
                  <motion.tr key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-sm">{item.type}</TableCell>
                    <TableCell className="font-mono text-sm">{item.rate}%</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.productCategory || "—"}</TableCell>
                    <TableCell><Badge variant={item.isActive ? "success" : "secondary"}>{item.isActive ? "Yes" : "No"}</Badge></TableCell>
                    <TableCell className="text-sm">{item.priority}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Commission Rule" : "Create Commission Rule"}</DialogTitle>
            <DialogDescription>Configure the commission rule details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Name</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Rule name" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Type</label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed</SelectItem>
                    <SelectItem value="tiered">Tiered</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Rate</label>
                <Input type="number" value={form.rate} onChange={(e) => setForm({ ...form, rate: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Priority</label>
                <Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Product Category</label>
              <Input value={form.productCategory} onChange={(e) => setForm({ ...form, productCategory: e.target.value })} placeholder="Optional" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Min Amount</label>
                <Input type="number" value={form.minAmount} onChange={(e) => setForm({ ...form, minAmount: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Max Amount</label>
                <Input type="number" value={form.maxAmount} onChange={(e) => setForm({ ...form, maxAmount: Number(e.target.value) })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Active</label>
              <select value={form.isActive ? "true" : "false"} onChange={(e) => setForm({ ...form, isActive: e.target.value === "true" })}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Conditions (JSON)</label>
              <Input value={form.conditions} onChange={(e) => setForm({ ...form, conditions: e.target.value })} placeholder="Optional JSON conditions" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave}>{editing ? "Update" : "Create"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CampaignsTab() {
  const api = adminAffiliateApi.campaigns
  const [items, setItems] = useState<AffiliateCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AffiliateCampaign | null>(null)
  const [form, setForm] = useState({ name: "", description: "", type: "referral", startDate: "", endDate: "", budget: 0, status: "draft", commissionRate: 0, commissionType: "percentage", rewardDescription: "", terms: "" })

  const fetchItems = () => {
    setLoading(true)
    api.getAll()
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchItems() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ name: "", description: "", type: "referral", startDate: "", endDate: "", budget: 0, status: "draft", commissionRate: 0, commissionType: "percentage", rewardDescription: "", terms: "" })
    setDialogOpen(true)
  }

  const openEdit = (item: AffiliateCampaign) => {
    setEditing(item)
    setForm({
      name: item.name, description: item.description || "", type: item.type,
      startDate: item.startDate ? item.startDate.slice(0, 10) : "",
      endDate: item.endDate ? item.endDate.slice(0, 10) : "",
      budget: item.budget || 0, status: item.status,
      commissionRate: item.commissionRate || 0, commissionType: item.commissionType || "percentage",
      rewardDescription: item.rewardDescription || "", terms: item.terms || "",
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (editing) {
      await api.update(editing.id, form).catch(() => {})
    } else {
      await api.create(form).catch(() => {})
    }
    setDialogOpen(false)
    fetchItems()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return
    await api.delete(id).catch(() => {})
    fetchItems()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{items.length} campaigns</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchItems}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
          <Button size="sm" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />New Campaign</Button>
        </div>
      </div>
      <Card className="glass-card rounded-2xl p-6">
        <CardHeader className="px-0 pt-0"><CardTitle>Affiliate Campaigns</CardTitle></CardHeader>
        <CardContent className="px-0 pb-0">
          {loading ? (
            <div className="space-y-3">{[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No campaigns yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Spent</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, i) => (
                  <motion.tr key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-sm">{item.type}</TableCell>
                    <TableCell><Badge variant={statusVariant[item.status] || "secondary"}>{item.status}</Badge></TableCell>
                    <TableCell className="text-sm">R {item.budget?.toFixed(2) || "0.00"}</TableCell>
                    <TableCell className="text-sm">R {item.spent.toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.startDate ? new Date(item.startDate).toLocaleDateString() : "—"} - {item.endDate ? new Date(item.endDate).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Campaign" : "Create Campaign"}</DialogTitle>
            <DialogDescription>Manage affiliate campaign details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Name</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Campaign name" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Type</label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="signup">Signup</SelectItem>
                    <SelectItem value="purchase">Purchase</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Start Date</label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">End Date</label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Budget</label>
                <Input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Commission Rate</label>
                <Input type="number" value={form.commissionRate} onChange={(e) => setForm({ ...form, commissionRate: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Commission Type</label>
                <Select value={form.commissionType} onValueChange={(v) => setForm({ ...form, commissionType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Reward Description</label>
              <Input value={form.rewardDescription} onChange={(e) => setForm({ ...form, rewardDescription: e.target.value })} placeholder="Reward..." />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Terms</label>
              <Input value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} placeholder="Terms..." />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave}>{editing ? "Update" : "Create"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function LeaderboardTab() {
  const [items, setItems] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState("monthly")
  const [generating, setGenerating] = useState(false)

  const fetchItems = () => {
    setLoading(true)
    adminAffiliateApi.leaderboard()
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchItems() }, [])

  const handleGenerate = async () => {
    setGenerating(true)
    await adminAffiliateApi.generateLeaderboard({ period }).catch(() => {})
    setGenerating(false)
    fetchItems()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleGenerate} disabled={generating}><Rocket className="mr-2 h-4 w-4" />{generating ? "Generating..." : "Generate"}</Button>
        </div>
        <Button variant="outline" size="sm" onClick={fetchItems}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
      </div>
      <Card className="glass-card rounded-2xl p-6">
        <CardHeader className="px-0 pt-0"><CardTitle>Leaderboard</CardTitle></CardHeader>
        <CardContent className="px-0 pb-0">
          {loading ? (
            <div className="space-y-3">{[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No leaderboard entries yet. Generate one above.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Affiliate ID</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Referrals</TableHead>
                  <TableHead>Earnings</TableHead>
                  <TableHead>Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, i) => (
                  <motion.tr key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    <TableCell className="font-bold text-lg">#{item.rank}</TableCell>
                    <TableCell className="font-mono text-xs">{item.affiliateId.slice(0, 12)}...</TableCell>
                    <TableCell className="text-sm">{item.period}</TableCell>
                    <TableCell className="text-sm">{item.referrals}</TableCell>
                    <TableCell className="text-sm">R {item.earnings.toFixed(2)}</TableCell>
                    <TableCell className="text-sm">R {item.revenue.toFixed(2)}</TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function BonusesTab() {
  const [items, setItems] = useState<BonusAward[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ affiliateId: "", type: "signup_bonus", amount: 0, reason: "" })

  const fetchItems = () => {
    setLoading(true)
    adminAffiliateApi.bonuses()
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchItems() }, [])

  const handleCreate = async () => {
    await adminAffiliateApi.createBonus(form).catch(() => {})
    setDialogOpen(false)
    setForm({ affiliateId: "", type: "signup_bonus", amount: 0, reason: "" })
    fetchItems()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{items.length} bonuses awarded</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchItems}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
          <Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Award Bonus</Button>
        </div>
      </div>
      <Card className="glass-card rounded-2xl p-6">
        <CardHeader className="px-0 pt-0"><CardTitle>Bonus Awards</CardTitle></CardHeader>
        <CardContent className="px-0 pb-0">
          {loading ? (
            <div className="space-y-3">{[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No bonuses yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Affiliate ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Awarded</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, i) => (
                  <motion.tr key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    <TableCell className="font-mono text-xs">{item.affiliateId.slice(0, 12)}...</TableCell>
                    <TableCell className="text-sm">{item.type}</TableCell>
                    <TableCell className="font-medium">R {item.amount.toFixed(2)}</TableCell>
                    <TableCell className="text-sm max-w-xs truncate">{item.reason}</TableCell>
                    <TableCell><Badge variant={item.isAwarded ? "success" : "secondary"}>{item.isAwarded ? "Yes" : "No"}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "—"}</TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Award Bonus</DialogTitle>
            <DialogDescription>Grant a bonus to an affiliate.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Affiliate ID</label>
              <Input value={form.affiliateId} onChange={(e) => setForm({ ...form, affiliateId: e.target.value })} placeholder="Affiliate ID..." />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Type</label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="signup_bonus">Signup Bonus</SelectItem>
                  <SelectItem value="performance_bonus">Performance Bonus</SelectItem>
                  <SelectItem value="referral_milestone">Referral Milestone</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Amount (R)</label>
              <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Reason</label>
              <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Reason..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate}>Award Bonus</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function MarketingAssetsTab() {
  const [items, setItems] = useState<MarketingAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<MarketingAsset | null>(null)
  const [form, setForm] = useState({ title: "", description: "", type: "banner", url: "", previewUrl: "", tags: "", isActive: true })

  const fetchItems = () => {
    setLoading(true)
    adminAffiliateApi.marketingAssets()
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchItems() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ title: "", description: "", type: "banner", url: "", previewUrl: "", tags: "", isActive: true })
    setDialogOpen(true)
  }

  const openEdit = (item: MarketingAsset) => {
    setEditing(item)
    setForm({ title: item.title, description: item.description || "", type: item.type, url: item.url, previewUrl: item.previewUrl || "", tags: item.tags || "", isActive: item.isActive })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (editing) {
      await adminAffiliateApi.updateMarketingAsset(editing.id, form).catch(() => {})
    } else {
      await adminAffiliateApi.createMarketingAsset(form).catch(() => {})
    }
    setDialogOpen(false)
    fetchItems()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return
    await adminAffiliateApi.deleteMarketingAsset(id).catch(() => {})
    fetchItems()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{items.length} marketing assets</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchItems}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
          <Button size="sm" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />New Asset</Button>
        </div>
      </div>
      <Card className="glass-card rounded-2xl p-6">
        <CardHeader className="px-0 pt-0"><CardTitle>Marketing Assets</CardTitle></CardHeader>
        <CardContent className="px-0 pb-0">
          {loading ? (
            <div className="space-y-3">{[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No marketing assets yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, i) => (
                  <motion.tr key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    <TableCell className="font-medium">{item.title}</TableCell>
                    <TableCell className="text-sm">{item.type}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{item.url}</a>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{item.tags || "—"}</TableCell>
                    <TableCell><Badge variant={item.isActive ? "success" : "secondary"}>{item.isActive ? "Yes" : "No"}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Asset" : "Create Marketing Asset"}</DialogTitle>
            <DialogDescription>Add or update a marketing asset for affiliates.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Title</label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Asset title" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Type</label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="banner">Banner</SelectItem>
                    <SelectItem value="logo">Logo</SelectItem>
                    <SelectItem value="social_media">Social Media</SelectItem>
                    <SelectItem value="email_template">Email Template</SelectItem>
                    <SelectItem value="landing_page">Landing Page</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description..." />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Asset URL</label>
              <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://..." />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Preview URL (optional)</label>
              <Input value={form.previewUrl} onChange={(e) => setForm({ ...form, previewUrl: e.target.value })} placeholder="https://..." />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Tags (comma separated)</label>
              <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="banner, summer, promo" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Active</label>
              <select value={form.isActive ? "true" : "false"} onChange={(e) => setForm({ ...form, isActive: e.target.value === "true" })}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave}>{editing ? "Update" : "Create"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
