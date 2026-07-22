"use client"

import { useRef } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import dynamic from "next/dynamic"

const GlobeComponent = dynamic(
  () => import("@/components/animations/three-globe").then((m) => ({ default: m.ThreeGlobe })),
  {
    ssr: false,
    loading: () => null,
  }
)

export function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null)

  return (
    <section ref={containerRef} className="relative min-h-screen flex items-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-payafrika-50/50 via-transparent to-background dark:from-payafrika-950/20" />

      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-payafrika-500/10 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-sky/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-accent/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: "2s" }} />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 backdrop-blur-sm px-4 py-1.5 text-sm"
            >
              <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
              Now serving 12+ African countries
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tight text-balance leading-[1.05]"
            >
              Empowering{" "}
              <span className="gradient-text">Africa&apos;s</span>
              <br />
              Digital Economy
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg sm:text-xl text-muted-foreground max-w-xl text-balance leading-relaxed"
            >
              One secure platform for loans, cross-border payments, digital currency exchange, import &amp; export services, and business growth.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Button variant="gradient" size="xl" asChild>
                <Link href="/auth/register">
                  Apply for Loan
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button variant="glass" size="xl" asChild>
                <Link href="#services">
                  Explore Services
                </Link>
              </Button>
              <Button variant="outline" size="xl" asChild>
                <Link href="#">
                  <Play className="mr-2 h-5 w-5" />
                  Watch Demo
                </Link>
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="flex items-center gap-8 pt-4"
            >
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-8 w-8 rounded-full border-2 border-background bg-gradient-to-br from-payafrika-400 to-sky"
                  />
                ))}
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">50,000+</span> happy customers
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="relative hidden lg:block"
          >
            <div className="relative aspect-square max-w-lg mx-auto">
              <div className="absolute inset-0 rounded-full">
                <GlobeComponent />
              </div>

              <div className="absolute -top-4 -right-4 glass-card rounded-2xl p-4 shadow-card-hover animate-float-slow z-10">
                <p className="text-xs text-muted-foreground">Exchange Rate</p>
                <p className="text-lg font-bold">1 USD = R18.25</p>
                <p className="text-xs text-accent">▲ +0.32%</p>
              </div>

              <div className="absolute -bottom-4 -left-4 glass-card rounded-2xl p-4 shadow-card-hover animate-float z-10" style={{ animationDelay: "1s" }}>
                <p className="text-xs text-muted-foreground">Loan Approved</p>
                <p className="text-lg font-bold">R250,000</p>
                <p className="text-xs text-muted-foreground">in 24 hours</p>
              </div>

              <div className="absolute top-1/2 -right-8 glass-card rounded-2xl p-3 shadow-card-hover animate-float z-10" style={{ animationDelay: "2s" }}>
                <p className="text-xs text-muted-foreground">Live Transactions</p>
                <p className="text-lg font-bold">12,847</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
