"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowRight, Loader2 } from "lucide-react"
import { Suspense, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authApi } from "@/lib/api"

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const initialEmail = searchParams.get("email") || ""

  const [email, setEmail] = useState(initialEmail)
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendMsg, setResendMsg] = useState("")
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  const handleCodeChange = (i: number, value: string) => {
    const next = code.split("")
    next[i] = value.replace(/\D/g, "").slice(-1)
    const joined = next.join("").slice(0, 6).padEnd(code.length > 6 ? code.length : 6, "").slice(0, 6)
    setCode(next.join("").slice(0, 6))
    if (value && i < 5) inputsRef.current[i + 1]?.focus()
    if (!value && i > 0) inputsRef.current[i - 1]?.focus()
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!email) { setError("Enter the email address you registered with."); return }
    if (code.length < 6) { setError("Enter the 6-digit verification code."); return }
    setLoading(true)
    try {
      await authApi.verifyEmail({ email, code })
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.")
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!email) { setError("Enter your email address first."); return }
    setError("")
    setResending(true)
    setResendMsg("")
    try {
      const res = await authApi.forgotPassword(email)
      setResendMsg("If that email exists, a verification code was sent. Check your inbox.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend code.")
    } finally {
      setResending(false)
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
        <div className="glass-card rounded-3xl p-8 text-center">
          {success ? (
            <>
              <div className="h-16 w-16 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold">✓</span>
              </div>
              <h1 className="text-2xl font-bold mb-2">Email verified</h1>
              <p className="text-sm text-muted-foreground mb-8">
                Your email address has been verified. You can now sign in to your account.
              </p>
              <Link href="/auth/login">
                <Button variant="gradient" className="w-full">
                  Go to Sign In
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </>
          ) : (
            <>
              <div className="h-16 w-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-6">
                <span className="text-white text-2xl font-bold">✓</span>
              </div>

              <h1 className="text-2xl font-bold mb-2">Verify your email</h1>
              <p className="text-sm text-muted-foreground mb-6">
                We&apos;ve sent a verification code to your email. Enter it below to activate your account.
              </p>

              <form onSubmit={handleVerify} className="space-y-4 text-left">
                <div className="space-y-2">
                  <Label htmlFor="verify-email">Email address</Label>
                  <Input
                    id="verify-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

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

                {error && <p className="text-sm text-destructive text-center">{error}</p>}
                {resendMsg && <p className="text-sm text-accent text-center">{resendMsg}</p>}

                <Button type="submit" variant="gradient" className="w-full" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Verifying...
                    </span>
                  ) : (
                    <>
                      Verify Email
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <p className="text-sm text-muted-foreground mt-6">
                Didn&apos;t receive the code?{" "}
                <button onClick={handleResend} disabled={resending} className="text-primary hover:underline font-medium disabled:text-muted-foreground">
                  {resending ? "Sending..." : "Resend"}
                </button>
              </p>

              <Link
                href="/auth/login"
                className="block text-sm text-muted-foreground hover:text-foreground mt-4"
              >
                ← Back to sign in
              </Link>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  )
}
