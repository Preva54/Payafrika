"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Send, Clock, Users, CreditCard, Globe, QrCode, BarChart3, Receipt, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { QuickActions } from "./quick-actions"
import { SendMoneyWizard } from "./send-money-wizard"
import { PaymentsTable } from "./payments-table"

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-sm text-muted-foreground">Send, receive, and manage payments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
          <Button variant="gradient" size="sm" onClick={() => setShowSendWizard(true)}><Send className="mr-2 h-4 w-4" />Send Money</Button>
        </div>
      </div>

      {showSendWizard ? (
        <SendMoneyWizard onClose={() => setShowSendWizard(false)} />
      ) : (
        <>
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
              <QuickActions onSendMoney={() => setActiveTab("send")} />

              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { label: "Total Sent", value: "R 124,850", change: "+12%", positive: true },
                  { label: "Pending", value: "R 8,500", change: "3 payments", positive: false },
                  { label: "Saved Fees", value: "R 1,875", change: "This month", positive: true },
                ].map((stat, i) => (
                  <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }}>
                    <div className="rounded-2xl border border-border p-4 hover:shadow-card-hover transition-all">
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-bold mt-1">{stat.value}</p>
                      <p className={`text-xs mt-1 ${stat.positive ? "text-accent" : "text-destructive"}`}>{stat.change}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Recent Payments</h3>
                <PaymentsTable />
              </div>
            </TabsContent>

            <TabsContent value="send" className="mt-6">
              <SendMoneyWizard onClose={() => setActiveTab("overview")} />
            </TabsContent>

            <TabsContent value="payments" className="mt-6">
              <PaymentsTable />
            </TabsContent>

            <TabsContent value="scheduled" className="mt-6">
              <ScheduledPayments />
            </TabsContent>

            <TabsContent value="beneficiaries" className="mt-6">
              <BeneficiariesSection />
            </TabsContent>

            <TabsContent value="bills" className="mt-6">
              <BillPayments />
            </TabsContent>

            <TabsContent value="international" className="mt-6">
              <InternationalPayments />
            </TabsContent>

            <TabsContent value="qr" className="mt-6">
              <QRPayments />
            </TabsContent>

            <TabsContent value="analytics" className="mt-6">
              <PaymentAnalytics />
            </TabsContent>

            <TabsContent value="receipts" className="mt-6">
              <ReceiptsSection />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}

