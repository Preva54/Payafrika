"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Send, ArrowDownLeft, Repeat, Building2, CreditCard, Globe, QrCode, BarChart3,
  Clock, Users, Zap, GraduationCap, Landmark, Handshake,
  Receipt, RefreshCw, ArrowUpRight, ArrowDownUp, DollarSign, Check, Copy,
  CheckCircle2, XCircle, Loader2, Download, Share2, Printer,
  Wallet, Smartphone, Wifi, Tv, FileText,
  Search, Calendar, Filter,
  ArrowRight, Mail, User, Phone,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { SendMoneyWizard } from "./send-money-wizard"
import { DashboardPaymentsTable } from "./payments-table"
import {
  dashboardApi, beneficiariesApi, scheduledPaymentsApi, exchangeRatesApi,
  walletApi, type Transaction, type Beneficiary, type SchedulePayment,
  type ExchangeRate, type WalletResponse, type QRResponse,
} from "@/lib/api"

const CURRENCY_FLAGS: Record<string, string> = {
  ZAR: "🇿🇦", USD: "🇺🇸", EUR: "🇪🇺", GBP: "🇬🇧", NGN: "🇳🇬", KES: "🇰🇪",
  BTC: "₿", ETH: "⟠", USDT: "💵",
}

const tabs = [
  { value: "overview", label: "Overview", icon: Wallet },
  { value: "send", label: "Send", icon: Send },
  { value: "receive", label: "Receive", icon: ArrowDownLeft },
  { value: "transfers", label: "Transfers", icon: ArrowDownUp },
  { value: "bills", label: "Bills", icon: CreditCard },
  { value: "history", label: "History", icon: Clock },
  { value: "beneficiaries", label: "Beneficiaries", icon: Users },
  { value: "analytics", label: "Analytics", icon: BarChart3 },
]

function formatCurrency(amount: number, currency = "ZAR"): string {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(amount)
}

function formatDateGroup(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const txDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (txDate.getTime() === today.getTime()) return "Today"
  if (txDate.getTime() === yesterday.getTime()) return "Yesterday"
  return date.toLocaleDateString("en-ZA", { weekday: "long", month: "short", day: "numeric", year: "numeric" })
}

function groupByDate(transactions: Transaction[]): Record<string, Transaction[]> {
  const groups: Record<string, Transaction[]> = {}
  transactions.forEach(t => {
    const key = formatDateGroup(t.createdAt)
    if (!groups[key]) groups[key] = []
    groups[key].push(t)
  })
  return groups
}

const statusIcons: Record<string, typeof Check> = {
  completed: CheckCircle2,
  pending: Clock,
  processing: Loader2,
  failed: XCircle,
}

