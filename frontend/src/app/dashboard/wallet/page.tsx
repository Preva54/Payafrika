"use client"

import { useEffect, useState } from "react"
import { Wallet as WalletIcon, Plus, ArrowUpRight, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { walletApi, type WalletResponse } from "@/lib/api"

export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchWallet = async () => {
    setLoading(true)
    try {
      const data = await walletApi.get()
      setWallet(data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchWallet() }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Wallet</h1>
        <Button variant="outline" size="sm" onClick={fetchWallet}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
      </div>
      {loading ? (
        <Card><CardContent className="p-6"><Skeleton className="h-16 w-32" /><Skeleton className="h-4 w-24 mt-2" /></Skeleton></CardContent></Card>
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
        <Button variant="gradient" className="h-auto py-6 flex-col gap-2"><Plus className="h-6 w-6" /><span>Deposit</span></Button>
        <Button variant="outline" className="h-auto py-6 flex-col gap-2"><ArrowUpRight className="h-6 w-6" /><span>Transfer</span></Button>
      </div>
    </div>
  )
}
