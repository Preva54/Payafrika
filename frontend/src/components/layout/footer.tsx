"use client"

import Link from "next/link"
import { ArrowUp, Mail, Phone, MapPin, Globe, MessageCircle, AtSign, Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const footerLinks = {
  products: [
    { label: "Personal Loans", href: "#" },
    { label: "Business Loans", href: "#" },
    { label: "Cross Border Payments", href: "#" },
    { label: "Currency Exchange", href: "#" },
    { label: "Import Services", href: "#" },
    { label: "Export Services", href: "#" },
    { label: "B2B Marketplace", href: "#" },
  ],
  company: [
    { label: "About Us", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Blog", href: "/blog" },
    { label: "Press", href: "#" },
    { label: "Partners", href: "#" },
    { label: "Affiliate Program", href: "#" },
  ],
  support: [
    { label: "Help Center", href: "#" },
    { label: "Contact Us", href: "#contact" },
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "Cookie Policy", href: "#" },
    { label: "Security", href: "#" },
  ],
}

export function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <footer className="relative border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg gradient-bg flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <span className="font-bold text-xl tracking-tight">PayAfrika</span>
            </Link>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">
              Empowering Africa&apos;s digital economy with secure loans, cross-border payments, currency exchange, and trade services.
            </p>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl border border-border flex items-center justify-center hover:bg-secondary transition-colors cursor-pointer">
                <Globe className="h-4 w-4" />
              </div>
              <div className="h-10 w-10 rounded-xl border border-border flex items-center justify-center hover:bg-secondary transition-colors cursor-pointer">
                <MessageCircle className="h-4 w-4" />
              </div>
              <div className="h-10 w-10 rounded-xl border border-border flex items-center justify-center hover:bg-secondary transition-colors cursor-pointer">
                <AtSign className="h-4 w-4" />
              </div>
              <div className="h-10 w-10 rounded-xl border border-border flex items-center justify-center hover:bg-secondary transition-colors cursor-pointer">
                <Camera className="h-4 w-4" />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>hello@payafrika.com</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>+27 87 551 0123</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>Sandton, Johannesburg, South Africa</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-sm mb-4">Products</h3>
            <ul className="space-y-3">
              {footerLinks.products.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-sm mb-4">Company</h3>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-sm mb-4">Support</h3>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <div className="grid md:grid-cols-2 gap-8 items-start">
            <div>
              <h3 className="font-semibold text-sm mb-3">Subscribe to our newsletter</h3>
              <p className="text-sm text-muted-foreground mb-4">Get the latest fintech news and updates delivered to your inbox.</p>
              <div className="flex gap-2 max-w-md">
                <Input placeholder="Enter your email" type="email" className="flex-1" />
                <Button variant="gradient">Subscribe</Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 justify-start md:justify-end">
              <div className="h-10 px-4 rounded-xl border border-border flex items-center text-xs font-medium">PCI DSS</div>
              <div className="h-10 px-4 rounded-xl border border-border flex items-center text-xs font-medium">ISO 27001</div>
              <div className="h-10 px-4 rounded-xl border border-border flex items-center text-xs font-medium">GDPR</div>
              <div className="h-10 px-4 rounded-xl border border-border flex items-center text-xs font-medium">POPIA</div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} PayAfrika. All rights reserved. PayAfrika (Pty) Ltd is a licensed financial services provider.
          </p>
          <div className="flex gap-4">
            <Link href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Privacy</Link>
            <Link href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
            <Link href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Cookies</Link>
          </div>
        </div>
      </div>

      <button
        onClick={scrollToTop}
        className="fixed bottom-8 right-8 h-12 w-12 rounded-2xl gradient-bg text-white shadow-lg shadow-primary/25 flex items-center justify-center hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 z-40"
      >
        <ArrowUp className="h-5 w-5" />
      </button>
    </footer>
  )
}
