"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { affiliateApi, type Affiliate, type Referral, type Commission, type AffiliateAnalytics } from "@/lib/affiliate-api"
import { Copy, RefreshCw, ExternalLink, TrendingUp, DollarSign, Users, Gift, Award, Clock } from "lucide-react"

const statusVariant: Record<string, "success" | "secondary" | "destructive" | "default"> = {
  active: "success", completed: "success", paid: "success", converted: "success",
  pending: "secondary",
  rejected: "destructive", failed: "destructive", expired: "destructive",
}

export default function AffiliatesDashboardPage() {
  const [profile, setProfile] = useState<Affiliate | null>(null)
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [analytics, setAnalytics] = useState<AffiliateAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [notRegistered, setNotRegistered] = useState(false)
  const [registerForm, setRegisterForm] = useState({ businessName: "", website: "", country: "", preferredCurrency: "ZAR" })
  const [registering, setRegistering] = useState(false)
  const [copied, setCopied] = useState(false)

  const fetchData = () => {
    setLoading(true)
    Promise.all([
      affiliateApi.profile(),
      affiliateApi.referrals(),
      affiliateApi.commissions(),
      affiliateApi.analytics(),
    ])
      .then(([p, r, c, a]) => {
        setProfile(p)
        setReferrals(r)
        setCommissions(c)
        setAnalytics(a)
        setNotRegistered(false)
      })
      .catch((err) => {
        if (err.message?.includes("404") || err.message?.includes("not found")) {
          setNotRegistered(true)
        }
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  const handleRegister = async () => {
    setRegistering(true)
    try {
      const result = await affiliateApi.register(registerForm)
      setProfile(result)
      setNotRegistered(false)
      fetchData()
    } catch {
      // handled by silent catch
    } finally {
      setRegistering(false)
    }
  }

  const copyReferralLink = () => {
    const link = `${window.location.origin}/ref/${profile?.referralCode}`
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map((i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-10 w-24" /><Skeleton className="h-4 w-16 mt-2" /></CardContent></Card>
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  if (notRegistered) {
    return (
      <div className="max-w-lg mx-auto py-12">
        <Card className="glass-card rounded-2xl p-8">
          <div className="text-center mb-6">
            <div className="h-16 w-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-4">
              <Award className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold mb-1">Become an Affiliate</h1>
            <p className="text-muted-foreground text-sm">Join our affiliate program and earn commissions.</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Business Name (optional)</label>
              <Input value={registerForm.businessName} onChange={(e) => setRegisterForm({ ...registerForm, businessName: e.target.value })} placeholder="Your business name" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Website (optional)</label>
              <Input value={registerForm.website} onChange={(e) => setRegisterForm({ ...registerForm, website: e.target.value })} placeholder="https://" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Country</label>
              <Input value={registerForm.country} onChange={(e) => setRegisterForm({ ...registerForm, country: e.target.value })} placeholder="South Africa" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Preferred Currency</label>
              <Input value={registerForm.preferredCurrency} onChange={(e) => setRegisterForm({ ...registerForm, preferredCurrency: e.target.value })} placeholder="ZAR" />
            </div>
            <Button className="w-full" onClick={handleRegister} disabled={registering}>
              {registering ? "Registering..." : "Register as Affiliate"}
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  const referralLink = `${window.location.origin}/ref/${profile?.referralCode}`

  const stats = [
    { label: "Referral Code", value: profile?.referralCode ?? "—", icon: Gift },
    { label: "Available Balance", value: `R ${(profile?.availableBalance ?? 0).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`, icon: DollarSign },
    { label: "Pending Balance", value: `R ${(profile?.pendingBalance ?? 0).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`, icon: Clock },
    { label: "Total Earned", value: `R ${(profile?.totalEarned ?? 0).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`, icon: TrendingUp },
    { label: "Total Referrals", value: profile?.lifetimeReferrals ?? 0, icon: Users },
    { label: "Conversion Rate", value: profile ? `${(profile.conversionRate * 100).toFixed(1)}%` : "0%", icon: TrendingUp },
  ]

  const months = analytics?.referralsByMonth ? Object.keys(analytics.referralsByMonth) : []
  const maxReferrals = Math.max(...Object.values(analytics?.referralsByMonth ?? {}), 1)
  const maxCommission = Math.max(...Object.values(analytics?.commissionByMonth ?? {}), 1)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">Affiliate Dashboard</h1>
          <p className="text-muted-foreground">Track your referrals, commissions, and earnings.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.06 }}
            >
              <Card className="hover:shadow-card-hover transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                  <div className="h-8 w-8 rounded-xl gradient-bg flex items-center justify-center">
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/50 border">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground mb-1">Your Referral Link</p>
          <p className="text-sm font-mono font-medium truncate">{referralLink}</p>
        </div>
        <Button size="sm" variant="outline" onClick={copyReferralLink} className="shrink-0">
          <Copy className="mr-2 h-4 w-4" />
          {copied ? "Copied!" : "Copy"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => window.open(referralLink, "_blank")} className="shrink-0">
          <ExternalLink className="mr-2 h-4 w-4" />
          Open
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Referrals</CardTitle>
          </CardHeader>
          <CardContent>
            {referrals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No referrals yet.</div>
            ) : (
              <div className="space-y-3">
                {referrals.slice(0, 10).map((r, i) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">{r.referredEmail || "Anonymous"}</p>
                      <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.source && <span className="text-xs text-muted-foreground">{r.source}</span>}
                      <Badge variant={statusVariant[r.status] || "secondary"}>{r.status}</Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Commissions</CardTitle>
          </CardHeader>
          <CardContent>
            {commissions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No commissions yet.</div>
            ) : (
              <div className="space-y-3">
                {commissions.slice(0, 10).map((c, i) => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">{c.description || c.type}</p>
                      <p className="text-xs text-muted-foreground">{new Date(c.earnedAt).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-accent">+R {c.amount.toFixed(2)}</span>
                      <div className="mt-0.5">
                        <Badge variant={statusVariant[c.status] || "secondary"} className="text-[10px]">{c.status}</Badge>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {months.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Referrals by Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-40">
                {months.map((month) => {
                  const val = analytics?.referralsByMonth[month] ?? 0
                  const height = (val / maxReferrals) * 100
                  return (
                    <div key={month} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs font-medium">{val}</span>
                      <div
                        className="w-full rounded-t-md gradient-bg transition-all"
                        style={{ height: `${Math.max(height, 4)}%` }}
                      />
                      <span className="text-[10px] text-muted-foreground rotate-45 origin-left whitespace-nowrap">
                        {month}
                      </span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Commission by Month (R)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-40">
                {months.map((month) => {
                  const val = analytics?.commissionByMonth[month] ?? 0
                  const height = (val / maxCommission) * 100
                  return (
                    <div key={month} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs font-medium">R{val.toFixed(0)}</span>
                      <div
                        className="w-full rounded-t-md bg-accent transition-all"
                        style={{ height: `${Math.max(height, 4)}%` }}
                      />
                      <span className="text-[10px] text-muted-foreground rotate-45 origin-left whitespace-nowrap">
                        {month}
                      </span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
