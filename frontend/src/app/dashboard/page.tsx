"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Wallet, ArrowLeftRight, Repeat, Send, TrendingUp, TrendingDown, ArrowRight, Plus, RefreshCw, Building2, HandCoins, CreditCard, Bell, BarChart3, Globe, ChevronRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import DepositDialog from "@/components/dashboard/deposit-dialog"
import WithdrawDialog from "@/components/dashboard/withdraw-dialog"
import ExchangeDialog from "@/components/dashboard/exchange-dialog"
import TransferDialog from "@/components/dashboard/transfer-dialog"
import PayMerchantDialog from "@/components/dashboard/pay-merchant-dialog"
import RequestMoneyDialog from "@/components/dashboard/request-money-dialog"
import { dashboardApi, walletApi, type WalletResponse, type Transaction, type LoanResponse, type UserInfo, type WalletOverviewResponse, type CurrencyWalletResponse, type ExchangeRateResponse, type WalletNotificationResponse } from "@/lib/api"

const CURRENCY_FLAGS: Record<string, string> = {
  ZAR: "\uD83C\uDDFF\uD83C\uDDE6", USD: "\uD83C\uDDFA\uD83C\uDDF8", EUR: "\uD83C\uDDEA\uD83C\uDDFA",
  GBP: "\uD83C\uDDEC\uD83C\uDDE7", NGN: "\uD83C\uDDF3\uD83C\uDDEC", KES: "\uD83C\uDDF0\uD83C\uDDEA",
  BTC: "\u20BF", ETH: "\u27A0", USDT: "\uD83D\uDCB5",
}

