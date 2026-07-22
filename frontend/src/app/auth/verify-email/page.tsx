"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-payafrika-50/50 to-background dark:from-payafrika-950/20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        <div className="glass-card rounded-3xl p-8 text-center">
          <div className="h-16 w-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-6">
            <span className="text-white text-2xl font-bold">✓</span>
          </div>

          <h1 className="text-2xl font-bold mb-2">Verify your email</h1>
          <p className="text-sm text-muted-foreground mb-8">
            We&apos;ve sent a verification code to your email. Enter it below to activate your account.
          </p>

          <div className="flex justify-center gap-3 mb-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <input
                key={i}
                maxLength={1}
                className="h-14 w-12 rounded-xl border border-border bg-background text-center text-lg font-bold focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              />
            ))}
          </div>

          <Button variant="gradient" className="w-full">
            Verify Email
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>

          <p className="text-sm text-muted-foreground mt-6">
            Didn&apos;t receive the code?{" "}
            <button className="text-primary hover:underline font-medium">Resend</button>
          </p>

          <Link
            href="/auth/login"
            className="block text-sm text-muted-foreground hover:text-foreground mt-4"
          >
            ← Back to sign in
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
