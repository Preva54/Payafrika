"use client"

import { useEffect, useState, useRef } from "react"
import { motion } from "framer-motion"
import {
  Landmark, Copy, Check, Download, Share2, Upload, Clock,
  CheckCircle2, XCircle, Loader2, ChevronRight,
  FileText, Shield, Banknote,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { depositsApi, type DepositResponse } from "@/lib/api"
import { cn, formatCurrency } from "@/lib/utils"

const COMPANY_BANK = {
  bankName: "PayAfrika Bank",
  accountName: "PayAfrika (Pty) Ltd",
  accountNumber: "1234567890",
  branchCode: "250655",
  accountType: "Business Cheque",
  currency: "ZAR (South African Rand)",
  swiftCode: "PAYA ZA JJ",
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days} Days Ago`
  if (date.getFullYear() === now.getFullYear()) return date.toLocaleDateString("en-ZA", { day: "numeric", month: "short" })
  return date.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-600 border-yellow-200 dark:border-yellow-800",
    processing: "bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800",
    approved: "bg-green-500/10 text-green-600 border-green-200 dark:border-green-800",
    rejected: "bg-red-500/10 text-red-600 border-red-200 dark:border-red-800",
  }
  const icons: Record<string, React.ReactNode> = {
    pending: <Clock className="h-3 w-3 animate-pulse" />,
    processing: <Loader2 className="h-3 w-3 animate-spin" />,
    approved: <CheckCircle2 className="h-3 w-3" />,
    rejected: <XCircle className="h-3 w-3" />,
  }
  return (
    <Badge variant="outline" className={cn("gap-1 capitalize text-[10px]", styles[status])}>
      {icons[status]} {status}
    </Badge>
  )
}

export default function DepositFundsSection() {
  const [reference, setReference] = useState("")
  const [deposits, setDeposits] = useState<DepositResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState("")
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const generateReference = async () => {
    try {
      const res = await depositsApi.getReference()
      setReference(res.reference)
    } catch {
      setReference(`PAF-${100000 + Math.floor(Math.random() * 999999)}`)
    }
  }

  const fetchDeposits = async () => {
    try {
      const res = await depositsApi.list(1, 20)
      setDeposits(res.data)
    } catch {
      // silently fail
    }
  }

  useEffect(() => {
    Promise.all([generateReference(), fetchDeposits()]).finally(() => setLoading(false))
  }, [])

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(""), 2000)
  }

  const bankDetails = [
    { label: "Bank Name", value: COMPANY_BANK.bankName, copy: false },
    { label: "Account Name", value: COMPANY_BANK.accountName, copy: false },
    { label: "Account Number", value: COMPANY_BANK.accountNumber, copy: true },
    { label: "Branch Code", value: COMPANY_BANK.branchCode, copy: true },
    { label: "Account Type", value: COMPANY_BANK.accountType, copy: false },
    { label: "Currency", value: COMPANY_BANK.currency, copy: false },
    { label: "SWIFT Code", value: COMPANY_BANK.swiftCode, copy: true },
  ]

  const pendingDeposits = deposits.filter(d => d.status === "pending" || d.status === "processing")
  const approvedDeposits = deposits.filter(d => d.status === "approved")
  const rejectedDeposits = deposits.filter(d => d.status === "rejected")
  const totalDepositedThisMonth = approvedDeposits.reduce((sum, d) => sum + d.amount, 0)

  const timelineDeposits = [...deposits]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  const downloadInstructions = () => {
    const content = [
      "PAYAFRIKA DEPOSIT INSTRUCTIONS",
      "================================",
      "",
      `Bank Name:       ${COMPANY_BANK.bankName}`,
      `Account Name:    ${COMPANY_BANK.accountName}`,
      `Account Number:  ${COMPANY_BANK.accountNumber}`,
      `Branch Code:     ${COMPANY_BANK.branchCode}`,
      `Account Type:    ${COMPANY_BANK.accountType}`,
      `Currency:        ${COMPANY_BANK.currency}`,
      `SWIFT Code:      ${COMPANY_BANK.swiftCode}`,
      "",
      `Your Reference:  ${reference}`,
      "",
      "Instructions:",
      "1. Log in to your online banking or banking app.",
      "2. Add PayAfrika (Pty) Ltd as a beneficiary using the details above.",
      `3. Use your unique reference (${reference}) as the payment reference.`,
      "4. Transfer the desired deposit amount.",
      "5. Return to your PayAfrika dashboard and upload the proof of payment.",
      "6. Your deposit will be verified within 1-2 business hours.",
      "",
      "Note: Deposits are only credited after verification by our finance team.",
      "",
      "PayAfrika (Pty) Ltd",
      `Generated: ${new Date().toLocaleString("en-ZA")}`,
    ].join("\n")

    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `PayAfrika-Deposit-Instructions-${reference}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const shareDetails = async () => {
    const details = [
      `PayAfrika Bank Details:`,
      `Bank: ${COMPANY_BANK.bankName}`,
      `Account: ${COMPANY_BANK.accountName}`,
      `Number: ${COMPANY_BANK.accountNumber}`,
      `Branch: ${COMPANY_BANK.branchCode}`,
      `Reference: ${reference}`,
    ].join("\n")
    if (navigator.share) {
      try { await navigator.share({ title: "PayAfrika Deposit Details", text: details }) } catch { /* user cancelled */ }
    } else {
      navigator.clipboard.writeText(details)
      setCopied("shared")
      setTimeout(() => setCopied(""), 2000)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const pending = pendingDeposits[0]
      if (pending) {
        await depositsApi.uploadProof(pending.id, file)
      }
    } catch { /* handle silently */ }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  if (loading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6, 7].map(i => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="glass-card overflow-hidden border-primary/10">
        <CardHeader className="border-b border-border/50">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-lg">Deposit Funds</CardTitle>
              <CardDescription className="mt-1">
                Fund your wallet using a bank transfer. Once your payment is verified by our Finance Team,
                your wallet balance will be updated automatically.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="gap-1 text-xs">
              <Shield className="h-3 w-3" />
              Secured by PayAfrika
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <div className="grid lg:grid-cols-5 gap-6">
            {/* Left: Banking Details */}
            <div className="lg:col-span-3 space-y-6">
              {/* Company Bank Details */}
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-primary" />
                  Company Banking Details
                </h4>
                <div className="rounded-xl bg-muted/40 border border-border/50 overflow-hidden">
                  {bankDetails.map((detail, i) => (
                    <div
                      key={detail.label}
                      className={cn(
                        "flex items-center justify-between px-4 py-2.5",
                        i < bankDetails.length - 1 && "border-b border-border/30"
                      )}
                    >
                      <div>
                        <p className="text-xs text-muted-foreground">{detail.label}</p>
                        <p className="text-sm font-mono font-medium">{detail.value}</p>
                      </div>
                      {detail.copy && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs gap-1"
                          onClick={() => handleCopy(detail.value, detail.label)}
                        >
                          {copied === detail.label ? (
                            <><Check className="h-3 w-3 text-green-500" /> Copied</>
                          ) : (
                            <><Copy className="h-3 w-3" /> Copy</>
                          )}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Customer Reference */}
              <div className="flex items-center justify-between rounded-xl bg-primary/5 border border-primary/10 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Your Reference</p>
                    <p className="text-sm font-mono font-bold text-primary">{reference}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => handleCopy(reference, "reference")}
                >
                  {copied === "reference" ? (
                    <><Check className="h-3 w-3 text-green-500" /> Copied</>
                  ) : (
                    <><Copy className="h-3 w-3" /> Copy Reference</>
                  )}
                </Button>
              </div>

              {/* Quick Actions */}
              <div>
                <h4 className="text-sm font-semibold mb-3">Quick Actions</h4>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    Upload Proof of Payment
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,image/jpeg,image/png"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={downloadInstructions}>
                    <Download className="h-4 w-4" />
                    Download Instructions
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={shareDetails}>
                    {copied === "shared" ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Share2 className="h-4 w-4" />
                    )}
                    {copied === "shared" ? "Copied" : "Share Details"}
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-1.5" asChild>
                    <a href="/dashboard/deposits">
                      View History <ChevronRight className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
              </div>
            </div>

            {/* Right: Status + Timeline */}
            <div className="lg:col-span-2 space-y-6">
              {/* Deposit Status Widget */}
              <div>
                <h4 className="text-sm font-semibold mb-3">Deposit Status</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-yellow-500/5 border border-yellow-500/20 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">Pending</span>
                      <Clock className="h-3.5 w-3.5 text-yellow-500" />
                    </div>
                    <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{pendingDeposits.length}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatCurrency(pendingDeposits.reduce((s, d) => s + d.amount, 0))}
                    </p>
                  </div>
                  <div className="rounded-xl bg-green-500/5 border border-green-500/20 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">Approved</span>
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    </div>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">{approvedDeposits.length}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatCurrency(approvedDeposits.reduce((s, d) => s + d.amount, 0))}
                    </p>
                  </div>
                  <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">Rejected</span>
                      <XCircle className="h-3.5 w-3.5 text-red-500" />
                    </div>
                    <p className="text-lg font-bold text-red-600 dark:text-red-400">{rejectedDeposits.length}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatCurrency(rejectedDeposits.reduce((s, d) => s + d.amount, 0))}
                    </p>
                  </div>
                  <div className="rounded-xl bg-primary/5 border border-primary/20 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">This Month</span>
                      <Banknote className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <p className="text-lg font-bold text-primary">{formatCurrency(totalDepositedThisMonth)}</p>
                    <p className="text-[10px] text-muted-foreground">Total deposited</p>
                  </div>
                </div>
              </div>

              {/* Deposit Timeline */}
              <div>
                <h4 className="text-sm font-semibold mb-3">Recent Activity</h4>
                <div className="space-y-2">
                  {timelineDeposits.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <Banknote className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-xs">No deposits yet</p>
                    </div>
                  ) : (
                    timelineDeposits.map((deposit, i) => {
                      const icon = deposit.status === "approved" ? CheckCircle2 :
                        deposit.status === "rejected" ? XCircle : Clock
                      const color = deposit.status === "approved" ? "text-green-500" :
                        deposit.status === "rejected" ? "text-red-500" : "text-yellow-500"
                      const bg = deposit.status === "approved" ? "bg-green-500/10" :
                        deposit.status === "rejected" ? "bg-red-500/10" : "bg-yellow-500/10"
                      const Icon = icon
                      return (
                        <motion.div
                          key={deposit.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex items-center justify-between rounded-xl p-3 hover:bg-muted/40 transition-all cursor-default"
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn("rounded-full p-2", bg)}>
                              <Icon className={cn("h-4 w-4", color)} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium capitalize">
                                  {deposit.status === "approved" ? "Deposit Approved" :
                                   deposit.status === "rejected" ? "Deposit Rejected" : "Pending Verification"}
                                </p>
                                <StatusBadge status={deposit.status} />
                              </div>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <span className="font-mono text-accent font-semibold">
                                  {formatCurrency(deposit.amount)}
                                </span>
                                <span>·</span>
                                <span>{formatDateLabel(deposit.createdAt)}</span>
                              </p>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-50 group-hover:opacity-100" asChild>
                            <a href={`/dashboard/deposits/${deposit.id}`}>
                              <ChevronRight className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        </motion.div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
