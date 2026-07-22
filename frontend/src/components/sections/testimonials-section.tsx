"use client"

import { useRef } from "react"
import { motion, useInView } from "framer-motion"
import { Star, Quote } from "lucide-react"
import { testimonials } from "@/data/mock-data"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

export function TestimonialsSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true })

  return (
    <section ref={ref} className="relative py-20 md:py-28 bg-secondary/50 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <Badge variant="premium" className="mb-4">Testimonials</Badge>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Loved by{" "}
            <span className="gradient-text">Thousands</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Hear from our customers across Africa about their PayAfrika experience.
          </p>
        </motion.div>

        <div className="relative">
          <div className="flex gap-6 pb-4 overflow-x-auto no-scrollbar">
            {[...testimonials, ...testimonials].map((testimonial, index) => (
              <motion.div
                key={`${testimonial.id}-${index}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.4, delay: (index % testimonials.length) * 0.08 }}
                className="glass-card rounded-2xl p-6 min-w-[350px] md:min-w-[420px] shrink-0 hover:shadow-card-hover transition-all duration-300"
              >
                <Quote className="h-8 w-8 text-primary/20 mb-4" />
                <p className="text-sm leading-relaxed mb-6 text-muted-foreground">
                  &ldquo;{testimonial.content}&rdquo;
                </p>

                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-4 w-4",
                        i < testimonial.rating ? "text-amber-400 fill-amber-400" : "text-muted"
                      )}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="gradient-bg text-white text-sm">
                      {testimonial.name.split(" ").map((n) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold">{testimonial.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {testimonial.role}, {testimonial.company}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}


