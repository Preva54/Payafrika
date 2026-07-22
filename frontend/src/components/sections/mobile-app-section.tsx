"use client"

import { useRef } from "react"
import { motion, useInView } from "framer-motion"
import { Smartphone, QrCode, Apple } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function MobileAppSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true })

  return (
    <section ref={ref} className="relative py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="premium" className="mb-4">Mobile App</Badge>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Your Finances in{" "}
              <span className="gradient-text">Your Pocket</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-md">
              Manage loans, send money, exchange currencies, and track your business on the go. Available for iOS and Android.
            </p>

            <div className="space-y-4 mb-8">
              {[
                "Apply for loans in under 2 minutes",
                "Real-time transaction tracking",
                "Biometric security & 2FA",
                "Instant push notifications",
                "Offline transaction history",
              ].map((feature, i) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, x: -20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.3, delay: 0.2 + i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="h-6 w-6 rounded-full bg-accent/10 flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-accent" />
                  </div>
                  <span className="text-sm">{feature}</span>
                </motion.div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="gradient" size="lg" className="gap-3">
                <Apple className="h-5 w-5" />
                App Store
              </Button>
              <Button variant="outline" size="lg" className="gap-3">
                <Smartphone className="h-5 w-5" />
                Google Play
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative flex justify-center"
          >
            <div className="relative">
              <div className="relative w-[280px] h-[560px] rounded-[3rem] border-[3px] border-border bg-background shadow-2xl overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-6 rounded-b-2xl bg-background border-x-[3px] border-b-[3px] border-border z-10" />
                <div className="h-full bg-gradient-to-b from-payafrika-50 via-background to-background dark:from-payafrika-950/30 p-6 pt-12">
                  <div className="space-y-4">
                    <div className="h-8 w-8 rounded-lg gradient-bg flex items-center justify-center">
                      <span className="text-white font-bold text-xs">P</span>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Account Balance</p>
                      <p className="text-2xl font-bold">R 124,850.00</p>
                    </div>
                    <div className="space-y-2">
                      {[
                        { label: "Loan Payment", amount: "-R2,500", time: "Today" },
                        { label: "Transfer Received", amount: "+R15,000", time: "Yesterday" },
                        { label: "Currency Exchange", amount: "+R3,200", time: "2 days ago" },
                      ].map((tx, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-background/80 border border-border">
                          <div>
                            <p className="text-xs font-medium">{tx.label}</p>
                            <p className="text-[10px] text-muted-foreground">{tx.time}</p>
                          </div>
                          <span className={cn(
                            "text-xs font-semibold",
                            tx.amount.startsWith("+") ? "text-accent" : ""
                          )}>{tx.amount}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-4 -right-4 glass-card rounded-2xl p-4 shadow-card-hover animate-float">
                <QrCode className="h-8 w-8 mb-2" />
                <p className="text-xs font-medium">Scan to Download</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}


