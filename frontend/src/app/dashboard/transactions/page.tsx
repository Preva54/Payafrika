"use client"

import { useEffect, useState } from "react"
import { RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { walletApi, type Transaction } from "@/lib/api"

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTx = async () => {
    setLoading(true)
    try {
      const data = await walletApi.transactions()
      setTransactions(data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchTx() }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <Button variant="outline" size="sm" onClick={fetchTx}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
      </div>
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : transactions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <p className="text-lg font-medium">No transactions yet</p>
            <p className="text-sm mt-1">Your transaction history will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {transactions.map(tx => (
            <Card key={tx.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium">{tx.description || tx.type}</p>
                  <p className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${tx.type === "deposit" || tx.type === "loan" ? "text-accent" : ""}`}>
                    {tx.type === "deposit" || tx.type === "loan" ? "+" : "-"}R {tx.amount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                  </p>
                  <Badge variant={tx.status === "completed" ? "success" : "secondary"} className="text-[10px]">{tx.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
