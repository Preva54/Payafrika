"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowRight, Check, Copy, Share2, QrCode, CheckCircle2 } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authApi } from "@/lib/api"

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [username, setUsername] = useState("")
  const [copied, setCopied] = useState(false)
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
    country: "South Africa",
    accountType: "Personal" as "Personal" | "Business",
  })

  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (step === 1) {
      if (!form.fullName || !form.email || !form.phoneNumber) return
      setStep(2)
      return
    }
    if (step === 2) {
      if (!form.password || form.password.length < 8) return
      if (form.password !== form.confirmPassword) {
        setError("Passwords do not match")
        return
      }
      setStep(3)
      return
    }
    if (step === 3) {
      setError("")
      setLoading(true)
      try {
        const res = await authApi.register({
          fullName: form.fullName,
          email: form.email,
          password: form.password,
          phoneNumber: form.phoneNumber,
          country: form.country,
          role: form.accountType === "Business" ? "business" : "customer",
        })
        localStorage.setItem("token", res.token)
        setUsername(res.user.username || "@payafrika.user")
        setStep(4)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Registration failed")
      } finally {
        setLoading(false)
      }
    }
  }

  const copyUsername = () => {
    navigator.clipboard.writeText(username)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-payafrika-50/50 to-background dark:from-payafrika-950/20">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 right-1/3 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-payafrika-500/5 rounded-full blur-3xl" />
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
            <h1 className="text-2xl font-bold mb-2">
              {step === 4 ? "Welcome to PayAfrika!" : "Create your account"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {step === 4
                ? "Your username has been created."
                : "Join thousands of businesses and individuals across Africa."}
            </p>
          </div>

          {step < 4 && (
            <div className="flex gap-2 mb-8">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                    s <= step ? "bg-primary" : "bg-secondary"
                  }`}
                />
              ))}
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-destructive/10 text-destructive text-sm text-center">
              {error}
            </div>
          )}

          {step === 4 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <div className="flex justify-center">
                <div className="h-20 w-20 rounded-full bg-accent/10 flex items-center justify-center">
                  <CheckCircle2 className="h-10 w-10 text-accent" />
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Your PayAfrika Username</p>
                <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
                  <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    {username}
                  </span>
                </div>
              </div>

              <p className="text-center text-sm text-muted-foreground">
                You can now receive money using your PayAfrika Username.
              </p>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={copyUsername}>
                  {copied ? <Check className="mr-2 h-4 w-4 text-accent" /> : <Copy className="mr-2 h-4 w-4" />}
                  {copied ? "Copied!" : "Copy"}
                </Button>
                <Button variant="outline" className="flex-1">
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </Button>
              </div>

              <Button variant="gradient" className="w-full" onClick={() => router.push("/dashboard")}>
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              {step === 1 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input id="fullName" placeholder="John Doe" value={form.fullName} onChange={(e) => update("fullName", e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => update("email", e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" type="tel" placeholder="+27 12 345 6789" value={form.phoneNumber} onChange={(e) => update("phoneNumber", e.target.value)} required />
                  </div>
                  <Button type="submit" variant="gradient" className="w-full">
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="password">Create Password</Label>
                    <Input id="password" type="password" placeholder="Min. 8 characters" value={form.password} onChange={(e) => update("password", e.target.value)} required minLength={8} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input id="confirmPassword" type="password" placeholder="Re-enter password" value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} required />
                  </div>
                  <label className="flex items-start gap-2 text-sm text-muted-foreground">
                    <input type="checkbox" className="mt-1 rounded border-border" required />
                    I agree to the{" "}
                    <Link href="#" className="text-primary hover:underline">Terms of Service</Link>{" "}
                    and{" "}
                    <Link href="#" className="text-primary hover:underline">Privacy Policy</Link>
                  </label>
                  <Button type="submit" variant="gradient" className="w-full">
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <select id="country" value={form.country} onChange={(e) => update("country", e.target.value)} className="flex h-11 w-full rounded-xl border border-input bg-transparent px-4 py-2 text-sm">
                      <option>South Africa</option>
                      <option>Nigeria</option>
                      <option>Kenya</option>
                      <option>Ghana</option>
                      <option>Botswana</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Account Type</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {(["Personal", "Business"] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => update("accountType", type)}
                          className={`p-4 rounded-xl border text-center transition-all ${
                            form.accountType === type
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary"
                          }`}
                        >
                          {form.accountType === type && (
                            <Check className="h-4 w-4 text-primary mx-auto mb-1" />
                          )}
                          <p className="font-medium text-sm">{type}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button type="submit" variant="gradient" className="w-full" disabled={loading}>
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Creating Account...
                      </span>
                    ) : (
                      <>
                        Create Account
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </motion.div>
              )}
            </form>
          )}

          {step < 4 && step > 1 && (
            <button
              onClick={() => { setStep(step - 1); setError("") }}
              className="text-sm text-muted-foreground hover:text-foreground mt-4 block mx-auto"
            >
              ← Back
            </button>
          )}

          {step < 4 && (
            <p className="text-center text-sm text-muted-foreground mt-6">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          )}
        </div>
      </motion.div>
    </div>
  )
}
