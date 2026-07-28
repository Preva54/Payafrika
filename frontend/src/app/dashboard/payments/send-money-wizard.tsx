"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Check, ArrowLeft, ArrowRight, User, Building2, Handshake, Phone, Mail,
  Download, Share2, Printer, CheckCircle2,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { paymentsApi, type ExchangeRate } from "@/lib/api"

const CURRENCY_FLAGS: Record<string, string> = {
  ZAR: "🇿🇦", USD: "🇺🇸", EUR: "🇪🇺", GBP: "🇬🇧", NGN: "🇳🇬", KES: "🇰🇪",
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  ZAR: "R", USD: "$", EUR: "€", GBP: "£", NGN: "₦", KES: "KSh",
}

const steps = ["Recipient", "Currency", "Amount", "Review", "Confirmation"]

const RECIPIENT_TYPES = [
  { id: "payafrika", label: "PayAfrika User", desc: "Send to another PayAfrika user", icon: User, color: "from-primary/10 to-primary/5" },
  { id: "bank", label: "Bank Account", desc: "Send to a bank account", icon: Building2, color: "from-blue-500/10 to-blue-500/5" },
  { id: "merchant", label: "Merchant", desc: "Pay a business", icon: Handshake, color: "from-green-500/10 to-green-500/5" },
  { id: "phone", label: "Phone Number", desc: "Send via mobile number", icon: Phone, color: "from-orange-500/10 to-orange-500/5" },
  { id: "email", label: "Email", desc: "Send to an email address", icon: Mail, color: "from-purple-500/10 to-purple-500/5" },
]

const DEFAULT_RATES: ExchangeRate[] = [
  { code: "ZAR", name: "South African Rand", flag: "🇿🇦", buy: 1, sell: 1, changePercent: 0 },
  { code: "USD", name: "US Dollar", flag: "🇺🇸", buy: 0.055, sell: 0.058, changePercent: 0 },
  { code: "EUR", name: "Euro", flag: "🇪🇺", buy: 0.051, sell: 0.054, changePercent: 0 },
  { code: "GBP", name: "British Pound", flag: "🇬🇧", buy: 0.043, sell: 0.046, changePercent: 0 },
  { code: "NGN", name: "Nigerian Naira", flag: "🇳🇬", buy: 75.5, sell: 78.0, changePercent: 0 },
]

