"use client"

import { useState, useEffect, useCallback } from "react"
import { settingsApi, type ProfileSettings as ProfileType } from "@/lib/api"
import { SectionWrapper, SettingsCard, SettingsSkeleton } from "../SettingsShared"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import { Camera, Check, Loader2, Save, X } from "lucide-react"
import { useAuthStore } from "@/stores/use-auth-store"

export function ProfileSection() {
  const { user, fetchUser } = useAuthStore()
  const [profile, setProfile] = useState<ProfileType | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    fullName: "",
    displayName: "",
    phoneNumber: "",
    country: "",
    city: "",
    address: "",
    postalCode: "",
    occupation: "",
  })

  useEffect(() => {
    settingsApi.getProfile().then((res) => {
      setProfile(res)
      setForm({
        fullName: res.fullName || "",
        displayName: res.displayName || "",
        phoneNumber: res.phoneNumber || "",
        country: res.country || "",
        city: res.city || "",
        address: res.address || "",
        postalCode: res.postalCode || "",
        occupation: res.occupation || "",
      })
      setLoading(false)
    })
  }, [])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const updated = await settingsApi.updateProfile(form)
      setProfile(updated)
      setSaved(true)
      fetchUser()
      setTimeout(() => setSaved(false), 2000)
    } catch { /* ignore */ }
    setSaving(false)
  }, [form, fetchUser])

  if (loading) return <SettingsSkeleton rows={4} />

  const initials = profile?.fullName?.split(" ").map(n => n[0]).join("").toUpperCase() || "U"

  return (
    <SectionWrapper title="Profile" description="Manage your personal information and how it appears on PayAfrika.">
      <SettingsCard>
        <div className="flex items-center gap-6">
          <div className="relative group">
            <Avatar className="h-20 w-20 ring-2 ring-primary/20">
              <AvatarImage src={profile?.avatarUrl} />
              <AvatarFallback className="gradient-bg text-white text-xl">{initials}</AvatarFallback>
            </Avatar>
            <button className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="h-5 w-5 text-white" />
            </button>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold">{profile?.fullName}</h3>
              {profile?.isEmailVerified && <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Verified</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
            {profile?.kycStatus === "verified" && (
              <Badge className="mt-1 gradient-bg text-white text-xs">KYC Verified</Badge>
            )}
          </div>
        </div>
      </SettingsCard>

      <SettingsCard title="Personal Information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>Display Name</Label>
            <Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={profile?.email || ""} disabled className="rounded-xl opacity-60" />
          </div>
          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>Country</Label>
            <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>City</Label>
            <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="rounded-xl" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Address</Label>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>Postal Code</Label>
            <Input value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>Occupation</Label>
            <Input value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} className="rounded-xl" />
          </div>
        </div>
      </SettingsCard>

      <div className="flex items-center justify-end gap-3">
        {saved && (
          <motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-sm text-green-500 flex items-center gap-1">
            <Check className="h-4 w-4" /> Saved
          </motion.span>
        )}
        <Button variant="outline" onClick={() => {
          if (profile) {
            setForm({
              fullName: profile.fullName || "",
              displayName: profile.displayName || "",
              phoneNumber: profile.phoneNumber || "",
              country: profile.country || "",
              city: profile.city || "",
              address: profile.address || "",
              postalCode: profile.postalCode || "",
              occupation: profile.occupation || "",
            })
          }
        }}>
          <X className="h-4 w-4 mr-1" /> Reset
        </Button>
        <Button variant="gradient" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
          Save Changes
        </Button>
      </div>
    </SectionWrapper>
  )
}