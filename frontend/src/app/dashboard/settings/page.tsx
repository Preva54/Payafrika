"use client"

import { useState, useCallback } from "react"
import { SettingsSidebar } from "@/components/settings/SettingsSidebar"
import { ProfileSection } from "@/components/settings/sections/ProfileSection"
import { SecuritySection } from "@/components/settings/sections/SecuritySection"
import { NotificationsSection } from "@/components/settings/sections/NotificationsSection"
import { WalletSection } from "@/components/settings/sections/WalletSection"
import { PaymentMethodsSection } from "@/components/settings/sections/PaymentMethodsSection"
import { BusinessSection } from "@/components/settings/sections/BusinessSection"
import { ApiKeysSection } from "@/components/settings/sections/ApiKeysSection"
import { TeamSection } from "@/components/settings/sections/TeamSection"
import { PrivacySection } from "@/components/settings/sections/PrivacySection"
import { IntegrationsSection } from "@/components/settings/sections/IntegrationsSection"
import { BillingSection } from "@/components/settings/sections/BillingSection"
import { AppearanceSection } from "@/components/settings/sections/AppearanceSection"
import { LanguageRegionSection } from "@/components/settings/sections/LanguageRegionSection"
import { DevicesSection } from "@/components/settings/sections/DevicesSection"
import { ActivityLogsSection } from "@/components/settings/sections/ActivityLogsSection"
import { PreferencesSection } from "@/components/settings/sections/PreferencesSection"
import { DeleteAccountSection } from "@/components/settings/sections/DeleteAccountSection"
import { motion, AnimatePresence } from "framer-motion"

const sections: Record<string, React.ReactNode> = {
  profile: <ProfileSection />,
  security: <SecuritySection />,
  notifications: <NotificationsSection />,
  wallet: <WalletSection />,
  "payment-methods": <PaymentMethodsSection />,
  business: <BusinessSection />,
  "api-keys": <ApiKeysSection />,
  team: <TeamSection />,
  privacy: <PrivacySection />,
  integrations: <IntegrationsSection />,
  billing: <BillingSection />,
  appearance: <AppearanceSection />,
  "language-region": <LanguageRegionSection />,
  devices: <DevicesSection />,
  activity: <ActivityLogsSection />,
  preferences: <PreferencesSection />,
  delete: <DeleteAccountSection />,
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("profile")

  return (
    <div className="flex gap-6">
      <SettingsSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
      <div className="flex-1 min-w-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {sections[activeSection] || <ProfileSection />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}