const statusColors: Record<string, string> = {
  completed: "text-accent",
  pending: "text-yellow-500",
  processing: "text-blue-500",
  failed: "text-destructive",
}

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState("overview")
  const [showSendWizard, setShowSendWizard] = useState(false)
  const [showReceiveModal, setShowReceiveModal] = useState(false)
  const [showBankTransferModal, setShowBankTransferModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [wallet, setWallet] = useState<WalletResponse | null>(null)
  const [scheduled, setScheduled] = useState<SchedulePayment[]>([])
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
  const [rates, setRates] = useState<ExchangeRate[]>([])
  const [qrData, setQrData] = useState<QRResponse | null>(null)
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

  const payments = transactions.filter(t =>
    t.type === "payment" || t.type === "transfer" || t.type === "deposit" || t.type === "withdrawal"
  )
  const moneySent = payments.filter(t => t.type === "payment" || t.type === "transfer" || t.type === "withdrawal").reduce((s, t) => s + t.amount, 0)
  const moneyReceived = payments.filter(t => t.type === "deposit").reduce((s, t) => s + t.amount, 0)
  const totalPayments = payments.reduce((s, t) => s + t.amount, 0)
  const pendingAmount = payments.filter(t => t.status === "pending").reduce((s, t) => s + t.amount, 0)
  const completedPayments = payments.filter(t => t.status === "completed")
  const groupedHistory = groupByDate(payments.slice(0, 30))

  if (showSendWizard) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Send Money</h1>
          <Button variant="ghost" size="sm" onClick={() => setShowSendWizard(false)}>
            Back to Payments
          </Button>
        </div>
        <SendMoneyWizard onClose={() => setShowSendWizard(false)} rates={rates} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-sm text-muted-foreground">Manage all incoming and outgoing payments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAll}>
            <RefreshCw className="mr-2 h-4 w-4" />Refresh
          </Button>
          <Button variant="gradient" size="sm" onClick={() => setShowSendWizard(true)}>
            <Send className="mr-2 h-4 w-4" />Send Money
          </Button>
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

        <TabsContent value="overview" className="mt-6 space-y-8">
          <PaymentSummary
            totalPayments={totalPayments}
            moneySent={moneySent}
            moneyReceived={moneyReceived}
            pending={pendingAmount}
            loading={loading}
          />

          <PrimaryActions
            onSend={() => setShowSendWizard(true)}
            onReceive={() => setShowReceiveModal(true)}
            onTransfer={() => setShowTransferModal(true)}
            onBankTransfer={() => setShowBankTransferModal(true)}
          />

          <BillsAndUtilities />

          <InternationalPayments rates={rates} />

          <MerchantPayments />

          <PaymentHistorySection transactions={payments.slice(0, 15)} />
        </TabsContent>

        <TabsContent value="send" className="mt-6">
          <SendMoneyWizard onClose={() => setActiveTab("overview")} rates={rates} />
        </TabsContent>

        <TabsContent value="receive" className="mt-6">
          <ReceiveMoneySection wallet={wallet} />
        </TabsContent>

        <TabsContent value="transfers" className="mt-6">
          <TransfersSection
            onBankTransfer={() => setShowBankTransferModal(true)}
            onWalletTransfer={() => setShowTransferModal(true)}
            rates={rates}
          />
        </TabsContent>

        <TabsContent value="bills" className="mt-6">
          <BillsSection scheduled={scheduled} />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <HistorySection transactions={payments} />
        </TabsContent>

        <TabsContent value="beneficiaries" className="mt-6">
          <BeneficiariesSection data={beneficiaries} onRefresh={fetchAll} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <AnalyticsSection transactions={payments} rates={rates} />
        </TabsContent>
      </Tabs>

      <ReceiveMoneyModal open={showReceiveModal} onClose={() => setShowReceiveModal(false)} wallet={wallet} />
      <BankTransferModal open={showBankTransferModal} onClose={() => setShowBankTransferModal(false)} />
      <WalletTransferModal open={showTransferModal} onClose={() => setShowTransferModal(false)} rates={rates} />
    </div>
  )
}

