"use client"

import { useEffect, useState, useCallback } from "react"
import {
  RefreshCw, Plus, ArrowUpRight, ArrowDownLeft, Repeat, TrendingUp, Shield,
  CreditCard, Landmark, Bell, Wallet, QrCode, Send, Download, ChevronRight,
  Copy, Check, Eye, EyeOff, Ban, MoreHorizontal, Globe, Clock, AlertTriangle,
  X, BarChart3, PiggyBank, Target, Zap, Lock, Smartphone, Monitor,
  DollarSign, Users, Activity, ExternalLink, Menu,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { walletApi, type WalletResponse, type WalletOverviewResponse, type CurrencyWalletResponse, type WalletAnalyticsResponse, type SpendingInsightResponse, type LinkedBankResponse, type WalletNotificationResponse, type SecurityInfoResponse, type CardResponse, type ExchangeRateResponse, type QRResponse, type Transaction } from "@/lib/api"
import DepositFundsSection from "@/components/dashboard/deposit-funds-section"

const CURRENCIES = ["ZAR", "USD", "EUR", "GBP", "NGN", "KES", "BTC", "ETH", "USDT"]
const CURRENCY_FLAGS: Record<string, string> = {
  ZAR: "🇿🇦", USD: "🇺🇸", EUR: "🇪🇺", GBP: "🇬🇧", NGN: "🇳🇬", KES: "🇰🇪", BTC: "₿", ETH: "⟠", USDT: "💵",
}

function formatCurrency(amount: number, currency = "ZAR"): string {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
}

function formatCompact(amount: number): string {
  if (amount >= 1_000_000) return `R ${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `R ${(amount / 1_000).toFixed(1)}k`
  return `R ${amount.toFixed(0)}`
}

function MiniGraph({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const w = 72; const h = 24
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ")
  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function AnimatedNumber({ value, prefix = "R " }: { value: number; prefix?: string }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let start = 0; const end = value; const step = end / 30
    const timer = setInterval(() => { start += step; if (start >= end) { setDisplay(end); clearInterval(timer) } else setDisplay(start) }, 20)
    return () => clearInterval(timer)
  }, [value])
  return <span>{prefix}{display.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
}

export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletResponse | null>(null)
  const [overview, setOverview] = useState<WalletOverviewResponse | null>(null)
  const [balances, setBalances] = useState<CurrencyWalletResponse[]>([])
  const [analytics, setAnalytics] = useState<WalletAnalyticsResponse | null>(null)
  const [insights, setInsights] = useState<SpendingInsightResponse[]>([])
  const [notifications, setNotifications] = useState<WalletNotificationResponse[]>([])
  const [linkedBanks, setLinkedBanks] = useState<LinkedBankResponse[]>([])
  const [security, setSecurity] = useState<SecurityInfoResponse | null>(null)
  const [cards, setCards] = useState<CardResponse[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [showBalance, setShowBalance] = useState(true)
  const [copied, setCopied] = useState("")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const [depositOpen, setDepositOpen] = useState(false); const [depositAmount, setDepositAmount] = useState(""); const [depositCurrency, setDepositCurrency] = useState("ZAR"); const [depositing, setDepositing] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false); const [withdrawAmount, setWithdrawAmount] = useState(""); const [withdrawCurrency, setWithdrawCurrency] = useState("ZAR"); const [withdrawing, setWithdrawing] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false); const [transferAmount, setTransferAmount] = useState(""); const [transferFrom, setTransferFrom] = useState("ZAR"); const [transferTo, setTransferTo] = useState("USD"); const [transferring, setTransferring] = useState(false)
  const [exchangeOpen, setExchangeOpen] = useState(false); const [exchangeAmount, setExchangeAmount] = useState(""); const [exchangeFrom, setExchangeFrom] = useState("ZAR"); const [exchangeTo, setExchangeTo] = useState("USD"); const [exchanging, setExchanging] = useState(false)
  const [qrOpen, setQrOpen] = useState(false); const [qrData, setQrData] = useState<QRResponse | null>(null)
  const [bankOpen, setBankOpen] = useState(false); const [bankName, setBankName] = useState(""); const [bankAccount, setBankAccount] = useState(""); const [bankAccountName, setBankAccountName] = useState(""); const [linking, setLinking] = useState(false)

  const [exchageRates, setExchangeRates] = useState<ExchangeRateResponse[]>([])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try { const [w, o, b, a, i, n, lb, s, c, txs] = await Promise.all([walletApi.get(), walletApi.overview(), walletApi.balances(), walletApi.analytics(), walletApi.insights(), walletApi.notifications(), walletApi.linkedBanks(), walletApi.security(), walletApi.cards(), walletApi.transactions()])
      setWallet(w); setOverview(o); setBalances(b); setAnalytics(a); setInsights(i); setNotifications(n); setLinkedBanks(lb); setSecurity(s); setCards(c); setTransactions(txs)
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleDeposit = async () => {
    const amt = parseFloat(depositAmount); if (isNaN(amt) || amt <= 0) return
    setDepositing(true); try { await walletApi.deposit(amt, depositCurrency); setDepositOpen(false); setDepositAmount(""); fetchAll() } catch {} finally { setDepositing(false) }
  }
  const handleWithdraw = async () => {
    const amt = parseFloat(withdrawAmount); if (isNaN(amt) || amt <= 0) return
    setWithdrawing(true); try { await walletApi.withdraw(amt, withdrawCurrency); setWithdrawOpen(false); setWithdrawAmount(""); fetchAll() } catch {} finally { setWithdrawing(false) }
  }
  const handleTransfer = async () => {
    const amt = parseFloat(transferAmount); if (isNaN(amt) || amt <= 0) return
    setTransferring(true); try { await walletApi.transfer(amt, transferFrom, transferTo); setTransferOpen(false); setTransferAmount(""); fetchAll() } catch {} finally { setTransferring(false) }
  }
  const handleExchange = async () => {
    const amt = parseFloat(exchangeAmount); if (isNaN(amt) || amt <= 0) return
    setExchanging(true); try { await walletApi.exchange(amt, exchangeFrom, exchangeTo); setExchangeOpen(false); setExchangeAmount(""); fetchAll() } catch {} finally { setExchanging(false) }
  }

  const handleCopy = (text: string, id: string) => { navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(""), 2000) }

  const netWorth = overview?.totalBalance ?? 0
  const unreadNotifications = notifications.filter(n => !n.read).length

  const tabs = [
    { id: "overview", label: "Overview", icon: Wallet },
    { id: "currencies", label: "Currencies", icon: Globe },
    { id: "transfer", label: "Transfer", icon: Send },
    { id: "exchange", label: "Exchange", icon: Repeat },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "security", label: "Security", icon: Shield },
    { id: "cards", label: "Cards", icon: CreditCard },
    { id: "banks", label: "Banks", icon: Landmark },
    { id: "notifications", label: "Notifications", icon: Bell },
  ]

  const commonDialogs = (
    <>
      <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Deposit Funds</DialogTitle><DialogDescription>Add money to your wallet</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R</span>
                <Input type="number" min="1" placeholder="0.00" className="pl-8 text-lg" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={depositCurrency} onValueChange={setDepositCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{CURRENCY_FLAGS[c]} {c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button variant="gradient" className="w-full" disabled={depositing} onClick={handleDeposit}>
              {depositing ? "Processing..." : `Deposit ${formatCurrency(parseFloat(depositAmount || "0"), depositCurrency)}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Withdraw Funds</DialogTitle><DialogDescription>Send money to your bank account</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R</span>
                <Input type="number" min="1" placeholder="0.00" className="pl-8 text-lg" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={withdrawCurrency} onValueChange={setWithdrawCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{CURRENCY_FLAGS[c]} {c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button variant="gradient" className="w-full" disabled={withdrawing} onClick={handleWithdraw}>
              {withdrawing ? "Processing..." : `Withdraw ${formatCurrency(parseFloat(withdrawAmount || "0"), withdrawCurrency)}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Transfer</DialogTitle><DialogDescription>Move money between currencies</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input type="number" min="1" placeholder="0.00" className="text-lg" value={transferAmount} onChange={e => setTransferAmount(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>From</Label>
                <Select value={transferFrom} onValueChange={setTransferFrom}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{CURRENCY_FLAGS[c]} {c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>To</Label>
                <Select value={transferTo} onValueChange={setTransferTo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{CURRENCY_FLAGS[c]} {c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <Button variant="gradient" className="w-full" disabled={transferring} onClick={handleTransfer}>
              {transferring ? "Processing..." : "Transfer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={exchangeOpen} onOpenChange={setExchangeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Exchange Currency</DialogTitle><DialogDescription>Convert between currencies at live rates</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input type="number" min="1" placeholder="0.00" className="text-lg" value={exchangeAmount} onChange={e => setExchangeAmount(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>From</Label>
                <Select value={exchangeFrom} onValueChange={setExchangeFrom}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{CURRENCY_FLAGS[c]} {c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>To</Label>
                <Select value={exchangeTo} onValueChange={setExchangeTo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{CURRENCY_FLAGS[c]} {c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="rounded-lg bg-muted p-3 text-sm">
              <div className="flex justify-between"><span>Rate</span><span className="font-mono">1 {exchangeFrom} = --- {exchangeTo}</span></div>
              <div className="flex justify-between mt-1"><span>Fee (0.5%)</span><span className="font-mono">{formatCurrency(parseFloat(exchangeAmount || "0") * 0.005)}</span></div>
            </div>
            <Button variant="gradient" className="w-full" disabled={exchanging} onClick={handleExchange}>
              {exchanging ? "Processing..." : "Exchange"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Receive Payment</DialogTitle><DialogDescription>Share your wallet details</DialogDescription></DialogHeader>
          {qrData && (
            <div className="space-y-4 text-center">
              <div className="mx-auto w-48 h-48 bg-muted rounded-xl flex items-center justify-center">
                <QrCode className="h-32 w-32 text-primary" />
              </div>
              <div className="space-y-2 text-left">
                {[
                  { label: "Wallet Address", value: qrData.walletAddress },
                  { label: "Account Number", value: qrData.accountNumber },
                  { label: "Payment Link", value: qrData.paymentLink },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between rounded-lg bg-muted p-2">
                    <div><p className="text-xs text-muted-foreground">{item.label}</p><p className="text-sm font-mono truncate max-w-[200px]">{item.value}</p></div>
                    <Button variant="ghost" size="sm" onClick={() => handleCopy(item.value, item.label)}>
                      {copied === item.label ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={bankOpen} onOpenChange={setBankOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Link Bank Account</DialogTitle><DialogDescription>Add a bank account for withdrawals</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Bank Name</Label><Input placeholder="e.g. Standard Bank" value={bankName} onChange={e => setBankName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Account Name</Label><Input placeholder="e.g. John Doe" value={bankAccountName} onChange={e => setBankAccountName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Account Number</Label><Input placeholder="e.g. 1234567890" value={bankAccount} onChange={e => setBankAccount(e.target.value)} /></div>
            <Button variant="gradient" className="w-full" disabled={linking || !bankName || !bankAccount || !bankAccountName} onClick={async () => {
              setLinking(true)
              try { await walletApi.linkBank({ bankName, accountName: bankAccountName, accountNumber: bankAccount }); setBankOpen(false); setBankName(""); setBankAccount(""); setBankAccountName(""); fetchAll() } catch {}
              setLinking(false)
            }}>
              {linking ? "Linking..." : "Link Bank Account"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Wallet</h1>
          <p className="text-sm text-muted-foreground">Manage your finances across multiple currencies</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline" size="sm"><Plus className="mr-2 h-4 w-4" />Action</Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setDepositOpen(true)}><Plus className="mr-2 h-4 w-4" />Deposit</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setWithdrawOpen(true)}><ArrowUpRight className="mr-2 h-4 w-4" />Withdraw</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTransferOpen(true)}><Send className="mr-2 h-4 w-4" />Transfer</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setExchangeOpen(true)}><Repeat className="mr-2 h-4 w-4" />Exchange</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { walletApi.qr().then(setQrData); setQrOpen(true) }}><QrCode className="mr-2 h-4 w-4" />Receive</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setBankOpen(true)}><Landmark className="mr-2 h-4 w-4" />Link Bank</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" onClick={fetchAll}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
          </div>
          <Button variant="ghost" size="sm" className="sm:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}><Menu className="h-5 w-5" /></Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={() => setShowBalance(!showBalance)}>
                  {showBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{showBalance ? "Hide" : "Show"} balance</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => <Card key={i}><CardContent className="p-6 space-y-2"><Skeleton className="h-8 w-24" /><Skeleton className="h-4 w-32" /></CardContent></Card>)}
          </div>
          <Card><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
        </div>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">Total Balance</p>
                  <Wallet className="h-4 w-4 text-primary" />
                </div>
                <p className="text-3xl font-bold mt-2">
                  {showBalance ? <AnimatedNumber value={overview?.totalBalance ?? 0} /> : "••••••"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Available: {showBalance ? formatCurrency(overview?.availableBalance ?? 0) : "••••••"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">Monthly Income</p>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
                <p className="text-2xl font-bold mt-2">{showBalance ? formatCurrency(overview?.monthlyIncome ?? 0) : "••••••"}</p>
                <p className="text-xs text-muted-foreground mt-1">This month</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">Monthly Spending</p>
                  <ArrowUpRight className="h-4 w-4 text-red-500" />
                </div>
                <p className="text-2xl font-bold mt-2">{showBalance ? formatCurrency(overview?.monthlySpending ?? 0) : "••••••"}</p>
                <p className="text-xs text-muted-foreground mt-1">This month</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">Cash Flow</p>
                  {overview && overview.monthlyCashFlow >= 0 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />}
                </div>
                <p className={`text-2xl font-bold mt-2 ${overview && overview.monthlyCashFlow >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {showBalance ? formatCurrency(Math.abs(overview?.monthlyCashFlow ?? 0)) : "••••••"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{overview && overview.monthlyCashFlow >= 0 ? "Positive" : "Negative"}</p>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <ScrollArea className="pb-2">
              <TabsList className="w-full justify-start">
                {tabs.map(tab => (
                  <TabsTrigger key={tab.id} value={tab.id} className="gap-2">
                    <tab.icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </ScrollArea>

            <TabsContent value="overview" className="space-y-6 mt-6">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button variant="gradient" className="h-auto py-4 flex-col gap-1" onClick={() => setDepositOpen(true)}>
                  <Plus className="h-5 w-5" /><span className="text-sm">Deposit</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col gap-1" onClick={() => setWithdrawOpen(true)}>
                  <ArrowUpRight className="h-5 w-5" /><span className="text-sm">Withdraw</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col gap-1" onClick={() => setTransferOpen(true)}>
                  <Send className="h-5 w-5" /><span className="text-sm">Transfer</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col gap-1" onClick={() => { walletApi.qr().then(setQrData); setQrOpen(true) }}>
                  <QrCode className="h-5 w-5" /><span className="text-sm">Receive</span>
                </Button>
              </div>

              <DepositFundsSection />

              {insights.length > 0 && (
                <div className="grid gap-3">
                  {insights.map((insight, i) => (
                    <Card key={i} className={insight.type === "positive" ? "border-green-500/30 bg-green-500/5" : "border-amber-500/30 bg-amber-500/5"}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {insight.type === "positive" ? <TrendingUp className="h-5 w-5 text-green-500" /> : <AlertTriangle className="h-5 w-5 text-amber-500" />}
                          <div><p className="text-sm font-medium">{insight.message}</p></div>
                        </div>
                        <Button variant="ghost" size="sm">{insight.recommendations[0]?.action}</Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Recent Transactions</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab("analytics")}>View All <ChevronRight className="ml-1 h-4 w-4" /></Button>
                </CardHeader>
                <CardContent>
                  {transactions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No transactions yet</p>
                  ) : (
                    <div className="space-y-1">
                      {transactions.slice(0, 5).map(tx => (
                        <div key={tx.id} className="flex items-center justify-between rounded-lg p-3 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`rounded-full p-2 ${
                              tx.type === "deposit" || tx.type === "payment" ? "bg-green-500/10" :
                              tx.type === "withdrawal" ? "bg-red-500/10" : "bg-blue-500/10"
                            }`}>
                              {tx.type === "deposit" || tx.type === "payment" ? <ArrowDownLeft className="h-4 w-4 text-green-500" /> :
                               tx.type === "withdrawal" ? <ArrowUpRight className="h-4 w-4 text-red-500" /> : <Repeat className="h-4 w-4 text-blue-500" />}
                            </div>
                            <div>
                              <p className="text-sm font-medium capitalize">{tx.type}</p>
                              <p className="text-xs text-muted-foreground">{tx.description || tx.reference || new Date(tx.createdAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-medium ${tx.type === "deposit" || tx.type === "payment" ? "text-green-500" : ""}`}>
                              {tx.type === "deposit" || tx.type === "payment" ? "+" : "-"}{formatCurrency(tx.amount, tx.currency)}
                            </p>
                            <Badge variant={tx.status === "completed" ? "default" : tx.status === "pending" ? "secondary" : "destructive"} className="text-[10px] px-1.5 py-0">
                              {tx.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="currencies" className="space-y-4 mt-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {balances.map((bal, i) => (
                  <Card key={bal.currency} className="relative overflow-hidden group hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{bal.flag}</span>
                          <div>
                            <p className="font-semibold">{bal.currency}</p>
                            <p className="text-xs text-muted-foreground">{formatCurrency(bal.zarValue)} ZAR</p>
                          </div>
                        </div>
                        <Badge variant={bal.changePercent >= 0 ? "default" : "destructive"} className="text-xs">
                          {bal.changePercent >= 0 ? "+" : ""}{bal.changePercent}%
                        </Badge>
                      </div>
                      <p className="text-2xl font-bold font-mono">{showBalance ? formatCurrency(bal.balance, bal.currency) : "••••••"}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <MiniGraph data={bal.miniGraph} color={bal.changePercent >= 0 ? "#22c55e" : "#ef4444"} />
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setDepositCurrency(bal.currency); setDepositOpen(true) }}><Plus className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setWithdrawCurrency(bal.currency); setWithdrawOpen(true) }}><ArrowUpRight className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="transfer" className="space-y-6 mt-6">
              <Card className="max-w-lg mx-auto">
                <CardHeader><CardTitle>Transfer Between Currencies</CardTitle><CardDescription>Move money between your wallets</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input type="number" placeholder="0.00" className="text-lg" value={transferAmount} onChange={e => setTransferAmount(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-[1fr,auto,1fr] gap-3 items-end">
                    <div className="space-y-2">
                      <Label>From</Label>
                      <Select value={transferFrom} onValueChange={setTransferFrom}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{CURRENCY_FLAGS[c]} {c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <Button variant="ghost" size="icon" className="mb-1" onClick={() => { const t = transferFrom; setTransferFrom(transferTo); setTransferTo(t) }}>
                      <Repeat className="h-4 w-4" />
                    </Button>
                    <div className="space-y-2">
                      <Label>To</Label>
                      <Select value={transferTo} onValueChange={setTransferTo}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{CURRENCY_FLAGS[c]} {c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button variant="gradient" className="w-full" disabled={transferring || !transferAmount} onClick={handleTransfer}>
                    {transferring ? "Processing..." : "Transfer"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="exchange" className="space-y-6 mt-6">
              <div className="grid lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle>Exchange Currency</CardTitle><CardDescription>Convert at competitive rates</CardDescription></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>You Send</Label>
                      <Input type="number" placeholder="0.00" className="text-lg" value={exchangeAmount} onChange={e => setExchangeAmount(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-[1fr,auto,1fr] gap-3 items-end">
                      <div className="space-y-2">
                        <Label>From</Label>
                        <Select value={exchangeFrom} onValueChange={setExchangeFrom}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{CURRENCY_FLAGS[c]} {c}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <Button variant="ghost" size="icon" className="mb-1" onClick={() => { const t = exchangeFrom; setExchangeFrom(exchangeTo); setExchangeTo(t) }}>
                        <Repeat className="h-4 w-4" />
                      </Button>
                      <div className="space-y-2">
                        <Label>To</Label>
                        <Select value={exchangeTo} onValueChange={setExchangeTo}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{CURRENCY_FLAGS[c]} {c}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="rounded-lg bg-muted p-3 space-y-1 text-sm">
                      <div className="flex justify-between"><span>Rate</span><span className="font-mono">1 {exchangeFrom} = --- {exchangeTo}</span></div>
                      <div className="flex justify-between"><span>Fee (0.5%)</span><span className="font-mono">{formatCurrency(parseFloat(exchangeAmount || "0") * 0.005)}</span></div>
                      <Separator className="my-1" />
                      <div className="flex justify-between font-medium">
                        <span>You Get</span>
                        <span className="font-mono">--- {exchangeTo}</span>
                      </div>
                    </div>
                    <Button variant="gradient" className="w-full" disabled={exchanging || !exchangeAmount} onClick={handleExchange}>
                      {exchanging ? "Processing..." : "Exchange"}
                    </Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Live Exchange Rates</CardTitle><CardDescription>Updated in real-time</CardDescription></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {["ZAR/USD", "ZAR/EUR", "ZAR/GBP", "USD/EUR", "USD/GBP"].map(pair => {
                        const [from, to] = pair.split("/")
                        const rate = exchageRates.find(r => r.from === from && r.to === to)
                        return (
                          <div key={pair} className="flex items-center justify-between rounded-lg p-3 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-2">
                              <span>{CURRENCY_FLAGS[from]}</span>
                              <span className="text-sm font-medium">{pair}</span>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-mono">{rate ? rate.rate.toFixed(4) : "---"}</p>
                              <p className="text-[10px] text-muted-foreground">Spread: {rate ? rate.spread.toFixed(4) : "---"}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6 mt-6">
              {analytics && (
                <div className="grid gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader><CardTitle className="text-base">Income vs Expenses</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {analytics.incomeVsExpenses.map((d, i) => (
                          <div key={i} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>{d.label}</span>
                              <span className="font-medium">{formatCurrency(d.value)}</span>
                            </div>
                            <Progress value={Math.min(Math.abs((d.value / (Math.max(...analytics.incomeVsExpenses.map(x => Math.abs(x.value)), 1))) * 100), 100)} className="h-2" />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-base">Spending by Category</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analytics.spendingCategories.map((cat, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-primary" />
                              <span className="text-sm capitalize">{cat.label}</span>
                            </div>
                            <span className="text-sm font-medium">{formatCurrency(cat.value)}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-base">Top Recipients</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analytics.topRecipients.map((r, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <span className="text-sm">{r.label}</span>
                            <span className="text-sm font-medium">{formatCurrency(r.value)}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-base">Key Metrics</CardTitle></CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><p className="text-sm text-muted-foreground">Avg Transaction</p><p className="text-lg font-bold">{formatCurrency(analytics.averageTransaction)}</p></div>
                        <div className="space-y-1"><p className="text-sm text-muted-foreground">Largest Txn</p><p className="text-lg font-bold">{formatCurrency(analytics.largestTransaction)}</p></div>
                        <div className="space-y-1"><p className="text-sm text-muted-foreground">Net Cash Flow</p><p className={`text-lg font-bold ${analytics.cashFlow >= 0 ? "text-green-500" : "text-red-500"}`}>{formatCurrency(Math.abs(analytics.cashFlow))}</p></div>
                        <div className="space-y-1"><p className="text-sm text-muted-foreground">Total Txns</p><p className="text-lg font-bold">{transactions.length}</p></div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="lg:col-span-2">
                    <CardHeader><CardTitle className="text-base">Transaction History</CardTitle></CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {transactions.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No transactions</TableCell></TableRow>
                          ) : transactions.map(tx => (
                            <TableRow key={tx.id}>
                              <TableCell className="text-xs">{new Date(tx.createdAt).toLocaleDateString()}</TableCell>
                              <TableCell><Badge variant="outline" className="capitalize text-xs">{tx.type}</Badge></TableCell>
                              <TableCell className="text-sm max-w-[200px] truncate">{tx.description || tx.reference || "-"}</TableCell>
                              <TableCell className={`text-right font-mono text-sm ${tx.type === "deposit" || tx.type === "payment" ? "text-green-500" : ""}`}>
                                {tx.type === "deposit" || tx.type === "payment" ? "+" : "-"}{formatCurrency(tx.amount, tx.currency || "ZAR")}
                              </TableCell>
                              <TableCell><Badge variant={tx.status === "completed" ? "default" : tx.status === "pending" ? "secondary" : "destructive"} className="text-[10px]">{tx.status}</Badge></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="security" className="space-y-6 mt-6">
              {security && (
                <div className="grid gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader><CardTitle className="text-base">Security Score</CardTitle></CardHeader>
                    <CardContent className="text-center">
                      <div className="relative inline-flex mb-4">
                        <svg className="w-32 h-32" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                          <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--primary))" strokeWidth="8"
                            strokeDasharray={`${2 * Math.PI * 40}`} strokeDashoffset={`${2 * Math.PI * 40 * (1 - security.securityScore / 100)}`}
                            strokeLinecap="round" transform="rotate(-90, 50, 50)" />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold">{security.securityScore}%</span>
                      </div>
                      <div className="space-y-3 text-left">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2"><Shield className="h-4 w-4" /><span className="text-sm">Two-Factor Auth</span></div>
                          <Switch checked={security.twoFactorEnabled} />
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2"><Smartphone className="h-4 w-4" /><span className="text-sm">Biometric</span></div>
                          <Switch checked={security.biometricEnabled} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-base">Active Sessions</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      {security.activeDevices.map(d => (
                        <div key={d.id} className="flex items-center justify-between rounded-lg p-3 bg-muted/50">
                          <div className="flex items-center gap-3">
                            {d.type === "Desktop" ? <Monitor className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
                            <div><p className="text-sm font-medium">{d.name}</p><p className="text-xs text-muted-foreground">Active {new Date(d.lastActive).toLocaleDateString()}</p></div>
                          </div>
                          <Button variant="ghost" size="sm" className="text-destructive"><X className="h-4 w-4" /></Button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                  <Card className="lg:col-span-2">
                    <CardHeader><CardTitle className="text-base">Login History</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {security.loginHistory.map((s, i) => (
                          <div key={s.id} className="flex items-center justify-between rounded-lg p-3 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="rounded-full bg-muted p-2"><Lock className="h-4 w-4" /></div>
                              <div><p className="text-sm font-medium">{s.device}</p><p className="text-xs text-muted-foreground">{s.location} · {s.ip}</p></div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">{new Date(s.time).toLocaleString()}</p>
                              {s.isCurrent && <Badge className="text-[10px]">Current</Badge>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="cards" className="space-y-6 mt-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {cards.map(card => (
                  <Card key={card.id} className={`relative overflow-hidden ${card.isFrozen ? "opacity-60" : ""}`}>
                    <div className="absolute top-0 right-0 w-32 h-32 -translate-y-1/2 translate-x-1/2 rounded-full bg-gradient-to-br from-primary/20 to-primary/5" />
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">{card.type} Card</p>
                          <p className="text-lg font-bold">{card.type === "Virtual" ? "Virtual" : "Physical"}</p>
                        </div>
                        <CreditCard className="h-8 w-8 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-mono text-lg tracking-wider">•••• •••• •••• {card.lastFour}</p>
                        <p className="text-xs text-muted-foreground">Expires {card.expiry}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm">Limit: {formatCurrency(card.limit ?? 0)}</p>
                        <div className="flex gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  {card.isFrozen ? <Ban className="h-4 w-4 text-amber-500" /> : <Zap className="h-4 w-4 text-green-500" />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{card.isFrozen ? "Frozen" : "Active"}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>{card.isFrozen ? "Unfreeze" : "Freeze"} Card</DropdownMenuItem>
                              <DropdownMenuItem>View Details</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">Report Lost</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="banks" className="space-y-6 mt-6">
              <div className="flex justify-end">
                <Button variant="gradient" size="sm" onClick={() => setBankOpen(true)}><Plus className="mr-2 h-4 w-4" />Link Bank</Button>
              </div>
              {linkedBanks.length === 0 ? (
                <Card><CardContent className="p-12 text-center"><Landmark className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">No linked bank accounts</p><Button variant="link" onClick={() => setBankOpen(true)}>Link your first bank</Button></CardContent></Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {linkedBanks.map(bank => (
                    <Card key={bank.id}>
                      <CardContent className="p-5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="rounded-full bg-primary/10 p-3"><Landmark className="h-5 w-5 text-primary" /></div>
                          <div>
                            <p className="font-medium">{bank.bankName}</p>
                            <p className="text-sm text-muted-foreground">{bank.accountName} · {bank.accountNumber}</p>
                            <div className="flex gap-2 mt-1">
                              <Badge variant={bank.isVerified ? "default" : "secondary"} className="text-[10px]">{bank.isVerified ? "Verified" : "Pending"}</Badge>
                              {bank.isPrimary && <Badge variant="outline" className="text-[10px]">Primary</Badge>}
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={async () => { try { await walletApi.unlinkBank(bank.id); fetchAll() } catch {} }}>
                          <X className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="notifications" className="space-y-4 mt-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{unreadNotifications} unread</p>
                <Button variant="ghost" size="sm">Mark all read</Button>
              </div>
              {notifications.length === 0 ? (
                <Card><CardContent className="p-12 text-center"><Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">No notifications</p></CardContent></Card>
              ) : (
                <div className="space-y-2">
                  {notifications.map(n => (
                    <Card key={n.id} className={n.read ? "" : "border-primary/30"}>
                      <CardContent className="p-4 flex items-start gap-3">
                        <div className={`rounded-full p-2 mt-0.5 ${
                          n.type === "success" ? "bg-green-500/10" : n.type === "warning" ? "bg-amber-500/10" : "bg-blue-500/10"
                        }`}>
                          {n.type === "success" ? <Check className="h-4 w-4 text-green-500" /> :
                           n.type === "warning" ? <AlertTriangle className="h-4 w-4 text-amber-500" /> : <Bell className="h-4 w-4 text-blue-500" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">{n.title}</p>
                            <span className="text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{n.message}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {commonDialogs}
        </>
      )}
    </div>
  )
}