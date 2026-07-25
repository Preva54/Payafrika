"use client"

import { useState, useEffect } from "react"
import { settingsApi, type ApiKeyItem, type CreateApiKeyResult } from "@/lib/api"
import { SectionWrapper, SettingsCard } from "../SettingsShared"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import { Key, Copy, Check, Trash2, Plus, Eye, EyeOff, ExternalLink } from "lucide-react"

export function ApiKeysSection() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newKey, setNewKey] = useState<CreateApiKeyResult | null>(null)
  const [form, setForm] = useState({ name: "", environment: "sandbox", scopes: "" })
  const [creating, setCreating] = useState(false)
  const [copiedKey, setCopiedKey] = useState("")
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({})

  useEffect(() => {
    settingsApi.getApiKeys().then((res) => { setKeys(res); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const create = async () => {
    if (!form.name) return
    setCreating(true)
    let result: CreateApiKeyResult
    try { result = await settingsApi.createApiKey({
      name: form.name,
      environment: form.environment,
      scopes: form.scopes.split(",").map((s) => s.trim()).filter(Boolean),
    })
    setNewKey(result)
    setKeys([...keys, { id: result.id, name: result.name, keyPreview: result.key.slice(0, 8) + "...", environment: result.environment, scopes: [], allowedDomains: [], callbackUrls: [], isActive: true, createdAt: new Date().toISOString() }])
    setCreating(false)
    setForm({ name: "", environment: "sandbox", scopes: "" })
    } catch { setCreating(false) }
  }

  const remove = async (id: string) => {
    try { await settingsApi.deleteApiKey(id) } catch { return }
    setKeys(keys.filter((k) => k.id !== id))
  }

  const copy = (val: string, id: string) => {
    navigator.clipboard.writeText(val)
    setCopiedKey(id)
    setTimeout(() => setCopiedKey(""), 2000)
  }

  if (loading) return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="glass-card rounded-2xl p-6 animate-pulse"><div className="h-4 bg-muted rounded w-full" /></div>)}</div>

  return (
    <SectionWrapper title="API & Developers" description="Manage your API keys, webhooks, and developer credentials.">
      {newKey && (
        <SettingsCard title="API Key Created" className="border-green-500/30">
          <p className="text-sm text-muted-foreground mb-3">Copy your API key and secret now. You won&apos;t be able to see the secret again.</p>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">API Key</Label>
              <div className="flex gap-2">
                <Input value={newKey.key} readOnly className="rounded-xl font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={() => copy(newKey.key, "key-" + newKey.id)}>
                  {copiedKey === "key-" + newKey.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Secret Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input value={newKey.secret} type={showSecret[newKey.id] ? "text" : "password"} readOnly className="rounded-xl font-mono text-xs pr-10" />
                  <button onClick={() => setShowSecret({ ...showSecret, [newKey.id]: !showSecret[newKey.id] })} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showSecret[newKey.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button variant="outline" size="icon" onClick={() => copy(newKey.secret, "secret-" + newKey.id)}>
                  {copiedKey === "secret-" + newKey.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <Button variant="ghost" className="text-sm" onClick={() => setNewKey(null)}>I&apos;ve saved my keys</Button>
          </div>
        </SettingsCard>
      )}

      {showCreate && !newKey && (
        <SettingsCard title="Create API Key">
          <div className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label>Key Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Production API" className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Environment</Label>
              <select className="glass rounded-xl px-3 py-2.5 text-sm w-full" value={form.environment} onChange={(e) => setForm({ ...form, environment: e.target.value })}>
                <option value="sandbox">Sandbox</option>
                <option value="production">Production</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Scopes (comma-separated)</Label>
              <Input value={form.scopes} onChange={(e) => setForm({ ...form, scopes: e.target.value })} placeholder="payments:read, wallet:write" className="rounded-xl" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button variant="gradient" onClick={create} disabled={creating || !form.name}>
                {creating ? "Creating..." : "Generate Key"}
              </Button>
            </div>
          </div>
        </SettingsCard>
      )}

      <SettingsCard title="API Keys">
        <div className="space-y-3">
          {keys.length === 0 && !showCreate && (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No API keys yet</p>
              <Button variant="gradient" className="mt-4" onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 mr-1" /> Create API Key
              </Button>
            </div>
          )}
          {keys.map((key, i) => (
            <motion.div
              key={key.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between p-4 glass rounded-xl group"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg gradient-bg flex items-center justify-center text-white"><Key className="h-4 w-4" /></div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{key.name}</p>
                    <Badge className={`text-xs ${key.environment === "production" ? "bg-amber-500/10 text-amber-500" : "bg-blue-500/10 text-blue-500"}`}>
                      {key.environment}
                    </Badge>
                    {!key.isActive && <Badge className="bg-red-500/10 text-red-500 text-xs">Inactive</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">{key.keyPreview}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copy(key.keyPreview, "preview-" + key.id)}>
                  {copiedKey === "preview-" + key.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => remove(key.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </motion.div>
          ))}
          {keys.length > 0 && (
            <Button variant="outline" className="w-full" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-1" /> Create API Key
            </Button>
          )}
        </div>
      </SettingsCard>
    </SectionWrapper>
  )
}