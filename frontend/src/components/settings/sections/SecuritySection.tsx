"use client"

import { useState, useEffect, useCallback } from "react"
import { settingsApi, type SecuritySettings as SecurityType, type TwoFactorSetup, type SecurityOverview, type SecurityNotification, type ConnectedDeviceItem } from "@/lib/api"
import { SectionWrapper, SettingsCard, SettingRow } from "../SettingsShared"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { motion } from "framer-motion"
import { Shield, KeyRound, Smartphone, Fingerprint, Copy, Check, Eye, EyeOff, Loader2, Laptop, Smartphone as SmartphoneIcon, Monitor, X, ShieldAlert, Mail } from "lucide-react"

const DEVICE_ICONS: Record<string, typeof Monitor> = {
  desktop: Monitor,
  laptop: Laptop,
  mobile: SmartphoneIcon,
  tablet: SmartphoneIcon,
  web: Monitor,
}

const CHANNEL_LABELS: Record<string, string> = {
  authenticator: "Authenticator app",
  sms: "SMS",
  email: "Email",
}

export function SecuritySection() {
  const [security, setSecurity] = useState<SecurityType | null>(null)
  const [overview, setOverview] = useState<SecurityOverview | null>(null)
  const [devices, setDevices] = useState<ConnectedDeviceItem[]>([])
  const [notifications, setNotifications] = useState<SecurityNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [passForm, setPassForm] = useState({ current: "", newPass: "", confirm: "" })
  const [passError, setPassError] = useState("")
  const [passSuccess, setPassSuccess] = useState("")
  const [showPass, setShowPass] = useState(false)

  // 2FA
  const [twoFactorSetup, setTwoFactorSetup] = useState<TwoFactorSetup | null>(null)
  const [twoFactorMethod, setTwoFactorMethod] = useState("authenticator")
  const [setupStep, setSetupStep] = useState<"choose" | "setup" | "recovery" | "disable" | null>(null)
  const [setupCode, setSetupCode] = useState("")
  const [disableForm, setDisableForm] = useState({ password: "", code: "" })
  const [saving2FA, setSaving2FA] = useState(false)
  const [showRecovery, setShowRecovery] = useState(false)
  const [regenCodes, setRegenCodes] = useState<string[]>([])
  const [copied, setCopied] = useState(false)
  const [twoFactorError, setTwoFactorError] = useState("")
  const [otpSent, setOtpSent] = useState(false)

  useEffect(() => {
    Promise.all([
      settingsApi.getSecurity(),
      settingsApi.getSecurityOverview().catch(() => null),
      settingsApi.getDevices().catch(() => []),
      settingsApi.getSecurityNotifications().catch(() => []),
    ])
      .then(([sec, ov, dev, notifs]) => {
        setSecurity(sec)
        setOverview(ov)
        setDevices(dev)
        setNotifications(notifs)
      })
      .finally(() => setLoading(false))
  }, [])

  const refresh = useCallback(async () => {
    try {
      const [sec, ov, dev] = await Promise.all([
        settingsApi.getSecurity(),
        settingsApi.getSecurityOverview().catch(() => null),
        settingsApi.getDevices().catch(() => []),
      ])
      setSecurity(sec)
      setOverview(ov)
      setDevices(dev)
    } catch { /* ignore */ }
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
    } catch (e) { setPassError(e instanceof Error ? e.message : "Failed to change password. Check your current password.") }
  }, [passForm])

  const startTwoFactorSetup = async () => {
    setTwoFactorError("")
    setSetupStep("setup")
    setSaving2FA(true)
    try {
      const setup = await settingsApi.setupTwoFactor(twoFactorMethod)
      setTwoFactorSetup(setup)
    } catch (e) {
      setTwoFactorError(e instanceof Error ? e.message : "Could not start 2FA setup.")
      setSetupStep("choose")
    } finally {
      setSaving2FA(false)
    }
  }

  const completeTwoFactorSetup = async () => {
    if (setupCode.trim().length < 6) {
      setTwoFactorError("Enter the 6-digit code from your authenticator app.")
      return
    }
    setTwoFactorError("")
    setSaving2FA(true)
    try {
      await settingsApi.toggleTwoFactor({ enabled: true, code: setupCode.trim() })
      setSecurity((prev) => (prev ? { ...prev, twoFactorEnabled: true } : prev))
      setSetupStep("recovery")
      setShowRecovery(true)
      setSetupCode("")
      await refresh()
    } catch (e) {
      setTwoFactorError(e instanceof Error ? e.message : "Invalid code. Try again.")
    } finally {
      setSaving2FA(false)
    }
  }

  const sendSetupOtp = async () => {
    setOtpSent(true)
    setTwoFactorError("")
    try {
      await settingsApi.sendOtp("two_factor_setup")
    } catch (e) {
      setTwoFactorError(e instanceof Error ? e.message : "Could not send code.")
    }
  }

  const disableTwoFactor = async () => {
    if (!disableForm.password) { setTwoFactorError("Enter your password to disable 2FA."); return }
    if (disableForm.code.trim().length < 6) { setTwoFactorError("Enter a verification code."); return }
    setTwoFactorError("")
    setSaving2FA(true)
    try {
      await settingsApi.toggleTwoFactor({
        enabled: false,
        code: disableForm.code.trim(),
        password: disableForm.password,
      })
      setSecurity((prev) => (prev ? { ...prev, twoFactorEnabled: false } : prev))
      setDisableForm({ password: "", code: "" })
      await refresh()
    } catch (e) {
      setTwoFactorError(e instanceof Error ? e.message : "Could not disable 2FA.")
    } finally {
      setSaving2FA(false)
    }
  }

  const regenerateRecoveryCodes = async () => {
    setSaving2FA(true)
    try {
      const res = await settingsApi.regenerateRecoveryCodes()
      setRegenCodes(res.recoveryCodes)
      setShowRecovery(true)
    } catch (e) {
      setTwoFactorError(e instanceof Error ? e.message : "Could not regenerate codes.")
    } finally {
      setSaving2FA(false)
    }
  }

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const trustDevice = async (id: string) => {
    try {
      await settingsApi.toggleTrustDevice(id)
      await refresh()
    } catch { /* ignore */ }
  }

  const removeDevice = async (id: string) => {
    try {
      await settingsApi.removeDevice(id)
      setDevices((prev) => prev.filter((d) => d.id !== id))
    } catch { /* ignore */ }
  }

  const removeAllDevices = async () => {
    try {
      await settingsApi.removeAllDevices()
      await refresh()
    } catch { /* ignore */ }
  }

  const markAllRead = async () => {
    await settingsApi.markNotificationsRead()
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
  }

  if (loading) return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="glass-card rounded-2xl p-6 animate-pulse"><div className="h-4 bg-muted rounded w-1/3 mb-3" /><div className="h-10 bg-muted rounded-xl w-full" /></div>)}</div>

  const strength = passwordStrength(passForm.newPass)
  const score = overview?.securityScore ?? (security?.twoFactorEnabled ? 70 : 40)
  const scoreLabel = score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Fair" : "Needs improvement"
  const deviceIcon = (d: ConnectedDeviceItem) => {
    const Icon = DEVICE_ICONS[d.deviceType] ?? Monitor
    return <Icon className="h-4 w-4" />
  }

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
            description={security?.twoFactorEnabled ? `Enabled via ${CHANNEL_LABELS[overview?.twoFactorMethod || "authenticator"] ?? "authenticator app"}` : "Add an extra layer of security to your account"}
          >
            {security?.twoFactorEnabled ? (
              <Button variant="outline" size="sm" onClick={() => { setSetupStep("disable"); setTwoFactorError("") }}>
                Disable 2FA
              </Button>
            ) : (
              <Button size="sm" onClick={() => { setSetupStep("choose"); setTwoFactorError(""); setTwoFactorMethod("authenticator"); setOtpSent(false) }}>
                Set up 2FA
              </Button>
            )}
          </SettingRow>

          {setupStep === "choose" && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-3 rounded-xl border border-border p-4">
              <Label>Choose verification method</Label>
              <div className="grid gap-2">
                {(["authenticator", "sms", "email"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setTwoFactorMethod(m)}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left text-sm transition ${twoFactorMethod === m ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/50"}`}
                  >
                    {m === "authenticator" ? <Smartphone className="h-4 w-4 text-primary" /> : m === "sms" ? <Fingerprint className="h-4 w-4 text-primary" /> : <Mail className="h-4 w-4 text-primary" />}
                    <div>
                      <p className="font-medium">{CHANNEL_LABELS[m]}</p>
                      <p className="text-xs text-muted-foreground">{m === "authenticator" ? "Google Authenticator, Authy or similar" : m === "sms" ? "Receive codes by SMS" : "Receive codes by email"}</p>
                    </div>
                  </button>
                ))}
              </div>
              {twoFactorError && <p className="text-sm text-red-500">{twoFactorError}</p>}
              <Button variant="gradient" size="sm" onClick={startTwoFactorSetup} disabled={saving2FA} className="w-full">
                {saving2FA ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Preparing...</> : "Continue"}
              </Button>
            </motion.div>
          )}

          {setupStep === "setup" && twoFactorSetup && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-4 rounded-xl border border-border p-4">
              <div className="flex items-center justify-between">
                <Label>Step 1 — Add PayAfrika to your authenticator app</Label>
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => { setSetupStep("choose"); setTwoFactorSetup(null) }}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="rounded-xl bg-secondary/40 p-4">
                <p className="text-xs text-muted-foreground mb-2">Open your authenticator app and enter this key manually:</p>
                <div className="flex items-center gap-2">
                  <code className="glass rounded-lg px-3 py-2 font-mono text-sm tracking-wider break-all flex-1">{twoFactorSetup.secretKey}</code>
                  <Button variant="outline" size="sm" onClick={() => copyText(twoFactorSetup.secretKey)}>
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Step 2 — Enter the 6-digit code</Label>
                <Input
                  inputMode="numeric"
                  placeholder="000000"
                  className="text-center tracking-[0.5em] font-mono text-lg"
                  maxLength={6}
                  value={setupCode}
                  onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                />
              </div>

              {twoFactorMethod !== "authenticator" && !otpSent && (
                <Button variant="outline" size="sm" onClick={sendSetupOtp}>Send code</Button>
              )}

              {twoFactorError && <p className="text-sm text-red-500">{twoFactorError}</p>}
              <Button variant="gradient" onClick={completeTwoFactorSetup} disabled={saving2FA || setupCode.trim().length < 6} className="w-full">
                {saving2FA ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying...</> : "Enable Two-Factor Authentication"}
              </Button>
            </motion.div>
          )}

          {setupStep === "disable" && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-3 rounded-xl border border-red-200 p-4">
              <div className="flex items-center justify-between">
                <Label>Disable two-factor authentication</Label>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSetupStep(null)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Input type="password" placeholder="Your password" value={disableForm.password} onChange={(e) => setDisableForm({ ...disableForm, password: e.target.value })} />
              <Input
                inputMode="numeric"
                placeholder={overview?.twoFactorMethod === "authenticator" ? "Authenticator or recovery code" : "Verification code"}
                className="text-center tracking-[0.3em] font-mono"
                maxLength={10}
                value={disableForm.code}
                onChange={(e) => setDisableForm({ ...disableForm, code: e.target.value.replace(/[^0-9-]/g, "") })}
              />
              {twoFactorError && <p className="text-sm text-red-500">{twoFactorError}</p>}
              <Button variant="destructive" size="sm" onClick={disableTwoFactor} disabled={saving2FA} className="w-full">
                {saving2FA ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Disabling...</> : "Disable 2FA"}
              </Button>
            </motion.div>
          )}

          {security?.twoFactorEnabled && (
            <div className="flex items-center justify-between rounded-xl bg-secondary/40 p-3">
              <div>
                <p className="text-sm font-medium">Recovery codes</p>
                <p className="text-xs text-muted-foreground">Use these if you lose access to your 2FA device</p>
              </div>
              <Button variant="outline" size="sm" onClick={regenerateRecoveryCodes} disabled={saving2FA}>
                {saving2FA ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                <span className="ml-1">Regenerate</span>
              </Button>
            </div>
          )}

          <SettingRow
            label="Biometric Login"
            description="Use fingerprint or face recognition to log in"
          >
            <Switch
              checked={security?.biometricEnabled || false}
              onCheckedChange={async (v) => {
                try {
                  setSecurity((prev) => (prev ? { ...prev, biometricEnabled: v } : prev))
                } catch { /* ignore */ }
              }}
            />
          </SettingRow>
        </div>
      </SettingsCard>

      {(setupStep === "recovery" || showRecovery) && (
        <SettingsCard title="Recovery Codes">
          <p className="text-sm text-muted-foreground mb-3">Save these recovery codes in a secure place. You can use them to access your account if you lose your two-factor authentication device.</p>
          <div className="glass rounded-xl p-4 font-mono text-sm space-y-1">
            {(regenCodes.length > 0 ? regenCodes : twoFactorSetup?.recoveryCodes ?? []).map((code, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-6 text-right text-muted-foreground">{i + 1}.</span>
                <span>{code}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <Button variant="outline" onClick={() => copyText((regenCodes.length > 0 ? regenCodes : twoFactorSetup?.recoveryCodes ?? []).join("\n"))}>
              {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
              {copied ? "Copied!" : "Copy Codes"}
            </Button>
            <Button variant="ghost" onClick={() => { setShowRecovery(false); setSetupStep(null); setRegenCodes([]) }}>Done</Button>
          </div>
        </SettingsCard>
      )}

      <SettingsCard title="Your Devices">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{devices.length} device{devices.length !== 1 ? "s" : ""} connected</p>
          {devices.length > 1 && <Button variant="ghost" size="sm" onClick={removeAllDevices}>Sign out all devices</Button>}
        </div>
        <div className="space-y-3">
          {devices.length === 0 && <p className="text-sm text-muted-foreground">No devices registered yet.</p>}
          {devices.map((d) => (
            <div key={d.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
              <div className="h-9 w-9 rounded-lg bg-secondary/60 flex items-center justify-center text-muted-foreground">
                {deviceIcon(d)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium flex items-center gap-2">
                  {d.deviceName}
                  {d.isCurrent && <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-semibold">CURRENT</span>}
                  {d.isTrusted && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">TRUSTED</span>}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {[d.browser, d.os].filter(Boolean).join(" · ")}
                  {d.location ? ` · ${d.location}` : ""}
                  {d.ipAddress ? ` · ${d.ipAddress}` : ""}
                </p>
                <p className="text-[11px] text-muted-foreground/70">Last active: {new Date(d.lastActiveAt).toLocaleString()}</p>
              </div>
              {!d.isCurrent && (
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => trustDevice(d.id)} title={d.isTrusted ? "Untrust device" : "Trust device"}>
                    <Shield className={`h-4 w-4 ${d.isTrusted ? "text-accent" : "text-muted-foreground"}`} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => removeDevice(d.id)} title="Remove device">
                    <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </SettingsCard>

      <SettingsCard title="Security Alerts">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{notifications.filter((n) => !n.isRead).length} unread alert{notifications.filter((n) => !n.isRead).length !== 1 ? "s" : ""}</p>
          {notifications.some((n) => !n.isRead) && <Button variant="ghost" size="sm" onClick={markAllRead}>Mark all read</Button>}
        </div>
        <div className="space-y-2">
          {notifications.length === 0 && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" /> No security alerts. You&apos;re all clear.
            </p>
          )}
          {notifications.map((n) => (
            <div key={n.id} className={`flex items-start gap-3 rounded-xl border p-3 ${n.isRead ? "border-border opacity-60" : "border-primary/30 bg-primary/5"}`}>
              <ShieldAlert className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-xs text-muted-foreground">{n.message}</p>
                <p className="text-[11px] text-muted-foreground/70 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
              {!n.isRead && <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />}
            </div>
          ))}
        </div>
      </SettingsCard>

      <SettingsCard title="Security Score">
        <div className="flex items-center gap-4">
          <div className="relative h-20 w-20 flex items-center justify-center">
            <svg className="absolute inset-0" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="35" fill="none" stroke="currentColor" className="text-muted" strokeWidth="6" />
              <circle cx="40" cy="40" r="35" fill="none" stroke="currentColor" className="text-primary" strokeWidth="6"
                strokeDasharray={`${score * 2.2} 220`} transform="rotate(-90) translate(-80)" />
            </svg>
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <div>
            <p className="text-lg font-bold">{score}/100</p>
            <p className="text-sm text-muted-foreground">{scoreLabel} — {overview?.twoFactorEnabled ? "2FA is active" : "enable 2FA to increase your score"}</p>
            <div className="flex flex-wrap gap-2 mt-2 text-[11px]">
              {overview?.isEmailVerified && <span className="px-2 py-0.5 rounded bg-accent/10 text-accent">Email verified</span>}
              {overview?.isPhoneVerified && <span className="px-2 py-0.5 rounded bg-accent/10 text-accent">Phone verified</span>}
              {overview?.hasRecoveryCodes && <span className="px-2 py-0.5 rounded bg-accent/10 text-accent">Recovery codes saved</span>}
            </div>
          </div>
        </div>
      </SettingsCard>
    </SectionWrapper>
  )
}
