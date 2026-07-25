"use client"

import { useState, useEffect } from "react"
import { settingsApi, type AppearanceSettings } from "@/lib/api"
import { SectionWrapper, SettingsCard, SettingRow } from "../SettingsShared"
import { Switch } from "@/components/ui/switch"
import { motion } from "framer-motion"
import { Palette, Sun, Moon, Monitor } from "lucide-react"
import { useTheme } from "next-themes"

const ACCENT_COLORS = [
  { id: "blue", color: "#0057FF" },
  { id: "sky", color: "#4CC9FF" },
  { id: "green", color: "#00C896" },
  { id: "purple", color: "#8B5CF6" },
  { id: "pink", color: "#EC4899" },
  { id: "amber", color: "#F59E0B" },
  { id: "red", color: "#EF4444" },
]

export function AppearanceSection() {
  const { theme, setTheme } = useTheme()
  const [settings, setSettings] = useState<AppearanceSettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    settingsApi.getAppearance().then((res) => { setSettings(res); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const update = async (key: keyof AppearanceSettings, value: string | boolean) => {
    if (!settings) return
    const updated = { ...settings, [key]: value }
    setSettings(updated)
    try { await settingsApi.updateAppearance(updated) } catch { /* ignore */ }
    if (key === "theme") setTheme(value as string)
  }

  if (loading) return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="glass-card rounded-2xl p-6 animate-pulse"><div className="h-4 bg-muted rounded w-full" /></div>)}</div>

  return (
    <SectionWrapper title="Appearance" description="Customize how PayAfrika looks for you.">
      <SettingsCard title="Theme">
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: "light", label: "Light", icon: <Sun className="h-5 w-5" /> },
            { id: "dark", label: "Dark", icon: <Moon className="h-5 w-5" /> },
            { id: "system", label: "System", icon: <Monitor className="h-5 w-5" /> },
          ].map((t) => (
            <motion.button
              key={t.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => update("theme", t.id)}
              className={`glass rounded-2xl p-4 text-center transition-all ${
                (settings?.theme || "system") === t.id
                  ? "ring-2 ring-primary shadow-lg shadow-primary/20"
                  : "hover:shadow-card-hover"
              }`}
            >
              <div className="h-10 w-10 rounded-xl gradient-bg flex items-center justify-center text-white mx-auto mb-2">
                {t.icon}
              </div>
              <p className="text-sm font-medium">{t.label}</p>
            </motion.button>
          ))}
        </div>
      </SettingsCard>

      <SettingsCard title="Accent Color">
        <div className="flex gap-3">
          {ACCENT_COLORS.map((c) => (
            <motion.button
              key={c.id}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => update("accentColor", c.id)}
              className={`h-9 w-9 rounded-xl transition-all ${
                settings?.accentColor === c.id ? "ring-2 ring-offset-2 ring-offset-background ring-primary scale-110" : ""
              }`}
              style={{ backgroundColor: c.color }}
            />
          ))}
        </div>
      </SettingsCard>

      <SettingsCard title="Layout">
        <div className="space-y-1">
          <SettingRow label="Compact Mode" description="Reduce spacing for a denser interface">
            <Switch checked={settings?.compactMode || false} onCheckedChange={(v) => update("compactMode", v)} />
          </SettingRow>
          <SettingRow label="Animation Intensity" description="Control motion and animation effects">
            <select className="glass rounded-xl px-3 py-2 text-sm" value={settings?.animationIntensity || "medium"} onChange={(e) => update("animationIntensity", e.target.value)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </SettingRow>
          <SettingRow label="Font Size" description="Adjust text size across the interface">
            <select className="glass rounded-xl px-3 py-2 text-sm" value={settings?.fontSize || "medium"} onChange={(e) => update("fontSize", e.target.value)}>
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </SettingRow>
        </div>
      </SettingsCard>
    </SectionWrapper>
  )
}