export function SendMoneyWizard({ onClose, rates }: { onClose: () => void; rates?: ExchangeRate[] }) {
  const [step, setStep] = useState(1)
  const [recipientType, setRecipientType] = useState("")
  const [recipientName, setRecipientName] = useState("")
  const [recipientAccount, setRecipientAccount] = useState("")
  const [recipientBank, setRecipientBank] = useState("")
  const [recipientPhone, setRecipientPhone] = useState("")
  const [recipientEmail, setRecipientEmail] = useState("")
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState("ZAR")
  const [reference, setReference] = useState("")
  const [note, setNote] = useState("")
  const [sending, setSending] = useState(false)
  const [txId, setTxId] = useState("")

  const apiRates = (rates ?? DEFAULT_RATES).filter(r => ["ZAR", "USD", "EUR", "GBP", "NGN", "KES"].includes(r.code))
  const availableCurrencies = apiRates.length > 0 ? apiRates : DEFAULT_RATES
  const selectedCurrency = availableCurrencies.find(c => c.code === currency)!
  const rate = selectedCurrency.sell || 1
  const convertedAmount = parseFloat(amount || "0") * rate
  const fee = parseFloat(amount || "0") * 0.015
  const total = parseFloat(amount || "0") + fee

  const canProceed = () => {
    if (step === 1) return recipientType !== ""
    if (step === 2) return currency !== ""
    if (step === 3) return parseFloat(amount) > 0
    return true
  }

  const getRecipientDisplay = () => {
    switch (recipientType) {
      case "payafrika": return recipientName || "PayAfrika User"
      case "bank": return `${recipientBank || "Bank"} - ${recipientAccount || "Account"}`
      case "merchant": return recipientName || "Merchant"
      case "phone": return recipientPhone || "Phone"
      case "email": return recipientEmail || "Email"
      default: return "Not specified"
    }
  }

  const handleSend = async () => {
    setSending(true)
    try {
      const res = await paymentsApi.initiate({
        amount: parseFloat(amount),
        currency,
        provider: "paystack",
        description: `Payment to ${getRecipientDisplay()}${reference ? `: ${reference}` : ""}`,
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
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {RECIPIENT_TYPES.map(rt => {
                  const Icon = rt.icon
                  return (
                    <button
                      key={rt.id}
                      onClick={() => setRecipientType(rt.id)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${recipientType === rt.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                    >
                      <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${rt.color} flex items-center justify-center mb-2`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className="font-medium text-sm">{rt.label}</p>
                      <p className="text-xs text-muted-foreground">{rt.desc}</p>
                    </button>
                  )
                })}
              </div>

              {recipientType === "payafrika" && (
                <div className="space-y-2 mt-4">
                  <Label>PayAfrika Username or Phone</Label>
                  <Input placeholder="@username or phone number" value={recipientName} onChange={e => setRecipientName(e.target.value)} />
                </div>
              )}
              {recipientType === "bank" && (
                <div className="space-y-3 mt-4">
                  <div className="space-y-2">
                    <Label>Bank Name</Label>
                    <Input placeholder="e.g. FNB, Standard Bank" value={recipientBank} onChange={e => setRecipientBank(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Account Number</Label>
                    <Input placeholder="Enter account number" value={recipientAccount} onChange={e => setRecipientAccount(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Account Holder Name</Label>
                    <Input placeholder="Enter account holder name" value={recipientName} onChange={e => setRecipientName(e.target.value)} />
                  </div>
                </div>
              )}
              {recipientType === "merchant" && (
                <div className="space-y-2 mt-4">
                  <Label>Merchant Name or ID</Label>
                  <Input placeholder="Enter merchant name" value={recipientName} onChange={e => setRecipientName(e.target.value)} />
                </div>
              )}
              {recipientType === "phone" && (
                <div className="space-y-2 mt-4">
                  <Label>Phone Number</Label>
                  <Input placeholder="+27..." value={recipientPhone} onChange={e => setRecipientPhone(e.target.value)} />
                </div>
              )}
              {recipientType === "email" && (
                <div className="space-y-2 mt-4">
                  <Label>Email Address</Label>
                  <Input type="email" placeholder="recipient@email.com" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} />
                </div>
              )}
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <p className="text-sm font-medium text-muted-foreground mb-3">Choose currency</p>
              <div className="grid grid-cols-3 gap-3">
                {availableCurrencies.map(c => (
                  <button
                    key={c.code}
                    onClick={() => setCurrency(c.code)}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${currency === c.code ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                  >
                    <span className="text-2xl">{CURRENCY_FLAGS[c.code] || c.flag}</span>
                    <p className="text-sm font-semibold mt-2">{c.code}</p>
                    <p className="text-[10px] text-muted-foreground">{c.name}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="space-y-2">
                <Label>Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground">
                    {CURRENCY_SYMBOLS[selectedCurrency.code] || "R"}
                  </span>
                  <Input
                    type="number"
                    min="1"
                    placeholder="0.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="pl-8 text-lg font-semibold"
                  />
                </div>
              </div>

              {parseFloat(amount) > 0 && (
                <div className="p-4 rounded-xl bg-secondary/50 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Exchange rate</span>
                    <span>1 ZAR = {rate} {currency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Recipient gets</span>
                    <span className="font-medium">
                      {CURRENCY_SYMBOLS[selectedCurrency.code] || "R"}{convertedAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fee (1.5%)</span>
                    <span className="text-destructive">-R {fee.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium">
                    <span>Total</span>
                    <span>R {total.toFixed(2)}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground pt-1">Estimated delivery: 1-3 business days</p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Reference (optional)</Label>
                <Input placeholder="e.g. Invoice #1234" value={reference} onChange={e => setReference(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Note (optional)</Label>
                <Textarea placeholder="Add a note..." value={note} onChange={e => setNote(e.target.value)} className="min-h-[80px]" />
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <p className="text-sm font-medium text-muted-foreground mb-3">Review your payment</p>
              <div className="space-y-3">
                {[
                  { label: "Recipient", value: getRecipientDisplay() },
                  { label: "Recipient Type", value: RECIPIENT_TYPES.find(r => r.id === recipientType)?.label || "" },
                  { label: "Amount", value: `R ${parseFloat(amount || "0").toFixed(2)}` },
                  { label: "Fee", value: `R ${fee.toFixed(2)}` },
                  { label: "Exchange Rate", value: `1 ZAR = ${rate} ${currency}` },
                  { label: "Recipient gets", value: `${CURRENCY_SYMBOLS[selectedCurrency.code] || "R"}${convertedAmount.toFixed(2)}` },
                  { label: "Total", value: `R ${total.toFixed(2)}` },
                  { label: "Currency", value: `${CURRENCY_FLAGS[currency]} ${currency}` },
                  { label: "Estimated arrival", value: "1-3 business days" },
                ].filter(item => item.value).map(({ label, value }) => (
                  <div key={label} className="flex justify-between py-2 text-sm border-b border-border last:border-0">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium text-right">{value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div key="s5" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8 space-y-4">
              <div className="h-20 w-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-10 w-10 text-accent" />
              </div>
              <h3 className="text-2xl font-bold">Payment Sent!</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Your transfer to {getRecipientDisplay()} has been initiated successfully.
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary">
                <span className="text-xs text-muted-foreground">Transaction ID</span>
                <span className="text-sm font-mono font-medium">{txId || "PAY-" + Date.now().toString(36).toUpperCase()}</span>
              </div>
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
            <Button
              variant="gradient"
              onClick={() => step < 4 ? setStep(s => s + 1) : handleSend()}
              disabled={sending || !canProceed()}
            >
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
