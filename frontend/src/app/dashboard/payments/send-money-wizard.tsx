"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, ArrowLeft, ArrowRight, Building2, User, Euro, DollarSign, Naira, Pound, Cpu, Wallet, Download, Share2, Printer, Upload } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { paymentsApi } from "@/lib/api"

const currencies = [
  { code: "ZAR", name: "South African Rand", symbol: "R", flag: "🇿🇦", rate: 1 },
  { code: "USD", name: "US Dollar", symbol: "$", flag: "🇺🇸", rate: 0.055 },
  { code: "NGN", name: "Nigerian Naira", symbol: "₦", flag: "🇳🇬", rate: 75.5 },
  { code: "GBP", name: "British Pound", symbol: "£", flag: "🇬🇧", rate: 0.043 },
  { code: "EUR", name: "Euro", symbol: "€", flag: "🇪🇺", rate: 0.051 },
]

const steps = ["Recipient", "Amount", "Reference", "Review", "Confirmation"]

export function SendMoneyWizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1)
  const [recipientType, setRecipientType] = useState<"existing" | "new">("new")
  const [recipientName, setRecipientName] = useState("")
  const [recipientAccount, setRecipientAccount] = useState("")
  const [recipientBank, setRecipientBank] = useState("")
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState("ZAR")
  const [reference, setReference] = useState("")
  const [note, setNote] = useState("")
  const [sending, setSending] = useState(false)
  const [txId, setTxId] = useState("")

  const selectedCurrency = currencies.find(c => c.code === currency)!
  const convertedAmount = parseFloat(amount || "0") * selectedCurrency.rate
  const fee = parseFloat(amount || "0") * 0.015
  const total = parseFloat(amount || "0") + fee

  const handleSend = async () => {
    setSending(true)
    try {
      const res = await paymentsApi.initiate({
        amount: parseFloat(amount),
        currency,
        provider: "paystack",
        description: `Payment to ${recipientName}${reference ? `: ${reference}` : ""}`,
      })
      setTxId(res.transactionId)
      setStep(5)
    } catch {}
    setSending(false)
  }

  return (
    <Card className="overflow-hidden">
      <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b">
        <div className="flex items-center gap-3">
          {step > 1 && step < 5 ? (
            <button onClick={() => setStep(s => s - 1)} className="p-1 hover:bg-secondary rounded-lg transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : null}
          <h2 className="text-lg font-semibold">Send Money</h2>
        </div>
        <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">✕</button>
      </div>
      <div className="px-6 py-4 border-b">
        <div className="flex gap-1">
          {steps.map((s, i) => (
            <div key={s} className="flex-1 flex flex-col items-center gap-1">
              <div className={`h-2 w-full rounded-full transition-colors ${i + 1 <= step ? "bg-primary" : "bg-secondary"}`} />
              <span className={`text-[10px] ${i + 1 === step ? "text-primary font-medium" : "text-muted-foreground"}`}>{s}</span>
            </div>
          ))}
        </div>
      </div>
      <CardContent className="p-6">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <p className="text-sm font-medium text-muted-foreground mb-3">Choose recipient type</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button onClick={() => setRecipientType("existing")} className={`p-4 rounded-xl border-2 text-left transition-all ${recipientType === "existing" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
                  <Building2 className="h-5 w-5 mb-2" />
                  <p className="font-medium text-sm">Existing</p>
                  <p className="text-xs text-muted-foreground">Saved beneficiary</p>
                </button>
                <button onClick={() => setRecipientType("new")} className={`p-4 rounded-xl border-2 text-left transition-all ${recipientType === "new" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
                  <User className="h-5 w-5 mb-2" />
                  <p className="font-medium text-sm">New</p>
                  <p className="text-xs text-muted-foreground">New recipient</p>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button className="p-3 rounded-xl border border-border text-left hover:bg-secondary/50 transition-colors">
                  <p className="font-medium text-sm">Business</p>
                  <p className="text-xs text-muted-foreground">Company account</p>
                </button>
                <button className="p-3 rounded-xl border border-border text-left hover:bg-secondary/50 transition-colors">
                  <p className="font-medium text-sm">Personal</p>
                  <p className="text-xs text-muted-foreground">Individual account</p>
                </button>
              </div>
            </motion.div>
          )}
          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground">{selectedCurrency.symbol}</span>
                  <Input type="number" min="1" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} className="pl-8 text-lg font-semibold" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Currency</label>
                <div className="grid grid-cols-4 gap-2">
                  {currencies.map(c => (
                    <button key={c.code} onClick={() => setCurrency(c.code)} className={`p-2 rounded-xl border text-center transition-all ${currency === c.code ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
                      <span className="text-lg">{c.flag}</span>
                      <p className="text-xs font-medium">{c.code}</p>
                    </button>
                  ))}
                </div>
              </div>
              {parseFloat(amount) > 0 && (
                <div className="p-3 rounded-xl bg-secondary/50 space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Exchange rate</span><span>1 ZAR = {selectedCurrency.rate} {currency}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Recipient gets</span><span className="font-medium">{selectedCurrency.symbol}{convertedAmount.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Fee (1.5%)</span><span className="text-destructive">-R {fee.toFixed(2)}</span></div>
                  <div className="flex justify-between pt-1 border-t font-medium"><span>Total</span><span>R {total.toFixed(2)}</span></div>
                  <p className="text-[10px] text-muted-foreground pt-1">Estimated delivery: 1-3 business days</p>
                </div>
              )}
            </motion.div>
          )}
          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Reference (optional)</label>
                <Input placeholder="e.g. Invoice #1234" value={reference} onChange={e => setReference(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Note (optional)</label>
                <textarea className="flex min-h-[80px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" placeholder="Add a note..." value={note} onChange={e => setNote(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Upload Invoice (optional)</label>
                <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                  <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
                  <p className="text-xs text-muted-foreground">PDF, PNG, JPG (max 5MB)</p>
                </div>
              </div>
            </motion.div>
          )}
          {step === 4 && (
            <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="space-y-3">
                {[
                  { label: "Recipient", value: recipientName || "Not specified" },
                  { label: "Account", value: recipientAccount || "Not specified" },
                  { label: "Bank", value: recipientBank || "Not specified" },
                  { label: "Amount", value: `R ${parseFloat(amount || "0").toFixed(2)}` },
                  { label: "Fee", value: `R ${fee.toFixed(2)}` },
                  { label: "Exchange Rate", value: `1 ZAR = ${selectedCurrency.rate} ${currency}` },
                  { label: "Recipient gets", value: `${selectedCurrency.symbol}${convertedAmount.toFixed(2)}` },
                  { label: "Total", value: `R ${total.toFixed(2)}` },
                  { label: "Estimated arrival", value: "1-3 business days" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between py-1 text-sm"><span className="text-muted-foreground">{label}</span><span className="font-medium">{value}</span></div>
                ))}
              </div>
            </motion.div>
          )}
          {step === 5 && (
            <motion.div key="s5" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6 space-y-4">
              <div className="h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
                <Check className="h-8 w-8 text-accent" />
              </div>
              <h3 className="text-xl font-bold">Payment Sent!</h3>
              <p className="text-sm text-muted-foreground">Your transfer has been initiated successfully.</p>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary"><span className="text-xs text-muted-foreground">Transaction ID</span><span className="text-sm font-mono font-medium">{txId || "PAY-" + Date.now().toString(36).toUpperCase()}</span></div>
              <div className="flex justify-center gap-3 pt-4">
                <Button variant="outline" size="sm"><Download className="mr-2 h-4 w-4" />Receipt</Button>
                <Button variant="outline" size="sm"><Share2 className="mr-2 h-4 w-4" />Share</Button>
                <Button variant="outline" size="sm"><Printer className="mr-2 h-4 w-4" />Print</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
      <div className="px-6 py-4 border-t flex justify-between">
        {step < 5 ? (
          <>
            {step > 1 && <Button variant="ghost" onClick={() => setStep(s => s - 1)}>Back</Button>}
            {step === 1 && <div />}
            <Button variant="gradient" onClick={() => step < 4 ? setStep(s => s + 1) : handleSend()} disabled={sending}>
              {sending ? "Processing..." : step < 4 ? <><span>Continue</span><ArrowRight className="ml-2 h-4 w-4" /></> : "Send Payment"}
            </Button>
          </>
        ) : (
          <Button variant="gradient" className="w-full" onClick={onClose}>Done</Button>
        )}
      </div>
    </Card>
  )
}


