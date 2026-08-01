"use client"

import { useEffect, useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Landmark, Copy, Check, Download, Share2, Upload, Clock,
  CheckCircle2, Loader2, FileText, Shield, X, ArrowLeft,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { depositsApi } from "@/lib/api"
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

const STEPS = ["Bank Details", "Payment Details", "Upload Proof", "Review", "Complete"]

export default function DepositDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}) {
  const [step, setStep] = useState(0)
  const [reference, setReference] = useState("")
  const [amount, setAmount] = useState("")
  const [referenceUsed, setReferenceUsed] = useState("")
  const [transferDate, setTransferDate] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setStep(0)
      setAmount("")
      setReferenceUsed("")
      setTransferDate("")
      setFile(null)
      setUploadProgress(0)
      setError("")
      generateReference()
    }
  }, [open])

  const generateReference = async () => {
    try {
      const res = await depositsApi.getReference()
      setReference(res.reference)
    } catch {
      setReference(`PAF-${100000 + Math.floor(Math.random() * 999999)}`)
    }
  }

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(""), 2000)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 10 * 1024 * 1024) { setError("File too large. Max 10MB."); return }
    if (!["application/pdf", "image/jpeg", "image/png"].includes(f.type)) { setError("Invalid file type."); return }
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
    if (!amount || !referenceUsed || !transferDate) return
    setSubmitting(true)
    setError("")
    try {
      const res = await depositsApi.submit({
        amount: parseFloat(amount),
        bankName: COMPANY_BANK.bankName,
        accountHolderName: COMPANY_BANK.accountName,
        referenceUsed,
        transferDate: new Date(transferDate).toISOString(),
      })
      if (file) {
        try { await depositsApi.uploadProof(res.id, file); setUploadProgress(100) } catch { }
      }
      setStep(4)
      onSuccess?.()
      setTimeout(() => onClose(), 2500)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Submission failed")
    }
    setSubmitting(false)
  }

  const bankDetails = [
    { label: "Bank Name", value: COMPANY_BANK.bankName },
    { label: "Account Name", value: COMPANY_BANK.accountName },
    { label: "Account Number", value: COMPANY_BANK.accountNumber, copy: true },
    { label: "Branch Code", value: COMPANY_BANK.branchCode, copy: true },
    { label: "Account Type", value: COMPANY_BANK.accountType },
    { label: "Currency", value: COMPANY_BANK.currency },
    { label: "SWIFT Code", value: COMPANY_BANK.swiftCode, copy: true },
  ]

  const canProceed = (s: number) => {
    if (s === 0) return true
    if (s === 1) return !!amount && !!referenceUsed && !!transferDate
    if (s === 2) return true
    if (s === 3) return true
    return true
  }

  return (
    <Dialog open={open} onOpenChange={o => { if (!o && !submitting) onClose() }}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Deposit Funds</DialogTitle>
          <DialogDescription>
            Fund your wallet using a bank transfer.
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-6">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] transition-all",
                i === step ? "bg-primary text-primary-foreground" :
                i < step ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground",
              )}>
                {i < step ? <Check className="h-3 w-3" /> : <span>{i + 1}</span>}
                <span className="hidden sm:inline">{s}</span>
              </div>
              {i < STEPS.length - 1 && <div className={cn("w-6 h-px mx-1", i < step ? "bg-green-500" : "bg-border")} />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 4 ? (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="py-8 text-center space-y-3">
              <div className="mx-auto w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7 text-green-500" />
              </div>
              <div>
                <h3 className="font-bold">Deposit Submitted</h3>
                <p className="text-sm text-muted-foreground">Your deposit request is pending review.</p>
              </div>
            </motion.div>
          ) : (
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">

              {/* Step 0: Bank Details */}
              {step === 0 && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">Transfer to the PayAfrika business account below:</p>
                  <div className="rounded-xl bg-muted/40 border border-border/50 divide-y divide-border/30">
                    {bankDetails.map(d => (
                      <div key={d.label} className="flex items-center justify-between px-4 py-2.5">
                        <div>
                          <p className="text-[10px] text-muted-foreground">{d.label}</p>
                          <p className="text-sm font-mono font-medium">{d.value}</p>
                        </div>
                        {d.copy && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => handleCopy(d.value, d.label)}>
                            {copied === d.label ? <><Check className="h-3 w-3 text-green-500" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 rounded-xl bg-primary/5 border border-primary/10 px-4 py-3">
                    <FileText className="h-5 w-5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-muted-foreground">Your Reference</p>
                      <p className="text-sm font-mono font-bold text-primary truncate">{reference}</p>
                    </div>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleCopy(reference, "ref")}>
                      {copied === "ref" ? <><Check className="h-3 w-3 text-green-500" /> Done</> : <><Copy className="h-3 w-3" /> Copy</>}
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 1: Payment Details */}
              {step === 1 && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Deposit Amount (ZAR)</Label>
                    <Input type="number" placeholder="0.00" className="text-lg" value={amount} onChange={e => setAmount(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Payment Reference</Label>
                    <Input placeholder="e.g. PAF-928374" value={referenceUsed} onChange={e => setReferenceUsed(e.target.value)} />
                    <p className="text-[10px] text-muted-foreground">Use the reference shown in step 1 to ensure your deposit is matched.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Transfer Date</Label>
                    <Input type="date" value={transferDate} onChange={e => setTransferDate(e.target.value)} />
                  </div>
                </div>
              )}

              {/* Step 2: Upload Proof */}
              {step === 2 && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">Upload proof of payment (PDF, JPG, or PNG, max 10MB).</p>
                  <div
                    className="border-2 border-dashed border-border rounded-xl p-8 text-center space-y-2 cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-sm font-medium">{file ? file.name : "Click to upload proof"}</p>
                    {file && <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>}
                  </div>
                  <input ref={fileInputRef} type="file" accept="application/pdf,image/jpeg,image/png" className="hidden" onChange={handleFileChange} />
                  {uploadProgress > 0 && (
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Review */}
              {step === 3 && (
                <div className="space-y-3">
                  <div className="rounded-xl bg-muted/40 border border-border/50 divide-y divide-border/30 text-sm">
                    <div className="flex justify-between px-4 py-2.5"><span className="text-muted-foreground">Amount</span><span className="font-semibold font-mono">{formatCurrency(parseFloat(amount || "0"))}</span></div>
                    <div className="flex justify-between px-4 py-2.5"><span className="text-muted-foreground">Reference</span><span className="font-mono">{referenceUsed}</span></div>
                    <div className="flex justify-between px-4 py-2.5"><span className="text-muted-foreground">Transfer Date</span><span>{transferDate}</span></div>
                    <div className="flex justify-between px-4 py-2.5"><span className="text-muted-foreground">Proof</span><span>{file ? file.name : "Not uploaded"}</span></div>
                    <div className="flex justify-between px-4 py-2.5"><span className="text-muted-foreground">Bank</span><span>{COMPANY_BANK.accountName}</span></div>
                  </div>
                  <div className="flex items-start gap-2 rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
                    <Shield className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">Your deposit will be credited after verification by our Finance Team. This usually takes 1-2 business hours.</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {error && <p className="text-xs text-destructive">{error}</p>}

        {step < 4 && (
          <div className="flex items-center justify-between gap-3 mt-4">
            <div>
              {step > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setStep(s => (s - 1) as 0 | 1 | 2 | 3)}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
              <Button
                variant="gradient"
                size="sm"
                disabled={!canProceed(step) || submitting}
                onClick={() => {
                  if (step < 3) setStep(s => (s + 1) as 0 | 1 | 2 | 3 | 4)
                  else handleSubmit()
                }}
              >
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Submitting...</> : step === 3 ? "Submit Deposit" : "Continue"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
