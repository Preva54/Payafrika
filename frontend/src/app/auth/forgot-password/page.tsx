"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowLeft, Loader2, Send } from "lucide-react"
import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authApi } from "@/lib/api"

type Step = "email" | "code" | "done"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("email")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  const handleCodeChange = (i: number, value: string) => {
    const chars = value.replace(/\D/g, "").slice(-1)
    const next = code.split("")
    next[i] = chars
    setCode(next.join("").slice(0, 6))
    if (chars && i < 5) inputsRef.current[i + 1]?.focus()
    if (!chars && i > 0) inputsRef.current[i - 1]?.focus()
  }

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await authApi.forgotPassword(email)
      setMessage("If an account exists for that email, a reset code has been sent. Enter it below.")
      setStep("code")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (code.length < 6) { setError("Enter the 6-digit code from your email."); return }
    if (newPassword.length < 8) { setError("New password must be at least 8 characters."); return }
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return }
    setLoading(true)
    try {
      await authApi.resetPassword({ token: code, newPassword })
      setStep("done")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset password.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-payafrika-50/50 to-background dark:from-payafrika-950/20">
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
            <h1 className="text-2xl font-bold mb-2">
              {step === "done" ? "Password reset" : step === "code" ? "Enter reset code" : "Reset password"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {step === "done"
                ? "Your password has been reset successfully."
                : step === "code"
                  ? `Enter the 6-digit code sent to ${email}`
                  : "Enter your email address and we&apos;ll send you a reset code."}
            </p>
          </div>

          {step === "email" && (
            <form className="space-y-4" onSubmit={handleSendCode}>
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" variant="gradient" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Send Reset Code
              </Button>
            </form>
          )}

          {step === "code" && (
            <form className="space-y-4" onSubmit={handleReset}>
              <div className="flex justify-center gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputsRef.current[i] = el }}
                    maxLength={1}
                    inputMode="numeric"
                    value={code[i] || ""}
                    onChange={(e) => handleCodeChange(i, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && !code[i] && i > 0) inputsRef.current[i - 1]?.focus()
                    }}
                    className="h-14 w-11 rounded-xl border border-border bg-background text-center text-lg font-bold focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  />
                ))}
              </div>

              {message && <p className="text-sm text-accent text-center">{message}</p>}

              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" variant="gradient" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Reset Password
              </Button>
            </form>
          )}

          {step === "done" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                You can now sign in with your new password.
              </p>
              <Button variant="gradient" className="w-full" onClick={() => router.push("/auth/login")}>
                Go to Sign In
              </Button>
            </div>
          )}

          <Link
            href="/auth/login"
            className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground mt-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
