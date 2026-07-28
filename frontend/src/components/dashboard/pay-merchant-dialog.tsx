"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Search, Scan, Building2, CheckCircle2, Loader2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"

export default function PayMerchantDialog({
  open, onClose,
}: {
  open: boolean; onClose: () => void
}) {
  const [step, setStep] = useState(0)
  const [method, setMethod] = useState<"search" | "scan" | "id">("search")
  const [merchant, setMerchant] = useState("")
  const [amount, setAmount] = useState("")
  const [reference, setReference] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async () => {
    if (step < 2) { setStep(s => s + 1); return }
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 1000))
    setSuccess(true)
    setTimeout(() => onClose(), 2000)
    setSubmitting(false)
  }

  const reset = () => { setStep(0); setMerchant(""); setAmount(""); setReference(""); setSuccess(false) }

  return (
    <Dialog open={open} onOpenChange={o => { if (!o && !submitting) { onClose(); reset() } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pay Merchant</DialogTitle>
          <DialogDescription>Send payment to a merchant.</DialogDescription>
        </DialogHeader>

        {success ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-8 text-center space-y-3">
            <div className="mx-auto w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-green-500" />
            </div>
            <div><h3 className="font-bold">Payment Sent</h3><p className="text-sm text-muted-foreground">R {amount} paid to {merchant}.</p></div>
          </motion.div>
        ) : step === 0 ? (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">How would you like to find the merchant?</p>
            <div className="grid grid-cols-3 gap-2">
              <Button variant={method === "search" ? "default" : "outline"} className="flex-col gap-1 h-auto py-3" onClick={() => setMethod("search")}>
                <Search className="h-5 w-5" /><span className="text-[10px]">Search</span>
              </Button>
              <Button variant={method === "scan" ? "default" : "outline"} className="flex-col gap-1 h-auto py-3" onClick={() => setMethod("scan")}>
                <Scan className="h-5 w-5" /><span className="text-[10px]">Scan QR</span>
              </Button>
              <Button variant={method === "id" ? "default" : "outline"} className="flex-col gap-1 h-auto py-3" onClick={() => setMethod("id")}>
                <Building2 className="h-5 w-5" /><span className="text-[10px]">Merchant ID</span>
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label>{method === "search" ? "Search Merchant" : method === "scan" ? "Scan QR Code" : "Enter Merchant ID"}</Label>
              <Input placeholder={method === "id" ? "e.g. MER-12345" : "Merchant name or ID"} value={merchant} onChange={e => setMerchant(e.target.value)} />
            </div>
          </div>
        ) : step === 1 ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-muted/40 border border-border/50 p-3 flex items-center gap-3">
              <Building2 className="h-8 w-8 text-primary" />
              <div><p className="font-medium text-sm">{merchant || "Selected Merchant"}</p><p className="text-xs text-muted-foreground">Verified Merchant</p></div>
            </div>
            <div className="space-y-1.5">
              <Label>Amount (ZAR)</Label>
              <Input type="number" placeholder="0.00" className="text-lg" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Reference (Optional)</Label>
              <Input placeholder="e.g. Invoice #123" value={reference} onChange={e => setReference(e.target.value)} />
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between mt-4">
          <Button variant="outline" size="sm" onClick={step > 0 ? () => setStep(s => s - 1) : () => { onClose(); reset() }}>
            {step > 0 ? "Back" : "Cancel"}
          </Button>
          <Button variant="gradient" size="sm" disabled={submitting || !merchant || !amount} onClick={handleSubmit}>
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Processing...</> : step < 2 ? "Continue" : "Pay Now"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
