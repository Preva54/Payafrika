"use client"

import { useState, useEffect } from "react"
import { settingsApi, type ActivityLogItem } from "@/lib/api"
import { SectionWrapper, SettingsCard } from "../SettingsShared"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { motion } from "framer-motion"
import { History, Search, Download, Filter } from "lucide-react"

const CATEGORY_ICONS: Record<string, string> = {
  profile: "👤", security: "🔒", business: "🏢", wallet: "💳",
  api: "🔑", team: "👥", integrations: "🔌", billing: "💰",
  account: "📋", payment: "💸",
}

export function ActivityLogsSection() {
  const [logs, setLogs] = useState<ActivityLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterCat, setFilterCat] = useState("")

  const fetchLogs = (category?: string) => {
    setLoading(true)
    settingsApi.getActivityLogs(1, 50, category).then((res) => { setLogs(res); setLoading(false) }).catch(() => setLoading(false))
  }

  useEffect(() => { fetchLogs() }, [])

  const filtered = logs.filter((l) =>
    l.action.toLowerCase().includes(search.toLowerCase()) &&
    (!filterCat || l.category === filterCat)
  )

  if (loading) return <div className="space-y-4">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="glass-card rounded-2xl p-6 animate-pulse"><div className="h-4 bg-muted rounded w-full" /></div>)}</div>

  return (
    <SectionWrapper title="Activity Logs" description="Track every action taken on your account.">
      <SettingsCard>
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search activity..."
              className="rounded-xl pl-10"
            />
          </div>
          <select className="glass rounded-xl px-3 py-2.5 text-sm" value={filterCat} onChange={(e) => { setFilterCat(e.target.value); fetchLogs(e.target.value) }}>
            <option value="">All Categories</option>
            {Object.keys(CATEGORY_ICONS).map((cat) => (
              <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
            ))}
          </select>
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {filtered.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No activity logs found</p>
            </div>
          )}
          {filtered.map((log, i) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.02 }}
              className="flex items-start gap-3 p-3 glass rounded-xl"
            >
              <span className="text-lg mt-0.5">{CATEGORY_ICONS[log.category] || "📌"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{log.action}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(log.createdAt).toLocaleString()} · {log.ipAddress || "---"}
                </p>
              </div>
              <span className="text-xs text-muted-foreground capitalize shrink-0">{log.category}</span>
            </motion.div>
          ))}
        </div>
      </SettingsCard>
    </SectionWrapper>
  )
}