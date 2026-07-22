import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { HeroSection } from "@/components/sections/hero"
import { TrustSection } from "@/components/sections/trust-section"
import { ServicesSection } from "@/components/sections/services-section"
import { HowItWorksSection } from "@/components/sections/how-it-works"
import { LoanCalculatorSection } from "@/components/sections/loan-calculator"
import { ExchangeSection } from "@/components/sections/exchange-section"
import { ImportExportSection } from "@/components/sections/import-export-section"
import { ComparisonSection } from "@/components/sections/comparison-section"
import { TestimonialsSection } from "@/components/sections/testimonials-section"
import { MobileAppSection } from "@/components/sections/mobile-app-section"
import { FAQSection } from "@/components/sections/faq-section"
import { ContactSection } from "@/components/sections/contact-section"

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <HeroSection />
        <TrustSection />
        <ServicesSection />
        <HowItWorksSection />
        <LoanCalculatorSection />
        <ExchangeSection />
        <ImportExportSection />
        <ComparisonSection />
        <TestimonialsSection />
        <MobileAppSection />
        <FAQSection />
        <ContactSection />
      </main>
      <Footer />
    </>
  )
}
