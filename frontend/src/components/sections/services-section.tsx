"use client"

import { useRef, useState } from "react"
import { motion, useInView, AnimatePresence } from "framer-motion"
import {
  Wallet, Building2, Globe, TrendingUp, Ship, Plane, Shield,
  Truck, Store, Users, Briefcase, PiggyBank, X
} from "lucide-react"
import { services } from "@/data/mock-data"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

const iconMap: Record<string, React.ElementType> = {
  Wallet, Building2, Globe, TrendingUp, Ship, Plane, Shield,
  Truck, Store, Users, Briefcase, PiggyBank,
}

const categoryColors: Record<string, string> = {
  loans: "from-payafrika-500 to-payafrika-600",
  payments: "from-sky to-blue-500",
  exchange: "from-accent to-green-500",
  trade: "from-amber-500 to-orange-500",
  business: "from-purple-500 to-pink-500",
}

export function ServicesSection() {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>("all")
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true })

  const filteredServices = filter === "all" ? services : services.filter((s) => s.category === filter)
  const categories = ["all", ...new Set(services.map((s) => s.category))]

  return (
    <section id="services" ref={ref} className="relative py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <Badge variant="premium" className="mb-4">Our Services</Badge>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Everything You Need to{" "}
            <span className="gradient-text">Succeed</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From loans to logistics, we provide end-to-end financial services for individuals and businesses across Africa.
          </p>
        </motion.div>

        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all duration-200",
                filter === cat
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              {cat === "all" ? "All Services" : cat}
            </button>
          ))}
        </div>

        <motion.div layout className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredServices.map((service, index) => {
              const Icon = iconMap[service.icon] || Wallet
              const isExpanded = expandedId === service.id

              return (
                <motion.div
                  key={service.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={isInView ? { opacity: 1, scale: 1 } : {}}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={cn(
                    "group relative rounded-2xl border p-6 cursor-pointer transition-all duration-300",
                    isExpanded
                      ? "col-span-2 row-span-2 shadow-card-hover border-primary/30"
                      : "hover:shadow-card-hover hover:-translate-y-1",
                    "bg-card hover:bg-card/80"
                  )}
                  onClick={() => setExpandedId(isExpanded ? null : service.id)}
                >
                  <div className={cn(
                    "absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                    "bg-gradient-to-br from-transparent via-transparent to-primary/5"
                  )} />

                  <div className="relative z-10">
                    <div className={cn(
                      "h-12 w-12 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br",
                      categoryColors[service.category] || "from-payafrika-500 to-sky"
                    )}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>

                    <Badge variant="secondary" className="mb-3 capitalize text-xs">
                      {service.category}
                    </Badge>

                    <h3 className="text-lg font-semibold mb-2">{service.title}</h3>
                    <p className={cn("text-sm text-muted-foreground", isExpanded ? "" : "line-clamp-2")}>
                      {service.description}
                    </p>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="mt-4 space-y-3"
                        >
                          <div className="border-t border-border pt-4">
                            <p className="text-sm font-medium mb-3">Features:</p>
                            <ul className="space-y-2">
                              {service.features.map((feature) => (
                                <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                                  <div className="h-5 w-5 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                                    <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                                  </div>
                                  {feature}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <Button variant="gradient" size="sm" className="w-full">
                            Get Started
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  )
}