function formatCurrency(amount: number, currency = "ZAR"): string {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

const quickActions = [
  { label: "Deposit", icon: Plus, gradient: true, key: "deposit" },
  { label: "Withdraw", icon: ArrowLeftRight, gradient: false, key: "withdraw" },
  { label: "Exchange", icon: Repeat, gradient: false, key: "exchange" },
  { label: "Transfer", icon: Send, gradient: false, key: "transfer" },
  { label: "Pay Merchant", icon: Building2, gradient: false, key: "pay" },
  { label: "Request", icon: HandCoins, gradient: false, key: "request" },
]

const HOUR = new Date().getHours()
const greeting = HOUR < 12 ? "Good Morning" : HOUR < 18 ? "Good Afternoon" : "Good Evening"

export default function DashboardPage() {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [wallet, setWallet] = useState<WalletResponse | null>(null)
  const [overview, setOverview] = useState<WalletOverviewResponse | null>(null)
  const [balances, setBalances] = useState<CurrencyWalletResponse[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loans, setLoans] = useState<LoanResponse[]>([])
  const [rates, setRates] = useState<ExchangeRateResponse[]>([])
  const [notifications, setNotifications] = useState<WalletNotificationResponse[]>([])
  const [loading, setLoading] = useState(true)

  const [openDialog, setOpenDialog] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [userData, walletData, ov, bals, txData, loanData, rateData, notifData] = await Promise.all([
        dashboardApi.user(),
        dashboardApi.wallet(),
        walletApi.overview().catch(() => null),
        walletApi.balances().catch(() => []),
        dashboardApi.transactions(),
        dashboardApi.loans(),
        walletApi.exchangeRates().catch(() => []),
        walletApi.notifications().catch(() => []),
      ])
      setUser(userData)
      setWallet(walletData)
      setOverview(ov)
      setBalances(bals)
      setTransactions(txData)
      setLoans(loanData)
      setRates(rateData)
      setNotifications(notifData)
    } catch { /* handled */ }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const activeLoans = loans.filter(l => l.status === "active" || l.status === "pending")
  const unreadNotifs = notifications.filter(n => !n.read).length

  const stats = overview ? [
    { label: "Total Portfolio", value: formatCurrency(overview.totalBalance), change: "+0%", icon: Wallet, positive: true },
    { label: "Available Balance", value: formatCurrency(overview.availableBalance), change: "Ready to use", icon: Wallet, positive: true },
    { label: "Pending Balance", value: formatCurrency(overview.pendingBalance), change: "Awaiting clearance", icon: Wallet, positive: false },
    { label: "Reserved Balance", value: formatCurrency(overview.reservedBalance), change: "In use", icon: Wallet, positive: false },
  ] : [
    { label: "Wallet Balance", value: `R ${(wallet?.balance ?? 0).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`, change: "+0%", icon: Wallet, positive: true },
    { label: "Total Spent", value: `R ${transactions.filter(t => t.type === "payment" || t.type === "withdrawal").reduce((s, t) => s + t.amount, 0).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`, change: "From wallet", icon: ArrowLeftRight, positive: false },
    { label: "Active Loans", value: activeLoans.length.toString(), change: `${activeLoans.length} loan${activeLoans.length !== 1 ? "s" : ""}`, icon: HandCoins, positive: true },
    { label: "Next Payment", value: activeLoans[0] ? `R ${(activeLoans[0].monthlyPayment ?? 0).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}` : "None", change: activeLoans[0] ? `Due ${new Date(activeLoans[0].createdAt).toLocaleDateString()}` : "No active loans", icon: CreditCard, positive: !!activeLoans[0] },
  ]

  const dialogProps = { onClose: () => setOpenDialog(null), onSuccess: fetchData }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-72" /><Skeleton className="h-4 w-48" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{[1, 2, 3, 4].map(i => <Card key={i}><CardContent className="p-6"><Skeleton className="h-10 w-20" /><Skeleton className="h-4 w-28 mt-2" /></CardContent></Card>)}</div>
        <div className="grid lg:grid-cols-2 gap-6"><Card><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card><div className="space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-24 w-full" /></div></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{greeting}, {user?.fullName?.split(" ")[0] ?? "User"}</h1>
          <p className="text-sm text-muted-foreground">Here&apos;s your financial overview for today.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="mr-2 h-4 w-4" />Refresh
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon
          return (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.08 }}>
              <Card className="hover:shadow-md transition-all duration-300 cursor-pointer" onClick={() => setOpenDialog("deposit")}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">{stat.label}</CardTitle>
                  <div className="h-7 w-7 rounded-lg gradient-bg flex items-center justify-center">
                    <Icon className="h-3.5 w-3.5 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">{stat.value}</div>
                  <div className="flex items-center gap-1 mt-1">
                    {stat.positive ? <TrendingUp className="h-3 w-3 text-accent" /> : <TrendingDown className="h-3 w-3 text-destructive" />}
                    <span className={`text-[10px] ${stat.positive ? "text-accent" : "text-destructive"}`}>{stat.change}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {quickActions.map(action => {
              const Icon = action.icon
              return (
                <Button
                  key={action.key}
                  variant={action.gradient ? "gradient" : "outline"}
                  className="h-auto py-3 flex-col gap-1.5"
                  onClick={() => setOpenDialog(action.key)}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[10px] font-normal">{action.label}</span>
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card className="cursor-pointer hover:shadow-md transition-all" onClick={() => setOpenDialog("exchange")}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Multi-Currency Wallet</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs gap-1" asChild><a href="/dashboard/wallet">View Wallet <ArrowRight className="h-3 w-3" /></a></Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {balances.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No currency wallets</p>
                ) : balances.slice(0, 4).map(bal => (
                  <div key={bal.currency} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{CURRENCY_FLAGS[bal.currency] || bal.flag}</span>
                      <span className="text-sm font-medium">{bal.currency}</span>
                    </div>
                    <span className="text-sm font-semibold font-mono">
                      {formatCurrency(bal.balance, bal.currency)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-all" onClick={() => setOpenDialog("exchange")}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Exchange Rates</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs gap-1" asChild><a href="/dashboard/exchange">View Live Rates <ArrowRight className="h-3 w-3" /></a></Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {rates.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No rates available</p>
                ) : rates.slice(0, 4).map(rate => (
                  <div key={`${rate.from}-${rate.to}`} className="flex items-center justify-between py-1.5">
                    <span className="text-sm">{rate.from}/{rate.to}</span>
                    <div className="text-right">
                      <span className="text-sm font-mono">{rate.rate.toFixed(4)}</span>
                      <Badge variant="outline" className="text-[10px] ml-2 border-green-500/30 text-green-600 bg-green-500/5">{rate.spread > 0 ? "+" : ""}{rate.spread.toFixed(2)}%</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="cursor-pointer hover:shadow-md transition-all" onClick={() => setOpenDialog("transfer")}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Recent Transactions</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs gap-1" asChild><a href="/dashboard/transactions">View All <ArrowRight className="h-3 w-3" /></a></Button>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No transactions yet</p>
              ) : (
                <div className="space-y-1">
                  {transactions.slice(0, 5).map(tx => (
                    <div key={tx.id} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2">
                        <div className={`rounded-full p-1.5 ${tx.type === "deposit" || tx.type === "payment" ? "bg-green-500/10" : tx.type === "withdrawal" ? "bg-red-500/10" : "bg-blue-500/10"}`}>
                          {tx.type === "deposit" || tx.type === "payment" ? <TrendingUp className="h-3 w-3 text-green-500" /> : tx.type === "withdrawal" ? <ArrowLeftRight className="h-3 w-3 text-red-500" /> : <Repeat className="h-3 w-3 text-blue-500" />}
                        </div>
                        <div>
                          <p className="text-sm capitalize">{tx.type}</p>
                          <p className="text-[10px] text-muted-foreground">{new Date(tx.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-semibold ${tx.type === "deposit" || tx.type === "payment" ? "text-accent" : ""}`}>
                          {tx.type === "deposit" || tx.type === "payment" ? "+" : "-"}{formatCurrency(tx.amount, tx.currency || "ZAR")}
                        </span>
                        <div><Badge variant={tx.status === "completed" ? "success" : "secondary"} className="text-[9px] px-1">{tx.status}</Badge></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Notifications</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs gap-1" asChild><a href="/dashboard/notifications">View All <ArrowRight className="h-3 w-3" /></a></Button>
            </CardHeader>
            <CardContent>
              {notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No notifications</p>
              ) : (
                <div className="space-y-2">
                  {notifications.slice(0, 3).map(n => (
                    <div key={n.id} className="flex items-start gap-3 py-2">
                      <div className={`rounded-full p-1.5 mt-0.5 ${n.read ? "bg-muted" : "bg-primary/10"}`}>
                        <Bell className={`h-3 w-3 ${n.read ? "text-muted-foreground" : "text-primary"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs ${n.read ? "" : "font-semibold"}`}>{n.title}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{n.message}</p>
                        <p className="text-[9px] text-muted-foreground mt-0.5">{formatRelativeTime(n.createdAt)}</p>
                      </div>
                      {!n.read && <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {openDialog === "deposit" && <DepositDialog open={true} {...dialogProps} />}
      {openDialog === "withdraw" && <WithdrawDialog open={true} {...dialogProps} />}
      {openDialog === "exchange" && <ExchangeDialog open={true} {...dialogProps} />}
      {openDialog === "transfer" && <TransferDialog open={true} {...dialogProps} />}
      {openDialog === "pay" && <PayMerchantDialog open={true} onClose={() => setOpenDialog(null)} />}
      {openDialog === "request" && <RequestMoneyDialog open={true} onClose={() => setOpenDialog(null)} />}
    </div>
  )
}
