"use client"

import { useState, useEffect } from "react"
import { settingsApi, type BillingInfo } from "@/lib/api"
import { SectionWrapper, SettingsCard } from "../SettingsShared"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { motion } from "framer-motion"
import { CreditCard, FileText, Download, Check, Loader2, Save, Zap } from "lucide-react"

const PLANS = [
  { id: "free", name: "Free", price: "R0", features: ["Basic wallet", "5 transactions/month", "Email support"] },
  { id: "starter", name: "Starter", price: "R99", features: ["Unlimited transactions", "Currency exchange", "API access", "Priority support"] },
  { id: "business", name: "Business", price: "R299", features: ["Everything in Starter", "Team management", "Multiple wallets", "Dedicated account manager", "Custom integrations"] },
  { id: "enterprise", name: "Enterprise", price: "Custom", features: ["Everything in Business", "White-label options", "SLA guarantee", "On-premise deployment", "24/7 support"] },
]

export function BillingSection() {
  const [billing, setBilling] = useState<BillingInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({ billingEmail: "", billingAddress: "", taxId: "" })

  useEffect(() => {
    settingsApi.getBilling().then((res) => {
      setBilling(res)
      setForm({ billingEmail: res.billingEmail || "", billingAddress: res.billingAddress || "", taxId: res.taxId || "" })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try { await settingsApi.updateBilling({ ...form, plan: billing?.plan }) } catch { setSaving(false); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setSaving(false)
  }

  const changePlan = async (plan: string) => {
    if (plan === billing?.plan) return
    try { await settingsApi.updateBilling({ plan }) } catch { return }
    if (billing) setBilling({ ...billing, plan })
  }

  if (loading) return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="glass-card rounded-2xl p-6 animate-pulse"><div className="h-4 bg-muted rounded w-1/3 mb-3" /><div className="h-10 bg-muted rounded-xl w-full" /></div>)}</div>

  return (
    <SectionWrapper title="Billing & Subscription" description="Manage your plan, billing information, and invoices.">
      <SettingsCard title="Current Plan">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {PLANS.map((plan, i) => (
            <motion.button
              key={plan.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => changePlan(plan.id)}
              className={`glass rounded-2xl p-4 text-left transition-all ${
                billing?.plan === plan.id
                  ? "ring-2 ring-primary shadow-lg shadow-primary/20"
                  : "hover:shadow-card-hover"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="font-bold text-lg">{plan.name}</p>
                {billing?.plan === plan.id && <Check className="h-5 w-5 text-primary" />}
              </div>
              <p className="text-2xl font-bold mb-3">{plan.price}<span className="text-sm font-normal text-muted-foreground">{plan.price !== "Custom" ? "/mo" : ""}</span></p>
              <ul className="space-y-1.5">
                {plan.features.map((f) => (
                  <li key={f} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <Check className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </motion.button>
          ))}
        </div>
      </SettingsCard>

      <SettingsCard title="Billing Information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Billing Email</Label>
            <Input value={form.billingEmail} onChange={(e) => setForm({ ...form, billingEmail: e.target.value })} className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>Tax ID / VAT Number</Label>
            <Input value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} className="rounded-xl" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Billing Address</Label>
            <Input value={form.billingAddress} onChange={(e) => setForm({ ...form, billingAddress: e.target.value })} className="rounded-xl" />
          </div>
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-border/50 mt-4">
          <div className="flex items-center gap-2">
            <span className="text-sm">Auto Renew</span>
            <Switch checked={billing?.autoRenew ?? true} onCheckedChange={async (v) => {
              try { await settingsApi.updateBilling({ autoRenew: v }) } catch { return }
              if (billing) setBilling({ ...billing, autoRenew: v })
            }} />
          </div>
          <div className="flex items-center gap-2">
            {saved && <span className="text-sm text-green-500 flex items-center gap-1"><Check className="h-4 w-4" /> Saved</span>}
            <Button variant="gradient" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Save
            </Button>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard title="Invoice History">
        <div className="space-y-2">
          {billing?.invoices.map((inv, i) => (
            <motion.div
              key={inv.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between p-3 glass rounded-xl"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg gradient-bg flex items-center justify-center text-white">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{inv.description}</p>
                  <p className="text-xs text-muted-foreground">{inv.id} · {new Date(inv.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-medium">R {inv.amount.toLocaleString()}</p>
                <Badge className={`text-xs ${inv.status === "paid" ? "bg-green-500/10 text-green-500" : "bg-yellow-500/10 text-yellow-500"}`}>{inv.status}</Badge>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </SettingsCard>
    </SectionWrapper>
  )
}