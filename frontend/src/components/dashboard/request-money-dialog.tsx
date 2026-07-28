"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Send, CheckCircle2, Loader2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"

export default function RequestMoneyDialog({
  open, onClose,
}: {
  open: boolean; onClose: () => void
}) {
  const [step, setStep] = useState(0)
  const [recipient, setRecipient] = useState("")
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  const [expiry, setExpiry] = useState("")
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

  const reset = () => { setStep(0); setRecipient(""); setAmount(""); setReason(""); setExpiry(""); setSuccess(false) }

  return (
    <Dialog open={open} onOpenChange={o => { if (!o && !submitting) { onClose(); reset() } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Money</DialogTitle>
          <DialogDescription>Request payment from someone.</DialogDescription>
        </DialogHeader>

        {success ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-8 text-center space-y-3">
            <div className="mx-auto w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-green-500" />
            </div>
            <div><h3 className="font-bold">Request Sent</h3><p className="text-sm text-muted-foreground">R {amount} requested from {recipient}.</p></div>
          </motion.div>
        ) : step === 0 ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Recipient</Label>
              <Input placeholder="Email, phone, or wallet ID" value={recipient} onChange={e => setRecipient(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Amount (ZAR)</Label>
              <Input type="number" placeholder="0.00" className="text-lg" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Reason (Optional)</Label>
              <Textarea placeholder="What is this for?" className="min-h-[60px]" value={reason} onChange={e => setReason(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Expiry Date (Optional)</Label>
              <Input type="date" value={expiry} onChange={e => setExpiry(e.target.value)} />
            </div>
          </div>
        ) : step === 1 ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-muted/40 border border-border/50 divide-y divide-border/30 text-sm">
              <div className="flex justify-between px-4 py-2.5"><span className="text-muted-foreground">Recipient</span><span>{recipient}</span></div>
              <div className="flex justify-between px-4 py-2.5"><span className="text-muted-foreground">Amount</span><span className="font-semibold font-mono">R {amount}</span></div>
              <div className="flex justify-between px-4 py-2.5"><span className="text-muted-foreground">Reason</span><span>{reason || "Not specified"}</span></div>
              <div className="flex justify-between px-4 py-2.5"><span className="text-muted-foreground">Expires</span><span>{expiry || "Never"}</span></div>
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between mt-4">
          <Button variant="outline" size="sm" onClick={step > 0 ? () => setStep(s => s - 1) : () => { onClose(); reset() }}>
            {step > 0 ? "Back" : "Cancel"}
          </Button>
          <Button variant="gradient" size="sm" disabled={submitting || !recipient || !amount} onClick={handleSubmit}>
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Sending...</> : step < 2 ? "Continue" : "Send Request"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
