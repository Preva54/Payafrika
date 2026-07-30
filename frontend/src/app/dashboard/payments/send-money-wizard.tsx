"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Check, ArrowLeft, ArrowRight, User, Building2, Globe,
  Download, Share2, Printer, CheckCircle2, Search, Loader2,
  ShieldCheck, AlertTriangle, XCircle, Clock, ArrowUpRight,
  Ban, RefreshCw, FileText, Fingerprint,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { bankVerificationApi, beneficiariesApi, countriesApi, transfersApi, type UsernameSearchResult, type Country, type BankListResponse, type BankVerificationResponse, type InitiateTransferRequest, type InitiateTransferResponse } from "@/lib/api"

const CURRENCY_SYMBOLS: Record<string, string> = {
  ZAR: "R", USD: "$", EUR: "€", GBP: "£", NGN: "₦", KES: "KSh",
  GHS: "GH₵", BWP: "P", NAD: "N$", ZMW: "ZK", TZS: "TSh", UGX: "USh",
  RWF: "Fr", CAD: "C$", AUD: "A$",
}

const COUNTRY_FLAGS: Record<string, string> = {
  ZA: "🇿🇦", NG: "🇳🇬", KE: "🇰🇪", GH: "🇬🇭", BW: "🇧🇼", NA: "🇳🇦",
  ZM: "🇿🇲", ZW: "🇿🇼", TZ: "🇹🇿", UG: "🇺🇬", RW: "🇷🇼", GB: "🇬🇧",
  US: "🇺🇸", CA: "🇨🇦", AU: "🇦🇺", DE: "🇩🇪", FR: "🇫🇷", NL: "🇳🇱",
  ES: "🇪🇸", IT: "🇮🇹", KE: "🇰🇪", ET: "🇪🇹", SZ: "🇸🇿", MW: "🇲🇼",
}

export function SendMoneyWizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1)
  const [transferType, setTransferType] = useState("")
