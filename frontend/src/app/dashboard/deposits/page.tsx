"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Wallet, ArrowRight, Check, Copy, Download, Share2, Upload,
  Clock, AlertCircle, ChevronRight, ChevronLeft, RefreshCw,
  Landmark, Banknote, FileText, Shield, X, Eye, EyeOff,
  CheckCircle2, XCircle, Loader2, Plus, Search, ArrowUpRight,
  ArrowDownLeft, Repeat, TrendingUp, AlertTriangle, Ban, Bell,
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
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { walletApi, depositsApi, type WalletOverviewResponse, type DepositResponse } from "@/lib/api"
import { cn, formatCurrency } from "@/lib/utils"

const COMPANY_BANK = {
  bankName: "ABC Bank",
  accountName: "PayAfrika (Pty) Ltd",
  accountNumber: "123456789",
  branchCode: "250655",
  accountType: "Business Cheque",
}

const STEPS = ["Method", "Bank Details", "Upload Proof", "Review", "Confirmation"]

type Step = 0 | 1 | 2 | 3 | 4

function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-ZA", { year: "numeric", month: "short", day: "numeric" }).format(new Date(date))
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-600 border-yellow-200 dark:border-yellow-800",
    processing: "bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800",
    approved: "bg-green-500/10 text-green-600 border-green-200 dark:border-green-800",
    rejected: "bg-red-500/10 text-red-600 border-red-200 dark:border-red-800",
  }
  const icons: Record<string, React.ReactNode> = {
    pending: <Clock className="h-3 w-3" />,
    processing: <Loader2 className="h-3 w-3 animate-spin" />,
    approved: <CheckCircle2 className="h-3 w-3" />,
    rejected: <XCircle className="h-3 w-3" />,
  }
  return (
    <Badge variant="outline" className={cn("gap-1 capitalize", styles[status])}>
      {icons[status]} {status}
    </Badge>
  )
}

