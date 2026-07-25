"use client"

import { useState, useEffect } from "react"
import { settingsApi, type PaymentMethod } from "@/lib/api"
import { SectionWrapper, SettingsCard } from "../SettingsShared"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import { CreditCard, Landmark, Trash2, Star, Smartphone, QrCode, Plus } from "lucide-react"

export function PaymentMethodsSection() {
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    settingsApi.getPaymentMethods().then((res) => { setMethods(res); setLoading(false) })
  }, [])

  const remove = async (id: string) => {
    await settingsApi.removePaymentMethod(id)
    setMethods(methods.filter((m) => m.id !== id))
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "card": case "virtual_card": return <CreditCard className="h-5 w-5" />
      case "bank": return <Landmark className="h-5 w-5" />
      case "mobile_money": return <Smartphone className="h-5 w-5" />
      case "qr": return <QrCode className="h-5 w-5" />
      default: return <CreditCard className="h-5 w-5" />
    }
  }

  if (loading) return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="glass-card rounded-2xl p-6 animate-pulse"><div className="h-4 bg-muted rounded w-full" /></div>)}</div>

  return (
    <SectionWrapper title="Payment Methods" description="Manage your cards, bank accounts, and payment methods.">
      <SettingsCard>
        <div className="space-y-3">
          {methods.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No payment methods added yet</p>
              <Button variant="gradient" className="mt-4" onClick={() => setShowAdd(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add Payment Method
              </Button>
            </div>
          )}
          {methods.map((method, i) => (
            <motion.div
              key={method.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between p-4 glass rounded-xl group hover:shadow-card-hover transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-14 rounded-lg gradient-bg flex items-center justify-center text-white">
                  {getIcon(method.type)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">
                      {method.type === "bank" ? "Bank Account" : method.type === "virtual_card" ? "Virtual Card" : "Card"}
                      {method.isVirtual && " (Virtual)"}
                    </p>
                    {method.isDefault && <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">Default</Badge>}
                    {method.isVerified && <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">Verified</Badge>}
                  </div>
                  {method.lastFour && <p className="text-sm text-muted-foreground">****{method.lastFour}{method.expiry ? ` | Expires ${method.expiry}` : ""}</p>}
                </div>
              </div>
              <button onClick={() => remove(method.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                <Trash2 className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </div>
      </SettingsCard>

      {methods.length > 0 && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Payment Method
          </Button>
        </div>
      )}

      {showAdd && (
        <SettingsCard title="Add Payment Method">
          <p className="text-sm text-muted-foreground mb-4">Link your bank account to get started. Card and mobile money options coming soon.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { label: "Debit / Credit Card", icon: <CreditCard className="h-5 w-5" />, desc: "Visa, Mastercard, Amex" },
              { label: "Bank Account", icon: <Bank className="h-5 w-5" />, desc: "SA bank account" },
              { label: "Mobile Money", icon: <Smartphone className="h-5 w-5" />, desc: "M-Pesa, Airtel Money" },
            ].map((item, i) => (
              <motion.button
                key={item.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass rounded-xl p-4 text-left hover:shadow-card-hover transition-all group"
              >
                <div className="h-10 w-10 rounded-lg gradient-bg flex items-center justify-center text-white mb-2 group-hover:scale-110 transition-transform">
                  {item.icon}
                </div>
                <p className="font-medium text-sm">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </motion.button>
            ))}
          </div>
          <div className="flex justify-end mt-4">
            <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </SettingsCard>
      )}
    </SectionWrapper>
  )
}