function PaymentSummary({ totalPayments, moneySent, moneyReceived, pending, loading }: {
  totalPayments: number; moneySent: number; moneyReceived: number; pending: number; loading: boolean
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
    )
  }

  const stats = [
    { label: "Total Payments", value: formatCurrency(totalPayments), icon: Wallet, color: "from-primary/10 to-primary/5" },
    { label: "Money Sent", value: formatCurrency(moneySent), icon: Send, color: "from-blue-500/10 to-blue-500/5" },
    { label: "Money Received", value: formatCurrency(moneyReceived), icon: ArrowDownLeft, color: "from-accent/10 to-accent/5" },
    { label: "Pending", value: formatCurrency(pending), icon: Clock, color: "from-yellow-500/10 to-yellow-500/5" },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => {
        const Icon = stat.icon
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
          >
            <div className={`rounded-2xl border border-border p-5 bg-gradient-to-br ${stat.color} hover:shadow-card-hover transition-all`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-background/80 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-foreground" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold mt-1">{stat.value}</p>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

function PrimaryActions({ onSend, onReceive, onTransfer, onBankTransfer }: {
  onSend: () => void; onReceive: () => void; onTransfer: () => void; onBankTransfer: () => void
}) {
  const actions = [
    { label: "Send Money", desc: "Transfer funds instantly", icon: Send, grad: "linear-gradient(135deg, #3B82F6, #2563EB)", onClick: onSend },
    { label: "Receive Money", desc: "Get paid via QR or link", icon: ArrowDownLeft, grad: "linear-gradient(135deg, #10B981, #059669)", onClick: onReceive },
    { label: "Transfer Between Wallets", desc: "Move between currencies", icon: Repeat, grad: "linear-gradient(135deg, #8B5CF6, #7C3AED)", onClick: onTransfer },
    { label: "Bank Transfer", desc: "Send to bank account", icon: Building2, grad: "linear-gradient(135deg, #F43F5E, #E11D48)", onClick: onBankTransfer },
  ]

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((action, i) => {
          const Icon = action.icon
          return (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              onClick={action.onClick}
              className="group relative overflow-hidden rounded-2xl p-5 text-left text-white transition-all duration-300 hover:scale-[1.03] hover:shadow-xl active:scale-[0.98]"
              style={{ background: action.grad }}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.15),transparent_70%)]" />
              <div className="relative z-10">
                <div className="mb-3 h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-sm mb-0.5">{action.label}</h3>
                <p className="text-[11px] text-white/70">{action.desc}</p>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

function BillsAndUtilities() {
  const services = [
    { label: "Airtime", icon: Smartphone, color: "from-blue-500 to-blue-600" },
    { label: "Data", icon: Wifi, color: "from-green-500 to-green-600" },
    { label: "Electricity", icon: Zap, color: "from-yellow-500 to-yellow-600" },
    { label: "Water", icon: Droplets, color: "from-cyan-500 to-cyan-600" },
    { label: "TV", icon: Tv, color: "from-purple-500 to-purple-600" },
    { label: "Internet", icon: WifiIcon, color: "from-indigo-500 to-indigo-600" },
    { label: "School Fees", icon: GraduationCap, color: "from-orange-500 to-orange-600" },
    { label: "Gov. Payments", icon: Landmark, color: "from-red-500 to-red-600" },
  ]

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Bills & Utilities</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {services.map((service, i) => {
          const Icon = service.icon
          return (
            <motion.button
              key={service.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: i * 0.03 }}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-border hover:shadow-card-hover transition-all group"
            >
              <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${service.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
              <span className="text-xs font-medium text-center">{service.label}</span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

function Droplets(props: Record<string, unknown>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z" />
      <path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97" />
    </svg>
  )
}

function InternationalPayments({ rates }: { rates: ExchangeRate[] }) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">International Payments</h3>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "International Transfer", desc: "Send money abroad", icon: Globe, color: "from-blue-500/10 to-blue-500/5" },
          { label: "Multi-Currency Transfer", desc: "Send in any currency", icon: DollarSign, color: "from-green-500/10 to-green-500/5" },
          { label: "SWIFT Transfer", desc: "Bank-to-bank global", icon: Building2, color: "from-purple-500/10 to-purple-500/5" },
          { label: "Remittance", desc: "Low-cost transfers", icon: Repeat, color: "from-orange-500/10 to-orange-500/5" },
        ].map((item, i) => {
          const Icon = item.icon
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className={`rounded-2xl border border-border p-5 bg-gradient-to-br ${item.color} hover:shadow-card-hover transition-all cursor-pointer group`}
            >
              <div className="h-10 w-10 rounded-xl bg-background/80 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Icon className="h-5 w-5" />
              </div>
              <p className="font-semibold text-sm">{item.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
            </motion.div>
          )
        })}
      </div>
      {rates.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Live Exchange Rates</h4>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {rates.slice(0, 5).map(r => (
              <div key={r.code} className="rounded-xl border border-border p-3 hover:shadow-card-hover transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{r.flag}</span>
                  <span className="text-sm font-semibold">{r.code}</span>
                </div>
                <p className="text-xs text-muted-foreground">1 ZAR = {r.sell}</p>
                <p className={`text-xs mt-1 ${r.changePercent >= 0 ? "text-accent" : "text-destructive"}`}>
                  {r.changePercent >= 0 ? "+" : ""}{r.changePercent}%
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function MerchantPayments() {
  const services = [
    { label: "Scan QR", icon: QrCode, desc: "Pay via QR code" },
    { label: "Pay Merchant", icon: Handshake, desc: "Pay a business" },
    { label: "Invoice Payment", icon: FileText, desc: "Pay an invoice" },
    { label: "Payment Links", icon: Globe, desc: "Share payment link" },
    { label: "Request Payment", icon: ArrowDownLeft, desc: "Request from someone" },
  ]

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Business Payments</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {services.map((service, i) => {
          const Icon = service.icon
          return (
            <motion.div
              key={service.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="rounded-2xl border border-border p-4 hover:shadow-card-hover transition-all cursor-pointer group"
            >
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Icon className="h-5 w-5" />
              </div>
              <p className="font-semibold text-sm">{service.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{service.desc}</p>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

function PaymentHistorySection({ transactions }: { transactions: Transaction[] }) {
  const grouped = groupByDate(transactions)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Recent Payments</h3>
        <Button variant="ghost" size="sm">View All</Button>
      </div>
      {Object.keys(grouped).length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No payments yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, txs]) => (
            <div key={date}>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">{date}</h4>
              <div className="space-y-2">
                {txs.map(tx => {
                  const StatusIcon = statusIcons[tx.status] || Clock
                  return (
                    <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-secondary/50 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                          <StatusIcon className={`h-5 w-5 ${statusColors[tx.status] || "text-muted-foreground"}`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{tx.description || tx.type}</p>
                          <p className="text-xs text-muted-foreground">{tx.reference || tx.id.slice(0, 8)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatCurrency(tx.amount)}</p>
                        <p className="text-xs text-muted-foreground capitalize">{tx.status}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ReceiveMoneySection({ wallet }: { wallet: WalletResponse | null }) {
  const [copied, setCopied] = useState("")
  const [showQR, setShowQR] = useState(false)
  const [qrData, setQrData] = useState<QRResponse | null>(null)

  const walletId = wallet?.id || "WALLET-XXXX-XXXX"
  const username = "@user"

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(""), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Receive Money</h2>
        <p className="text-sm text-muted-foreground">Share your details to receive payments</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border p-5 text-center space-y-4">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
            <QrCode className="h-8 w-8 text-primary" />
          </div>
          <div>
            <p className="font-semibold">QR Code</p>
            <p className="text-xs text-muted-foreground">Scan to pay you</p>
          </div>
          <Button variant="gradient" className="w-full" onClick={() => setShowQR(true)}>Show QR</Button>
        </div>

        <div className="rounded-2xl border border-border p-5 space-y-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 flex items-center justify-center">
            <Wallet className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <p className="font-semibold">Wallet ID</p>
            <p className="text-xs text-muted-foreground">Your unique wallet identifier</p>
          </div>
          <div className="flex items-center gap-2">
            <code className="text-xs font-mono bg-secondary/50 px-2 py-1 rounded flex-1 truncate">{walletId}</code>
            <Button variant="ghost" size="sm" onClick={() => copyToClipboard(walletId, "walletId")}>
              {copied === "walletId" ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border p-5 space-y-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5 flex items-center justify-center">
            <User className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <p className="font-semibold">Username</p>
            <p className="text-xs text-muted-foreground">Your PayAfrika username</p>
          </div>
          <div className="flex items-center gap-2">
            <code className="text-xs font-mono bg-secondary/50 px-2 py-1 rounded flex-1">{username}</code>
            <Button variant="ghost" size="sm" onClick={() => copyToClipboard(username, "username")}>
              {copied === "username" ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border p-5 space-y-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 flex items-center justify-center">
            <Globe className="h-5 w-5 text-purple-500" />
          </div>
          <div>
            <p className="font-semibold">Payment Link</p>
            <p className="text-xs text-muted-foreground">Share your payment link</p>
          </div>
          <div className="flex items-center gap-2">
            <code className="text-xs font-mono bg-secondary/50 px-2 py-1 rounded flex-1 truncate">payafrika.com/pay/{username}</code>
            <Button variant="ghost" size="sm" onClick={() => copyToClipboard(`payafrika.com/pay/${username}`, "link")}>
              {copied === "link" ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border p-6">
        <h3 className="font-semibold mb-4">Share Your Payment Details</h3>
        <div className="flex gap-3">
          <Button variant="outline" size="sm"><Share2 className="mr-2 h-4 w-4" />Share</Button>
          <Button variant="outline" size="sm"><Download className="mr-2 h-4 w-4" />Download QR</Button>
        </div>
      </div>

      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Your QR Code</DialogTitle>
            <DialogDescription>Scan this QR code to send money to your wallet</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-6">
            <div className="h-48 w-48 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center border-2 border-dashed border-primary/30">
              <QrCode className="h-32 w-32 text-primary/40" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Scan with any QR reader or banking app</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TransfersSection({ onBankTransfer, onWalletTransfer, rates }: {
  onBankTransfer: () => void; onWalletTransfer: () => void; rates: ExchangeRate[]
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Transfers</h2>
        <p className="text-sm text-muted-foreground">Move money between accounts and currencies</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={onWalletTransfer}
          className="rounded-2xl border border-border p-6 text-left hover:shadow-card-hover transition-all group"
        >
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Repeat className="h-6 w-6" />
          </div>
          <p className="font-semibold">Wallet Transfer</p>
          <p className="text-sm text-muted-foreground mt-1">Move money between your multi-currency wallets</p>
        </motion.button>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          onClick={onBankTransfer}
          className="rounded-2xl border border-border p-6 text-left hover:shadow-card-hover transition-all group"
        >
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Building2 className="h-6 w-6" />
          </div>
          <p className="font-semibold">Bank Transfer</p>
          <p className="text-sm text-muted-foreground mt-1">Send to or from a bank account</p>
        </motion.button>
      </div>

      {rates.length > 0 && (
        <div className="rounded-2xl border border-border p-6">
          <h3 className="font-semibold mb-4">Exchange Rates</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {rates.slice(0, 5).map(r => (
              <div key={r.code} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
                <span className="text-xl">{r.flag}</span>
                <div>
                  <p className="text-sm font-semibold">{r.code}</p>
                  <p className="text-xs text-muted-foreground">1 ZAR = {r.sell}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function BillsSection({ scheduled }: { scheduled: SchedulePayment[] }) {
  const categories = [
    { label: "Airtime", icon: Smartphone, color: "from-blue-500 to-blue-600" },
    { label: "Data", icon: Wifi, color: "from-green-500 to-green-600" },
    { label: "Electricity", icon: Zap, color: "from-yellow-500 to-yellow-600" },
    { label: "Water", icon: Droplets, color: "from-cyan-500 to-cyan-600" },
    { label: "TV", icon: Tv, color: "from-purple-500 to-purple-600" },
    { label: "Internet", icon: WifiIcon, color: "from-indigo-500 to-indigo-600" },
    { label: "School Fees", icon: GraduationCap, color: "from-orange-500 to-orange-600" },
    { label: "Gov. Payments", icon: Landmark, color: "from-red-500 to-red-600" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Bills & Utilities</h2>
        <p className="text-sm text-muted-foreground">Pay your bills and top up services</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {categories.map((cat, i) => {
          const Icon = cat.icon
          return (
            <motion.button
              key={cat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: i * 0.03 }}
              className="flex flex-col items-center gap-3 p-6 rounded-2xl border border-border hover:shadow-card-hover transition-all group"
            >
              <div className={`h-14 w-14 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <Icon className="h-7 w-7 text-white" />
              </div>
              <span className="text-sm font-medium">{cat.label}</span>
            </motion.button>
          )
        })}
      </div>

      {scheduled.length > 0 && (
        <div>
          <h3 className="font-semibold mb-4">Scheduled Bill Payments</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {scheduled.map(s => (
              <div key={s.id} className="rounded-2xl border border-border p-4 space-y-3 hover:shadow-card-hover transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{s.beneficiaryName}</p>
                    <p className="text-sm text-muted-foreground capitalize">{s.frequency}</p>
                  </div>
                  <Badge variant={s.status === "active" ? "success" : "secondary"}>{s.status}</Badge>
                </div>
                <p className="text-xl font-bold">{formatCurrency(s.amount)}</p>
                <p className="text-xs text-muted-foreground">Next: {new Date(s.nextDate).toLocaleDateString()}</p>
                <Button variant="gradient" className="w-full">Pay Now</Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function HistorySection({ transactions }: { transactions: Transaction[] }) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")

  const filtered = transactions.filter(t => {
    if (search && !(t.description || t.type).toLowerCase().includes(search.toLowerCase())) return false
    if (statusFilter && t.status !== statusFilter) return false
    return true
  })

  const grouped = groupByDate(filtered)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Payment History</h2>
        <p className="text-sm text-muted-foreground">View all your past transactions</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search payments..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2">
          {["", "completed", "pending", "processing", "failed"].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"}`}
            >
              {s ? s.charAt(0).toUpperCase() + s.slice(1) : "All"}
            </button>
          ))}
        </div>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No transactions found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, txs]) => (
            <div key={date}>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">{date}</h4>
              <div className="space-y-2">
                {txs.map(tx => {
                  const StatusIcon = statusIcons[tx.status] || Clock
                  return (
                    <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-secondary/50 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                          <StatusIcon className={`h-5 w-5 ${statusColors[tx.status] || "text-muted-foreground"}`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{tx.description || tx.type}</p>
                          <p className="text-xs text-muted-foreground">{tx.reference || tx.id.slice(0, 8)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatCurrency(tx.amount)}</p>
                        <p className="text-xs text-muted-foreground capitalize">{tx.status}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function BeneficiariesSection({ data, onRefresh }: { data: Beneficiary[]; onRefresh: () => void }) {
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")
  const filtered = data.filter(b => {
    if (search && !b.name.toLowerCase().includes(search.toLowerCase())) return false
    if (filter === "favorites" && !b.isFavorite) return false
    return true
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Beneficiaries</h2>
        <p className="text-sm text-muted-foreground">Manage your saved recipients</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search beneficiaries..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2">
          {["all", "favorites", "banks", "international"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${filter === f ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"}`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No beneficiaries</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(b => (
            <div key={b.id} className="rounded-2xl border border-border p-4 space-y-3 hover:shadow-card-hover transition-all relative">
              {b.isFavorite && <span className="absolute top-3 right-3 text-amber-500">★</span>}
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-lg font-bold">
                {b.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div>
                <p className="font-semibold">{b.name}</p>
                <p className="text-xs text-muted-foreground">{b.bankName || "Bank"}</p>
              </div>
              {b.accountNumber && <p className="text-xs font-mono">{b.accountNumber}</p>}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{b.country || "N/A"}</span>
                <Badge variant={b.isVerified ? "success" : "secondary"} className="text-[10px]">
                  {b.isVerified ? "Verified" : "Unverified"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AnalyticsSection({ transactions, rates }: { transactions: Transaction[]; rates: ExchangeRate[] }) {
  const byType = transactions.reduce<Record<string, number>>((acc, t) => { acc[t.type] = (acc[t.type] || 0) + t.amount; return acc }, {})
  const total = Object.values(byType).reduce((s, v) => s + v, 0)
  const typeData = Object.entries(byType).map(([label, amount]) => ({
    label, pct: total > 0 ? Math.round((amount / total) * 100) : 0,
  }))
  const avgPayment = transactions.length > 0 ? total / transactions.length : 0
  const largest = transactions.reduce((m, t) => Math.max(m, t.amount), 0)
  const successCount = transactions.filter(t => t.status === "completed").length
  const successRate = transactions.length > 0 ? Math.round((successCount / transactions.length) * 100) : 0
  const byCurrency = transactions.reduce<Record<string, number>>((acc, t) => { acc[t.currency || "ZAR"] = (acc[t.currency || "ZAR"] || 0) + t.amount; return acc }, {})
  const mostUsedCurrency = Object.entries(byCurrency).sort((a, b) => b[1] - a[1])[0]?.[0] || "ZAR"

  const stats = [
    { label: "Total Volume", value: formatCurrency(total) },
    { label: "Avg Payment", value: formatCurrency(avgPayment) },
    { label: "Largest Payment", value: formatCurrency(largest) },
    { label: "Success Rate", value: `${successRate}%` },
    { label: "Most Used Currency", value: mostUsedCurrency },
    { label: "Total Transactions", value: transactions.length.toString() },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Analytics</h2>
        <p className="text-sm text-muted-foreground">Payment insights and statistics</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map(s => (
          <div key={s.label} className="rounded-2xl border border-border p-4">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {typeData.length > 0 && (
        <div className="rounded-2xl border border-border p-6">
          <h4 className="font-semibold mb-4">Spending by Type</h4>
          <div className="space-y-3">
            {typeData.map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="capitalize">{item.label}</span>
                  <span className="text-muted-foreground">{item.pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.pct}%` }}
                    transition={{ duration: 1 }}
                    className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ReceiveMoneyModal({ open, onClose, wallet }: {
  open: boolean; onClose: () => void; wallet: WalletResponse | null
}) {
  const [copied, setCopied] = useState("")
  const walletId = wallet?.id || "WALLET-XXXX-XXXX"

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(""), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Receive Money</DialogTitle>
          <DialogDescription>Share your details to receive payments</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex justify-center py-4">
            <div className="h-48 w-48 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center border-2 border-dashed border-primary/30">
              <QrCode className="h-32 w-32 text-primary/40" />
            </div>
          </div>

          {[
            { label: "Wallet ID", value: walletId, key: "wallet" },
            { label: "Username", value: "@user", key: "username" },
            { label: "Payment Link", value: `payafrika.com/pay/@user`, key: "link" },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
              <div>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-sm font-mono font-medium">{item.value}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(item.value, item.key)}>
                {copied === item.key ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button variant="gradient"><Share2 className="mr-2 h-4 w-4" />Share</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function BankTransferModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<"to" | "from">("to")
  const [bankName, setBankName] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [accountHolder, setAccountHolder] = useState("")
  const [amount, setAmount] = useState("")
  const [reference, setReference] = useState("")

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Bank Transfer</DialogTitle>
          <DialogDescription>Send to or from a bank account</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMode("to")}
              className={`p-3 rounded-xl border-2 text-center transition-all ${mode === "to" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
            >
              <ArrowUpRight className="h-5 w-5 mx-auto mb-1" />
              <p className="text-sm font-medium">To Bank</p>
              <p className="text-xs text-muted-foreground">Send to bank account</p>
            </button>
            <button
              onClick={() => setMode("from")}
              className={`p-3 rounded-xl border-2 text-center transition-all ${mode === "from" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
            >
              <ArrowDownLeft className="h-5 w-5 mx-auto mb-1" />
              <p className="text-sm font-medium">From Bank</p>
              <p className="text-xs text-muted-foreground">Receive from bank</p>
            </button>
          </div>

          <div className="space-y-2">
            <Label>Bank Name</Label>
            <Select value={bankName} onValueChange={setBankName}>
              <SelectTrigger><SelectValue placeholder="Select bank" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="abc">ABC Bank</SelectItem>
                <SelectItem value="fnb">FNB</SelectItem>
                <SelectItem value="standard">Standard Bank</SelectItem>
                <SelectItem value="nedbank">Nedbank</SelectItem>
                <SelectItem value="absa">ABSA</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Account Number</Label>
            <Input placeholder="Enter account number" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Account Holder Name</Label>
            <Input placeholder="Enter account holder name" value={accountHolder} onChange={e => setAccountHolder(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">R</span>
              <Input type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} className="pl-8" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Reference (optional)</Label>
            <Input placeholder="Payment reference" value={reference} onChange={e => setReference(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="gradient">
            {mode === "to" ? "Send to Bank" : "Request from Bank"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function WalletTransferModal({ open, onClose, rates }: { open: boolean; onClose: () => void; rates: ExchangeRate[] }) {
  const [fromCurrency, setFromCurrency] = useState("ZAR")
  const [toCurrency, setToCurrency] = useState("USD")
  const [amount, setAmount] = useState("")

  const rate = rates.find(r => r.code === toCurrency)?.sell || 1
  const converted = parseFloat(amount || "0") * rate

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Wallet Transfer</DialogTitle>
          <DialogDescription>Move money between your wallets</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>From</Label>
            <Select value={fromCurrency} onValueChange={setFromCurrency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["ZAR", "USD", "EUR", "GBP", "NGN", "KES"].map(c => (
                  <SelectItem key={c} value={c}>{CURRENCY_FLAGS[c]} {c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>To</Label>
            <Select value={toCurrency} onValueChange={setToCurrency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["ZAR", "USD", "EUR", "GBP", "NGN", "KES"].map(c => (
                  <SelectItem key={c} value={c}>{CURRENCY_FLAGS[c]} {c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Amount</Label>
            <Input type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>

          {parseFloat(amount) > 0 && (
            <div className="p-3 rounded-xl bg-secondary/50 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Exchange rate</span>
                <span>1 {fromCurrency} = {rate} {toCurrency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Recipient gets</span>
                <span className="font-medium">{CURRENCY_FLAGS[toCurrency]} {converted.toFixed(2)} {toCurrency}</span>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="gradient">Transfer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
