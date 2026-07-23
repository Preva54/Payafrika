"use client"

import { useEffect, useState } from "react"
import { RefreshCw, Plus, ArrowUpRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { walletApi, type WalletResponse } from "@/lib/api"

export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [depositAmount, setDepositAmount] = useState("")
  const [depositing, setDepositing] = useState(false)
  const [open, setOpen] = useState(false)

  const fetchWallet = async () => {
    setLoading(true)
    try {
      const data = await walletApi.get()
      setWallet(data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchWallet() }, [])

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount)
    if (isNaN(amount) || amount <= 0) return
    setDepositing(true)
    try {
      const updated = await walletApi.deposit(amount)
      setWallet(updated)
      setOpen(false)
      setDepositAmount("")
    } catch {}
    setDepositing(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Wallet</h1>
        <Button variant="outline" size="sm" onClick={fetchWallet}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
      </div>
      {loading ? (
        <Card><CardContent className="p-6 space-y-2"><Skeleton className="h-16 w-32" /><Skeleton className="h-4 w-24" /></CardContent></Card>
      ) : (
        <Card>
          <CardHeader><CardTitle>Balance</CardTitle></CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">R {(wallet?.balance ?? 0).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</p>
            <p className="text-sm text-muted-foreground mt-1">{wallet?.currency ?? "ZAR"}</p>
          </CardContent>
        </Card>
      )}
      <div className="grid sm:grid-cols-2 gap-4">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="gradient" className="h-auto py-6 flex-col gap-2"><Plus className="h-6 w-6" /><span>Deposit</span></Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Deposit Funds</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount (ZAR)</label>
                <Input type="number" min="1" placeholder="Enter amount" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} />
              </div>
              <Button variant="gradient" className="w-full" disabled={depositing} onClick={handleDeposit}>
                {depositing ? "Processing..." : `Deposit R ${parseFloat(depositAmount || "0").toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <Button variant="outline" className="h-auto py-6 flex-col gap-2"><ArrowUpRight className="h-6 w-6" /><span>Transfer</span></Button>
      </div>
    </div>
  )
}
