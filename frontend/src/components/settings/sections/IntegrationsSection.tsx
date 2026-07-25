"use client"

import { useState, useEffect } from "react"
import { settingsApi, type IntegrationItem } from "@/lib/api"
import { SectionWrapper, SettingsCard } from "../SettingsShared"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import { Puzzle, Link2, Unlink, Check, RefreshCw, ExternalLink } from "lucide-react"

const INTEGRATION_ICONS: Record<string, string> = {
  shopify: "🛍️", woocommerce: "🛒", magento: "📦", wordpress: "📝",
  salesforce: "☁️", hubspot: "🔶", zapier: "⚡", slack: "💬",
  microsoft_teams: "💼", quickbooks: "📊", xero: "📈",
}

export function IntegrationsSection() {
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)

  useEffect(() => {
    settingsApi.getIntegrations().then((res) => { setIntegrations(res); setLoading(false) })
  }, [])

  const connect = async (provider: string) => {
    setConnecting(provider)
    await settingsApi.connectIntegration(provider)
    setIntegrations(integrations.map((i) => i.provider === provider ? { ...i, isConnected: true, syncStatus: "synced", lastSyncedAt: new Date().toISOString() } : i))
    setConnecting(null)
  }

  const disconnect = async (provider: string) => {
    await settingsApi.disconnectIntegration(provider)
    setIntegrations(integrations.map((i) => i.provider === provider ? { ...i, isConnected: false, syncStatus: "disconnected" } : i))
  }

  if (loading) return <div className="space-y-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="glass-card rounded-2xl p-6 animate-pulse"><div className="h-10 bg-muted rounded-xl w-full" /></div>)}</div>

  return (
    <SectionWrapper title="Integrations" description="Connect your favorite tools and platforms to PayAfrika.">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map((integration, i) => (
          <motion.div
            key={integration.provider}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className={`glass-card rounded-2xl p-5 ${integration.isConnected ? "border-green-500/20" : ""}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{INTEGRATION_ICONS[integration.provider] || "🔌"}</span>
                <div>
                  <p className="font-medium capitalize">{integration.provider.replace("_", " ")}</p>
                  {integration.isConnected && (
                    <div className="flex items-center gap-1 text-xs text-green-500">
                      <Check className="h-3 w-3" /> Connected
                      {integration.lastSyncedAt && <span className="text-muted-foreground"> · Synced {new Date(integration.lastSyncedAt).toLocaleDateString()}</span>}
                    </div>
                  )}
                </div>
              </div>
              {integration.isConnected ? (
                <Button variant="outline" size="sm" className="text-red-500" onClick={() => disconnect(integration.provider)}>
                  <Unlink className="h-3 w-3 mr-1" /> Disconnect
                </Button>
              ) : (
                <Button variant="gradient" size="sm" onClick={() => connect(integration.provider)} disabled={connecting === integration.provider}>
                  {connecting === integration.provider ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Link2 className="h-3 w-3 mr-1" />}
                  Connect
                </Button>
              )}
            </div>
            {integration.isConnected && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <RefreshCw className="h-3 w-3" />
                <span>Sync status: {integration.syncStatus}</span>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </SectionWrapper>
  )
}