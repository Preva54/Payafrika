"use client"

import { useEffect, useState } from "react"
import { Plus, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { loansApi, type LoanResponse } from "@/lib/api"

export default function LoansPage() {
  const [loans, setLoans] = useState<LoanResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [applying, setApplying] = useState(false)
  const [amount, setAmount] = useState("")
  const [term, setTerm] = useState("12")
  const [purpose, setPurpose] = useState("")

  const fetchLoans = async () => {
    setLoading(true)
    try {
      const data = await loansApi.getAll()
      setLoans(data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchLoans() }, [])

  const handleApply = async () => {
    const amt = parseFloat(amount)
    const months = parseInt(term)
    if (isNaN(amt) || amt <= 0 || isNaN(months) || months < 1) return
    setApplying(true)
    try {
      await loansApi.apply({ amount: amt, interestRate: 12.5, termMonths: months, purpose: purpose || undefined })
      setOpen(false)
      setAmount("")
      setTerm("12")
      setPurpose("")
      fetchLoans()
    } catch {}
    setApplying(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Loans</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchLoans}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="gradient" size="sm"><Plus className="mr-2 h-4 w-4" />Apply</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Apply for a Loan</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount (ZAR)</label>
                  <Input type="number" min="100" placeholder="e.g. 50000" value={amount} onChange={e => setAmount(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Repayment Period (months)</label>
                  <Input type="number" min="1" max="72" value={term} onChange={e => setTerm(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Purpose (optional)</label>
                  <Input placeholder="e.g. Business expansion" value={purpose} onChange={e => setPurpose(e.target.value)} />
                </div>
                <Button variant="gradient" className="w-full" disabled={applying} onClick={handleApply}>
                  {applying ? "Submitting..." : "Submit Application"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      {loading ? (
        <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : loans.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <p className="text-lg font-medium">No loans yet</p>
            <p className="text-sm mt-1">Apply for a loan to get started.</p>
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
