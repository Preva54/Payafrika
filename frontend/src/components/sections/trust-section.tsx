"use client"

import { useRef } from "react"
import { motion, useInView } from "framer-motion"
import { stats } from "@/data/mock-data"
import { formatNumber } from "@/lib/utils"

function Counter({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })

  return (
    <div className="text-center">
      <div className="text-4xl md:text-5xl font-bold mb-2">
        <span ref={ref}>
          {isInView ? formatNumber(value) : "0"}
        </span>
        <span className="gradient-text">{suffix}</span>
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

export function TrustSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true })

  return (
    <section ref={ref} className="relative py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Trusted Across{" "}
            <span className="gradient-text">Africa</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Thousands of businesses and individuals rely on PayAfrika for their financial needs.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-20">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Counter value={stat.value} suffix={stat.suffix} label={stat.label} />
            </motion.div>
          ))}
        </div>

        <div className="relative overflow-hidden py-8">
          <div className="flex gap-12 animate-marquee">
            {[...Array(2)].map((_, setIdx) => (
              <div key={setIdx} className="flex gap-12 items-center">
                {["Standard Bank", "Flutterwave", "Paystack", "MTN", "M-Pesa", "Ecobank", "Access Bank", "Ozow"].map(
                  (name, i) => (
                    <div
                      key={`${setIdx}-${i}`}
                      className="h-12 px-6 rounded-xl border border-border bg-background/50 backdrop-blur-sm flex items-center justify-center text-sm font-medium text-muted-foreground whitespace-nowrap"
                    >
                      {name}
                    </div>
                  )
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
