"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Send, ArrowRight, CheckCircle2, Loader2, Repeat, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { walletApi } from "@/lib/api"
import { formatCurrency } from "@/lib/utils"

const CURRENCIES = ["ZAR", "USD", "EUR", "GBP", "NGN", "KES"]
const CURRENCY_FLAGS: Record<string, string> = {
  ZAR: "\uD83C\uDDFF\uD83C\uDDE6", USD: "\uD83C\uDDFA\uD83C\uDDF8", EUR: "\uD83C\uDDEA\uD83C\uDDFA",
  GBP: "\uD83C\uDDEC\uD83C\uDDE7", NGN: "\uD83C\uDDF3\uD83C\uDDEC", KES: "\uD83C\uDDF0\uD83C\uDDEA",
}

export default function TransferDialog({
  open, onClose, onSuccess,
}: {
  open: boolean; onClose: () => void; onSuccess?: () => void
}) {
  const [step, setStep] = useState(0)
  const [transferType, setTransferType] = useState("wallet")
  const [amount, setAmount] = useState("")
  const [fromCurrency, setFromCurrency] = useState("ZAR")
  const [toCurrency, setToCurrency] = useState("USD")
  const [recipient, setRecipient] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async () => {
    if (step < 2) { setStep(s => s + 1); return }
    setSubmitting(true)
    setError("")
    try {
      if (transferType === "wallet") {
        await walletApi.transfer(parseFloat(amount), fromCurrency, toCurrency)
      }
      setSuccess(true)
      onSuccess?.()
      setTimeout(() => onClose(), 2000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Transfer failed")
    }
    setSubmitting(false)
  }

  const reset = () => { setStep(0); setAmount(""); setRecipient(""); setSuccess(false); setError("") }

  return (
    <Dialog open={open} onOpenChange={o => { if (!o && !submitting) { onClose(); reset() } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transfer</DialogTitle>
          <DialogDescription>Send money between your wallets or to others.</DialogDescription>
        </DialogHeader>

        {success ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-8 text-center space-y-3">
            <div className="mx-auto w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-green-500" />
            </div>
            <div><h3 className="font-bold">Transfer Complete</h3><p className="text-sm text-muted-foreground">{formatCurrency(parseFloat(amount || "0"), fromCurrency)} sent.</p></div>
          </motion.div>
        ) : step === 0 ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Transfer Type</Label>
              <Select value={transferType} onValueChange={setTransferType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="wallet">Internal Wallet Transfer</SelectItem>
                  <SelectItem value="user">PayAfrika User</SelectItem>
                  <SelectItem value="merchant">Merchant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>From Currency</Label>
              <Select value={fromCurrency} onValueChange={setFromCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{CURRENCY_FLAGS[c]} {c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {transferType !== "wallet" && (
              <div className="space-y-1.5">
                <Label>Recipient</Label>
                <Input placeholder="Email, phone, or wallet ID" value={recipient} onChange={e => setRecipient(e.target.value)} />
              </div>
            )}
            {transferType === "wallet" && (
              <div className="space-y-1.5">
                <Label>To Currency</Label>
                <Select value={toCurrency} onValueChange={setToCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.filter(c => c !== fromCurrency).map(c => <SelectItem key={c} value={c}>{CURRENCY_FLAGS[c]} {c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
          </div>
        ) : step === 1 ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input type="number" placeholder="0.00" className="text-lg" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            {parseFloat(amount || "0") > 0 && (
              <div className="rounded-xl bg-muted/40 border border-border/50 p-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Fee</span><span className="font-mono">R 0.00</span></div>
                <Separator className="my-1" />
                <div className="flex justify-between font-semibold"><span>Total</span><span className="font-mono text-primary">{formatCurrency(parseFloat(amount), fromCurrency)}</span></div>
              </div>
            )}
          </div>
        ) : null}

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="flex items-center justify-between mt-4">
          <Button variant="outline" size="sm" onClick={step > 0 ? () => setStep(s => s - 1) : onClose}>
            {step > 0 ? "Back" : "Cancel"}
          </Button>
          <Button variant="gradient" size="sm" disabled={submitting || !amount} onClick={handleSubmit}>
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Processing...</> : step < 2 ? "Continue" : "Confirm Transfer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
