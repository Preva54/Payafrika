"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowRight, ArrowLeft, Eye, EyeOff, ShieldAlert, Smartphone, Mail, KeyRound } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuthStore } from "@/stores/use-auth-store"
import { authApi } from "@/lib/api"

const CHANNEL_LABELS: Record<string, string> = {
  sms: "SMS",
  email: "Email",
  authenticator: "Authenticator app",
}

export default function LoginPage() {
  const router = useRouter()
  const { pendingChallenge, loginEmail, login, verifyLogin, cancelChallenge } = useAuthStore()

  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const [code, setCode] = useState("")
  const [useRecoveryCode, setUseRecoveryCode] = useState(false)
  const [attemptsLeft, setAttemptsLeft] = useState(pendingChallenge?.maxAttempts ?? 5)
  const [countdown, setCountdown] = useState(pendingChallenge?.expiresInSeconds ?? 0)
  const [resending, setResending] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!pendingChallenge) return
    setCountdown(pendingChallenge.expiresInSeconds ?? 300)
    setAttemptsLeft(pendingChallenge.maxAttempts ?? 5)
    setCode("")
    setError("")
    setUseRecoveryCode(false)

    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1 && timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
        return Math.max(0, prev - 1)
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [pendingChallenge])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const completed = await login(email, password)
      if (completed) {
        redirectToHome()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed")
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (code.trim().length < 6) {
      setError("Enter the 6-digit code.")
      return
    }
    setError("")
    setLoading(true)
    try {
      await verifyLogin(code.trim())
      redirectToHome()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Verification failed"
      setError(message)
      const match = message.match(/(\d+) attempts remaining/)
      if (match) setAttemptsLeft(parseInt(match[1], 10))
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!pendingChallenge) return
    setResending(true)
    setError("")
    try {
      const res = await authApi.resendOtp(pendingChallenge.challengeId)
      setCountdown(res.expiresInSeconds ?? 300)
      setAttemptsLeft(res.maxAttempts ?? 5)
      setCode("")
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1 && timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
          }
          return Math.max(0, prev - 1)
        })
      }, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend code.")
    } finally {
      setResending(false)
    }
  }

  const handleBack = () => {
    cancelChallenge()
  }

  const redirectToHome = () => {
    const role = useAuthStore.getState().user?.role
    if (role === "admin") {
      sessionStorage.setItem("admin_user", JSON.stringify({ email, name: useAuthStore.getState().user?.fullName, role: "superadmin" }))
      router.push("/admin")
    } else {
      router.push("/dashboard")
    }
  }

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  const showOtpStep = !!pendingChallenge

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-payafrika-50/50 to-background dark:from-payafrika-950/20">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-payafrika-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-sky/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        <div className="glass-card rounded-3xl p-8">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-6">
              <div className="h-8 w-8 rounded-lg gradient-bg flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <span className="font-bold text-xl">PayAfrika</span>
            </Link>
            {showOtpStep ? (
              <>
                <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  {pendingChallenge.channel === "authenticator" ? (
                    <KeyRound className="h-7 w-7" />
                  ) : pendingChallenge.channel === "sms" ? (
                    <Smartphone className="h-7 w-7" />
                  ) : (
                    <Mail className="h-7 w-7" />
                  )}
                </div>
                <h1 className="text-2xl font-bold mb-2">Verify it&apos;s you</h1>
                <p className="text-sm text-muted-foreground">
                  {pendingChallenge.message}
                  {pendingChallenge.isNewDevice && pendingChallenge.newDeviceDisplayName && (
                    <span className="block mt-1 text-xs">
                      <strong>{pendingChallenge.newDeviceDisplayName}</strong> — {pendingChallenge.recoveryCodeHint}
                    </span>
                  )}
                  {!pendingChallenge.isNewDevice && pendingChallenge.recoveryCodeHint && (
                    <span className="block mt-1 text-xs">{pendingChallenge.recoveryCodeHint}</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Code sent via <strong>{CHANNEL_LABELS[pendingChallenge.channel] ?? pendingChallenge.channel}</strong> to {loginEmail}
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold mb-2">Welcome back</h1>
                <p className="text-sm text-muted-foreground">Sign in to your account to continue.</p>
              </>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-destructive/10 text-destructive text-sm text-center">
              {error}
            </div>
          )}

          {showOtpStep ? (
            <form className="space-y-4" onSubmit={handleVerify}>
              <div className="space-y-2">
                <Label htmlFor="otp">
                  {pendingChallenge.channel === "authenticator" && !useRecoveryCode
                    ? "Authenticator code"
                    : useRecoveryCode
                      ? "Recovery code"
                      : "Verification code"}
                </Label>
                <Input
                  id="otp"
                  inputMode="numeric"
                  autoFocus
                  placeholder={useRecoveryCode ? "XXX-XXX" : "6-digit code"}
                  className="text-center text-xl tracking-[0.5em] font-mono"
                  maxLength={10}
                  value={code}
                  onChange={(e) => {
                    const sanitized = useRecoveryCode
                      ? e.target.value.toUpperCase().replace(/[^0-9-]/g, "").slice(0, 7)
                      : e.target.value.replace(/\D/g, "").slice(0, 6)
                    setCode(sanitized)
                  }}
                  required
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  {attemptsLeft} attempt{attemptsLeft !== 1 ? "s" : ""} remaining
                </span>
                <span className={countdown === 0 ? "text-destructive font-medium" : "text-muted-foreground font-mono"}>
                  {countdown > 0 ? formatCountdown(countdown) : "Code expired"}
                </span>
              </div>

              {pendingChallenge.channel === "authenticator" && (
                <button
                  type="button"
                  onClick={() => {
                    setUseRecoveryCode(!useRecoveryCode)
                    setCode("")
                    setError("")
                  }}
                  className="w-full text-xs text-primary hover:underline"
                >
                  {useRecoveryCode ? "Use authenticator app instead" : "Can't access your authenticator? Use a recovery code"}
                </button>
              )}

              <Button type="submit" variant="gradient" className="w-full" disabled={loading || code.trim().length < 6}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Verifying...
                  </span>
                ) : (
                  <>
                    Verify & Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleBack}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={countdown > 0 || resending}
                  className="text-xs text-primary hover:underline disabled:text-muted-foreground disabled:no-underline disabled:cursor-not-allowed"
                >
                  {resending ? "Sending..." : countdown > 0 ? `Resend in ${formatCountdown(countdown)}` : "Resend code"}
                </button>
              </div>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    className="pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded border-border" />
                  Remember me
                </label>
                <Link href="/auth/forgot-password" className="text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Button type="submit" variant="gradient" className="w-full" disabled={loading}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          )}

          {!showOtpStep && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="w-full">Google</Button>
                <Button variant="outline" className="w-full">Apple</Button>
              </div>
            </>
          )}

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/auth/register" className="text-primary hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
