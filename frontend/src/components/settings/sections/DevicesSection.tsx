"use client"

import { useState, useEffect } from "react"
import { settingsApi, type ConnectedDeviceItem } from "@/lib/api"
import { SectionWrapper, SettingsCard } from "../SettingsShared"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import { Monitor, Smartphone, Trash2, Shield, ShieldOff, LogOut } from "lucide-react"

export function DevicesSection() {
  const [devices, setDevices] = useState<ConnectedDeviceItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    settingsApi.getDevices().then((res) => { setDevices(res); setLoading(false) })
  }, [])

  const toggleTrust = async (id: string) => {
    await settingsApi.toggleTrustDevice(id)
    setDevices(devices.map((d) => d.id === id ? { ...d, isTrusted: !d.isTrusted } : d))
  }

  const remove = async (id: string) => {
    await settingsApi.removeDevice(id)
    setDevices(devices.filter((d) => d.id !== id))
  }

  const removeAll = async () => {
    await settingsApi.removeAllDevices()
    setDevices(devices.filter((d) => d.isCurrent))
  }

  if (loading) return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="glass-card rounded-2xl p-6 animate-pulse"><div className="h-4 bg-muted rounded w-1/3 mb-3" /><div className="h-10 bg-muted rounded-xl w-full" /></div>)}</div>

  return (
    <SectionWrapper title="Connected Devices" description="Manage devices that have access to your account.">
      <SettingsCard>
        <div className="space-y-3">
          {devices.map((device, i) => (
            <motion.div
              key={device.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between p-4 glass rounded-xl group"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl gradient-bg flex items-center justify-center text-white">
                  {device.deviceType === "mobile" ? <Smartphone className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{device.deviceName}</p>
                    {device.isCurrent && <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">Current</Badge>}
                    {device.isTrusted && <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">Trusted</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {device.browser && `${device.browser} on `}{device.os} · {device.location || "Unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Last active: {new Date(device.lastActiveAt).toLocaleDateString()} · IP: {device.ipAddress || "---"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={() => toggleTrust(device.id)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground">
                  {device.isTrusted ? <ShieldOff className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                </button>
                <button onClick={() => remove(device.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
        {devices.length > 1 && (
          <div className="flex justify-end mt-4">
            <Button variant="outline" size="sm" onClick={removeAll} className="text-red-500">
              <LogOut className="h-4 w-4 mr-1" /> Sign Out All Devices
            </Button>
          </div>
        )}
      </SettingsCard>
    </SectionWrapper>
  )
}