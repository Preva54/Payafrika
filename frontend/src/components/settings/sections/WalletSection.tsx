"use client"

import { useState, useEffect } from "react"
import { settingsApi, type WalletSettings } from "@/lib/api"
import { SectionWrapper, SettingsCard, SettingRow } from "../SettingsShared"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Save, Loader2, Check } from "lucide-react"
import { motion } from "framer-motion"

export function WalletSection() {
  const [settings, setSettings] = useState<WalletSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    settingsApi.getWalletSettings().then((res) => { setSettings(res); setLoading(false) })
  }, [])

  const update = (key: keyof WalletSettings, value: unknown) => {
    if (settings) setSettings({ ...settings, [key]: value })
  }

  const handleSave = async () => {
    if (!settings) return
    setSaving(true)
    await settingsApi.updateWalletSettings(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setSaving(false)
  }

  if (loading) return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="glass-card rounded-2xl p-6 animate-pulse"><div className="h-4 bg-muted rounded w-1/3 mb-3" /><div className="h-10 bg-muted rounded-xl w-full" /></div>)}</div>

  return (
    <SectionWrapper title="Wallet Settings" description="Configure your wallet preferences and spending limits.">
      <SettingsCard title="Wallet Preferences">
        <div className="space-y-2">
          <SettingRow label="Default Currency" description="Primary currency for your wallet">
            <select className="glass rounded-xl px-3 py-2 text-sm" value={settings?.defaultCurrency || "ZAR"} onChange={(e) => update("defaultCurrency", e.target.value)}>
              <option value="ZAR">ZAR - South African Rand</option>
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="NGN">NGN - Nigerian Naira</option>
              <option value="KES">KES - Kenyan Shilling</option>
            </select>
          </SettingRow>
          <SettingRow label="Auto Currency Conversion" description="Automatically convert incoming payments to your default currency">
            <Switch checked={settings?.autoCurrencyConversion || false} onCheckedChange={(v) => update("autoCurrencyConversion", v)} />
          </SettingRow>
          <SettingRow label="Auto Settlement" description="Automatically settle funds to your linked bank account">
            <Switch checked={settings?.autoSettlement ?? true} onCheckedChange={(v) => update("autoSettlement", v)} />
          </SettingRow>
        </div>
      </SettingsCard>

      <SettingsCard title="Spending Limits">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Daily Limit</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R</span>
              <Input type="number" className="rounded-xl pl-8" value={settings?.dailyLimit || ""} onChange={(e) => update("dailyLimit", e.target.value ? Number(e.target.value) : undefined)} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Monthly Limit</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R</span>
              <Input type="number" className="rounded-xl pl-8" value={settings?.monthlyLimit || ""} onChange={(e) => update("monthlyLimit", e.target.value ? Number(e.target.value) : undefined)} />
            </div>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard title="Auto Top-Up">
        <div className="space-y-4">
          <SettingRow label="Enable Auto Top-Up" description="Automatically top up when balance falls below threshold">
            <Switch checked={settings?.autoTopUp || false} onCheckedChange={(v) => update("autoTopUp", v)} />
          </SettingRow>
          {settings?.autoTopUp && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Threshold</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R</span>
                  <Input type="number" className="rounded-xl pl-8" value={settings?.autoTopUpThreshold || ""} onChange={(e) => update("autoTopUpThreshold", e.target.value ? Number(e.target.value) : undefined)} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Top-Up Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R</span>
                  <Input type="number" className="rounded-xl pl-8" value={settings?.autoTopUpAmount || ""} onChange={(e) => update("autoTopUpAmount", e.target.value ? Number(e.target.value) : undefined)} />
                </div>
              </div>
            </div>
          )}
        </div>
      </SettingsCard>

      <div className="flex justify-end">
        {saved && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-green-500 flex items-center gap-1 mr-3"><Check className="h-4 w-4" /> Saved</motion.span>}
        <Button variant="gradient" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
          Save Settings
        </Button>
      </div>
    </SectionWrapper>
  )
}