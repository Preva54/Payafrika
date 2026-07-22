"use client"

import { useRef } from "react"
import { motion, useInView } from "framer-motion"
import { Check, X } from "lucide-react"
import { comparisonData } from "@/data/mock-data"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export function ComparisonSection() {
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
          <Badge variant="premium" className="mb-4">Why PayAfrika</Badge>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Built Different.{" "}
            <span className="gradient-text">Built Better.</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            See how we compare to traditional banking. The difference is clear.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-4xl mx-auto"
        >
          <div className="glass-card rounded-3xl overflow-hidden">
            <div className="grid grid-cols-3 border-b border-border">
              <div className="p-5 font-semibold">Feature</div>
              <div className="p-5 font-semibold text-center bg-muted/50">Traditional Banks</div>
              <div className="p-5 font-semibold text-center gradient-bg text-white">PayAfrika</div>
            </div>

            {comparisonData.map((item, index) => (
              <motion.div
                key={item.feature}
                initial={{ opacity: 0, x: -20 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
                className={cn(
                  "grid grid-cols-3 border-b border-border last:border-b-0 transition-colors duration-200 hover:bg-secondary/30",
                )}
              >
                <div className="p-5 text-sm font-medium">{item.feature}</div>
                <div className="p-5 text-sm text-center text-muted-foreground flex items-center justify-center gap-2">
                  <X className="h-4 w-4 text-destructive shrink-0" />
                  {item.bank}
                </div>
                <div className="p-5 text-sm text-center flex items-center justify-center gap-2">
                  <Check className="h-4 w-4 text-accent shrink-0" />
                  <span className="font-medium">{item.payafrika}</span>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="flex justify-center gap-8 mt-8">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-destructive/70" />
              <span className="text-xs text-muted-foreground">Traditional Banks</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-accent" />
              <span className="text-xs text-muted-foreground">PayAfrika</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
