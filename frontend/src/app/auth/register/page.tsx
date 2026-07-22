"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function RegisterPage() {
  const [step, setStep] = useState(1)

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
            <h1 className="text-2xl font-bold mb-2">Create your account</h1>
            <p className="text-sm text-muted-foreground">Join thousands of businesses and individuals across Africa.</p>
          </div>

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

          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input placeholder="John Doe" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" placeholder="you@example.com" />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input type="tel" placeholder="+27 12 345 6789" />
                </div>
                <Button
                  type="button"
                  variant="gradient"
                  className="w-full"
                  onClick={() => setStep(2)}
                >
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
                  <Label>Create Password</Label>
                  <Input type="password" placeholder="Min. 8 characters" />
                </div>
                <div className="space-y-2">
                  <Label>Confirm Password</Label>
                  <Input type="password" placeholder="Re-enter password" />
                </div>
                <label className="flex items-start gap-2 text-sm text-muted-foreground">
                  <input type="checkbox" className="mt-1 rounded border-border" />
                  I agree to the{" "}
                  <Link href="#" className="text-primary hover:underline">Terms of Service</Link>{" "}
                  and{" "}
                  <Link href="#" className="text-primary hover:underline">Privacy Policy</Link>
                </label>
                <Button
                  type="button"
                  variant="gradient"
                  className="w-full"
                  onClick={() => setStep(3)}
                >
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
                  <Label>Country</Label>
                  <select className="flex h-11 w-full rounded-xl border border-input bg-transparent px-4 py-2 text-sm">
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
                    {["Personal", "Business"].map((type) => (
                      <button
                        key={type}
                        type="button"
                        className="p-4 rounded-xl border border-border text-center hover:border-primary transition-colors"
                      >
                        <p className="font-medium text-sm">{type}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <Button type="submit" variant="gradient" className="w-full">
                  Create Account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            )}
          </form>

          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="text-sm text-muted-foreground hover:text-foreground mt-4 block mx-auto"
            >
              ← Back
            </button>
          )}

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
