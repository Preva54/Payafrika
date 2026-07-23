"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, ChevronDown, ChevronUp, Download, Filter, Calendar } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

const statusColors: Record<string, "success" | "secondary" | "premium" | "destructive"> = {
  completed: "success",
  pending: "secondary",
  processing: "premium",
  failed: "destructive",
}

const samplePayments = Array.from({ length: 15 }, (_, i) => ({
  id: `PAY-${String(i + 1).padStart(6, "0")}`,
  recipient: ["Thandi Mokoena", "James Okafor", "Amina Diallo", "Kwame Asante", "Naledi Khumalo", "John Smith", "Sarah Chen", "Ahmed Hassan"][i % 8],
  type: ["Bank Transfer", "Mobile Money", "Cross Border", "Bill Payment", "QR Payment", "Wallet Transfer"][i % 6],
  amount: Math.floor(Math.random() * 50000) + 500,
  currency: ["ZAR", "USD", "NGN", "GBP", "EUR"][i % 5],
  status: ["completed", "pending", "processing", "completed", "failed", "completed", "completed", "pending"][i % 8],
  date: new Date(Date.now() - i * 86400000 * Math.random()).toISOString(),
  reference: `INV-${String(i + 100).padStart(4, "0")}`,
}))

export function PaymentsTable() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [expanded, setExpanded] = useState<string | null>(null)

  const filtered = samplePayments.filter(p => {
    if (search && !p.recipient.toLowerCase().includes(search.toLowerCase()) && !p.id.toLowerCase().includes(search.toLowerCase())) return false
    if (statusFilter && p.status !== statusFilter) return false
    return true
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by recipient or ID..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2">
          {["", "completed", "pending", "processing", "failed"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"}`}>
              {s ? s.charAt(0).toUpperCase() + s.slice(1) : "All"}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm"><Calendar className="mr-2 h-4 w-4" />Date</Button>
        <Button variant="outline" size="sm"><Filter className="mr-2 h-4 w-4" />Filters</Button>
        <Button variant="outline" size="sm"><Download className="mr-2 h-4 w-4" />Export</Button>
      </div>
      <AnimatePresence>
        {filtered.map((payment, i) => (
          <motion.div
            key={payment.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            <Card className={`transition-all duration-200 ${expanded === payment.id ? "shadow-md" : "hover:shadow-sm"}`}>
              <button onClick={() => setExpanded(expanded === payment.id ? null : payment.id)} className="w-full text-left">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-sm font-bold">
                      {payment.recipient.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{payment.recipient}</p>
                      <p className="text-xs text-muted-foreground">{payment.type}</p>
                    </div>
                  </div>
                  <div className="hidden sm:block text-sm text-muted-foreground flex-1">{payment.reference}</div>
                  <div className="text-right flex-1">
                    <p className="text-sm font-semibold">{payment.currency === "ZAR" ? "R" : payment.currency === "USD" ? "$" : payment.currency === "NGN" ? "₦" : payment.currency === "GBP" ? "£" : "€"}{payment.amount.toLocaleString()}</p>
                  </div>
                  <div className="w-24 text-right hidden md:block">
                    <Badge variant={statusColors[payment.status]}>{payment.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground w-20 text-right hidden lg:block">{new Date(payment.date).toLocaleDateString()}</div>
                  <div className="ml-3 text-muted-foreground">{expanded === payment.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</div>
                </CardContent>
              </button>
              {expanded === payment.id && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="border-t px-4 py-4 bg-secondary/20">
                  <div className="grid sm:grid-cols-3 gap-4 text-sm">
                    <div><span className="text-muted-foreground">Transaction ID</span><p className="font-mono font-medium">{payment.id}</p></div>
                    <div><span className="text-muted-foreground">Reference</span><p className="font-medium">{payment.reference}</p></div>
                    <div><span className="text-muted-foreground">Date</span><p className="font-medium">{new Date(payment.date).toLocaleString()}</p></div>
                    <div><span className="text-muted-foreground">Recipient</span><p className="font-medium">{payment.recipient}</p></div>
                    <div><span className="text-muted-foreground">Amount</span><p className="font-medium">{payment.currency === "ZAR" ? "R" : "$"}{payment.amount.toLocaleString()}</p></div>
                    <div><span className="text-muted-foreground">Status</span><Badge variant={statusColors[payment.status]}>{payment.status}</Badge></div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm"><Download className="mr-2 h-4 w-4" />Receipt</Button>
                    <Button variant="outline" size="sm">View Details</Button>
                    <Button variant="outline" size="sm" className="text-destructive">Report Issue</Button>
                  </div>
                </motion.div>
              )}
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
      {filtered.length === 0 && (
        <Card><CardContent className="text-center py-12 text-muted-foreground"><p className="text-lg font-medium">No payments found</p><p className="text-sm mt-1">Try adjusting your filters.</p></CardContent></Card>
      )}
    </div>
  )
}
