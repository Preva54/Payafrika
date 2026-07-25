"use client"

import { useState, useEffect } from "react"
import { settingsApi, type PrivacySettings } from "@/lib/api"
import { SectionWrapper, SettingsCard, SettingRow } from "../SettingsShared"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { Lock, Download, Trash2, Check, Loader2 } from "lucide-react"

export function PrivacySection() {
  const [settings, setSettings] = useState<PrivacySettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    settingsApi.getPrivacy().then((res) => { setSettings(res); setLoading(false) })
  }, [])

  const toggle = async (key: keyof PrivacySettings, value: boolean) => {
    if (!settings) return
    const updated = { ...settings, [key]: value }
    setSettings(updated)
    setSaving(true)
    await settingsApi.updatePrivacy(updated)
    setSaving(false)
  }

  if (loading) return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="glass-card rounded-2xl p-6 animate-pulse"><div className="h-4 bg-muted rounded w-full" /></div>)}</div>

  return (
    <SectionWrapper title="Privacy" description="Control your data sharing and privacy preferences.">
      <SettingsCard title="Privacy Controls">
        <div className="space-y-1">
          <SettingRow label="Data Sharing" description="Share usage data to help us improve PayAfrika">
            <Switch checked={settings?.dataSharing ?? true} onCheckedChange={(v) => toggle("dataSharing", v)} />
          </SettingRow>
          <SettingRow label="Marketing Emails" description="Receive emails about new features and offers">
            <Switch checked={settings?.marketingEmails ?? false} onCheckedChange={(v) => toggle("marketingEmails", v)} />
          </SettingRow>
          <SettingRow label="Analytics" description="Help us improve with anonymous analytics">
            <Switch checked={settings?.analyticsPermissions ?? true} onCheckedChange={(v) => toggle("analyticsPermissions", v)} />
          </SettingRow>
          <SettingRow label="Personalized Recommendations" description="Get personalized suggestions based on your usage">
            <Switch checked={settings?.personalizedRecommendations ?? true} onCheckedChange={(v) => toggle("personalizedRecommendations", v)} />
          </SettingRow>
          <SettingRow label="Profile Visibility" description="Make your profile visible to other PayAfrika users">
            <Switch checked={settings?.profileVisibility ?? true} onCheckedChange={(v) => toggle("profileVisibility", v)} />
          </SettingRow>
        </div>
      </SettingsCard>

      <SettingsCard title="Your Data">
        <p className="text-sm text-muted-foreground mb-4">You can download or request deletion of your personal data at any time. We comply with POPIA and GDPR.</p>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-1" /> Download My Data
          </Button>
          <Button variant="outline" className="text-red-500 hover:text-red-500">
            <Trash2 className="h-4 w-4 mr-1" /> Request Data Deletion
          </Button>
        </div>
      </SettingsCard>
    </SectionWrapper>
  )
}