const [recipientType, setRecipientType] = useState("")

  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<UsernameSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [selectedRecipient, setSelectedRecipient] = useState<UsernameSearchResult | null>(null)

  const [countries, setCountries] = useState<Country[]>([])
  const [selectedCountry, setSelectedCountry] = useState("")
  const [banks, setBanks] = useState<BankListResponse[]>([])
  const [selectedBank, setSelectedBank] = useState("")
  const [bankSearch, setBankSearch] = useState("")

  const [accountNumber, setAccountNumber] = useState("")
  const [verification, setVerification] = useState<BankVerificationResponse | null>(null)
  const [verifying, setVerifying] = useState(false)
  const verificationTimeout = useRef<NodeJS.Timeout | null>(null)

  const [recipientName, setRecipientName] = useState("")
  const [recipientPhone, setRecipientPhone] = useState("")
  const [recipientEmail, setRecipientEmail] = useState("")

  const [currency, setCurrency] = useState("ZAR")
  const [amount, setAmount] = useState("")
  const [reference, setReference] = useState("")
  const [note, setNote] = useState("")
  const [pin, setPin] = useState("")

  const [txResult, setTxResult] = useState<InitiateTransferResponse | null>(null)
  const [sending, setSending] = useState(false)

  const searchTimeout = useRef<NodeJS.Timeout | null>(null)

  const apiRates = [
    { code: "ZAR", name: "South African Rand", flag: "🇿🇦", buy: 1, sell: 1, changePercent: 0 },
    { code: "USD", name: "US Dollar", flag: "🇺🇸", buy: 0.055, sell: 0.058, changePercent: 0 },
    { code: "EUR", name: "Euro", flag: "🇪🇺", buy: 0.051, sell: 0.054, changePercent: 0 },
    { code: "GBP", name: "British Pound", flag: "🇬🇧", buy: 0.043, sell: 0.046, changePercent: 0 },
    { code: "NGN", name: "Nigerian Naira", flag: "🇳🇬", buy: 75.5, sell: 78.0, changePercent: 0 },
    { code: "KES", name: "Kenyan Shilling", flag: "🇰🇪", buy: 7.2, sell: 7.5, changePercent: 0 },
    { code: "GHS", name: "Ghanaian Cedi", flag: "🇬🇭", buy: 0.082, sell: 0.087, changePercent: 0 },
    { code: "BWP", name: "Botswana Pula", flag: "🇧🇼", buy: 0.72, sell: 0.75, changePercent: 0 },
  ]
  const availableCurrencies = apiRates.filter(r => ["ZAR", "USD", "EUR", "GBP", "NGN", "KES", "GHS", "BWP", "NAD", "ZMW", "TZS", "UGX", "RWF", "CAD", "AUD"].includes(r.code))
  const selectedCurrency = availableCurrencies.find(c => c.code === currency) ?? availableCurrencies[0] ?? apiRates[0]
  const rate = selectedCurrency?.sell || 1
  const fee = parseFloat(amount || "0") * 0.015
  const total = parseFloat(amount || "0") + fee

  useEffect(() => {
    countriesApi.getAll().then(setCountries).catch(() => {})
  }, [])

  useEffect(() => {
    if (selectedCountry) {
      bankVerificationApi.getBanks(selectedCountry).then(setBanks).catch(() => setBanks([]))
    } else {
      setBanks([])
    }
    setSelectedBank("")
    setVerification(null)
    setAccountNumber("")
  }, [selectedCountry])

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([])
      setShowUserDropdown(false)
      return
    }
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(async () => {
      setSearching(true)
      try {
        const results = await authApi.searchUsers(searchQuery, 5)
        setSearchResults(results)
        setShowUserDropdown(results.length > 0)
      } catch {}
      setSearching(false)
    }, 300)
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current) }
  }, [searchQuery])

  useEffect(() => {
    if (verificationTimeout.current) clearTimeout(verificationTimeout.current)
    if (accountNumber.length >= 6 && selectedBank && selectedCountry) {
      verificationTimeout.current = setTimeout(() => {
        handleVerifyAccount()
      }, 800)
    }
    return () => { if (verificationTimeout.current) clearTimeout(verificationTimeout.current) }
  }, [accountNumber])

  const handleVerifyAccount = async () => {
    if (!selectedCountry || !selectedBank) return
    setVerifying(true)
    setVerification(null)
    try {
      const bank = banks.find(b => b.id === selectedBank)
      const result = await bankVerificationApi.verifyAccount({
        countryCode: selectedCountry,
        bankCode: bank?.code || selectedBank,
        accountNumber,
      })
      setVerification(result)
    } catch {
      setVerification({ success: false, status: "failed", message: "Unable to verify this account." })
    } finally {
      setVerifying(false)
    }
  }

  const canProceed = () => {
    if (step === 1) return transferType !== ""
    if (step === 2) {
      if (transferType === "bank" || transferType === "international") {
        if (transferType === "international") return selectedCountry !== "" && currency !== ""
        return selectedCountry !== "" && selectedBank !== "" && accountNumber !== "" && verification?.success
      }
      if (recipientType === "payafrika") return selectedRecipient !== null || recipientName !== ""
      if (recipientType === "bank") return recipientName !== ""
      return recipientName !== "" || recipientPhone !== "" || recipientEmail !== ""
    }
    if (step === 3) return parseFloat(amount) > 0
    return true
  }

  const getRecipientDisplay = () => {
    if (selectedRecipient) return selectedRecipient.fullName
    if (recipientName) return recipientName
    if (recipientPhone) return recipientPhone
    if (recipientEmail) return recipientEmail
    return "Not specified"
  }

  const getBankName = () => {
    if (selectedBank) {
      const bank = banks.find(b => b.id === selectedBank)
      return bank?.name || ""
    }
    return ""
  }

  const handleSend = async () => {
    setSending(true)
    try {
      const req: InitiateTransferRequest = {
        amount: parseFloat(amount),
        currency,
        recipientName: getRecipientDisplay(),
        recipientType: transferType === "bank" || transferType === "international" ? "bank" : recipientType,
        recipientCountryCode: selectedCountry || undefined,
        recipientBankName: getBankName() || undefined,
        recipientAccountNumber: accountNumber || undefined,
        reference: reference || undefined,
        description: note || undefined,
      }
      const result = await transfersApi.initiate(req)
      setTxResult(result)
      setStep(7)
    } catch {
      setTxResult(null)
      setStep(7)
    } finally {
      setSending(false)
    }
  }

  const steps = ["Recipient", "Bank Details", "Amount", "Review", "Confirm", "Success"]

  return (
    <Card className="overflow-hidden">
      <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b">
        <div className="flex items-center gap-3">
          {step < 7 && (
            <button onClick={() => setStep(s => s - 1)} className="p-1 hover:bg-secondary rounded-lg transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <h2 className="text-lg font-semibold">Send Money</h2>
        </div>
        <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">✕</button>
      </div>

      {step < 7 && (
        <div className="px-6 py-3 border-b">
          <Progress value={(step / 6) * 100} className="h-1" />
          <div className="flex justify-between mt-2">
            {steps.map((s, i) => (
              <span key={s} className={`text-[10px] ${i + 1 <= step ? "text-primary font-medium" : "text-muted-foreground"}`}>{s}</span>
            ))}
          </div>
        </div>
      )}

      <CardContent className="p-6">
        <AnimatePresence mode="wait">
          {!(verification?.success) && step === 2 && transferType === "bank" && (
            <motion.div key="bank-select" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="space-y-2">
                <Label>Country</Label>
                <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination country" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.filter(c => c.isEnabled).map(c => (
                      <SelectItem key={c.id} value={c.code}>{c.code} — {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedCountry && (
                <>
                  <div className="space-y-2">
                    <Label>Bank</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search bank..."
                        value={bankSearch}
                        onChange={e => setBankSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto border rounded-lg">
                      {banks.filter(b => b.name.toLowerCase().includes(bankSearch.toLowerCase())).map(bank => (
                        <button
                          key={bank.id}
                          onClick={() => { setSelectedBank(bank.id); setVerification(null); setAccountNumber("") }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors flex items-center justify-between ${selectedBank === bank.id ? "bg-primary/10" : ""}`}
                        >
                          <span>{bank.name}</span>
                          {selectedBank === bank.id && <Check className="h-4 w-4 text-primary" />}
                        </button>
                      ))}
                      {banks.filter(b => b.name.toLowerCase().includes(bankSearch.toLowerCase())).length === 0 && (
                        <p className="px-3 py-4 text-sm text-muted-foreground text-center">No banks found</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Account Number</Label>
                    <Input
                      placeholder="Enter account number"
                      value={accountNumber}
                      onChange={e => { setAccountNumber(e.target.value); setVerification(null) }}
                      maxLength={20}
                    />
                  </div>

                  {verifying && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-yellow-50 border border-yellow-200">
                      <Loader2 className="h-4 w-4 animate-spin text-yellow-600" />
                      <span className="text-sm text-yellow-700">Verifying account...</span>
                    </div>
                  )}

                  {verification?.success === false && !verifying && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm text-red-700">{verification.message || "Unable to verify this account."}</span>
                      <Button variant="outline" size="sm" className="ml-auto" onClick={handleVerifyAccount}>
                        <RefreshCw className="mr-1 h-3 w-3" />Retry
                      </Button>
                    </div>
                  )}

                  {verification?.success && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50 border border-green-200">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <div className="flex-1">
                        <p className="font-medium text-sm text-green-800">Account Verified</p>
                        <p className="text-sm text-green-700">{verification.accountName}</p>
                        <p className="text-xs text-green-600">{getBankName()}</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {!(verification?.success) && step === 2 && transferType === "international" && (
            <motion.div key="international" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="space-y-2">
                <Label>Destination Country</Label>
                <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination country" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.filter(c => c.isEnabled).map(c => (
                      <SelectItem key={c.id} value={c.code}>{COUNTRY_FLAGS[c.code] || "🌍"} {c.name} ({c.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedCountry && (
                <>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCurrencies.map(c => (
                          <SelectItem key={c.code} value={c.code}>{c.flag} {c.code} — {c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Bank</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search bank..." value={bankSearch} onChange={e => setBankSearch(e.target.value)} className="pl-9" />
                    </div>
                    <div className="max-h-48 overflow-y-auto border rounded-lg">
                      {banks.filter(b => b.name.toLowerCase().includes(bankSearch.toLowerCase())).map(bank => (
                        <button
                          key={bank.id}
                          onClick={() => { setSelectedBank(bank.id); setVerification(null); setAccountNumber("") }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors flex items-center justify-between ${selectedBank === bank.id ? "bg-primary/10" : ""}`}
                        >
                          <span>{bank.name}</span>
                          {selectedBank === bank.id && <Check className="h-4 w-4 text-primary" />}
                        </button>
                      ))}
                      {banks.filter(b => b.name.toLowerCase().includes(bankSearch.toLowerCase())).length === 0 && (
                        <p className="px-3 py-4 text-sm text-muted-foreground text-center">No banks found</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Account Number</Label>
                    <Input placeholder="Enter account number" value={accountNumber} onChange={e => { setAccountNumber(e.target.value); setVerification(null) }} maxLength={20} />
                  </div>

                  {verifying && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-yellow-50 border border-yellow-200">
                      <Loader2 className="h-4 w-4 animate-spin text-yellow-600" />
                      <span className="text-sm text-yellow-700">Verifying account...</span>
                    </div>
                  )}

                  {verification?.success === false && !verifying && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm text-red-700">{verification.message || "Unable to verify this account."}</span>
                      <Button variant="outline" size="sm" className="ml-auto" onClick={handleVerifyAccount}>
                        <RefreshCw className="mr-1 h-3 w-3" />Retry
                      </Button>
                    </div>
                  )}

                  {verification?.success && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50 border border-green-200">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <div className="flex-1">
                        <p className="font-medium text-sm text-green-800">Account Verified</p>
                        <p className="text-sm text-green-700">{verification.accountName}</p>
                        <p className="text-xs text-green-600">{getBankName()}</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {!(verification?.success) && step === 2 && transferType === "payafrika" && (
            <motion.div key="payafrika" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="space-y-2 relative">
                <Label>Search by Username or Name</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="@payafrika.peter or Name" value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setSelectedRecipient(null) }} className="pl-9" onFocus={() => searchResults.length > 0 && setShowUserDropdown(true)} />
                  {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
                </div>

                {showUserDropdown && searchResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 rounded-xl border border-border bg-background shadow-lg overflow-hidden">
                    {searchResults.map(user => (
                      <button key={user.id} onClick={() => { setSelectedRecipient(user); setSearchQuery(user.username); setShowUserDropdown(false); setRecipientName(user.fullName) }} className="w-full flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors text-left">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-sm font-bold shrink-0">{user.fullName.split(" ").map(n => n[0]).join("")}</div>
                        <div className="min-w-0"><p className="font-medium text-sm truncate">{user.fullName}</p><p className="text-xs text-muted-foreground font-mono">{user.username}</p></div>
                        <Check className="h-4 w-4 text-accent ml-auto shrink-0" />
                      </button>
                    ))}
                  </div>
                )}

                {selectedRecipient && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-sm font-bold">{selectedRecipient.fullName.split(" ").map(n => n[0]).join("")}</div>
                    <div className="min-w-0 flex-1"><p className="font-medium text-sm">{selectedRecipient.fullName}</p><p className="text-xs text-muted-foreground font-mono">{selectedRecipient.username}</p></div>
                    <ShieldCheck className="h-5 w-5 text-accent" />
                    <Check className="h-5 w-5 text-accent" />
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="amount" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="space-y-2">
                <Label>Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground">{CURRENCY_SYMBOLS[currency] || "R"}</span>
                  <Input type="number" min="1" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} className="pl-8 text-lg font-semibold" />
                </div>
              </div>

              {parseFloat(amount) > 0 && (
                <div className="p-4 rounded-xl bg-secondary/50 space-y-2 text-sm">
                  {transferType === "international" && (
                    <>
                      <div className="flex justify-between"><span className="text-muted-foreground">Exchange Rate</span><span>1 {currency} = {(1 / rate).toFixed(4)} ZAR</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">You Pay</span><span className="font-medium">{CURRENCY_SYMBOLS[currency] || "¥"}{parseFloat(amount).toFixed(2)}</span></div>
                    </>
                  )}
                  <div className="flex justify-between"><span className="text-muted-foreground">Fee (1.5%)</span><span className="text-destructive">-R {fee.toFixed(2)}</span></div>
                  <Separator />
                  <div className="flex justify-between font-medium"><span>Total</span><span>R {total.toFixed(2)}</span></div>
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
            <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <p className="text-sm font-medium text-muted-foreground mb-3">Review your transfer</p>
              <div className="space-y-3">
                {[
                  { label: "Recipient", value: getRecipientDisplay() },
                  { label: "Type", value: transferType === "payafrika" ? "PayAfrika User" : transferType === "bank" ? "Local Bank Transfer" : "International Transfer" },
                  ...(selectedCountry ? [{ label: "Country", value: `${COUNTRY_FLAGS[selectedCountry] || "🌍"} ${selectedCountry}` }] : []),
                  ...(getBankName() ? [{ label: "Bank", value: getBankName() }] : []),
                  ...(accountNumber ? [{ label: "Account", value: `****${accountNumber.slice(-4)}` }] : []),
                  ...(verification?.success ? [{ label: "Account Holder", value: verification.accountName || "—", status: "verified" as const }] : []),
                  { label: "Amount", value: `${CURRENCY_SYMBOLS[currency] || "R"}${parseFloat(amount || "0").toFixed(2)}` },
                  { label: "Fee", value: `R ${fee.toFixed(2)}` },
                  ...(transferType === "international" ? [{ label: "You Pay", value: `${CURRENCY_SYMBOLS[currency] || "¥"}${parseFloat(amount || "0").toFixed(2)}` }] : []),
                  { label: "Total", value: `R ${total.toFixed(2)}` },
                  { label: "Reference", value: reference || "None" },
                  { label: "Est. Arrival", value: "1-3 business days" },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between py-2 text-sm border-b border-border last:border-0">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className={`font-medium text-right ${item.status === "verified" ? "text-green-600" : ""}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div key="confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="p-4 rounded-xl bg-yellow-50 border border-yellow-200 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Confirm this transfer?</p>
                  <p className="text-xs mt-1 opacity-80">You will be asked to enter your transaction PIN and complete two-factor authentication.</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Transaction PIN</Label>
                <Input type="password" placeholder="Enter your PIN" value={pin} onChange={e => setPin(e.target.value)} maxLength={6} className="tracking-[0.3em] text-center" />
              </div>

              <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary/50">
                <Fingerprint className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Two-Factor Authentication required</span>
                <Badge variant="secondary" className="ml-auto">Enabled</Badge>
              </div>
            </motion.div>
          )}

          {step === 6 && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8 space-y-4">
              <div className="h-20 w-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-10 w-10 text-accent" />
              </div>
              <h3 className="text-2xl font-bold">Transfer Complete!</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Your transfer to <strong>{getRecipientDisplay()}</strong> has been initiated successfully.
              </p>
              {txResult && (
                <div className="inline-flex flex-col items-center gap-2 px-4 py-3 rounded-xl bg-secondary text-left w-full max-w-sm mx-auto">
                  <div className="flex justify-between w-full text-sm"><span className="text-muted-foreground">Reference</span><span className="font-mono text-xs">{txResult.reference}</span></div>
                  <div className="flex justify-between w-full text-sm"><span className="text-muted-foreground">Amount</span><span className="font-medium">R {txResult.amount.toFixed(2)}</span></div>
                  <div className="flex justify-between w-full text-sm"><span className="text-muted-foreground">Fee</span><span className="text-destructive">R {txResult.fee.toFixed(2)}</span></div>
                  <div className="flex justify-between w-full text-sm"><span className="text-muted-foreground">Est. Arrival</span><span>{txResult.estimatedArrival || "1-3 business days"}</span></div>
                </div>
              )}
              <div className="flex justify-center gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print</Button>
                <Button variant="outline" size="sm"><Download className="mr-2 h-4 w-4" />Receipt</Button>
                <Button variant="outline" size="sm"><Share2 className="mr-2 h-4 w-4" />Share</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>

      <div className="px-6 py-4 border-t flex justify-between">
        {step < 7 ? (
          <>
            {step > 1 && step < 6 && (
              <Button variant="ghost" onClick={() => {
                if (step === 4) { setStep(3); return }
                if (step === 3 && !verification?.success) { setStep(2); return }
                if (step === 2 && !verification?.success) { setStep(1); return }
                setStep(s => s - 1)
              }}>Back</Button>
            )}
            {step === 1 && <div />}
            <Button
              variant="gradient"
              onClick={() => {
                if (step === 4) handleSend()
                else if (step === 5) handleSend()
                else setStep(s => s + 1)
              }}
              disabled={sending || (step === 2 && !verification?.success && transferType === "bank") || (step === 2 && !verification?.success && transferType === "international") || !canProceed()}
            >
              {sending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : step === 4 ? <><span>Confirm Transfer</span><ArrowRight className="ml-2 h-4 w-4" /></> : step === 5 ? "Complete Transfer" : <><span>Continue</span><ArrowRight className="ml-2 h-4 w-4" /></>}
            </Button>
          </>
        ) : (
          <Button variant="gradient" className="w-full" onClick={() => { setStep(1); setRecipientType(""); setTransferType(""); setVerification(null); setAccountNumber(""); setTxResult(null); setPin(""); setSelectedRecipient(null); setSelectedCountry(""); setSelectedBank(""); setSearchQuery(""); setRecipientName(""); setRecipientPhone(""); setRecipientEmail(""); setAmount(""); setReference(""); setNote(""); onClose() }}>Done</Button>
        )}
      </div>
    </Card>
  )
}