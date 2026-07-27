"use client"

import { useEffect, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Wallet, ArrowRight, Check, Clock, RefreshCw,
  Landmark, Banknote, Plus, Search, ArrowUpRight,
  ArrowDownLeft, Loader2, AlertTriangle, Ban, Trash2,
  CheckCircle2, XCircle, ChevronRight, ChevronLeft,
  ExternalLink, Building2, Percent, Hash,
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
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { walletApi, withdrawalsApi, type WalletOverviewResponse, type WithdrawalResponse, type LinkedBankResponse, type WalletBalanceResponse } from "@/lib/api"
import { cn, formatCurrency } from "@/lib/utils"

const STEPS = ["Bank Account", "Amount", "Review", "Confirmation"]
type Step = 0 | 1 | 2 | 3

function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-ZA", { year: "numeric", month: "short", day: "numeric" }).format(new Date(date))
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-600 border-yellow-200 dark:border-yellow-800",
    processing: "bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800",
    approved: "bg-green-500/10 text-green-600 border-green-200 dark:border-green-800",
    rejected: "bg-red-500/10 text-red-600 border-red-200 dark:border-red-800",
    paid: "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800",
    cancelled: "bg-gray-500/10 text-gray-600 border-gray-200 dark:border-gray-800",
  }
  const icons: Record<string, React.ReactNode> = {
    pending: <Clock className="h-3 w-3" />,
    processing: <Loader2 className="h-3 w-3 animate-spin" />,
    approved: <CheckCircle2 className="h-3 w-3" />,
    rejected: <XCircle className="h-3 w-3" />,
    paid: <CheckCircle2 className="h-3 w-3" />,
    cancelled: <Ban className="h-3 w-3" />,
  }
  return (
    <Badge variant="outline" className={cn("gap-1 capitalize", styles[status])}>
      {icons[status]} {status}
    </Badge>
  )
}