function ScheduledPayments() {
  const schedules = [
    { id: "1", name: "Office Rent", amount: "R 15,000", freq: "Monthly", next: "Aug 1, 2026", status: "active" },
    { id: "2", name: "Supplier Payment", amount: "R 45,000", freq: "Weekly", next: "Jul 28, 2026", status: "active" },
    { id: "3", name: "Subscription", amount: "$ 99", freq: "Yearly", next: "Jan 15, 2027", status: "paused" },
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Recurring Payments</h3>
        <Button variant="gradient" size="sm"><Clock className="mr-2 h-4 w-4" />Create Schedule</Button>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {schedules.map(s => (
          <div key={s.id} className="rounded-2xl border border-border p-4 space-y-3 hover:shadow-card-hover transition-all">
            <div className="flex justify-between items-start">
              <div><p className="font-semibold">{s.name}</p><p className="text-sm text-muted-foreground">{s.freq}</p></div>
              <Badge variant={s.status === "active" ? "success" : "secondary"}>{s.status}</Badge>
            </div>
            <p className="text-xl font-bold">{s.amount}</p>
            <p className="text-xs text-muted-foreground">Next: {s.next}</p>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" className="flex-1">Edit</Button>
              <Button variant="outline" size="sm" className="flex-1">{s.status === "active" ? "Pause" : "Resume"}</Button>
              <Button variant="outline" size="sm" className="flex-1 text-destructive">Cancel</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function BeneficiariesSection() {
  const beneficiaries = [
    { id: "1", name: "Thandi Mokoena", bank: "Standard Bank", acc: "123456789", country: "South Africa", verified: true, fav: true },
    { id: "2", name: "James Okafor", bank: "Access Bank", acc: "987654321", country: "Nigeria", verified: true, fav: false },
    { id: "3", name: "Amina Diallo", bank: "Ecobank", acc: "456789123", country: "Ghana", verified: false, fav: true },
    { id: "4", name: "Kwame Asante", bank: "GTBank", acc: "789123456", country: "Ghana", verified: true, fav: false },
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search beneficiaries..." className="pl-9" />
        </div>
        <Button variant="gradient" size="sm"><Users className="mr-2 h-4 w-4" />Add New</Button>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {beneficiaries.map(b => (
          <div key={b.id} className="rounded-2xl border border-border p-4 space-y-3 hover:shadow-card-hover transition-all relative">
            {b.fav && <span className="absolute top-3 right-3 text-amber-500">★</span>}
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-lg font-bold">
              {b.name.split(" ").map(n => n[0]).join("")}
            </div>
            <div><p className="font-semibold">{b.name}</p><p className="text-xs text-muted-foreground">{b.bank}</p></div>
            <p className="text-xs font-mono">{b.acc}</p>
            <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">{b.country}</span><Badge variant={b.verified ? "success" : "secondary"} className="text-[10px]">{b.verified ? "Verified" : "Unverified"}</Badge></div>
            <div className="flex gap-2 pt-1"><Button variant="outline" size="sm" className="flex-1">Send</Button><Button variant="outline" size="sm" className="flex-1">Edit</Button><Button variant="outline" size="sm" className="text-destructive">✕</Button></div>
          </div>
        ))}
      </div>
    </div>
  )
}

function BillPayments() {
  const bills = [
    { name: "City Power", type: "Electricity", logo: "⚡", amount: "R 1,250", due: "Jul 28, 2026", ref: "CP-88472" },
    { name: "Johannesburg Water", type: "Water", logo: "💧", amount: "R 480", due: "Aug 5, 2026", ref: "JW-33109" },
    { name: "MTN SA", type: "Internet", logo: "🌐", amount: "R 799", due: "Jul 30, 2026", ref: "MTN-5523" },
    { name: "DStv", type: "TV", logo: "📺", amount: "R 869", due: "Aug 1, 2026", ref: "DSTV-8871" },
    { name: "University of Cape Town", type: "School Fees", logo: "🎓", amount: "R 45,000", due: "Aug 15, 2026", ref: "UCT-2026-334" },
    { name: "Old Mutual", type: "Insurance", logo: "🛡️", amount: "R 1,350", due: "Aug 10, 2026", ref: "OM-77234" },
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Bill Payments</h3>
        <div className="flex gap-2"><Button variant="outline" size="sm">Schedule</Button><Button variant="gradient" size="sm">Pay Bill</Button></div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {bills.map(b => (
          <div key={b.ref} className="rounded-2xl border border-border p-4 space-y-3 hover:shadow-card-hover transition-all">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{b.logo}</span>
              <div><p className="font-semibold">{b.name}</p><p className="text-xs text-muted-foreground">{b.type}</p></div>
            </div>
            <p className="text-xl font-bold">{b.amount}</p>
            <div className="flex justify-between text-xs text-muted-foreground"><span>Due: {b.due}</span><span className="font-mono">{b.ref}</span></div>
            <Button variant="gradient" className="w-full">Pay Now</Button>
          </div>
        ))}
      </div>
    </div>
  )
}

function InternationalPayments() {
  const countries = [
    { flag: "🇳🇬", name: "Nigeria", rate: "75.50", time: "1-2 days", fee: "1.2%" },
    { flag: "🇰🇪", name: "Kenya", rate: "7.85", time: "1-2 days", fee: "1.0%" },
    { flag: "🇬🇭", name: "Ghana", rate: "0.72", time: "2-3 days", fee: "1.5%" },
    { flag: "🇧🇼", name: "Botswana", rate: "0.75", time: "1 day", fee: "0.8%" },
    { flag: "🇿🇲", name: "Zambia", rate: "1.05", time: "2-3 days", fee: "1.3%" },
    { flag: "🇬🇧", name: "United Kingdom", rate: "0.043", time: "3-5 days", fee: "2.0%" },
    { flag: "🇺🇸", name: "United States", rate: "0.055", time: "3-5 days", fee: "2.0%" },
    { flag: "🇪🇺", name: "Europe", rate: "0.051", time: "3-5 days", fee: "2.0%" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">International Transfers</h3>
        <Button variant="gradient" size="sm"><Globe className="mr-2 h-4 w-4" />New Transfer</Button>
      </div>
      <div className="relative h-48 rounded-2xl border border-border overflow-hidden bg-gradient-to-br from-primary/5 via-accent/5 to-primary/10 flex items-center justify-center">
        <div className="text-center">
          <Globe className="h-12 w-12 mx-auto text-primary/30" />
          <p className="text-sm text-muted-foreground mt-2">Interactive world map with connected routes</p>
          <p className="text-xs text-muted-foreground">12+ countries • 40+ currencies</p>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {countries.map(c => (
          <div key={c.name} className="rounded-2xl border border-border p-4 hover:shadow-card-hover transition-all">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{c.flag}</span>
              <div><p className="font-semibold text-sm">{c.name}</p><p className="text-xs text-muted-foreground">1 ZAR = {c.rate}</p></div>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground"><span>⏱ {c.time}</span><span>Fee {c.fee}</span></div>
          </div>
        ))}
      </div>
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
        <p className="text-sm text-muted-foreground">Create a QR code to receive payments</p>
        <Button variant="gradient" className="w-full">Generate</Button>
      </div>
      <div className="rounded-2xl border border-border p-6 text-center space-y-4 hover:shadow-card-hover transition-all">
        <div className="h-40 w-40 mx-auto rounded-2xl bg-gradient-to-br from-accent/10 to-primary/10 flex items-center justify-center border-2 border-dashed border-accent/30">
          <div className="relative">
            <QrCode className="h-16 w-16 text-accent/40" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-8 w-8 rounded-full bg-accent/20 animate-ping" />
            </div>
          </div>
        </div>
        <h3 className="font-semibold">Scan QR Code</h3>
        <p className="text-sm text-muted-foreground">Scan a merchant QR code to pay</p>
        <Button variant="gradient" className="w-full">Open Scanner</Button>
      </div>
    </div>
  )
}

function PaymentAnalytics() {
  const stats = [
    { label: "Monthly Spending", value: "R 84,250", chart: "📊" },
    { label: "Avg Payment", value: "R 5,617", chart: "📈" },
    { label: "Largest Payment", value: "R 45,000", chart: "🔺" },
    { label: "Success Rate", value: "96.8%", chart: "✅" },
  ]

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="rounded-2xl border border-border p-4 hover:shadow-card-hover transition-all">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        {[
          { title: "Spending by Category", items: [{ label: "Bills", pct: 35 }, { label: "Transfers", pct: 30 }, { label: "Shopping", pct: 20 }, { label: "Other", pct: 15 }] },
          { title: "Payment Methods", items: [{ label: "Bank Transfer", pct: 45 }, { label: "Mobile Money", pct: 30 }, { label: "QR", pct: 15 }, { label: "Crypto", pct: 10 }] },
        ].map(chart => (
          <div key={chart.title} className="rounded-2xl border border-border p-4">
            <h4 className="font-semibold mb-4">{chart.title}</h4>
            <div className="space-y-3">
              {chart.items.map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1"><span>{item.label}</span><span className="text-muted-foreground">{item.pct}%</span></div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.pct}%` }}
                      transition={{ duration: 1, delay: 0.2 }}
                      className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ReceiptsSection() {
  const receipts = [
    { id: "PAY-000001", recipient: "Thandi Mokoena", amount: "R 12,500", date: "Jul 22, 2026", method: "Bank Transfer" },
    { id: "PAY-000002", recipient: "James Okafor", amount: "R 45,000", date: "Jul 20, 2026", method: "Mobile Money" },
    { id: "PAY-000003", recipient: "City Power", amount: "R 1,250", date: "Jul 18, 2026", method: "Bill Payment" },
  ]

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {receipts.map(r => (
          <div key={r.id} className="rounded-2xl border border-border p-4 flex items-center justify-between hover:shadow-card-hover transition-all">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                <Receipt className="h-6 w-6 text-primary/40" />
              </div>
              <div><p className="font-semibold">{r.recipient}</p><p className="text-xs text-muted-foreground">{r.id} • {r.date}</p></div>
            </div>
            <div className="text-right">
              <p className="font-semibold">{r.amount}</p>
              <p className="text-xs text-muted-foreground">{r.method}</p>
            </div>
            <div className="flex gap-2 ml-4">
              <Button variant="outline" size="sm">PDF</Button>
              <Button variant="outline" size="sm">Email</Button>
              <Button variant="outline" size="sm">Print</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Badge({ variant, className, children, ...props }: { variant?: "success" | "secondary" | "premium" | "destructive" | "default"; className?: string; children: React.ReactNode; [key: string]: any }) {
  const v = variant === "success" ? "border-transparent bg-accent/10 text-accent" :
    variant === "secondary" ? "border-transparent bg-secondary text-secondary-foreground" :
    variant === "premium" ? "border-transparent bg-gradient-to-r from-payafrika-500 to-sky text-white" :
    variant === "destructive" ? "border-transparent bg-destructive text-destructive-foreground" :
    "border-transparent bg-primary text-primary-foreground"
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${v} ${className || ""}`} {...props}>{children}</span>
}

function Search(props: any) { return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> }