export default function DepositsPage() {
  const [overview, setOverview] = useState<WalletOverviewResponse | null>(null)
  const [deposits, setDeposits] = useState<DepositResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [showBalance, setShowBalance] = useState(true)

  // Multi-step form state
  const [step, setStep] = useState<Step>(0)
  const [showForm, setShowForm] = useState(false)

  // Step 0 - Method selection (just Bank Transfer for now)

  // Step 1 - Bank Details
  const [reference, setReference] = useState("")
  const [copied, setCopied] = useState("")

  // Step 2 - Upload Proof
  const [amount, setAmount] = useState("")
  const [referenceUsed, setReferenceUsed] = useState("")
  const [transferDate, setTransferDate] = useState("")
  const [transferTime, setTransferTime] = useState("")
  const [bankName, setBankName] = useState("")
  const [accountHolder, setAccountHolder] = useState("")
  const [notes, setNotes] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Step 3 - Review
  const [confirmed, setConfirmed] = useState(false)

  // Step 4 - Submitted
  const [submittedDeposit, setSubmittedDeposit] = useState<DepositResponse | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  // Deposit history pagination
  const [historyPage, setHistoryPage] = useState(1)
  const [historyTotal, setHistoryTotal] = useState(0)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [ov, depRes] = await Promise.all([
        walletApi.overview(),
        depositsApi.list(historyPage, 10),
      ])
      setOverview(ov)
      setDeposits(depRes.data)
      setHistoryTotal(depRes.total)
    } catch { /* handled */ }
    setLoading(false)
  }, [historyPage])

  useEffect(() => { fetchData() }, [fetchData])

  const generateReference = async () => {
    try {
      const res = await depositsApi.getReference()
      setReference(res.reference)
    } catch {
      setReference(`PAF-${100000 + Math.floor(Math.random() * 999999)}`)
    }
  }

  useEffect(() => {
    if (showForm && !reference) generateReference()
  }, [showForm, reference])

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(""), 2000)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const maxSize = 10 * 1024 * 1024
    if (f.size > maxSize) { setError("File too large. Max 10MB."); return }
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/jpg"]
    if (!allowed.includes(f.type)) { setError("Invalid file type. Only PDF, JPG, PNG."); return }
    setFile(f)
    setUploadProgress(0)
    setError("")
    let progress = 0
    const interval = setInterval(() => {
      progress += Math.random() * 15 + 5
      if (progress >= 90) { progress = 90; clearInterval(interval) }
      setUploadProgress(Math.min(progress, 90))
    }, 200)
  }

  const handleSubmit = async () => {
    if (!confirmed || !amount || !referenceUsed || !transferDate || !bankName || !accountHolder) return
    setSubmitting(true)
    setError("")
    try {
      const res = await depositsApi.submit({
        amount: parseFloat(amount),
        bankName,
        accountHolderName: accountHolder,
        referenceUsed,
        transferDate: new Date(transferDate).toISOString(),
        transferTime: transferTime || undefined,
        notes: notes || undefined,
      })

      // Upload proof if file selected
      if (file) {
        try {
          await depositsApi.uploadProof(res.id, file)
          // Simulate remaining progress to completion
          setUploadProgress(100)
        } catch (uploadErr: unknown) {
          setError(uploadErr instanceof Error ? uploadErr.message : "Deposit submitted but proof upload failed. You can upload later.")
        }
      }

      setSubmittedDeposit(res)
      setStep(4)
      fetchData()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to submit deposit.")
    }
    setSubmitting(false)
  }

  const resetForm = () => {
    setStep(0); setShowForm(false)
    setAmount(""); setReferenceUsed(""); setTransferDate(""); setTransferTime("")
    setBankName(""); setAccountHolder(""); setNotes(""); setFile(null)
    setUploadProgress(0); setConfirmed(false); setSubmittedDeposit(null); setError("")
  }

  const downloadInstructions = () => {
    const content = [
      "PAYAFRIKA DEPOSIT INSTRUCTIONS",
      "================================",
      "",
      "Bank Name:       " + COMPANY_BANK.bankName,
      "Account Name:    " + COMPANY_BANK.accountName,
      "Account Number:  " + COMPANY_BANK.accountNumber,
      "Branch Code:     " + COMPANY_BANK.branchCode,
      "Account Type:    " + COMPANY_BANK.accountType,
      "",
      "Your Reference:  " + reference,
      "",
      "Instructions:",
      "1. Log in to your online banking or banking app.",
      "2. Add PayAfrika (Pty) Ltd as a beneficiary using the details above.",
      "3. Use your unique reference (" + reference + ") as the payment reference.",
      "4. Transfer the desired deposit amount.",
      "5. Return to your PayAfrika dashboard and upload the proof of payment.",
      "6. Your deposit will be verified within 1-2 business hours.",
      "",
      "Note: Deposits are only credited after verification by our finance team.",
      "",
      "PayAfrika (Pty) Ltd",
      "Generated: " + new Date().toLocaleString("en-ZA"),
    ].join("\n")

    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `PayAfrika-Deposit-Instructions-${reference}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const shareBankDetails = async () => {
    const details = `PayAfrika Bank Details:\nBank: ${COMPANY_BANK.bankName}\nAccount: ${COMPANY_BANK.accountName}\nNumber: ${COMPANY_BANK.accountNumber}\nBranch: ${COMPANY_BANK.branchCode}\nReference: ${reference}`
    if (navigator.share) {
      try { await navigator.share({ title: "PayAfrika Deposit Details", text: details }) } catch {}
    } else {
      navigator.clipboard.writeText(details)
    }
  }

  const netWorth = overview?.totalBalance ?? 0
  const pendingDeposits = deposits.filter(d => d.status === "pending" || d.status === "processing")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Deposit Funds</h1>
          <p className="text-sm text-muted-foreground">Fund your wallet via bank transfer</p>
        </div>
        <div className="flex items-center gap-2">
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
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="mr-2 h-4 w-4" />Refresh
          </Button>
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
          {/* Wallet Overview Cards */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">Total Balance</p>
                  <Wallet className="h-4 w-4 text-primary" />
                </div>
                <p className="text-3xl font-bold mt-2">
                  {showBalance ? formatCurrency(overview?.totalBalance ?? 0) : "••••••"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Available: {showBalance ? formatCurrency(overview?.availableBalance ?? 0) : "••••••"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">Available Balance</p>
                  <Banknote className="h-4 w-4 text-green-500" />
                </div>
                <p className="text-2xl font-bold mt-2">{showBalance ? formatCurrency(overview?.availableBalance ?? 0) : "••••••"}</p>
                <p className="text-xs text-muted-foreground mt-1">Ready to use</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">Pending Deposits</p>
                  <Clock className="h-4 w-4 text-amber-500" />
                </div>
                <p className="text-2xl font-bold mt-2">{pendingDeposits.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Awaiting verification</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">Monthly Cash Flow</p>
                  {overview && overview.monthlyCashFlow >= 0 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />}
                </div>
                <p className={`text-2xl font-bold mt-2 ${overview && overview.monthlyCashFlow >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {showBalance ? formatCurrency(Math.abs(overview?.monthlyCashFlow ?? 0)) : "••••••"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{overview && overview.monthlyCashFlow >= 0 ? "Positive" : "Negative"}</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="deposit">
            <TabsList>
              <TabsTrigger value="deposit" className="gap-2"><Plus className="h-4 w-4" />New Deposit</TabsTrigger>
              <TabsTrigger value="history" className="gap-2"><Clock className="h-4 w-4" />Deposit History</TabsTrigger>
            </TabsList>

            <TabsContent value="deposit" className="mt-6">
              {!showForm ? (
                <Card className="max-w-2xl mx-auto">
                  <CardContent className="p-12 text-center space-y-6">
                    <div className="mx-auto w-20 h-20 rounded-full gradient-bg flex items-center justify-center">
                      <Plus className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Deposit Funds</h2>
                      <p className="text-muted-foreground mt-1">Transfer money to PayAfrika&apos;s bank account to fund your wallet</p>
                    </div>
                    <Button variant="gradient" size="lg" onClick={() => { setShowForm(true); setStep(1) }}>
                      + Deposit Funds
                    </Button>
                    <div className="text-xs text-muted-foreground">
                      <Shield className="h-3 w-3 inline mr-1" />
                      Funds are verified by our finance team before being credited
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="max-w-3xl mx-auto">
                  {/* Progress Steps */}
                  <div className="flex items-center justify-center mb-8">
                    {STEPS.map((s, i) => (
                      <div key={s} className="flex items-center">
                        <div className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all",
                          i === step ? "bg-primary text-primary-foreground" :
                          i < step ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"
                        )}>
                          {i < step ? <Check className="h-3.5 w-3.5" /> : <span>{i + 1}</span>}
                          <span className="hidden sm:inline">{s}</span>
                        </div>
                        {i < STEPS.length - 1 && <div className={cn("w-8 h-px mx-1", i < step ? "bg-green-500" : "bg-border")} />}
                      </div>
                    ))}
                  </div>

                  <AnimatePresence mode="wait">
                    {step === 1 && (
                      <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                        <Card className="glass-card">
                          <CardHeader>
                            <CardTitle>Bank Transfer Details</CardTitle>
                            <CardDescription>Transfer your deposit to the PayAfrika business account below</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-6">
                            <div className="grid sm:grid-cols-2 gap-4 p-4 rounded-xl bg-muted/50">
                              {[
                                { label: "Bank Name", value: COMPANY_BANK.bankName },
                                { label: "Account Name", value: COMPANY_BANK.accountName },
                                { label: "Account Number", value: COMPANY_BANK.accountNumber, copy: true },
                                { label: "Branch Code", value: COMPANY_BANK.branchCode, copy: true },
                                { label: "Account Type", value: COMPANY_BANK.accountType },
                              ].map((item) => (
                                <div key={item.label} className="space-y-1">
                                  <p className="text-xs text-muted-foreground">{item.label}</p>
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-mono font-medium">{item.value}</p>
                                    {item.copy && (
                                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(item.value, item.label)}>
                                        {copied === item.label ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              ))}
                              <div className="sm:col-span-2 space-y-1">
                                <p className="text-xs text-muted-foreground">Your Unique Reference</p>
                                <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
                                  <span className="text-sm font-mono font-bold text-primary flex-1">{reference}</span>
                                  <Button variant="ghost" size="sm" className="h-7" onClick={() => handleCopy(reference, "ref")}>
                                    {copied === "ref" ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                                  </Button>
                                </div>
                                <p className="text-[10px] text-muted-foreground">Use this reference when making the transfer</p>
                              </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="flex flex-wrap gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleCopy(COMPANY_BANK.accountNumber, "acc")}>
                                {copied === "acc" ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                                Copy Account Number
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleCopy(reference, "ref2")}>
                                {copied === "ref2" ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                                Copy Reference
                              </Button>
                              <Button variant="outline" size="sm" onClick={downloadInstructions}>
                                <Download className="mr-2 h-4 w-4" />Download Instructions
                              </Button>
                              <Button variant="outline" size="sm" onClick={shareBankDetails}>
                                <Share2 className="mr-2 h-4 w-4" />Share Details
                              </Button>
                            </div>

                            <Separator />

                            <Button variant="gradient" className="w-full" onClick={() => setStep(2)}>
                              I&apos;ve Made the Transfer <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )}

                    {step === 2 && (
                      <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                        <Card className="glass-card">
                          <CardHeader>
                            <CardTitle>Upload Proof of Payment</CardTitle>
                            <CardDescription>Provide details about your transfer and upload the proof</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-5">
                            <div className="grid sm:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Deposit Amount *</Label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R</span>
                                  <Input type="number" min="1" placeholder="0.00" className="pl-8" value={amount} onChange={e => setAmount(e.target.value)} />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label>Reference Used *</Label>
                                <Input placeholder={reference} value={referenceUsed} onChange={e => setReferenceUsed(e.target.value)} />
                              </div>
                              <div className="space-y-2">
                                <Label>Transfer Date *</Label>
                                <Input type="date" value={transferDate} onChange={e => setTransferDate(e.target.value)} />
                              </div>
                              <div className="space-y-2">
                                <Label>Transfer Time</Label>
                                <Input type="time" value={transferTime} onChange={e => setTransferTime(e.target.value)} />
                              </div>
                              <div className="space-y-2">
                                <Label>Bank Name *</Label>
                                <Input placeholder="e.g. Standard Bank" value={bankName} onChange={e => setBankName(e.target.value)} />
                              </div>
                              <div className="space-y-2">
                                <Label>Account Holder Name *</Label>
                                <Input placeholder="Your name on the account" value={accountHolder} onChange={e => setAccountHolder(e.target.value)} />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label>Optional Notes</Label>
                              <Textarea placeholder="Any additional information..." value={notes} onChange={e => setNotes(e.target.value)} className="h-20" />
                            </div>

                            {/* File Upload */}
                            <div className="space-y-2">
                              <Label>Upload Proof of Payment (PDF, JPG, PNG - Max 10MB)</Label>
                              <div
                                className="relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-primary") }}
                                onDragLeave={(e) => { e.currentTarget.classList.remove("border-primary") }}
                                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { const ev = { target: { files: [f] } } as unknown as React.ChangeEvent<HTMLInputElement>; handleFileChange(ev) } }}
                              >
                                <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileChange} />
                                {!file ? (
                                  <div className="space-y-2">
                                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                                    <p className="text-sm font-medium">Drop your proof of payment here</p>
                                    <p className="text-xs text-muted-foreground">or click to browse</p>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <FileText className="h-8 w-8 mx-auto text-primary" />
                                    <p className="text-sm font-medium">{file.name}</p>
                                    <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                    <Progress value={uploadProgress} className="w-48 mx-auto" />
                                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setFile(null); setUploadProgress(0) }}>
                                      <X className="h-3 w-3 mr-1" /> Remove
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {error && (
                              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/5 p-3 rounded-lg">
                                <AlertCircle className="h-4 w-4" />{error}
                              </div>
                            )}

                            <div className="flex gap-3">
                              <Button variant="outline" onClick={() => setStep(1)}>
                                <ChevronLeft className="mr-2 h-4 w-4" />Back
                              </Button>
                              <Button variant="gradient" className="flex-1" disabled={!amount || !referenceUsed || !transferDate || !bankName || !accountHolder} onClick={() => setStep(3)}>
                                Review Deposit <ChevronRight className="ml-2 h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )}

                    {step === 3 && (
                      <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                        <Card className="glass-card">
                          <CardHeader>
                            <CardTitle>Review Your Deposit</CardTitle>
                            <CardDescription>Please verify all details before submitting</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-6">
                            <div className="grid sm:grid-cols-2 gap-4">
                              <div className="p-4 rounded-xl bg-muted/50 space-y-3">
                                <p className="text-xs font-semibold text-muted-foreground uppercase">Deposit Details</p>
                                <div className="space-y-2">
                                  <div className="flex justify-between"><span className="text-sm text-muted-foreground">Amount</span><span className="text-sm font-bold">{formatCurrency(parseFloat(amount || "0"))}</span></div>
                                  <div className="flex justify-between"><span className="text-sm text-muted-foreground">Reference</span><span className="text-sm font-mono">{referenceUsed}</span></div>
                                  <div className="flex justify-between"><span className="text-sm text-muted-foreground">Date</span><span className="text-sm">{transferDate}</span></div>
                                  {transferTime && <div className="flex justify-between"><span className="text-sm text-muted-foreground">Time</span><span className="text-sm">{transferTime}</span></div>}
                                  <div className="flex justify-between"><span className="text-sm text-muted-foreground">Bank</span><span className="text-sm">{bankName}</span></div>
                                  <div className="flex justify-between"><span className="text-sm text-muted-foreground">Account Holder</span><span className="text-sm">{accountHolder}</span></div>
                                </div>
                              </div>
                              <div className="p-4 rounded-xl bg-muted/50 space-y-3">
                                <p className="text-xs font-semibold text-muted-foreground uppercase">Company Bank Details</p>
                                <div className="space-y-2">
                                  <div className="flex justify-between"><span className="text-sm text-muted-foreground">Bank</span><span className="text-sm font-medium">{COMPANY_BANK.bankName}</span></div>
                                  <div className="flex justify-between"><span className="text-sm text-muted-foreground">Account</span><span className="text-sm font-mono">{COMPANY_BANK.accountName}</span></div>
                                  <div className="flex justify-between"><span className="text-sm text-muted-foreground">Number</span><span className="text-sm font-mono">{COMPANY_BANK.accountNumber}</span></div>
                                  <div className="flex justify-between"><span className="text-sm text-muted-foreground">Branch</span><span className="text-sm font-mono">{COMPANY_BANK.branchCode}</span></div>
                                </div>
                                {file && (
                                  <div className="mt-3 pt-3 border-t">
                                    <p className="text-xs text-muted-foreground mb-1">Uploaded Proof</p>
                                    <div className="flex items-center gap-2 text-sm">
                                      <FileText className="h-4 w-4 text-primary" />
                                      <span className="truncate flex-1">{file.name}</span>
                                      <Check className="h-4 w-4 text-green-500" />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-200 dark:border-amber-800">
                              <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium">Important</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Your deposit will be verified by our finance team before being credited. 
                                  This usually takes 1-2 business hours during working hours.
                                </p>
                              </div>
                            </div>

                            <label className="flex items-start gap-3 cursor-pointer">
                              <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-1" />
                              <span className="text-sm">I confirm I have transferred the funds to the PayAfrika bank account.</span>
                            </label>

                            {error && (
                              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/5 p-3 rounded-lg">
                                <AlertCircle className="h-4 w-4" />{error}
                              </div>
                            )}

                            <div className="flex gap-3">
                              <Button variant="outline" onClick={() => setStep(2)}>
                                <ChevronLeft className="mr-2 h-4 w-4" />Back
                              </Button>
                              <Button variant="gradient" className="flex-1" disabled={!confirmed || submitting} onClick={handleSubmit}>
                                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</> : "Submit Deposit"}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )}

                    {step === 4 && submittedDeposit && (
                      <motion.div key="step4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                        <Card className="glass-card text-center">
                          <CardContent className="p-12 space-y-6">
                            <div className="mx-auto w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
                              <CheckCircle2 className="h-10 w-10 text-green-500" />
                            </div>
                            <div>
                              <h2 className="text-2xl font-bold">Deposit Submitted</h2>
                              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                                Your deposit has been received and is waiting for verification by our finance team.
                                Once approved, your wallet will automatically be credited.
                              </p>
                            </div>

                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 text-yellow-600 border border-yellow-200 dark:border-yellow-800">
                              <Clock className="h-4 w-4" />
                              <span className="font-medium">Status: Pending Verification</span>
                            </div>

                            <div className="max-w-sm mx-auto space-y-3">
                              <div className="flex justify-between p-3 rounded-lg bg-muted/50">
                                <span className="text-sm text-muted-foreground">Amount</span>
                                <span className="text-sm font-bold">{formatCurrency(submittedDeposit.amount)}</span>
                              </div>
                              <div className="flex justify-between p-3 rounded-lg bg-muted/50">
                                <span className="text-sm text-muted-foreground">Reference</span>
                                <span className="text-sm font-mono">{submittedDeposit.reference}</span>
                              </div>
                              <div className="flex justify-between p-3 rounded-lg bg-muted/50">
                                <span className="text-sm text-muted-foreground">Submitted</span>
                                <span className="text-sm">{formatDate(submittedDeposit.createdAt)}</span>
                              </div>
                            </div>

                            {/* Timeline */}
                            <div className="max-w-xs mx-auto">
                              <div className="space-y-0">
                                {[
                                  { label: "Submitted", done: true },
                                  { label: "Awaiting Verification", done: true, active: true },
                                  { label: "Approved / Rejected", done: false },
                                  { label: "Wallet Updated", done: false },
                                ].map((item, i) => (
                                  <div key={i} className="flex items-start gap-3">
                                    <div className="flex flex-col items-center">
                                      <div className={cn(
                                        "w-3 h-3 rounded-full border-2",
                                        item.done && item.active ? "border-yellow-500 bg-yellow-500" :
                                        item.done ? "border-green-500 bg-green-500" : "border-muted-foreground"
                                      )} />
                                      {i < 3 && <div className={cn("w-0.5 h-6", item.done ? "bg-green-500" : "bg-border")} />}
                                    </div>
                                    <div className="pb-4">
                                      <p className={cn("text-sm", item.active ? "font-medium text-foreground" : item.done ? "text-green-600" : "text-muted-foreground")}>
                                        {item.label}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="flex gap-3 justify-center">
                              <Button variant="outline" onClick={resetForm}>Make Another Deposit</Button>
                              <Button variant="gradient" onClick={() => {
                                const el = document.querySelector('[data-value="history"]') as HTMLElement
                                if (el) el.click()
                              }}>View History</Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Deposit History</CardTitle>
                  <CardDescription>Track all your deposit requests</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Reference</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Approved By</TableHead>
                        <TableHead>Approved Date</TableHead>
                        <TableHead>Receipt</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deposits.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                            No deposits yet. Make your first deposit to get started.
                          </TableCell>
                        </TableRow>
                      ) : deposits.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell className="font-mono text-xs">{d.reference}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(d.amount, d.currency)}</TableCell>
                          <TableCell>Bank Transfer</TableCell>
                          <TableCell><StatusBadge status={d.status} /></TableCell>
                          <TableCell className="text-xs">{formatDate(d.createdAt)}</TableCell>
                          <TableCell className="text-xs">{d.approvedByName || "-"}</TableCell>
                          <TableCell className="text-xs">{d.approvedAt ? formatDate(d.approvedAt) : "-"}</TableCell>
                          <TableCell>
                            {d.status === "approved" && (
                              <Button variant="ghost" size="sm" className="h-7">
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {historyTotal > 10 && (
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        Showing {(historyPage - 1) * 10 + 1}-{Math.min(historyPage * 10, historyTotal)} of {historyTotal}
                      </p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={historyPage <= 1} onClick={() => setHistoryPage(p => p - 1)}>Previous</Button>
                        <Button variant="outline" size="sm" disabled={historyPage * 10 >= historyTotal} onClick={() => setHistoryPage(p => p + 1)}>Next</Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