export default function WithdrawalsPage() {
  const [overview, setOverview] = useState<WalletOverviewResponse | null>(null)
  const [balance, setBalance] = useState<WalletBalanceResponse | null>(null)
  const [withdrawals, setWithdrawals] = useState<WithdrawalResponse[]>([])
  const [banks, setBanks] = useState<LinkedBankResponse[]>([])
  const [loading, setLoading] = useState(true)

  const [step, setStep] = useState<Step>(0)
  const [showForm, setShowForm] = useState(false)

  const [selectedBankId, setSelectedBankId] = useState("")
  const [amount, setAmount] = useState("")
  const [purpose, setPurpose] = useState("")
  const [customerRef, setCustomerRef] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submittedWithdrawal, setSubmittedWithdrawal] = useState<WithdrawalResponse | null>(null)

  const [historyPage, setHistoryPage] = useState(1)
  const [historyTotal, setHistoryTotal] = useState(0)

  const selectedBank = banks.find((b) => b.id === selectedBankId)
  const netAmount = Math.max(0, parseFloat(amount || "0") - (selectedBank?.currency === "ZAR" ? Math.min(parseFloat(amount || "0") * 0.01, 50) : 0))
  const fee = parseFloat(amount || "0") - netAmount

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [ov, bal, wRes, bRes] = await Promise.all([
        walletApi.overview(),
        walletApi.getBalance("ZAR"),
        withdrawalsApi.list(historyPage, 10),
        walletApi.linkedBanks(),
      ])
      setOverview(ov)
      setBalance(bal)
      setWithdrawals(wRes.data)
      setHistoryTotal(wRes.total)
      setBanks(bRes.filter((b) => b.status === "verified" || b.status === "pending"))
    } catch {}
    setLoading(false)
  }, [historyPage])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSubmit = async () => {
    if (!selectedBankId || !amount || parseFloat(amount) <= 0) return
    setError("")
    setSubmitting(true)
    try {
      const res = await withdrawalsApi.submit({
        amount: parseFloat(amount),
        bankId: selectedBankId,
        purpose: purpose || undefined,
        customerReference: customerRef || undefined,
      })
      setSubmittedWithdrawal(res)
      setStep(3)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Submission failed")
    }
    setSubmitting(false)
  }

  const resetForm = () => {
    setStep(0)
    setShowForm(false)
    setSelectedBankId("")
    setAmount("")
    setPurpose("")
    setCustomerRef("")
    setError("")
    setSubmittedWithdrawal(null)
  }

  const verifiedBanks = banks.filter((b) => b.status === "verified")
  const pendingBanks = banks.filter((b) => b.status === "pending")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Withdrawals</h1>
          <p className="text-muted-foreground">Withdraw funds to your bank account</p>
        </div>
        <Button variant="gradient" onClick={() => setShowForm(true)} disabled={banks.length === 0}>
          <ArrowUpRight className="h-4 w-4 mr-1" /> New Withdrawal
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Balance", value: overview?.totalBalance ?? 0, icon: Wallet, color: "text-blue-500" },
          { label: "Available Balance", value: overview?.availableBalance ?? 0, icon: Wallet, color: "text-green-500" },
          { label: "Linked Banks", value: banks.length, icon: Landmark, color: "text-purple-500" },
          { label: "Pending Withdrawals", value: withdrawals.filter((w) => w.status === "pending").length, icon: Clock, color: "text-yellow-500" },
        ].map((item) => {
          const Icon = item.icon
          return (
            <Card key={item.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", item.color, "bg-current/10")}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-lg font-bold">{formatCurrency(item.value)}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Tabs defaultValue="history">
        <TabsList>
          <TabsTrigger value="history">Withdrawal History</TabsTrigger>
          <TabsTrigger value="banks">Linked Banks</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : withdrawals.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ArrowUpRight className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No withdrawals yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reference</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Bank</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawals.map((w) => (
                      <TableRow key={w.id}>
                        <TableCell className="font-mono text-xs">{w.reference}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(w.amount)}</TableCell>
                        <TableCell className="text-sm">{w.bankName}</TableCell>
                        <TableCell><StatusBadge status={w.status} /></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(w.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
            {historyTotal > 10 && (
              <CardFooter className="flex justify-between p-4">
                <Button variant="outline" size="sm" disabled={historyPage === 1} onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {historyPage} of {Math.ceil(historyTotal / 10)}
                </span>
                <Button variant="outline" size="sm" disabled={historyPage >= Math.ceil(historyTotal / 10)} onClick={() => setHistoryPage((p) => p + 1)}>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="banks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Linked Bank Accounts</CardTitle>
              <CardDescription>Manage your bank accounts for withdrawals</CardDescription>
            </CardHeader>
            <CardContent>
              {banks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Landmark className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No bank accounts linked yet. Go to Settings &gt; Payment Methods to add one.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {verifiedBanks.map((bank) => (
                    <BankRow key={bank.id} bank={bank} />
                  ))}
                  {pendingBanks.length > 0 && (
                    <>
                      <Separator className="my-2" />
                      <p className="text-xs text-muted-foreground font-medium">Pending Verification</p>
                      {pendingBanks.map((bank) => (
                        <BankRow key={bank.id} bank={bank} />
                      ))}
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AnimatePresence>
        {showForm && (
          <Dialog open={showForm} onOpenChange={(open) => { if (!open) resetForm() }}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {step === 0 && "Select Bank Account"}
                  {step === 1 && "Enter Amount"}
                  {step === 2 && "Review Withdrawal"}
                  {step === 3 && "Withdrawal Submitted"}
                </DialogTitle>
                <DialogDescription>
                  {step === 0 && "Choose where to send your funds"}
                  {step === 1 && "How much would you like to withdraw?"}
                  {step === 2 && "Please review your withdrawal details"}
                  {step === 3 && "Your withdrawal request has been submitted"}
                </DialogDescription>
              </DialogHeader>

              {step === 0 && (
                <div className="space-y-3 py-2">
                  {verifiedBanks.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      No verified bank accounts. Please link and verify a bank account first.
                    </p>
                  ) : (
                    verifiedBanks.map((bank) => (
                      <motion.button
                        key={bank.id}
                        whileHover={{ scale: 1.01 }}
                        onClick={() => { setSelectedBankId(bank.id); setStep(1) }}
                        className={cn(
                          "w-full text-left p-4 rounded-xl border transition-all",
                          selectedBankId === bank.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50 hover:bg-secondary"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg gradient-bg flex items-center justify-center text-white">
                            <Landmark className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{bank.nickname || bank.bankName}</p>
                            <p className="text-sm text-muted-foreground">{bank.accountName} - {bank.accountNumber}</p>
                          </div>
                          {selectedBankId === bank.id && <Check className="h-5 w-5 text-primary" />}
                        </div>
                      </motion.button>
                    ))
                  )}
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4 py-2">
                  <div>
                    <Label>Amount (ZAR)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">R</span>
                      <Input
                        type="number"
                        min="1"
                        step="0.01"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="pl-8 text-lg font-bold"
                      />
                    </div>
                  </div>
                  {amount && parseFloat(amount) > 0 && (
                    <div className="glass rounded-xl p-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Withdrawal Amount</span>
                        <span>R {parseFloat(amount).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fee (1% capped at R50)</span>
                        <span>R {fee.toFixed(2)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-bold">
                        <span>You'll Receive</span>
                        <span>R {netAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                  {balance && parseFloat(amount || "0") > balance.availableBalance && (
                    <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 rounded-lg p-3">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>Insufficient available balance. Available: R {balance.availableBalance.toFixed(2)}</span>
                    </div>
                  )}
                  <div>
                    <Label>Purpose (Optional)</Label>
                    <Select value={purpose} onValueChange={setPurpose}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a purpose" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="personal">Personal Transfer</SelectItem>
                        <SelectItem value="business">Business Payment</SelectItem>
                        <SelectItem value="savings">Savings Withdrawal</SelectItem>
                        <SelectItem value="bills">Bill Payment</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Your Reference (Optional)</Label>
                    <Input
                      placeholder="e.g. Rent payment"
                      value={customerRef}
                      onChange={(e) => setCustomerRef(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {step === 2 && selectedBank && (
                <div className="space-y-4 py-2">
                  <div className="glass rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-3 pb-3 border-b border-border">
                      <Landmark className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">{selectedBank.nickname || selectedBank.bankName}</p>
                        <p className="text-sm text-muted-foreground">{selectedBank.accountName} - {selectedBank.accountNumber}</p>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Amount</span>
                      <span className="font-medium">R {parseFloat(amount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Fee</span>
                      <span className="font-medium">R {fee.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">You'll Receive</span>
                      <span className="font-bold text-lg">R {netAmount.toFixed(2)}</span>
                    </div>
                    {purpose && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Purpose</span>
                        <span className="capitalize">{purpose}</span>
                      </div>
                    )}
                    {customerRef && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Your Reference</span>
                        <span>{customerRef}</span>
                      </div>
                    )}
                  </div>
                  {error && (
                    <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 rounded-lg p-3">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                </div>
              )}

              {step === 3 && submittedWithdrawal && (
                <div className="text-center py-6 space-y-4">
                  <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                    <Check className="h-8 w-8 text-green-500" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">Withdrawal Submitted</p>
                    <p className="text-sm text-muted-foreground">
                      Reference: <span className="font-mono font-medium">{submittedWithdrawal.reference}</span>
                    </p>
                  </div>
                  <div className="glass rounded-xl p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount Requested</span>
                      <span>R {submittedWithdrawal.amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fee</span>
                      <span>R {submittedWithdrawal.fee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Net Amount</span>
                      <span className="font-bold">R {submittedWithdrawal.netAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sent To</span>
                      <span>{submittedWithdrawal.bankName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <StatusBadge status={submittedWithdrawal.status} />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your withdrawal is pending admin approval. You'll be notified once it's processed.
                  </p>
                </div>
              )}

              <DialogFooter>
                {step === 0 && (
                  <Button variant="outline" onClick={() => resetForm()} className="w-full">Cancel</Button>
                )}
                {step === 1 && (
                  <div className="flex gap-2 w-full">
                    <Button variant="outline" onClick={() => setStep(0)} className="flex-1">Back</Button>
                    <Button
                      variant="gradient"
                      onClick={() => setStep(2)}
                      disabled={!amount || parseFloat(amount) <= 0 || (balance ? parseFloat(amount) > balance.availableBalance : false)}
                      className="flex-1"
                    >
                      Review <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
                {step === 2 && (
                  <div className="flex gap-2 w-full">
                    <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
                    <Button variant="gradient" onClick={handleSubmit} disabled={submitting} className="flex-1">
                      {submitting ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Submitting...</> : <>Confirm & Submit <ArrowRight className="h-4 w-4 ml-1" /></>}
                    </Button>
                  </div>
                )}
                {step === 3 && (
                  <Button variant="gradient" onClick={resetForm} className="w-full">Done</Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  )
}

function BankRow({ bank }: { bank: LinkedBankResponse }) {
  const [showDelete, setShowDelete] = useState(false)
  return (
    <div className="flex items-center justify-between p-4 glass rounded-xl group hover:shadow-card-hover transition-all">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg gradient-bg flex items-center justify-center text-white">
          <Landmark className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium">{bank.nickname || bank.bankName}</p>
            {bank.isPrimary && <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">Primary</Badge>}
            {bank.status === "verified" && <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">Verified</Badge>}
            {bank.status === "rejected" && <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">Rejected</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {bank.accountName} - {bank.accountNumber}
            {bank.branchCode && ` | Branch: ${bank.branchCode}`}
          </p>
        </div>
      </div>
    </div>
  )
}
