"use client"

import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import {
  User,
  Building2,
  Shield,
  Bell,
  Wallet,
  CreditCard,
  Key,
  Users,
  Lock,
  Puzzle,
  CreditCard as BillingIcon,
  Palette,
  Globe,
  Monitor,
  History,
  Sliders,
  Trash2,
} from "lucide-react"

export interface NavItem {
  id: string
  label: string
  icon: React.ReactNode
}

export const settingsNavItems: NavItem[] = [
  { id: "profile", label: "Profile", icon: <User className="h-4 w-4" /> },
  { id: "business", label: "Business", icon: <Building2 className="h-4 w-4" /> },
  { id: "security", label: "Security", icon: <Shield className="h-4 w-4" /> },
  { id: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
  { id: "wallet", label: "Wallet", icon: <Wallet className="h-4 w-4" /> },
  { id: "payment-methods", label: "Payment Methods", icon: <CreditCard className="h-4 w-4" /> },
  { id: "api-keys", label: "API & Developers", icon: <Key className="h-4 w-4" /> },
  { id: "team", label: "Team Management", icon: <Users className="h-4 w-4" /> },
  { id: "privacy", label: "Privacy", icon: <Lock className="h-4 w-4" /> },
  { id: "integrations", label: "Integrations", icon: <Puzzle className="h-4 w-4" /> },
  { id: "billing", label: "Billing", icon: <BillingIcon className="h-4 w-4" /> },
  { id: "appearance", label: "Appearance", icon: <Palette className="h-4 w-4" /> },
  { id: "language-region", label: "Language & Region", icon: <Globe className="h-4 w-4" /> },
  { id: "devices", label: "Connected Devices", icon: <Monitor className="h-4 w-4" /> },
  { id: "activity", label: "Activity Logs", icon: <History className="h-4 w-4" /> },
  { id: "preferences", label: "Account Preferences", icon: <Sliders className="h-4 w-4" /> },
  { id: "delete", label: "Delete Account", icon: <Trash2 className="h-4 w-4" /> },
]

interface SettingsSidebarProps {
  activeSection: string
  onSectionChange: (id: string) => void
}

export function SettingsSidebar({ activeSection, onSectionChange }: SettingsSidebarProps) {
  return (
    <div className="w-64 shrink-0">
      <div className="glass-card rounded-2xl p-3 sticky top-24">
        <nav className="space-y-0.5">
          {settingsNavItems.map((item, i) => (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03, duration: 0.3 }}
              onClick={() => onSectionChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                activeSection === item.id
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              )}
            >
              {item.icon}
              <span>{item.label}</span>
            </motion.button>
          ))}
        </nav>
      </div>
    </div>
  )
}