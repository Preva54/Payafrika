"use client"

import { useEffect, useState } from "react"
import { Plus, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { loansApi, type LoanResponse } from "@/lib/api"

export default function LoansPage() {
  const [loans, setLoans] = useState<LoanResponse[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLoans = async () => {
    setLoading(true)
    try {
      const data = await loansApi.getAll()
      setLoans(data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchLoans() }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Loans</h1>
        <Button variant="outline" size="sm" onClick={fetchLoans}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
      </div>
      {loading ? (
        <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : loans.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <p className="text-lg font-medium">No loans yet</p>
            <p className="text-sm mt-1">Apply for a loan to get started.</p>
            <Button variant="gradient" className="mt-4"><Plus className="mr-2 h-4 w-4" />Apply for a Loan</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {loans.map(loan => (
            <Card key={loan.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium">R {loan.amount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</p>
                  <p className="text-xs text-muted-foreground">{loan.termMonths} months @ {loan.interestRate}%</p>
                </div>
                <div className="text-right">
                  <Badge>{loan.status}</Badge>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(loan.createdAt).toLocaleDateString()}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
