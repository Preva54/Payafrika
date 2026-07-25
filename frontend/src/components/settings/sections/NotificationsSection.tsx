"use client"

import { useState, useEffect } from "react"
import { settingsApi, type NotificationPreferences } from "@/lib/api"
import { SectionWrapper, SettingsCard } from "../SettingsShared"
import { Switch } from "@/components/ui/switch"
import { motion } from "framer-motion"
import { Bell, Mail, MessageSquare, Smartphone, Globe, Shield } from "lucide-react"

const CHANNELS = [
  { id: "email", label: "Email", icon: <Mail className="h-4 w-4" /> },
  { id: "sms", label: "SMS", icon: <MessageSquare className="h-4 w-4" /> },
  { id: "push", label: "Push", icon: <Smartphone className="h-4 w-4" /> },
  { id: "whatsapp", label: "WhatsApp", icon: <Globe className="h-4 w-4" /> },
  { id: "in_app", label: "In-App", icon: <Bell className="h-4 w-4" /> },
]

const CATEGORIES = [
  { id: "payments", label: "Payments", icon: <Mail className="h-4 w-4" /> },
  { id: "wallet", label: "Wallet Activity", icon: <Smartphone className="h-4 w-4" /> },
  { id: "security", label: "Security Alerts", icon: <Shield className="h-4 w-4" /> },
  { id: "merchant", label: "Merchant Updates", icon: <Globe className="h-4 w-4" /> },
  { id: "promotions", label: "Promotions", icon: <Bell className="h-4 w-4" /> },
  { id: "news", label: "News", icon: <MessageSquare className="h-4 w-4" /> },
  { id: "settlements", label: "Settlement Updates", icon: <Mail className="h-4 w-4" /> },
  { id: "support", label: "Support Replies", icon: <MessageSquare className="h-4 w-4" /> },
  { id: "api", label: "API Alerts", icon: <Globe className="h-4 w-4" /> },
  { id: "maintenance", label: "System Maintenance", icon: <Shield className="h-4 w-4" /> },
]

export function NotificationsSection() {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    settingsApi.getNotifications().then((res) => { setPrefs(res); setLoading(false) })
  }, [])

  const toggle = async (category: string, channel: string, value: boolean) => {
    if (!prefs) return
    const updated = { ...prefs }
    if (!updated.channels[category]) updated.channels[category] = {}
    updated.channels[category][channel] = value
    setPrefs(updated)
    await settingsApi.updateNotification({ category, channel, enabled: value })
  }

  if (loading) return <div className="space-y-4">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="glass-card rounded-2xl p-6 animate-pulse"><div className="h-4 bg-muted rounded w-1/3 mb-3" /><div className="h-10 bg-muted rounded-xl w-full" /></div>)}</div>

  return (
    <SectionWrapper title="Notifications" description="Choose how and when you receive notifications.">
      <SettingsCard>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Category</th>
                {CHANNELS.map((ch) => (
                  <th key={ch.id} className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">
                    <div className="flex items-center justify-center gap-1">
                      {ch.icon}
                      <span className="hidden md:inline">{ch.label}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CATEGORIES.map((cat, i) => (
                <motion.tr
                  key={cat.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-border/20 hover:bg-secondary/30 transition-colors"
                >
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      {cat.icon}
                      <span className="text-sm">{cat.label}</span>
                    </div>
                  </td>
                  {CHANNELS.map((ch) => (
                    <td key={ch.id} className="text-center py-3 px-2">
                      <Switch
                        checked={prefs?.channels[cat.id]?.[ch.id] ?? false}
                        onCheckedChange={(v) => toggle(cat.id, ch.id, v)}
                      />
                    </td>
                  ))}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </SettingsCard>
    </SectionWrapper>
  )
}