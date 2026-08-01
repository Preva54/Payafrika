"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Plus, Search, Edit2, Trash2, Star, Banknote, Globe, Phone, Mail, MoreHorizontal, CheckCircle2, XCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { beneficiariesApi, type Beneficiary } from "@/lib/api"

export default function BeneficiariesPage() {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  const fetchBeneficiaries = async () => {
    setLoading(true)
    try {
      const data = await beneficiariesApi.getAll()
      setBeneficiaries(data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchBeneficiaries() }, [])

  const filtered = beneficiaries.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    (b.bankName || "").toLowerCase().includes(search.toLowerCase()) ||
    (b.accountNumber || "").includes(search)
  )

  const handleDelete = async (id: string) => {
    try {
      await beneficiariesApi.delete(id)
      await fetchBeneficiaries()
    } catch {}
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Beneficiaries</h1>
          <p className="text-sm text-muted-foreground">Manage saved recipients for faster transfers</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search beneficiaries..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}><CardContent className="p-4"><div className="h-12 bg-secondary rounded-lg" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((b, i) => (
            <motion.div key={b.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-sm font-bold">
                        {b.name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{b.nickname || b.name}</p>
                        {b.nickname && <p className="text-xs text-muted-foreground">{b.name}</p>}
                        <p className="text-xs text-muted-foreground font-mono">{b.accountNumber || "No account"}</p>
                        {b.lastUsedAt && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Last used {new Date(b.lastUsedAt).toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {b.isVerified && <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="mr-1 h-3 w-3" />Verified</Badge>}
                      {!b.isVerified && <Badge variant="secondary" className="bg-yellow-50 text-yellow-700 border-yellow-200"><XCircle className="mr-1 h-3 w-3" />Pending</Badge>}
                      {b.isFavorite && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                      <Badge variant="outline">{b.currency}</Badge>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><Edit2 className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => handleDelete(b.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
          {filtered.length === 0 && (
            <Card><CardContent className="p-8 text-center">
              <Banknote className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No beneficiaries found</p>
            </CardContent></Card>
          )}
        </div>
      )}
    </div>
  )
}