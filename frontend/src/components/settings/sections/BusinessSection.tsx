"use client"

import { useState, useEffect } from "react"
import { settingsApi, type BusinessProfileSettings } from "@/lib/api"
import { SectionWrapper, SettingsCard } from "../SettingsShared"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Save, Loader2, Check, Building2, Upload } from "lucide-react"
import { motion } from "framer-motion"

export function BusinessSection() {
  const [profile, setProfile] = useState<BusinessProfileSettings>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    settingsApi.getBusiness().then((res) => { setProfile(res || {}); setLoading(false) })
  }, [])

  const update = (key: keyof BusinessProfileSettings, value: string | undefined) => {
    setProfile({ ...profile, [key]: value })
  }

  const handleSave = async () => {
    setSaving(true)
    await settingsApi.updateBusiness(profile)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setSaving(false)
  }

  if (loading) return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="glass-card rounded-2xl p-6 animate-pulse"><div className="h-4 bg-muted rounded w-1/3 mb-3" /><div className="h-10 bg-muted rounded-xl w-full" /></div>)}</div>

  return (
    <SectionWrapper title="Business" description="Manage your business profile and merchant settings.">
      <SettingsCard title="Business Information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label>Business Name</Label>
            <Input value={profile.businessName || ""} onChange={(e) => update("businessName", e.target.value)} className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>Registration Number</Label>
            <Input value={profile.registrationNumber || ""} onChange={(e) => update("registrationNumber", e.target.value)} className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>VAT Number</Label>
            <Input value={profile.vatNumber || ""} onChange={(e) => update("vatNumber", e.target.value)} className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>Industry</Label>
            <select className="glass rounded-xl px-3 py-2.5 text-sm w-full" value={profile.industry || ""} onChange={(e) => update("industry", e.target.value)}>
              <option value="">Select industry</option>
              <option value="retail">Retail</option>
              <option value="technology">Technology</option>
              <option value="finance">Finance</option>
              <option value="healthcare">Healthcare</option>
              <option value="education">Education</option>
              <option value="hospitality">Hospitality</option>
              <option value="manufacturing">Manufacturing</option>
              <option value="services">Services</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Website</Label>
            <Input value={profile.website || ""} onChange={(e) => update("website", e.target.value)} placeholder="https://" className="rounded-xl" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Company Address</Label>
            <Textarea value={profile.companyAddress || ""} onChange={(e) => update("companyAddress", e.target.value)} className="rounded-xl" rows={2} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Business Description</Label>
            <Textarea value={profile.businessDescription || ""} onChange={(e) => update("businessDescription", e.target.value)} className="rounded-xl" rows={3} />
          </div>
        </div>
      </SettingsCard>

      <SettingsCard title="Business Logo">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-2xl gradient-bg flex items-center justify-center text-white text-2xl font-bold">
            {profile.businessName?.[0] || <Building2 className="h-8 w-8" />}
          </div>
          <div>
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-1" /> Upload Logo
            </Button>
            <p className="text-xs text-muted-foreground mt-1">PNG, JPG, SVG. Max 2MB.</p>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard title="Settlement Preferences">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Settlement Schedule</Label>
            <select className="glass rounded-xl px-3 py-2.5 text-sm w-full" value={profile.settlementPreference || "daily"} onChange={(e) => update("settlementPreference", e.target.value)}>
              <option value="instant">Instant</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Bank Account Details (JSON)</Label>
            <Textarea value={profile.bankAccountDetails || ""} onChange={(e) => update("bankAccountDetails", e.target.value)} className="rounded-xl font-mono text-xs" rows={3} placeholder='{"bankName":"...","accountNumber":"...","branchCode":"..."}' />
          </div>
        </div>
      </SettingsCard>

      <div className="flex justify-end">
        {saved && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-green-500 flex items-center gap-1 mr-3"><Check className="h-4 w-4" /> Saved</motion.span>}
        <Button variant="gradient" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
          Save Business Info
        </Button>
      </div>
    </SectionWrapper>
  )
}