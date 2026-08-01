"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Check, ArrowLeft, ArrowRight, User, Building2, Globe,
  Download, Share2, Printer, CheckCircle2, Search, Loader2,
  ShieldCheck, AlertTriangle, XCircle,
  RefreshCw, Fingerprint, KeyRound,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { bankVerificationApi, beneficiariesApi, countriesApi, transfersApi, authApi, type UsernameSearchResult, type Country, type BankListResponse, type BankVerificationResponse, type BankTransferResponse, type TransferQuoteResponse, type ExchangeRate } from "@/lib/api"

const CURRENCY_SYMBOLS: Record<string, string> = {
  ZAR: "R", USD: "$", EUR: "€", GBP: "£", NGN: "₦", KES: "KSh",
  GHS: "GH₵", BWP: "P", NAD: "N$", ZMW: "ZK", TZS: "TSh", UGX: "USh",
  RWF: "Fr", CAD: "C$", AUD: "A$",
}

const COUNTRY_FLAGS: Record<string, string> = {
  ZA: "🇿🇦", NG: "🇳🇬", KE: "🇰🇪", GH: "🇬🇭", BW: "🇧🇼", NA: "🇳🇦",
  ZM: "🇿🇲", ZW: "🇿🇼", TZ: "🇹🇿", UG: "🇺🇬", RW: "🇷🇼", GB: "🇬🇧",
  US: "🇺🇸", CA: "🇨🇦", AU: "🇦🇺", DE: "🇩🇪", FR: "🇫🇷", NL: "🇳🇱",
  ES: "🇪🇸", IT: "🇮🇹", ET: "🇪🇹", SZ: "🇸🇿", MW: "🇲🇼",
}

const COUNTRY_CURRENCY: Record<string, string> = {
  NG: "NGN", ZA: "ZAR", KE: "KES", GH: "GHS", BW: "BWP", NA: "NAD",
  ZM: "ZMW", TZ: "TZS", UG: "UGX", RW: "RWF", GB: "GBP", US: "USD",
  CA: "CAD", AU: "AUD", ET: "ETB", SZ: "SZL", MW: "MWK", ZW: "ZWL",
}

const ACCOUNT_DIGITS: Record<string, { min: number; max: number }> = {
  ZA: { min: 6, max: 10 }, NG: { min: 10, max: 10 }, KE: { min: 10, max: 12 }, GH: { min: 10, max: 13 },
  GB: { min: 8, max: 8 }, US: { min: 8, max: 17 }, CA: { min: 7, max: 12 }, AU: { min: 6, max: 9 },
  BW: { min: 10, max: 12 }, ZM: { min: 8, max: 13 }, TZ: { min: 10, max: 13 }, UG: { min: 10, max: 12 },
  RW: { min: 10, max: 12 }, NA: { min: 6, max: 12 }, SZ: { min: 10, max: 12 }, MW: { min: 10, max: 13 },
  ZW: { min: 10, max: 13 }, ET: { min: 6, max: 16 }, MZ: { min: 9, max: 14 }, EG: { min: 10, max: 14 },
  MA: { min: 20, max: 24 },
}
const DEFAULT_ACCOUNT_DIGITS = { min: 6, max: 20 }

const maskAccount = (accountNumber: string) => `${"*".repeat(8)}${accountNumber.slice(-4)}`

