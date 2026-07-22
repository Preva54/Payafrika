"use client"

import { useRef, useState } from "react"
import { motion, useInView } from "framer-motion"
import { Globe, ArrowRight, Ship, Plane, Shield } from "lucide-react"
import { countries } from "@/data/mock-data"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function ImportExportSection() {
  const [activeCountry, setActiveCountry] = useState(countries[0])
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true })

  return (
    <section id="trade" ref={ref} className="relative py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <Badge variant="premium" className="mb-4">Import & Export</Badge>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Global Trade,{" "}
            <span className="gradient-text">Simplified</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Connect with markets across Africa. We handle the logistics, compliance, and documentation.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="glass-card rounded-3xl p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <Globe className="h-6 w-6 text-primary" />
              <h3 className="text-lg font-semibold">Select a Country</h3>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-8">
              {countries.map((country) => (
                <button
                  key={country.code}
                  onClick={() => setActiveCountry(country)}
                  className={cn(
                    "p-4 rounded-2xl border text-left transition-all duration-200",
                    activeCountry.code === country.code
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border hover:border-primary/50 hover:bg-secondary/50"
                  )}
                >
                  <span className="text-2xl mb-2 block">
                    {country.code === "ZA" ? "🇿🇦" : country.code === "NG" ? "🇳🇬" : country.code === "KE" ? "🇰🇪" : "🇬🇭"}
                  </span>
                  <p className="font-semibold text-sm">{country.name}</p>
                  <p className="text-xs text-muted-foreground">{country.code}</p>
                </button>
              ))}
            </div>

            <div className="border-t border-border pt-6">
              <h4 className="font-semibold mb-4">Trade Information</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
                  <span className="text-sm text-muted-foreground">Trade Volume</span>
                  <span className="text-sm font-semibold">{activeCountry.tradeVolume}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
                  <span className="text-sm text-muted-foreground">Shipping Estimate</span>
                  <span className="text-sm font-semibold">{activeCountry.shippingEstimate}</span>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground block mb-2">Available Services</span>
                  <div className="flex flex-wrap gap-2">
                    {activeCountry.services.map((service) => (
                      <Badge key={service} variant="secondary">{service}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground block mb-2">Required Documents</span>
                  <ul className="space-y-2">
                    {activeCountry.documents.map((doc) => (
                      <li key={doc} className="flex items-center gap-2 text-sm">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        {doc}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="space-y-6"
          >
            <div className="glass-card rounded-3xl p-8 h-full flex flex-col items-center justify-center text-center">
              <div className="relative w-full max-w-sm aspect-square mb-6">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-payafrika-500/10 via-sky/10 to-accent/10" />
                <div className="absolute inset-8 flex items-center justify-center">
                  <div className="text-center">
                    <Globe className="h-16 w-16 text-primary/30 mx-auto mb-4" />
                    <div className="flex justify-center gap-4">
                      {[
                        { from: "🇿🇦", to: "🇳🇬" },
                        { from: "🇰🇪", to: "🇬🇭" },
                        { from: "🇧🇼", to: "🇿🇲" },
                      ].map((route, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <span>{route.from}</span>
                          <ArrowRight className="h-3 w-3 text-primary" />
                          <span>{route.to}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <h3 className="text-xl font-semibold mb-2">Global Trade Network</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Connecting African businesses with the world. Trade routes across 12+ countries.
              </p>

              <div className="grid grid-cols-3 gap-3 w-full">
                {[
                  { icon: Ship, label: "Sea Freight" },
                  { icon: Plane, label: "Air Freight" },
                  { icon: Shield, label: "Insurance" },
                ].map((item) => (
                  <div key={item.label} className="p-4 rounded-2xl border border-border text-center hover:border-primary/50 transition-colors">
                    <item.icon className="h-5 w-5 mx-auto mb-2 text-primary" />
                    <p className="text-xs font-medium">{item.label}</p>
                  </div>
                ))}
              </div>

              <Button variant="gradient" className="w-full mt-6">
                Start Trading
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
