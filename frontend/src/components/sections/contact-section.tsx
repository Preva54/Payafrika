"use client"

import { useRef } from "react"
import { motion, useInView } from "framer-motion"
import { Mail, Phone, MapPin, MessageCircle, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

const contactInfo = [
  {
    icon: Mail,
    label: "Email",
    value: "hello@payafrika.com",
    action: "Send us an email",
    href: "mailto:hello@payafrika.com",
  },
  {
    icon: Phone,
    label: "Phone",
    value: "+27 87 551 0123",
    action: "Call us",
    href: "tel:+27875510123",
  },
  {
    icon: MapPin,
    label: "Office",
    value: "Sandton, Johannesburg\nSouth Africa",
    action: "View on map",
    href: "#",
  },
  {
    icon: MessageCircle,
    label: "WhatsApp",
    value: "Chat with us",
    action: "Start chat",
    href: "#",
  },
]

export function ContactSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true })

  return (
    <section id="contact" ref={ref} className="relative py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <Badge variant="premium" className="mb-4">Contact</Badge>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Let&apos;s{" "}
            <span className="gradient-text">Talk</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Have a question or need help? We&apos;re here for you 24/7.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-6"
          >
            <div className="glass-card rounded-3xl p-8">
              <h3 className="text-lg font-semibold mb-6">Send us a message</h3>
              <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Full Name</label>
                    <Input placeholder="John Doe" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Email</label>
                    <Input type="email" placeholder="john@example.com" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Subject</label>
                  <Input placeholder="How can we help?" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Message</label>
                  <textarea
                    className="flex min-h-[120px] w-full rounded-xl border border-input bg-transparent px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Tell us more about your inquiry..."
                  />
                </div>
                <Button type="submit" variant="gradient" className="w-full">
                  <Send className="mr-2 h-4 w-4" />
                  Send Message
                </Button>
              </form>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="space-y-4"
          >
            {contactInfo.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="glass-card rounded-2xl p-5 flex items-center gap-4 hover:shadow-card-hover transition-all duration-300 group"
              >
                <div className="h-12 w-12 rounded-xl gradient-bg flex items-center justify-center shrink-0">
                  <item.icon className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="font-medium whitespace-pre-line">{item.value}</p>
                </div>
                <span className="text-sm text-primary group-hover:underline">{item.action} →</span>
              </a>
            ))}

            <div className="glass-card rounded-3xl overflow-hidden h-[250px] bg-muted flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MapPin className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm font-medium">Sandton, Johannesburg</p>
                <p className="text-xs">South Africa</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