const formatMoney = (amount: number, currency = "NGN") =>
  `${CURRENCY_SYMBOLS[currency] || ""}${amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function buildReceiptText(tx: BankTransferResponse): string {
  return [
    "PAYAFRIKA TRANSFER RECEIPT",
    "─────────────────────────────",
    `Reference      : ${tx.reference}`,
    `Date           : ${new Date(tx.createdAt).toLocaleString()}`,
    `Status         : ${tx.status.toUpperCase()}`,
    "─────────────────────────────",
    `Recipient      : ${tx.accountName || ""}`,
    `Bank           : ${tx.bankName || ""}`,
    `Account        : ${tx.accountNumber}`,
    `Narration      : ${tx.narration || "-"}`,
    "─────────────────────────────",
    `Amount         : ${formatMoney(tx.amount, tx.currency)}`,
    `Fee            : ${formatMoney(tx.fee, tx.currency)}`,
    `VAT            : ${formatMoney(tx.vat, tx.currency)}`,
    `Total Debit    : ${formatMoney(tx.totalDebit, tx.currency)}`,
    "─────────────────────────────",
    `Provider Ref   : ${tx.providerRequestId || "-"}`,
    "─────────────────────────────",
    "Thank you for using PayAfrika.",
  ].join("\n")
}

export function SendMoneyWizard({ onClose, rates }: { onClose: () => void; rates?: ExchangeRate[] }) {
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

  const [currency, setCurrency] = useState("NGN")
  const [amount, setAmount] = useState("")
  const [reference, setReference] = useState("")
  const [note, setNote] = useState("")
  const [pin, setPin] = useState("")
  const [newPin, setNewPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [hasPin, setHasPin] = useState<boolean | null>(null)
  const [pinError, setPinError] = useState("")

  const [quote, setQuote] = useState<TransferQuoteResponse | null>(null)
  const [quoting, setQuoting] = useState(false)

  const [txResult, setTxResult] = useState<BankTransferResponse | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")

  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState("")
  const [otpChallengeId, setOtpChallengeId] = useState("")
  const [otpCountdown, setOtpCountdown] = useState(0)
  const [otpSending, setOtpSending] = useState(false)
  const [otpVerifying, setOtpVerifying] = useState(false)
  const [otpError, setOtpError] = useState("")
  const [otpAttemptsLeft, setOtpAttemptsLeft] = useState(5)
  const otpTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [savingBeneficiary, setSavingBeneficiary] = useState(false)
  const [beneficiarySaved, setBeneficiarySaved] = useState(false)
  const [showSavePrompt, setShowSavePrompt] = useState(false)
  const [beneficiaryNickname, setBeneficiaryNickname] = useState("")

  const searchTimeout = useRef<NodeJS.Timeout | null>(null)
  const quoteTimeout = useRef<NodeJS.Timeout | null>(null)

  const apiRates = rates && rates.length > 0
    ? rates.map(r => ({ code: r.code, name: r.code, flag: COUNTRY_FLAGS[`${r.code.slice(0, 2)}`] || "🌍", buy: 0, sell: r.sell, changePercent: 0 }))
    : [
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
  const fee = quote?.fee ?? parseFloat(amount || "0") * 0.015
  const vat = quote?.vat ?? 0
  const total = quote?.totalDebit ?? (parseFloat(amount || "0") + fee)
  const estimatedArrival = quote?.estimatedArrival || "1-3 business days"

  const fetchCountries = useCallback(async () => {
    try {
      const data = await countriesApi.getAll()
      setCountries(data)
    } catch {
      setCountries([])
    }
  }, [])

  useEffect(() => {
    fetchCountries()
    transfersApi.pinStatus().then(r => setHasPin(r.hasPin)).catch(() => setHasPin(true))
  }, [fetchCountries])

  useEffect(() => {
    if (selectedCountry) {
      bankVerificationApi.getBanks(selectedCountry).then(setBanks).catch(() => setBanks([]))
    } else {
      setBanks([])
    }
    setSelectedBank("")
    setVerification(null)
    setAccountNumber("")
    setQuote(null)
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

  const handleVerifyAccount = useCallback(async () => {
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
  }, [selectedCountry, selectedBank, accountNumber, banks])

  useEffect(() => {
    if (verificationTimeout.current) clearTimeout(verificationTimeout.current)
    const { min } = ACCOUNT_DIGITS[selectedCountry] ?? DEFAULT_ACCOUNT_DIGITS
    if (accountNumber.length >= min && selectedBank && selectedCountry) {
      verificationTimeout.current = setTimeout(() => {
        handleVerifyAccount()
      }, 400)
    }
    return () => { if (verificationTimeout.current) clearTimeout(verificationTimeout.current) }
  }, [accountNumber, selectedBank, selectedCountry, handleVerifyAccount])

  useEffect(() => {
    if (quoteTimeout.current) clearTimeout(quoteTimeout.current)
    const amt = parseFloat(amount)
    if (transferType === "bank" && amt > 0 && selectedCountry) {
      quoteTimeout.current = setTimeout(async () => {
        setQuoting(true)
        try {
          const q = await transfersApi.quote({ amount: amt, countryCode: selectedCountry, currency })
          setQuote(q)
        } catch {
          setQuote(null)
        } finally {
          setQuoting(false)
        }
      }, 350)
    } else {
      setQuote(null)
    }
    return () => { if (quoteTimeout.current) clearTimeout(quoteTimeout.current) }
  }, [amount, selectedCountry, currency, transferType])

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

  const handleCountryChange = (code: string) => {
    setSelectedCountry(code)
    if (transferType === "bank" && COUNTRY_CURRENCY[code]) {
      setCurrency(COUNTRY_CURRENCY[code])
    }
  }

  const ensurePin = async (pinToUse: string): Promise<string> => {
    if (hasPin) return pinToUse

    if (newPin.length < 4 || !/^\d+$/.test(newPin)) {
      setPinError("Transaction PIN must be at least 4 digits.")
      return ""
    }
    if (newPin !== confirmPin) {
      setPinError("PINs do not match.")
      return ""
    }

    await transfersApi.setPin(newPin)
    setHasPin(true)
    setPinError("")
    return newPin
  }

  const handleSend = async () => {
    setError("")
    setSending(true)
    try {
      if (transferType === "bank") {
        const pinToUse = await ensurePin(pin)
        if (!pinToUse) {
          setSending(false)
          return
        }
        const bank = banks.find(b => b.id === selectedBank)
        const req: {
          amount: number
          currency: string
          countryCode: string
          bankCode: string
          accountNumber: string
          accountName: string
          narration?: string
          pin: string
          otpChallengeId?: string
          otpCode?: string
        } = {
          amount: parseFloat(amount),
          currency,
          countryCode: selectedCountry,
          bankCode: bank?.code || selectedBank,
          accountNumber,
          accountName: verification?.accountName || "",
          narration: note || reference || undefined,
          pin: pinToUse,
        }
        if (otpChallengeId) req.otpChallengeId = otpChallengeId
        else if (otpSent && otpCode.trim().length === 6) req.otpCode = otpCode.trim()
        const result = await transfersApi.initiate(req)
        setTxResult(result)
        setShowSavePrompt(result.status === "successful")
        setStep(6)
      } else {
        const req = {
          amount: parseFloat(amount),
          currency,
          recipientName: verification?.accountName || getRecipientDisplay(),
          recipientType: transferType === "international" ? "bank" : recipientType,
          recipientCountryCode: selectedCountry || undefined,
          recipientBankName: getBankName() || undefined,
          recipientAccountNumber: accountNumber || undefined,
          reference: reference || undefined,
          description: note || undefined,
        }
        const result = await transfersApi.legacySendBank(req)
        setTxResult({
          id: result.transactionId,
          reference: result.reference,
          countryCode: selectedCountry,
          bankName: getBankName() || undefined,
          accountNumber: accountNumber || "",
          accountName: verification?.accountName || getRecipientDisplay(),
          amount: result.amount,
          currency: result.currency,
          fee: result.fee,
          vat: 0,
          totalDebit: result.total,
          status: result.status,
          createdAt: new Date().toISOString(),
        } as BankTransferResponse)
        setShowSavePrompt(false)
        setStep(6)
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Transfer failed. Please try again."
      const errData = (e as Error & { data?: { requiresOtp?: boolean } }).data
      if (errData?.requiresOtp) {
        setError(message)
        sendOtp()
      } else {
        setError(message)
      }
    } finally {
      setSending(false)
    }
  }

  const sendOtp = async () => {
    setOtpSending(true)
    setOtpError("")
    try {
      const res = await transfersApi.sendOtp()
      setOtpSent(true)
      setOtpChallengeId("")
      setOtpCode("")
      setOtpAttemptsLeft(5)
      startOtpCountdown(res.expiresInSeconds ?? 300)
    } catch (e) {
      setOtpError(e instanceof Error ? e.message : "Could not send verification code.")
    } finally {
      setOtpSending(false)
    }
  }

  const verifyOtp = async () => {
    if (otpCode.trim().length !== 6) {
      setOtpError("Enter the 6-digit code.")
      return
    }
    setOtpVerifying(true)
    setOtpError("")
    try {
      const res = await transfersApi.verifyOtp(otpCode.trim())
      if (res.success && res.challengeId) {
        setOtpChallengeId(res.challengeId)
        if (otpTimerRef.current) clearInterval(otpTimerRef.current)
        otpTimerRef.current = null
        setOtpCountdown(0)
      } else {
        setOtpError(res.message || "Verification failed.")
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Verification failed."
      setOtpError(message)
      const match = message.match(/(\d+) attempts remaining/)
      if (match) setOtpAttemptsLeft(parseInt(match[1], 10))
    } finally {
      setOtpVerifying(false)
    }
  }

  const startOtpCountdown = (seconds: number) => {
    setOtpCountdown(seconds)
    if (otpTimerRef.current) clearInterval(otpTimerRef.current)
    otpTimerRef.current = setInterval(() => {
      setOtpCountdown((prev) => {
        if (prev <= 1 && otpTimerRef.current) {
          clearInterval(otpTimerRef.current)
          otpTimerRef.current = null
        }
        return Math.max(0, prev - 1)
      })
    }, 1000)
  }

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  const handleSaveBeneficiary = async () => {
    setSavingBeneficiary(true)
    try {
      await beneficiariesApi.create({
        name: txResult?.accountName || verification?.accountName || getRecipientDisplay(),
        bankName: getBankName() || txResult?.bankName || undefined,
        accountNumber: accountNumber || undefined,
        country: selectedCountry,
        currency,
        isVerified: true,
        isFavorite: false,
        nickname: beneficiaryNickname.trim() || undefined,
      })
      setBeneficiarySaved(true)
    } catch {}
    setSavingBeneficiary(false)
  }

  const downloadReceipt = () => {
    if (!txResult) return
    const blob = new Blob([buildReceiptText(txResult)], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${txResult.reference}-receipt.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const shareReceipt = async () => {
    if (!txResult) return
    const text = buildReceiptText(txResult)
    if (navigator.share) {
      try { await navigator.share({ title: "PayAfrika Transfer Receipt", text }) } catch {}
    } else {
      navigator.clipboard.writeText(text)
      setError("Receipt copied to clipboard.")
      setTimeout(() => setError(""), 2000)
    }
  }

  const resetWizard = () => {
    setStep(1); setRecipientType(""); setTransferType(""); setVerification(null); setAccountNumber("")
    setTxResult(null); setPin(""); setNewPin(""); setConfirmPin(""); setSelectedRecipient(null)
    setSelectedCountry(""); setSelectedBank(""); setSearchQuery(""); setRecipientName("")
    setRecipientPhone(""); setRecipientEmail(""); setAmount(""); setReference(""); setNote("")
    setQuote(null); setError(""); setShowSavePrompt(false); setBeneficiarySaved(false)
    setBeneficiaryNickname(""); setCurrency("NGN")
    setOtpSent(false); setOtpCode(""); setOtpChallengeId(""); setOtpCountdown(0); setOtpError("")
    setOtpAttemptsLeft(5)
    if (otpTimerRef.current) clearInterval(otpTimerRef.current)
    otpTimerRef.current = null
  }

  const steps = ["Recipient", "Bank Details", "Amount", "Review", "Confirm", "Success"]

  return (
    <Card className="overflow-hidden">
      <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b">
        <div className="flex items-center gap-3">
          {step < 6 && (
            <button onClick={() => setStep(s => s - 1)} className="p-1 hover:bg-secondary rounded-lg transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <h2 className="text-lg font-semibold">Send Money</h2>
          {transferType === "bank" && <Badge variant="outline" className="ml-1">{COUNTRY_FLAGS[selectedCountry] || "🌍"} {currency}</Badge>}
        </div>
        <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">✕</button>
      </div>

      {step < 6 && (
        <div className="px-6 py-3 border-b">
          <Progress value={(step / 5) * 100} className="h-1" />
          <div className="flex justify-between mt-2">
            {steps.map((s, i) => (
              <span key={s} className={`text-[10px] ${i + 1 <= step ? "text-primary font-medium" : "text-muted-foreground"}`}>{s}</span>
            ))}
          </div>
        </div>
      )}

      <CardContent className="p-6">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <p className="text-sm font-medium text-muted-foreground mb-3">Choose how you want to send money</p>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { id: "payafrika", label: "PayAfrika User", desc: "Send to another PayAfrika user", icon: User, color: "from-primary/10 to-primary/5" },
                  { id: "bank", label: "Nigerian Bank Account", desc: "Send to any Nigerian bank instantly", icon: Building2, color: "from-blue-500/10 to-blue-500/5" },
                  { id: "international", label: "International Transfer", desc: "Send to a bank account worldwide", icon: Globe, color: "from-green-500/10 to-green-500/5" },
                ].map(rt => {
                  const Icon = rt.icon
                  return (
                    <button
                      key={rt.id}
                      onClick={() => { setTransferType(rt.id); setStep(2); if (rt.id === "bank") handleCountryChange("NG") }}
                      className="p-4 rounded-xl border-2 text-left transition-all hover:border-primary/50"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${rt.color} flex items-center justify-center shrink-0`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{rt.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{rt.desc}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto" />
                      </div>
                    </button>
                  )
                })}
              </div>
            </motion.div>
          )}

          {step === 2 && transferType === "bank" && (
            <motion.div key="bank-select" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="space-y-2">
                <Label>Country</Label>
                <Select value={selectedCountry} onValueChange={handleCountryChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination country" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.filter(c => c.isEnabled).map(c => (
                      <SelectItem key={c.id} value={c.code}>{COUNTRY_FLAGS[c.code] || "🌍"} {c.code} — {c.name}</SelectItem>
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
                      onChange={e => { setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, (ACCOUNT_DIGITS[selectedCountry]?.max ?? DEFAULT_ACCOUNT_DIGITS.max))); setVerification(null) }}
                      maxLength={ACCOUNT_DIGITS[selectedCountry]?.max ?? DEFAULT_ACCOUNT_DIGITS.max}
                      inputMode="numeric"
                      autoComplete="off"
                    />
                  </div>

                  {verifying && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-yellow-50 border border-yellow-200">
                      <Loader2 className="h-4 w-4 animate-spin text-yellow-600" />
                      <span className="text-sm text-yellow-700">Verifying account...</span>
                    </div>
                  )}

                  {verification?.success === false && !verifying && (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-5 w-5 text-red-600" />
                        <p className="font-medium text-sm text-red-800">Unable to verify this account.</p>
                        <Button variant="outline" size="sm" className="ml-auto" onClick={handleVerifyAccount}>
                          <RefreshCw className="mr-1 h-3 w-3" />Retry
                        </Button>
                      </div>
                      <p className="text-sm text-red-700 mt-2">Please check:</p>
                      <ul className="list-disc list-inside text-sm text-red-700">
                        <li>Bank</li>
                        <li>Account Number</li>
                      </ul>
                      <p className="text-sm text-red-700">and try again.</p>
                    </div>
                  )}

                  {verification?.success && (
                    <div className="p-4 rounded-xl bg-green-50 border border-green-200 space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <p className="font-medium text-sm text-green-800">Verified Account</p>
                        <ShieldCheck className="h-4 w-4 text-green-500 ml-auto" />
                      </div>
                      <div className="grid grid-cols-1 gap-2 pt-1">
                        <div className="flex justify-between gap-3 text-sm">
                          <span className="text-muted-foreground">Account Name</span>
                          <span className="font-semibold text-green-900 uppercase text-right">{verification.accountName}</span>
                        </div>
                        <div className="flex justify-between gap-3 text-sm">
                          <span className="text-muted-foreground">Bank</span>
                          <span className="font-medium text-green-800 text-right">{getBankName()}</span>
                        </div>
                        <div className="flex justify-between gap-3 text-sm">
                          <span className="text-muted-foreground">Account Number</span>
                          <span className="font-mono font-medium text-green-800">{maskAccount(accountNumber)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {step === 2 && transferType === "international" && (
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
                    <Input placeholder="Enter account number" value={accountNumber} onChange={e => { setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, (ACCOUNT_DIGITS[selectedCountry]?.max ?? DEFAULT_ACCOUNT_DIGITS.max))); setVerification(null) }} maxLength={ACCOUNT_DIGITS[selectedCountry]?.max ?? DEFAULT_ACCOUNT_DIGITS.max} inputMode="numeric" />
                  </div>

                  {verifying && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-yellow-50 border border-yellow-200">
                      <Loader2 className="h-4 w-4 animate-spin text-yellow-600" />
                      <span className="text-sm text-yellow-700">Verifying account...</span>
                    </div>
                  )}

                  {verification?.success === false && !verifying && (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-5 w-5 text-red-600" />
                        <p className="font-medium text-sm text-red-800">Unable to verify this bank account.</p>
                        <Button variant="outline" size="sm" className="ml-auto" onClick={handleVerifyAccount}>
                          <RefreshCw className="mr-1 h-3 w-3" />Retry
                        </Button>
                      </div>
                      <p className="text-sm text-red-700 mt-2">Please check:</p>
                      <ul className="list-disc list-inside text-sm text-red-700">
                        <li>Bank</li>
                        <li>Account Number</li>
                      </ul>
                      <p className="text-sm text-red-700">and try again.</p>
                    </div>
                  )}

                  {verification?.success && (
                    <div className="p-4 rounded-xl bg-green-50 border border-green-200 space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <p className="font-medium text-sm text-green-800">Account Verified</p>
                        <ShieldCheck className="h-4 w-4 text-green-500 ml-auto" />
                      </div>
                      <div className="grid grid-cols-1 gap-2 pt-1">
                        <div className="flex justify-between gap-3 text-sm">
                          <span className="text-muted-foreground">Account Name</span>
                          <span className="font-semibold text-green-900 uppercase text-right">{verification.accountName}</span>
                        </div>
                        <div className="flex justify-between gap-3 text-sm">
                          <span className="text-muted-foreground">Bank</span>
                          <span className="font-medium text-green-800 text-right">{getBankName()}</span>
                        </div>
                        <div className="flex justify-between gap-3 text-sm">
                          <span className="text-muted-foreground">Account Number</span>
                          <span className="font-mono font-medium text-green-800">{maskAccount(accountNumber)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {step === 2 && transferType === "payafrika" && (
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
                  {transferType === "bank" && quoting && (
                    <div className="flex items-center gap-2 text-muted-foreground text-xs">
                      <Loader2 className="h-3 w-3 animate-spin" /> Calculating fees...
                    </div>
                  )}
                  {transferType === "international" && (
                    <>
                      <div className="flex justify-between"><span className="text-muted-foreground">Exchange Rate</span><span>1 {currency} = {(1 / rate).toFixed(4)} ZAR</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">You Pay</span><span className="font-medium">{CURRENCY_SYMBOLS[currency] || "¥"}{parseFloat(amount).toFixed(2)}</span></div>
                    </>
                  )}
                  <div className="flex justify-between"><span className="text-muted-foreground">Transfer Fee</span><span>{formatMoney(fee, currency)}</span></div>
                  {vat > 0 && (
                    <div className="flex justify-between"><span className="text-muted-foreground">VAT</span><span>{formatMoney(vat, currency)}</span></div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-medium"><span>Total Debit</span><span>{formatMoney(total, currency)}</span></div>
                  <p className="text-[10px] text-muted-foreground pt-1">Estimated arrival: {estimatedArrival}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Narration (optional)</Label>
                <Input placeholder="e.g. Rent Payment" value={note} onChange={e => setNote(e.target.value)} />
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <p className="text-sm font-medium text-muted-foreground mb-3">Review your transfer</p>
              <div className="space-y-3">
                {[
                  { label: "Recipient", value: (verification?.accountName || getRecipientDisplay()).toUpperCase() },
                  { label: "Type", value: transferType === "payafrika" ? "PayAfrika User" : transferType === "bank" ? "Nigerian Bank Account" : "International Transfer" },
                  ...(selectedCountry ? [{ label: "Country", value: `${COUNTRY_FLAGS[selectedCountry] || "🌍"} ${selectedCountry}` }] : []),
                  ...(getBankName() ? [{ label: "Bank", value: getBankName() }] : []),
                  ...(accountNumber ? [{ label: "Account", value: maskAccount(accountNumber) }] : []),
                  ...(verification?.success ? [{ label: "Account Holder", value: (verification.accountName || "—").toUpperCase(), status: "verified" as const }] : []),
                  { label: "Amount", value: formatMoney(parseFloat(amount || "0"), currency) },
                  { label: "Fee", value: formatMoney(fee, currency) },
                  ...(vat > 0 ? [{ label: "VAT", value: formatMoney(vat, currency) }] : []),
                  ...(transferType === "international" ? [{ label: "You Pay", value: formatMoney(parseFloat(amount || "0"), currency) }] : []),
                  { label: "Total Debit", value: formatMoney(total, currency) },
                  ...(note ? [{ label: "Narration", value: note }] : []),
                  { label: "Est. Arrival", value: estimatedArrival },
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
                  <p className="text-xs mt-1 opacity-80">You will be asked to enter your transaction PIN to authorize {formatMoney(total, currency)}.</p>
                </div>
              </div>

              {hasPin === false ? (
                <div className="space-y-3 rounded-xl border border-border p-4">
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium">Set your Transaction PIN</p>
                  </div>
                  <p className="text-xs text-muted-foreground">A 4-digit PIN is required to authorize transfers. It will be used for all future transactions.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>New PIN</Label>
                      <Input type="password" placeholder="••••" value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))} maxLength={6} inputMode="numeric" className="tracking-[0.3em] text-center" />
                    </div>
                    <div className="space-y-1">
                      <Label>Confirm PIN</Label>
                      <Input type="password" placeholder="••••" value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))} maxLength={6} inputMode="numeric" className="tracking-[0.3em] text-center" />
                    </div>
                  </div>
                  {pinError && <p className="text-xs text-destructive">{pinError}</p>}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Transaction PIN</Label>
                  <Input type="password" placeholder="Enter your PIN" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} maxLength={6} inputMode="numeric" className="tracking-[0.3em] text-center" />
                </div>
              )}

              <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary/50">
                <Fingerprint className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Two-Factor Authentication required</span>
                <Badge variant="secondary" className="ml-auto">Enabled</Badge>
              </div>

              <div className="space-y-3 rounded-xl border border-border p-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium">Verify with a one-time code</p>
                  <Badge variant={otpChallengeId ? "default" : "secondary"} className="ml-auto">
                    {otpChallengeId ? "Verified" : otpSent ? "Code sent" : "Required"}
                  </Badge>
                </div>

                {otpSent && !otpChallengeId && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        inputMode="numeric"
                        placeholder="6-digit code"
                        className="text-center tracking-[0.3em] font-mono"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="shrink-0"
                        onClick={verifyOtp}
                        disabled={otpVerifying || otpCode.trim().length !== 6}
                        title="Verify code"
                      >
                        {otpVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                      </Button>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {otpAttemptsLeft} attempt{otpAttemptsLeft !== 1 ? "s" : ""} remaining
                      </span>
                      <span className={otpCountdown === 0 ? "text-destructive font-medium" : "text-muted-foreground font-mono"}>
                        {otpCountdown > 0 ? formatCountdown(otpCountdown) : "Code expired"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={sendOtp}
                      disabled={otpCountdown > 0 || otpSending}
                      className="text-xs text-primary hover:underline disabled:text-muted-foreground disabled:no-underline disabled:cursor-not-allowed"
                    >
                      {otpSending ? "Sending..." : otpCountdown > 0 ? `Resend in ${formatCountdown(otpCountdown)}` : "Resend code"}
                    </button>
                    {otpError && <p className="text-xs text-destructive">{otpError}</p>}
                  </div>
                )}

                {!otpSent && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={sendOtp}
                    disabled={otpSending}
                    className="w-full"
                  >
                    {otpSending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending code...</> : <><ShieldCheck className="mr-2 h-4 w-4" />Send verification code</>}
                  </Button>
                )}

                {otpChallengeId && (
                  <p className="text-xs text-accent flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5" /> Code verified. You can now authorize the transfer.
                  </p>
                )}
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800">
                  <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </motion.div>
          )}

          {step === 6 && txResult && (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6 space-y-4">
              {txResult.status === "successful" ? (
                <>
                  <div className="h-20 w-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-10 w-10 text-accent" />
                  </div>
                  <h3 className="text-2xl font-bold">Transfer Successful</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Your transfer to <strong>{txResult.accountName}</strong> has been sent successfully.
                  </p>
                  <div className="inline-flex flex-col items-center gap-2 px-4 py-3 rounded-xl bg-secondary text-left w-full max-w-sm mx-auto">
                    <div className="flex justify-between w-full text-sm"><span className="text-muted-foreground">Reference</span><span className="font-mono text-xs">{txResult.reference}</span></div>
                    <div className="flex justify-between w-full text-sm"><span className="text-muted-foreground">Recipient</span><span className="font-medium uppercase text-right">{txResult.accountName}</span></div>
                    {txResult.bankName && <div className="flex justify-between w-full text-sm"><span className="text-muted-foreground">Bank</span><span className="font-medium">{txResult.bankName}</span></div>}
                    <div className="flex justify-between w-full text-sm"><span className="text-muted-foreground">Amount</span><span className="font-medium">{formatMoney(txResult.amount, txResult.currency)}</span></div>
                    <div className="flex justify-between w-full text-sm"><span className="text-muted-foreground">Fee</span><span>{formatMoney(txResult.fee, txResult.currency)}</span></div>
                    <div className="flex justify-between w-full text-sm"><span className="text-muted-foreground">Status</span><Badge variant="success" className="text-[10px]">Successful</Badge></div>
                  </div>

                  <div className="flex justify-center gap-2 pt-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={downloadReceipt}><Download className="mr-2 h-4 w-4" />Receipt</Button>
                    <Button variant="outline" size="sm" onClick={shareReceipt}><Share2 className="mr-2 h-4 w-4" />Share</Button>
                    <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print</Button>
                    <Button variant="outline" size="sm" onClick={resetWizard}><RefreshCw className="mr-2 h-4 w-4" />Make Another Transfer</Button>
                  </div>

                  {showSavePrompt && (
                    <div className="rounded-xl border border-border p-4 text-left space-y-3">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-accent" />
                        <p className="text-sm font-medium">Save this beneficiary?</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Nickname (optional)</Label>
                        <Input placeholder={`e.g. ${txResult.accountName?.split(" ")[0] || "Recipient"}`} value={beneficiaryNickname} onChange={e => setBeneficiaryNickname(e.target.value)} />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="gradient" onClick={handleSaveBeneficiary} disabled={savingBeneficiary}>
                          {savingBeneficiary ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" />Saving...</> : beneficiarySaved ? <><Check className="mr-1 h-3 w-3" />Saved</> : "Save"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setShowSavePrompt(false)}>Skip</Button>
                      </div>
                      {beneficiarySaved && <p className="text-xs text-accent">Beneficiary saved successfully.</p>}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="h-20 w-20 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto">
                    <XCircle className="h-10 w-10 text-destructive" />
                  </div>
                  <h3 className="text-2xl font-bold">Transfer Failed</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    {txResult.failureReason || "The transfer could not be completed."}
                  </p>
                  <div className="inline-flex flex-col items-center gap-2 px-4 py-3 rounded-xl bg-secondary text-left w-full max-w-sm mx-auto">
                    <div className="flex justify-between w-full text-sm"><span className="text-muted-foreground">Reference</span><span className="font-mono text-xs">{txResult.reference}</span></div>
                    <div className="flex justify-between w-full text-sm"><span className="text-muted-foreground">Amount</span><span className="font-medium">{formatMoney(txResult.amount, txResult.currency)}</span></div>
                    <div className="flex justify-between w-full text-sm"><span className="text-muted-foreground">Status</span><Badge variant="destructive" className="text-[10px]">Failed</Badge></div>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <RefreshCw className="h-3 w-3" /> Your funds have been refunded.
                  </p>
                  <div className="flex justify-center gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => setStep(3)}><RefreshCw className="mr-2 h-4 w-4" />Try Again</Button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>

      <div className="px-6 py-4 border-t flex justify-between">
        {step < 6 ? (
          <>
            {step > 1 && (
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
                if (step === 5) handleSend()
                else if (step === 4) setStep(5)
                else setStep(s => s + 1)
              }}
              disabled={sending || (step === 2 && !verification?.success && transferType === "bank") || (step === 2 && !verification?.success && transferType === "international") || !canProceed()}
            >
              {sending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : step === 4 ? <><span>Confirm Transfer</span><ArrowRight className="ml-2 h-4 w-4" /></> : step === 5 ? "Authorize Transfer" : <><span>Continue</span><ArrowRight className="ml-2 h-4 w-4" /></>}
            </Button>
          </>
        ) : (
          <Button variant="gradient" className="w-full" onClick={() => { resetWizard(); onClose() }}>Done</Button>
        )}
      </div>
    </Card>
  )
}
