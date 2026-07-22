"use client"

import { useState, useRef } from "react"
import { motion, useInView } from "framer-motion"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"

export function LoanCalculatorSection() {
  const [amount, setAmount] = useState(100000)
  const [interest, setInterest] = useState(12.5)
  const [period, setPeriod] = useState(12)
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true })

  const monthlyRate = interest / 100 / 12
  const payment = amount * (monthlyRate * Math.pow(1 + monthlyRate, period)) / (Math.pow(1 + monthlyRate, period) - 1)
  const totalPayment = payment * period
  const totalInterest = totalPayment - amount
  const eligibilityScore = Math.min(95, Math.floor(amount / 10000) * 2 + 50)

  return (
    <section id="calculator" ref={ref} className="relative py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <Badge variant="premium" className="mb-4">Loan Calculator</Badge>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            See Your{" "}
            <span className="gradient-text">Monthly Payment</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Adjust the sliders to estimate your loan payments. No impact on your credit score.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-4xl mx-auto"
        >
          <div className="glass-card rounded-3xl p-8 md:p-10">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Loan Amount</label>
                    <span className="text-lg font-bold">{formatCurrency(amount)}</span>
                  </div>
                  <Slider
                    value={[amount]}
                    onValueChange={([v]) => setAmount(v)}
                    min={1000}
                    max={500000}
                    step={1000}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>R1,000</span>
                    <span>R500,000</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Interest Rate</label>
                    <span className="text-lg font-bold">{interest}%</span>
                  </div>
                  <Slider
                    value={[interest]}
                    onValueChange={([v]) => setInterest(v)}
                    min={5}
                    max={30}
                    step={0.5}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>5%</span>
                    <span>30%</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Repayment Period</label>
                    <span className="text-lg font-bold">{period} months</span>
                  </div>
                  <Slider
                    value={[period]}
                    onValueChange={([v]) => setPeriod(v)}
                    min={1}
                    max={72}
                    step={1}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1 month</span>
                    <span>72 months</span>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="glass rounded-2xl p-6 space-y-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">Monthly Payment</p>
                    <p className="text-4xl md:text-5xl font-bold gradient-text">
                      {formatCurrency(Math.round(payment))}
                    </p>
                  </div>

                  <div className="border-t border-border pt-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Interest</span>
                      <span className="font-medium">{formatCurrency(Math.round(totalInterest))}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Payment</span>
                      <span className="font-medium">{formatCurrency(Math.round(totalPayment))}</span>
                    </div>
                  </div>
                </div>

                <div className="glass rounded-2xl p-6">
                  <p className="text-sm text-muted-foreground mb-3">Eligibility Score</p>
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex-1 h-3 rounded-full bg-secondary overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={isInView ? { width: `${eligibilityScore}%` } : {}}
                        transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                        className={`h-full rounded-full ${
                          eligibilityScore >= 80 ? "bg-accent" : eligibilityScore >= 60 ? "bg-amber-500" : "bg-destructive"
                        }`}
                      />
                    </div>
                    <span className="text-2xl font-bold">{eligibilityScore}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {eligibilityScore >= 80
                      ? "Excellent — you have a high chance of approval."
                      : eligibilityScore >= 60
                      ? "Good — most applicants at this level are approved."
                      : "Fair — consider a smaller loan amount for better odds."}
                  </p>
                </div>

                <Button variant="gradient" className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Download Summary (PDF)
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
