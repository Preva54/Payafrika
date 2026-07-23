"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Wallet, ArrowLeftRight, HandCoins, CreditCard, TrendingUp, TrendingDown, ArrowRight, Plus, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { dashboardApi, type WalletResponse, type Transaction, type LoanResponse, type UserInfo } from "@/lib/api"

export default function DashboardPage() {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [wallet, setWallet] = useState<WalletResponse | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loans, setLoans] = useState<LoanResponse[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [userData, walletData, txData, loanData] = await Promise.all([
        dashboardApi.user(),
        dashboardApi.wallet(),
        dashboardApi.transactions(),
        dashboardApi.loans(),
      ])
      setUser(userData)
      setWallet(walletData)
      setTransactions(txData)
      setLoans(loanData)
    } catch {
      // handled by auth guard redirect
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const activeLoans = loans.filter((l) => l.status === "active" || l.status === "pending")
  const nextPayment = activeLoans[0]

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-12 w-24" /><Skeleton className="h-4 w-16 mt-2" /></CardContent></Card>
          ))}
        </div>
      </div>
    )
  }

  const balance = wallet?.balance ?? 0

  const stats = [
    { label: "Wallet Balance", value: `R ${balance.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`, change: "+0%", icon: Wallet, positive: true },
    { label: "Total Spent", value: `R ${transactions.filter((t) => t.type === "payment" || t.type === "withdrawal").reduce((s, t) => s + t.amount, 0).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`, change: "From your wallet", icon: ArrowLeftRight, positive: false },
    { label: "Active Loans", value: activeLoans.length.toString(), change: `${activeLoans.length} loan${activeLoans.length !== 1 ? "s" : ""}`, icon: HandCoins, positive: true },
    { label: "Next Payment", value: nextPayment ? `R ${(nextPayment.monthlyPayment ?? 0).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}` : "None", change: nextPayment ? `Due ${new Date(nextPayment.createdAt).toLocaleDateString()}` : "No active loans", icon: CreditCard, positive: !!nextPayment },
  ]

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">Welcome back, {user?.fullName?.split(" ")[0] ?? "User"}</h1>
          <p className="text-muted-foreground">Here&apos;s your financial overview for today.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.1 }}
            >
              <Card className="hover:shadow-card-hover transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </CardTitle>
                  <div className="h-8 w-8 rounded-xl gradient-bg flex items-center justify-center">
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="flex items-center gap-1 mt-1">
                    {stat.positive ? (
                      <TrendingUp className="h-3 w-3 text-accent" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-destructive" />
                    )}
                    <span className={`text-xs ${stat.positive ? "text-accent" : "text-destructive"}`}>
                      {stat.change}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Transactions</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs">
              View All <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No transactions yet</div>
            ) : (
              <div className="space-y-4">
                {transactions.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium">{tx.description || tx.type}</p>
                      <p className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-semibold ${tx.type === "deposit" || tx.type === "loan" ? "text-accent" : ""}`}>
                        {tx.type === "deposit" || tx.type === "loan" ? "+" : "-"}R {tx.amount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                      </span>
                      <div className="mt-1">
                        <Badge variant={tx.status === "completed" ? "success" : "secondary"} className="text-[10px]">
                          {tx.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="gradient" className="h-auto py-4 flex-col gap-1">
                  <Plus className="h-5 w-5" />
                  <span className="text-xs font-normal">Deposit</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col gap-1">
                  <ArrowLeftRight className="h-5 w-5" />
                  <span className="text-xs font-normal">Transfer</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col gap-1">
                  <HandCoins className="h-5 w-5" />
                  <span className="text-xs font-normal">Apply Loan</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col gap-1">
                  <CreditCard className="h-5 w-5" />
                  <span className="text-xs font-normal">Pay</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>KYC Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={`flex items-center gap-4 p-4 rounded-xl ${user?.kycStatus === "verified" ? "bg-accent/10" : "bg-amber-500/10"}`}>
                <div className={`h-12 w-12 rounded-xl ${user?.kycStatus === "verified" ? "bg-accent/10" : "bg-amber-500/10"} flex items-center justify-center`}>
                  <div className={`h-6 w-6 rounded-full ${user?.kycStatus === "verified" ? "bg-accent" : "bg-amber-500"}`} />
                </div>
                <div>
                  <p className="font-semibold text-sm">
                    {user?.kycStatus === "verified" ? "Verification Complete" : user?.kycStatus === "pending" ? "Verification Pending" : "Not Verified"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user?.kycStatus === "verified" ? "Your identity has been verified" : "Complete your KYC to unlock full features"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
