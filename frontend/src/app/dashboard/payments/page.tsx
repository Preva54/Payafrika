"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Send, Clock, Users, CreditCard, Globe, QrCode, BarChart3, Receipt, RefreshCw } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { QuickActions } from "./quick-actions"
import { SendMoneyWizard } from "./send-money-wizard"
import { DashboardPaymentsTable } from "./payments-table"
import { dashboardApi, beneficiariesApi, scheduledPaymentsApi, exchangeRatesApi, type Transaction, type Beneficiary, type SchedulePayment, type ExchangeRate, type WalletResponse } from "@/lib/api"

const tabs = [
  { value: "overview", label: "Overview", icon: Send },
  { value: "send", label: "Send Money", icon: Send },
  { value: "payments", label: "History", icon: Clock },
  { value: "scheduled", label: "Scheduled", icon: Clock },
  { value: "beneficiaries", label: "Beneficiaries", icon: Users },
  { value: "bills", label: "Bill Pay", icon: CreditCard },
  { value: "international", label: "International", icon: Globe },
  { value: "qr", label: "QR", icon: QrCode },
  { value: "analytics", label: "Analytics", icon: BarChart3 },
  { value: "receipts", label: "Receipts", icon: Receipt },
]

export default function PaymentsPage() {
  const [showSendWizard, setShowSendWizard] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [wallet, setWallet] = useState<WalletResponse | null>(null)
  const [scheduled, setScheduled] = useState<SchedulePayment[]>([])
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
  const [rates, setRates] = useState<ExchangeRate[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [txData, walletData, schedData, benData, rateData] = await Promise.all([
        dashboardApi.transactions().catch(() => [] as Transaction[]),
        dashboardApi.wallet().catch(() => null),
        scheduledPaymentsApi.getAll().catch(() => [] as SchedulePayment[]),
        beneficiariesApi.getAll().catch(() => [] as Beneficiary[]),
        exchangeRatesApi.get().catch(() => [] as ExchangeRate[]),
      ])
      setTransactions(txData)
      setWallet(walletData)
      setScheduled(schedData)
      setBeneficiaries(benData)
      setRates(rateData)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  const payments = transactions.filter(t => t.type === "payment" || t.type === "transfer" || t.type === "deposit" || t.type === "withdrawal")
  const totalSent = payments.filter(t => t.type === "payment" || t.type === "transfer" || t.type === "withdrawal").reduce((s, t) => s + t.amount, 0)
  const pendingPayments = payments.filter(t => t.status === "pending").reduce((s, t) => s + t.amount, 0)
  const completedPayments = payments.filter(t => t.status === "completed")
  const successRate = completedPayments.length > 0 ? Math.round((completedPayments.length / (payments.length || 1)) * 100) : 0

  if (showSendWizard) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Send Money</h1>
          <Button variant="ghost" size="sm" onClick={() => setShowSendWizard(false)}>Back to Payments</Button>
        </div>
        <SendMoneyWizard onClose={() => setShowSendWizard(false)} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-sm text-muted-foreground">Send, receive, and manage payments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAll}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
          <Button variant="gradient" size="sm" onClick={() => setShowSendWizard(true)}><Send className="mr-2 h-4 w-4" />Send Money</Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto pb-1">
          <TabsList className="inline-flex min-w-max gap-1">
            {tabs.map(t => (
              <TabsTrigger key={t.value} value={t.value} className="flex items-center gap-2">
                <t.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{t.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <QuickActions onSendMoney={() => setShowSendWizard(true)} />

          {loading ? (
            <div className="grid md:grid-cols-3 gap-4">{[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}</div>
          ) : (
            <div className="grid md:grid-cols-3 gap-4">
              <StatCard label="Total Sent" value={`R ${totalSent.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`} change={`${payments.length} payments`} positive />
              <StatCard label="Pending" value={`R ${pendingPayments.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`} change={`${payments.filter(t => t.status === "pending").length} pending`} positive={false} />
              <StatCard label="Success Rate" value={`${successRate}%`} change={`${completedPayments.length} completed`} positive={successRate > 80} />
            </div>
          )}

          <div>
            <h3 className="text-lg font-semibold mb-4">Recent Payments</h3>
            <DashboardPaymentsTable transactions={payments.slice(0, 10)} />
          </div>
        </TabsContent>

        <TabsContent value="send" className="mt-6">
          <SendMoneyWizard onClose={() => setActiveTab("overview")} />
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          <DashboardPaymentsTable transactions={payments} />
        </TabsContent>

        <TabsContent value="scheduled" className="mt-6">
          <ScheduledPaymentsList data={scheduled} onRefresh={fetchAll} />
        </TabsContent>

        <TabsContent value="beneficiaries" className="mt-6">
          <BeneficiariesList data={beneficiaries} onRefresh={fetchAll} />
        </TabsContent>

        <TabsContent value="bills" className="mt-6">
          <BillPayments />
        </TabsContent>

        <TabsContent value="international" className="mt-6">
          <InternationalPaymentsSection rates={rates} />
        </TabsContent>

        <TabsContent value="qr" className="mt-6">
          <QRPayments />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <PaymentAnalyticsSection transactions={payments} rates={rates} />
        </TabsContent>

        <TabsContent value="receipts" className="mt-6">
          <ReceiptsSection transactions={completedPayments} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function StatCard({ label, value, change, positive }: { label: string; value: string; change: string; positive: boolean }) {
  return (
    <div className="rounded-2xl border border-border p-4 hover:shadow-card-hover transition-all">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      <p className={`text-xs mt-1 ${positive ? "text-accent" : "text-destructive"}`}>{change}</p>
    </div>
  )
}

function ScheduledPaymentsList({ data, onRefresh }: { data: SchedulePayment[]; onRefresh: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Recurring Payments ({data.length})</h3>
      </div>
      {data.length === 0 ? (
        <Card><CardContent className="text-center py-12 text-muted-foreground"><p className="text-lg font-medium">No scheduled payments</p></CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map(s => (
            <div key={s.id} className="rounded-2xl border border-border p-4 space-y-3 hover:shadow-card-hover transition-all">
              <div className="flex justify-between items-start">
                <div><p className="font-semibold">{s.beneficiaryName}</p><p className="text-sm text-muted-foreground capitalize">{s.frequency}</p></div>
                <Badge variant={s.status === "active" ? "success" : s.status === "paused" ? "secondary" : "destructive"}>{s.status}</Badge>
              </div>
              <p className="text-xl font-bold">R {s.amount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</p>
              <p className="text-xs text-muted-foreground">Next: {new Date(s.nextDate).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function BeneficiariesList({ data, onRefresh }: { data: Beneficiary[]; onRefresh: () => void }) {
  const [search, setSearch] = useState("")
  const filtered = data.filter(b => !search || b.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search beneficiaries..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>
      {filtered.length === 0 ? (
        <Card><CardContent className="text-center py-12 text-muted-foreground"><p className="text-lg font-medium">No beneficiaries</p></CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(b => (
            <div key={b.id} className="rounded-2xl border border-border p-4 space-y-3 hover:shadow-card-hover transition-all relative">
              {b.isFavorite && <span className="absolute top-3 right-3 text-amber-500">★</span>}
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-lg font-bold">
                {b.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div><p className="font-semibold">{b.name}</p><p className="text-xs text-muted-foreground">{b.bankName || "Bank"}</p></div>
              {b.accountNumber && <p className="text-xs font-mono">{b.accountNumber}</p>}
              <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">{b.country || "N/A"}</span><Badge variant={b.isVerified ? "success" : "secondary"} className="text-[10px]">{b.isVerified ? "Verified" : "Unverified"}</Badge></div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function BillPayments() {
  const bills = [
    { name: "City Power", type: "Electricity", logo: "⚡", amount: "R 1,250", due: "Jul 28, 2026", ref: "CP-88472" },
    { name: "Johannesburg Water", type: "Water", logo: "💧", amount: "R 480", due: "Aug 5, 2026", ref: "JW-33109" },
    { name: "MTN SA", type: "Internet", logo: "🌐", amount: "R 799", due: "Jul 30, 2026", ref: "MTN-5523" },
    { name: "DStv", type: "TV", logo: "📺", amount: "R 869", due: "Aug 1, 2026", ref: "DSTV-8871" },
    { name: "University of Cape Town", type: "School Fees", logo: "🎓", amount: "R 45,000", due: "Aug 15, 2026", ref: "UCT-2026" },
    { name: "Old Mutual", type: "Insurance", logo: "🛡️", amount: "R 1,350", due: "Aug 10, 2026", ref: "OM-77234" },
  ]
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Bill Payments</h3>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {bills.map(b => (
          <div key={b.ref} className="rounded-2xl border border-border p-4 space-y-3 hover:shadow-card-hover transition-all">
            <div className="flex items-center gap-3"><span className="text-2xl">{b.logo}</span><div><p className="font-semibold">{b.name}</p><p className="text-xs text-muted-foreground">{b.type}</p></div></div>
            <p className="text-xl font-bold">{b.amount}</p>
            <div className="flex justify-between text-xs text-muted-foreground"><span>Due: {b.due}</span><span className="font-mono">{b.ref}</span></div>
            <Button variant="gradient" className="w-full">Pay Now</Button>
          </div>
        ))}
      </div>
    </div>
  )
}

function InternationalPaymentsSection({ rates }: { rates: ExchangeRate[] }) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">International Transfers</h3>
      <div className="relative h-48 rounded-2xl border border-border overflow-hidden bg-gradient-to-br from-primary/5 via-accent/5 to-primary/10 flex items-center justify-center">
        <div className="text-center"><Globe className="h-12 w-12 mx-auto text-primary/30" /><p className="text-sm text-muted-foreground mt-2">{rates.length}+ countries available</p></div>
      </div>
      {rates.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {rates.map(r => (
            <div key={r.code} className="rounded-2xl border border-border p-4 hover:shadow-card-hover transition-all">
              <div className="flex items-center gap-3 mb-3"><span className="text-2xl">{r.flag}</span><div><p className="font-semibold text-sm">{r.name}</p><p className="text-xs text-muted-foreground">1 ZAR = {r.sell}</p></div></div>
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">Buy: {r.buy}</span><span className={r.changePercent >= 0 ? "text-accent" : "text-destructive"}>{r.changePercent >= 0 ? "+" : ""}{r.changePercent}%</span></div>
            </div>
          ))}
        </div>
      ) : (
        <Card><CardContent className="text-center py-8 text-muted-foreground"><p>Loading rates...</p></CardContent></Card>
      )}
    </div>
  )
}

function QRPayments() {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="rounded-2xl border border-border p-6 text-center space-y-4 hover:shadow-card-hover transition-all">
        <div className="h-40 w-40 mx-auto rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center border-2 border-dashed border-primary/30">
          <QrCode className="h-16 w-16 text-primary/40" />
        </div>
        <h3 className="font-semibold">Generate QR Code</h3>
        <Button variant="gradient" className="w-full">Generate</Button>
      </div>
      <div className="rounded-2xl border border-border p-6 text-center space-y-4 hover:shadow-card-hover transition-all">
        <div className="h-40 w-40 mx-auto rounded-2xl bg-gradient-to-br from-accent/10 to-primary/10 flex items-center justify-center border-2 border-dashed border-accent/30">
          <QrCode className="h-16 w-16 text-accent/40" />
        </div>
        <h3 className="font-semibold">Scan QR Code</h3>
        <Button variant="gradient" className="w-full">Open Scanner</Button>
      </div>
    </div>
  )
}

function PaymentAnalyticsSection({ transactions, rates }: { transactions: Transaction[]; rates: ExchangeRate[] }) {
  const byType = transactions.reduce<Record<string, number>>((acc, t) => { acc[t.type] = (acc[t.type] || 0) + t.amount; return acc }, {})
  const total = Object.values(byType).reduce((s, v) => s + v, 0)
  const typeData = Object.entries(byType).map(([label, amount]) => ({ label, pct: total > 0 ? Math.round((amount / total) * 100) : 0 }))
  const avgPayment = transactions.length > 0 ? total / transactions.length : 0
  const largest = transactions.reduce((m, t) => Math.max(m, t.amount), 0)
  const successCount = transactions.filter(t => t.status === "completed").length
  const successRate = transactions.length > 0 ? Math.round((successCount / transactions.length) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Volume", value: `R ${total.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}` },
          { label: "Avg Payment", value: `R ${avgPayment.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}` },
          { label: "Largest", value: `R ${largest.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}` },
          { label: "Success Rate", value: `${successRate}%` },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border border-border p-4"><p className="text-sm text-muted-foreground">{s.label}</p><p className="text-2xl font-bold mt-1">{s.value}</p></div>
        ))}
      </div>
      {typeData.length > 0 && (
        <div className="rounded-2xl border border-border p-4">
          <h4 className="font-semibold mb-4">Spending by Type</h4>
          <div className="space-y-3">
            {typeData.map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1"><span className="capitalize">{item.label}</span><span className="text-muted-foreground">{item.pct}%</span></div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${item.pct}%` }} transition={{ duration: 1 }} className="h-full rounded-full bg-gradient-to-r from-primary to-accent" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ReceiptsSection({ transactions }: { transactions: Transaction[] }) {
  return (
    <div className="space-y-4">
      {transactions.length === 0 ? (
        <Card><CardContent className="text-center py-12 text-muted-foreground"><Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" /><p className="text-lg font-medium">No receipts yet</p></CardContent></Card>
      ) : (
        transactions.slice(0, 10).map(t => (
          <div key={t.id} className="rounded-2xl border border-border p-4 flex items-center justify-between hover:shadow-card-hover transition-all">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center"><Receipt className="h-6 w-6 text-primary/40" /></div>
              <div><p className="font-semibold">{t.description || t.type}</p><p className="text-xs text-muted-foreground">{t.reference || t.id.slice(0, 8)} • {new Date(t.createdAt).toLocaleDateString()}</p></div>
            </div>
            <div className="text-right"><p className="font-semibold">R {t.amount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</p><p className="text-xs text-muted-foreground capitalize">{t.status}</p></div>
          </div>
        ))
      )}
    </div>
  )
}

function Badge({ variant, className, children }: { variant?: "success" | "secondary" | "destructive" | "default"; className?: string; children: React.ReactNode }) {
  const v = variant === "success" ? "border-transparent bg-accent/10 text-accent" :
    variant === "destructive" ? "border-transparent bg-destructive text-destructive-foreground" :
    variant === "secondary" ? "border-transparent bg-secondary text-secondary-foreground" :
    "border-transparent bg-primary text-primary-foreground"
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${v} ${className || ""}`}>{children}</span>
}

function Search(props: any) { return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> }
