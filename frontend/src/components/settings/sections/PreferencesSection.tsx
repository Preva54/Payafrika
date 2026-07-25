"use client"

import { useState, useEffect } from "react"
import { settingsApi, type AccountPreferences } from "@/lib/api"
import { SectionWrapper, SettingsCard, SettingRow } from "../SettingsShared"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Save, Loader2, Check } from "lucide-react"
import { motion } from "framer-motion"

export function PreferencesSection() {
  const [prefs, setPrefs] = useState<AccountPreferences>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    settingsApi.getAccountPreferences().then((res) => { setPrefs(res || {}); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const update = (key: keyof AccountPreferences, value: string) => {
    setPrefs({ ...prefs, [key]: value })
  }

  const handleSave = async () => {
    setSaving(true)
    try { await settingsApi.updateAccountPreferences(prefs) } catch { setSaving(false); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setSaving(false)
  }

  if (loading) return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="glass-card rounded-2xl p-6 animate-pulse"><div className="h-4 bg-muted rounded w-1/3 mb-3" /><div className="h-10 bg-muted rounded-xl w-full" /></div>)}</div>

  return (
    <SectionWrapper title="Account Preferences" description="Customize your default settings and shortcuts.">
      <SettingsCard>
        <div className="space-y-1">
          <SettingRow label="Default Landing Page" description="Where you land after logging in">
            <select className="glass rounded-xl px-3 py-2 text-sm" value={prefs.defaultLandingPage || "dashboard"} onChange={(e) => update("defaultLandingPage", e.target.value)}>
              <option value="dashboard">Dashboard</option>
              <option value="wallet">Wallet</option>
              <option value="transactions">Transactions</option>
              <option value="payments">Payments</option>
            </select>
          </SettingRow>
          <SettingRow label="Startup Page" description="First page shown in the app">
            <select className="glass rounded-xl px-3 py-2 text-sm" value={prefs.startupPage || "dashboard"} onChange={(e) => update("startupPage", e.target.value)}>
              <option value="dashboard">Dashboard</option>
              <option value="wallet">Wallet</option>
            </select>
          </SettingRow>
          <SettingRow label="Preferred Payment Method" description="Default payment method for transactions">
            <select className="glass rounded-xl px-3 py-2 text-sm" value={prefs.preferredPaymentMethod || "wallet"} onChange={(e) => update("preferredPaymentMethod", e.target.value)}>
              <option value="wallet">Wallet Balance</option>
              <option value="card">Card</option>
              <option value="bank">Bank Transfer</option>
            </select>
          </SettingRow>
          <SettingRow label="Default Wallet" description="Primary wallet for transactions">
            <select className="glass rounded-xl px-3 py-2 text-sm" value={prefs.defaultWallet || "zar"} onChange={(e) => update("defaultWallet", e.target.value)}>
              <option value="zar">ZAR Wallet</option>
              <option value="usd">USD Wallet</option>
              <option value="eur">EUR Wallet</option>
            </select>
          </SettingRow>
          <SettingRow label="Favorite Services" description="Quick-access services on your dashboard">
            <Input value={prefs.favoriteServices || ""} onChange={(e) => update("favoriteServices", e.target.value)} placeholder="e.g. transfers, exchange, payments" className="rounded-xl" />
          </SettingRow>
        </div>
      </SettingsCard>

      <div className="flex justify-end">
        {saved && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-green-500 flex items-center gap-1 mr-3"><Check className="h-4 w-4" /> Saved</motion.span>}
        <Button variant="gradient" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
          Save Preferences
        </Button>
      </div>
    </SectionWrapper>
  )
}