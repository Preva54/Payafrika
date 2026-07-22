"use client"

import { useRef } from "react"
import { motion, useInView } from "framer-motion"
import { UserPlus, ShieldCheck, FileText, CheckCircle, Rocket } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { timelineSteps } from "@/data/mock-data"
import { cn } from "@/lib/utils"

const iconMap: Record<string, React.ElementType> = {
  UserPlus, ShieldCheck, FileText, CheckCircle, Rocket,
}

export function HowItWorksSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section ref={ref} className="relative py-20 md:py-28 bg-secondary/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <Badge variant="premium" className="mb-4">How It Works</Badge>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Get Started in{" "}
            <span className="gradient-text">5 Simple Steps</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From registration to your first transaction — we make it fast, secure, and completely digital.
          </p>
        </motion.div>

        <div className="relative max-w-3xl mx-auto">
          <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-payafrika-500 via-sky to-accent hidden md:block" />

          <div className="space-y-12">
            {timelineSteps.map((step, index) => {
              const Icon = iconMap[step.icon] || Rocket

              return (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, x: -30 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.5, delay: index * 0.15 }}
                  className="relative flex items-start gap-6 md:gap-8"
                >
                  <div className={cn(
                    "relative z-10 hidden md:flex h-16 w-16 shrink-0 rounded-2xl items-center justify-center",
                    "bg-gradient-to-br from-payafrika-500 to-sky shadow-lg shadow-primary/20"
                  )}>
                    <Icon className="h-7 w-7 text-white" />
                  </div>

                  <div className="glass-card rounded-2xl p-6 flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="flex md:hidden h-8 w-8 rounded-lg gradient-bg items-center justify-center text-white text-sm font-bold">
                        {step.step}
                      </span>
                      <Badge variant="outline" className="text-xs">Step {step.step}</Badge>
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                    <p className="text-muted-foreground">{step.description}</p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
