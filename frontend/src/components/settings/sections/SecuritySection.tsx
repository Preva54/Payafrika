"use client"

import { useState, useEffect, useCallback } from "react"
import { settingsApi, type SecuritySettings as SecurityType, type TwoFactorSetup } from "@/lib/api"
import { SectionWrapper, SettingsCard, SettingRow } from "../SettingsShared"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { motion } from "framer-motion"
import { Shield, KeyRound, Smartphone, Fingerprint, Copy, Check, Eye, EyeOff, Loader2 } from "lucide-react"

export function SecuritySection() {
  const [security, setSecurity] = useState<SecurityType | null>(null)
  const [loading, setLoading] = useState(true)
  const [passForm, setPassForm] = useState({ current: "", newPass: "", confirm: "" })
  const [passError, setPassError] = useState("")
  const [passSuccess, setPassSuccess] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [saving2FA, setSaving2FA] = useState(false)
  const [twoFactorSetup, setTwoFactorSetup] = useState<TwoFactorSetup | null>(null)
  const [showRecovery, setShowRecovery] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    settingsApi.getSecurity().then((res) => { setSecurity(res); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const passwordStrength = (pass: string): { score: number; label: string; color: string } => {
    let score = 0
    if (pass.length >= 8) score += 25
    if (pass.length >= 12) score += 15
    if (/[A-Z]/.test(pass)) score += 20
    if (/[a-z]/.test(pass)) score += 10
    if (/[0-9]/.test(pass)) score += 15
    if (/[^A-Za-z0-9]/.test(pass)) score += 15
    if (score >= 90) return { score, label: "Very Strong", color: "bg-green-500" }
    if (score >= 70) return { score, label: "Strong", color: "bg-emerald-500" }
    if (score >= 50) return { score, label: "Medium", color: "bg-yellow-500" }
    if (score >= 25) return { score, label: "Weak", color: "bg-orange-500" }
    return { score, label: "Too Short", color: "bg-red-500" }
  }

  const handleChangePassword = useCallback(async () => {
    setPassError("")
    setPassSuccess("")
    if (passForm.newPass !== passForm.confirm) { setPassError("Passwords do not match"); return }
    if (passForm.newPass.length < 8) { setPassError("Password must be at least 8 characters"); return }
    try {
      await settingsApi.changePassword({
        currentPassword: passForm.current,
        newPassword: passForm.newPass,
        confirmPassword: passForm.confirm,
      })
      setPassSuccess("Password changed successfully")
      setPassForm({ current: "", newPass: "", confirm: "" })
      setTimeout(() => setPassSuccess(""), 3000)
    } catch { setPassError("Failed to change password. Check your current password.") }
  }, [passForm])

  const handleToggle2FA = useCallback(async () => {
    if (!security) return
    if (!security.twoFactorEnabled) {
      try { const setup = await settingsApi.setupTwoFactor(); setTwoFactorSetup(setup); setShowRecovery(true) } catch { return }
    }
    setSaving2FA(true)
    try {
      const res = await settingsApi.toggleTwoFactor({ enabled: !security.twoFactorEnabled })
      setSecurity({ ...security, twoFactorEnabled: res.enabled })
    } catch { /* ignore */ }
    setSaving2FA(false)
  }, [security])

  const copyRecoveryCodes = () => {
    if (twoFactorSetup) {
      navigator.clipboard.writeText(twoFactorSetup.recoveryCodes.join("\n"))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="glass-card rounded-2xl p-6 animate-pulse"><div className="h-4 bg-muted rounded w-1/3 mb-3" /><div className="h-10 bg-muted rounded-xl w-full" /></div>)}</div>

  const strength = passwordStrength(passForm.newPass)

  return (
    <SectionWrapper title="Security" description="Protect your account with strong authentication and security measures.">
      <SettingsCard title="Change Password">
        <div className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label>Current Password</Label>
            <div className="relative">
              <Input type={showPass ? "text" : "password"} value={passForm.current} onChange={(e) => setPassForm({ ...passForm, current: e.target.value })} className="rounded-xl pr-10" />
              <button onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>New Password</Label>
            <Input type="password" value={passForm.newPass} onChange={(e) => setPassForm({ ...passForm, newPass: e.target.value })} className="rounded-xl" />
            {passForm.newPass && (
              <div className="space-y-1">
                <Progress value={strength.score} className={`h-1.5 ${strength.color}`} />
                <p className="text-xs text-muted-foreground">Strength: {strength.label} ({strength.score}%)</p>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label>Confirm New Password</Label>
            <Input type="password" value={passForm.confirm} onChange={(e) => setPassForm({ ...passForm, confirm: e.target.value })} className="rounded-xl" />
          </div>
          {passError && <p className="text-sm text-red-500">{passError}</p>}
          {passSuccess && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-green-500 flex items-center gap-1"><Check className="h-4 w-4" />{passSuccess}</motion.p>}
          <Button variant="gradient" onClick={handleChangePassword}>
            <KeyRound className="h-4 w-4 mr-1" /> Update Password
          </Button>
        </div>
      </SettingsCard>

      <SettingsCard title="Two-Factor Authentication">
        <div className="space-y-4">
          <SettingRow
            label="Two-Factor Authentication"
            description="Add an extra layer of security to your account"
          >
            <Switch checked={security?.twoFactorEnabled || false} onCheckedChange={handleToggle2FA} disabled={saving2FA} />
          </SettingRow>
          <SettingRow
            label="Biometric Login"
            description="Use fingerprint or face recognition to log in"
          >
            <Switch checked={security?.biometricEnabled || false} onCheckedChange={async (v) => {
              try {
                const res = await settingsApi.toggleTwoFactor({ enabled: v })
                if (security) setSecurity({ ...security, biometricEnabled: v })
              } catch { /* ignore */ }
            }} />
          </SettingRow>
          <SettingRow
            label="Login Notifications"
            description="Get notified when a new device logs into your account"
          >
            <Switch checked={security?.loginNotifications ?? true} onCheckedChange={async (v) => {
              if (security) setSecurity({ ...security, loginNotifications: v })
            }} />
          </SettingRow>
          <SettingRow
            label="Auto-Logout Timer"
            description="Automatically log out after inactivity"
          >
            <select className="glass rounded-xl px-3 py-2 text-sm" value={security?.autoLogoutMinutes || 30}>
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={120}>2 hours</option>
              <option value={240}>4 hours</option>
            </select>
          </SettingRow>
        </div>
      </SettingsCard>

      {showRecovery && twoFactorSetup && (
        <SettingsCard title="Recovery Codes">
          <p className="text-sm text-muted-foreground mb-3">Save these recovery codes in a secure place. You can use them to access your account if you lose your two-factor authentication device.</p>
          <div className="glass rounded-xl p-4 font-mono text-sm space-y-1">
            {twoFactorSetup.recoveryCodes.map((code, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-6 text-right text-muted-foreground">{i + 1}.</span>
                <span>{code}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <Button variant="outline" onClick={copyRecoveryCodes}>
              {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
              {copied ? "Copied!" : "Copy Codes"}
            </Button>
            <Button variant="ghost" onClick={() => setShowRecovery(false)}>Done</Button>
          </div>
        </SettingsCard>
      )}

      <SettingsCard title="Security Score">
        <div className="flex items-center gap-4">
          <div className="relative h-20 w-20 flex items-center justify-center">
            <svg className="absolute inset-0" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="35" fill="none" stroke="currentColor" className="text-muted" strokeWidth="6" />
              <circle cx="40" cy="40" r="35" fill="none" stroke="currentColor" className="text-primary" strokeWidth="6"
                strokeDasharray={`${(security?.twoFactorEnabled ? 70 : 40) * 2.2} 220`} transform="rotate(-90) translate(-80)" />
            </svg>
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <div>
            <p className="text-lg font-bold">{security?.twoFactorEnabled ? 70 : 40}/100</p>
            <p className="text-sm text-muted-foreground">{security?.twoFactorEnabled ? "Good" : "Needs improvement"} — enable 2FA to increase your score</p>
          </div>
        </div>
      </SettingsCard>
    </SectionWrapper>
  )
}