"use client"

import { useState, useEffect } from "react"
import { settingsApi, type LanguageRegionSettings } from "@/lib/api"
import { SectionWrapper, SettingsCard, SettingRow } from "../SettingsShared"
import { motion } from "framer-motion"
import { Globe } from "lucide-react"

const LANGUAGES = [
  { code: "en", label: "English" }, { code: "fr", label: "Français" },
  { code: "pt", label: "Português" }, { code: "sw", label: "Kiswahili" },
  { code: "ar", label: "العربية" }, { code: "zu", label: "isiZulu" },
  { code: "xh", label: "isiXhosa" }, { code: "af", label: "Afrikaans" },
]

const TIMEZONES = [
  "Africa/Johannesburg", "Africa/Lagos", "Africa/Nairobi", "Africa/Cairo",
  "Africa/Casablanca", "Europe/London", "Europe/Paris", "America/New_York",
  "America/Chicago", "America/Los_Angeles", "Asia/Dubai", "Asia/Singapore",
]

export function LanguageRegionSection() {
  const [settings, setSettings] = useState<LanguageRegionSettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    settingsApi.getLanguageRegion().then((res) => { setSettings(res); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const update = async (key: keyof LanguageRegionSettings, value: string) => {
    if (!settings) return
    const updated = { ...settings, [key]: value }
    setSettings(updated)
    try { await settingsApi.updateLanguageRegion(updated) } catch { /* ignore */ }
  }

  if (loading) return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="glass-card rounded-2xl p-6 animate-pulse"><div className="h-4 bg-muted rounded w-1/3 mb-3" /><div className="h-10 bg-muted rounded-xl w-full" /></div>)}</div>

  return (
    <SectionWrapper title="Language & Region" description="Set your preferred language, currency, and regional formats.">
      <SettingsCard>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Language</label>
              <select className="glass rounded-xl px-3 py-2.5 text-sm w-full" value={settings?.language || "en"} onChange={(e) => update("language", e.target.value)}>
                {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Currency</label>
              <select className="glass rounded-xl px-3 py-2.5 text-sm w-full" value={settings?.currency || "ZAR"} onChange={(e) => update("currency", e.target.value)}>
                <option value="ZAR">ZAR (R)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="NGN">NGN (₦)</option>
                <option value="KES">KES (KSh)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Time Zone</label>
              <select className="glass rounded-xl px-3 py-2.5 text-sm w-full" value={settings?.timeZone || "Africa/Johannesburg"} onChange={(e) => update("timeZone", e.target.value)}>
                {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz.replace("_", " ")}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Format</label>
              <select className="glass rounded-xl px-3 py-2.5 text-sm w-full" value={settings?.dateFormat || "DD/MM/YYYY"} onChange={(e) => update("dateFormat", e.target.value)}>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Time Format</label>
              <select className="glass rounded-xl px-3 py-2.5 text-sm w-full" value={settings?.timeFormat || "24h"} onChange={(e) => update("timeFormat", e.target.value)}>
                <option value="24h">24-hour</option>
                <option value="12h">12-hour (AM/PM)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Number Format</label>
              <select className="glass rounded-xl px-3 py-2.5 text-sm w-full" value={settings?.numberFormat || "1,234.56"} onChange={(e) => update("numberFormat", e.target.value)}>
                <option value="1,234.56">1,234.56</option>
                <option value="1 234,56">1 234,56</option>
                <option value="1.234,56">1.234,56</option>
              </select>
            </div>
          </div>
        </div>
      </SettingsCard>
    </SectionWrapper>
  )
}