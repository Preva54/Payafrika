"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Plus, RefreshCw, Wallet, TrendingUp, CreditCard, Shield, ArrowRight, Check, X,
  Building2, Briefcase, Ambulance, Car, Wrench, ShoppingBag, Home, GraduationCap,
  Tractor, RotateCcw, Download, Calculator, Zap, FileText, Bell, BarChart3,
  ChevronDown, ChevronRight, Search, Filter, Clock, CheckCircle, AlertCircle,
  AlertTriangle, Info, Upload, Eye, Printer, Share2, MessageCircle, Phone,
  Calendar, ChevronLeft, ChevronUp, HelpCircle, Clock3, Percent, DollarSign,
  PieChart, TrendingDown, Sparkles, Target, Sliders, BookOpen, UserCheck,
  Fingerprint, Lock, History, Activity, Mail, Smartphone, MessageSquare,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import {
  loansApi,
  type LoanResponse,
  type LoanOverview,
  type RepaymentScheduleItem,
  type CreditScoreResponse,
  type EligibilityResponse,
  type CalculatorResponse,
  type LoanNotification,
  type LoanAnalytics,
  type LoanDocument,
} from "@/lib/api"

const loanTypes = [
  { id: "personal", label: "Personal", icon: UserCheck, gradient: "from-blue-600 to-blue-400" },
  { id: "business", label: "Business", icon: Building2, gradient: "from-emerald-600 to-emerald-400" },
  { id: "emergency", label: "Emergency", icon: Ambulance, gradient: "from-red-600 to-red-400" },
  { id: "vehicle", label: "Vehicle Finance", icon: Car, gradient: "from-orange-600 to-orange-400" },
  { id: "equipment", label: "Equipment Finance", icon: Wrench, gradient: "from-yellow-600 to-yellow-400" },
  { id: "invoice", label: "Invoice Financing", icon: ShoppingBag, gradient: "from-purple-600 to-purple-400" },
  { id: "trade", label: "Trade Finance", icon: TrendingUp, gradient: "from-cyan-600 to-cyan-400" },
  { id: "mortgage", label: "Mortgage", icon: Home, gradient: "from-pink-600 to-pink-400" },
  { id: "education", label: "Education Loan", icon: GraduationCap, gradient: "from-indigo-600 to-indigo-400" },
  { id: "agricultural", label: "Agricultural Loan", icon: Tractor, gradient: "from-green-600 to-green-400" },
  { id: "refinance", label: "Refinance", icon: RotateCcw, gradient: "from-teal-600 to-teal-400" },
]

const pageVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } },
}

function AnimatedCounter({ value, suffix = "", prefix = "", decimals = 0 }: { value: number; suffix?: string; prefix?: string; decimals?: number }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef<number | null>(null)

  useEffect(() => {
    const start = performance.now()
    const duration = 1500
    const from = 0
    const to = value

    function animate(time: number) {
      const elapsed = time - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(from + (to - from) * eased)
      if (progress < 1) ref.current = requestAnimationFrame(animate)
    }

    ref.current = requestAnimationFrame(animate)
    return () => { if (ref.current) cancelAnimationFrame(ref.current) }
  }, [value])

  return <span>{prefix}{display.toLocaleString("en-ZA", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</span>
}

function ProgressRing({ progress, size = 80, strokeWidth = 6, color = "#22c55e" }: { progress: number; size?: number; strokeWidth?: number; color?: string }) {
  const [animatedProgress, setAnimatedProgress] = useState(0)
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (animatedProgress / 100) * circumference

  useEffect(() => {
    const start = performance.now()
    const duration = 2000
    function animate(time: number) {
      const elapsed = time - start
      const p = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setAnimatedProgress(progress * eased)
      if (p < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [progress])

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-muted/20" />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset 0.1s" }} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="fill-foreground text-lg font-bold" transform={`rotate(90, ${size / 2}, ${size / 2})`}>
        {Math.round(animatedProgress)}%
      </text>
    </svg>
  )
}

function ScoreGauge({ score }: { score: number }) {
  const [animatedScore, setAnimatedScore] = useState(300)
  const color = score >= 800 ? "#22c55e" : score >= 700 ? "#3b82f6" : score >= 600 ? "#eab308" : "#ef4444"

  useEffect(() => {
    const start = performance.now()
    const duration = 2000
    function animate(time: number) {
      const elapsed = time - start
      const p = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setAnimatedScore(300 + (score - 300) * eased)
      if (p < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [score])

  const angle = ((animatedScore - 300) / (999 - 300)) * 180

  return (
    <div className="relative flex flex-col items-center">
      <svg width="160" height="90" viewBox="0 0 160 90">
        <path d="M 15 80 A 65 65 0 0 1 145 80" fill="none" stroke="currentColor" strokeWidth="10" className="text-muted/20" strokeLinecap="round" />
        <path d="M 15 80 A 65 65 0 0 1 145 80" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${(angle / 180) * 204} 204`} style={{ transition: "stroke-dasharray 0.3s" }} />
        <text x="80" y="70" textAnchor="middle" className="fill-foreground text-2xl font-bold">{Math.round(animatedScore)}</text>
      </svg>
    </div>
  )
}

function RippleButton({ children, className, ...props }: React.ComponentProps<typeof Button>) {
  const ref = useRef<HTMLButtonElement>(null)
  const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([])

  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = ref.current?.getBoundingClientRect()
    if (rect) {
      const ripple = { x: e.clientX - rect.left, y: e.clientY - rect.top, id: Date.now() }
      setRipples(prev => [...prev, ripple])
      setTimeout(() => setRipples(prev => prev.filter(r => r.id !== ripple.id)), 600)
    }
  }, [])

  return (
    <Button ref={ref} className={`relative overflow-hidden ${className}`} onClick={handleClick} {...props}>
      {ripples.map(r => (
        <span key={r.id} className="absolute w-4 h-4 bg-white/30 rounded-full animate-ping" style={{ left: r.x - 8, top: r.y - 8 }} />
      ))}
      {children}
    </Button>
  )
}

export default function LoansPage() {
  const [activeTab, setActiveTab] = useState("overview")
  const [loans, setLoans] = useState<LoanResponse[]>([])
  const [overview, setOverview] = useState<LoanOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedLoan, setSelectedLoan] = useState<LoanResponse | null>(null)
  const [loanDetails, setLoanDetails] = useState<LoanResponse | null>(null)
  const [repaymentSchedule, setRepaymentSchedule] = useState<RepaymentScheduleItem[]>([])
  const [creditScore, setCreditScore] = useState<CreditScoreResponse | null>(null)
  const [eligibility, setEligibility] = useState<EligibilityResponse | null>(null)
  const [calculator, setCalculator] = useState<CalculatorResponse | null>(null)
  const [notifications, setNotifications] = useState<LoanNotification[]>([])
  const [analytics, setAnalytics] = useState<LoanAnalytics | null>(null)
  const [documents, setDocuments] = useState<LoanDocument[]>([])

  // Apply wizard state
  const [applyOpen, setApplyOpen] = useState(false)
  const [applyStep, setApplyStep] = useState(1)
  const [applyData, setApplyData] = useState({
    loanType: "",
    fullName: "", idNumber: "", phone: "", email: "", address: "",
    employer: "", monthlyIncome: "",
    bank: "", monthlyExpenses: "", existingLoans: "", assets: "", liabilities: "",
    agreeTerms: false, agreePrivacy: false,
  })

  // Calculator state
  const [calcAmount, setCalcAmount] = useState(100000)
  const [calcRate, setCalcRate] = useState(12.5)
  const [calcDuration, setCalcDuration] = useState(24)
  const [calcFreq, setCalcFreq] = useState("monthly")

  // Eligibility state
  const [eligForm, setEligForm] = useState({ monthlyIncome: 0, employmentStatus: "employed", existingDebt: 0, creditScore: 600, loanPurpose: "personal", loanAmount: 100000, loanTermMonths: 24 })
  const [eligLoading, setEligLoading] = useState(false)

  // Payment dialog
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentLoan, setPaymentLoan] = useState<LoanResponse | null>(null)
  const [paymentAmount, setPaymentAmount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState("wallet")
  const [paymentStep, setPaymentStep] = useState<"amount" | "otp" | "success">("amount")

  // Support dialog
  const [supportOpen, setSupportOpen] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [loansData, overviewData, creditData, notifData, analyticsData, docsData] = await Promise.allSettled([
        loansApi.getAll(), loansApi.overview(), loansApi.creditScore(),
        loansApi.notifications(), loansApi.analytics(), loansApi.documents(),
      ])
      if (loansData.status === "fulfilled") setLoans(loansData.value)
      if (overviewData.status === "fulfilled") setOverview(overviewData.value)
      if (creditData.status === "fulfilled") setCreditScore(creditData.value)
      if (notifData.status === "fulfilled") setNotifications(notifData.value)
      if (analyticsData.status === "fulfilled") setAnalytics(analyticsData.value)
      if (docsData.status === "fulfilled") setDocuments(docsData.value)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleApplySubmit = async () => {
    try {
      await loansApi.apply({
        amount: Math.max(1000, parseInt(applyData.monthlyIncome) * 3),
        interestRate: 12.5,
        termMonths: 24,
        purpose: applyData.loanType,
        loanType: applyData.loanType,
      })
      setApplyStep(6)
      setTimeout(() => { setApplyOpen(false); setApplyStep(1); fetchAll() }, 4000)
    } catch {}
  }

  const handleCalc = useCallback(async () => {
    try {
      const result = await loansApi.calculate({ loanAmount: calcAmount, interestRate: calcRate, durationMonths: calcDuration, paymentFrequency: calcFreq })
      setCalculator(result)
    } catch {}
  }, [calcAmount, calcRate, calcDuration, calcFreq])

  useEffect(() => { handleCalc() }, [handleCalc])

  const handleEligibility = async () => {
    setEligLoading(true)
    try {
      const result = await loansApi.eligibility(eligForm)
      setEligibility(result)
    } catch {}
    setEligLoading(false)
  }

  const handleSelectLoan = async (loan: LoanResponse) => {
    setSelectedLoan(loan)
    setLoanDetails(loan)
    try {
      const schedule = await loansApi.getRepaymentSchedule(loan.id)
      setRepaymentSchedule(schedule)
    } catch {}
  }

  const handlePayLoan = async () => {
    if (!paymentLoan) return
    if (paymentStep === "amount") { setPaymentStep("otp"); return }
    if (paymentStep === "otp") {
      try {
        await loansApi.makePayment({ loanId: paymentLoan.id, amount: paymentAmount || paymentLoan.monthlyPayment, paymentMethod })
        setPaymentStep("success")
        setTimeout(() => { setPaymentOpen(false); setPaymentStep("amount"); fetchAll() }, 3000)
      } catch {}
    }
  }

  if (loading) return (
    <div className="space-y-6 p-6">
      <div className="flex gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-32 flex-1" />)}</div>
      <Skeleton className="h-12 w-96" />
      <div className="grid grid-cols-3 gap-4">{[1,2,3].map(i => <Skeleton key={i} className="h-40" />)}</div>
    </div>
  )

  return (
    <motion.div variants={pageVariants} initial="hidden" animate="visible" className="space-y-6 pb-16">
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Loan Management</h1>
          <p className="text-sm text-muted-foreground">Apply, track, and manage your loans</p>
        </div>
        <div className="flex gap-2">
          <RippleButton variant="outline" size="sm" onClick={fetchAll}><RefreshCw className="mr-2 h-4 w-4" />Refresh</RippleButton>
          <RippleButton variant="gradient" size="sm" onClick={() => { setApplyOpen(true); setApplyStep(1) }}>
            <Plus className="mr-2 h-4 w-4" />Apply for Loan
          </RippleButton>
        </div>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="my-loans">My Loans</TabsTrigger>
          <TabsTrigger value="eligibility">Eligibility Checker</TabsTrigger>
          <TabsTrigger value="calculator">Calculator</TabsTrigger>
          <TabsTrigger value="credit-score">Credit Score</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        {/* ===== OVERVIEW TAB ===== */}
        <TabsContent value="overview" className="space-y-6">
          <motion.div variants={itemVariants} className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 hover:shadow-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-blue-400/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Loan</p>
                    <p className="text-2xl font-bold mt-1">
                      R <AnimatedCounter value={overview?.activeLoanAmount ?? 0} decimals={0} />
                    </p>
                    <Badge variant={overview?.activeLoanStatus === "active" ? "default" : "secondary"} className="mt-2">
                      {overview?.activeLoanStatus ?? "No active loan"}
                    </Badge>
                  </div>
                  <ProgressRing progress={overview?.activeLoanProgress ?? 0} color={overview && overview.activeLoanProgress > 50 ? "#22c55e" : "#eab308"} />
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 hover:shadow-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 to-emerald-400/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Available Credit</p>
                    <p className="text-2xl font-bold mt-1">
                      R <AnimatedCounter value={overview?.availableCredit ?? 500000} decimals={0} />
                    </p>
                    <div className="flex items-center gap-1 mt-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs text-muted-foreground">Ready to use</span>
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-500/10"><Wallet className="h-6 w-6 text-emerald-500" /></div>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 hover:shadow-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-purple-400/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly Repayment</p>
                    <p className="text-2xl font-bold mt-1">
                      R <AnimatedCounter value={overview?.monthlyRepayment ?? 0} decimals={2} />
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Next: {overview?.nextPaymentDate ?? "No active loan"}
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-purple-500/10"><CreditCard className="h-6 w-6 text-purple-500" /></div>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 hover:shadow-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-600/10 to-orange-400/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Credit Score</p>
                    <p className="text-2xl font-bold mt-1">
                      <AnimatedCounter value={overview?.creditScore ?? 600} decimals={0} />
                    </p>
                    <Badge variant="outline" className="mt-2">
                      {overview?.creditScoreRating ?? "Good"}
                    </Badge>
                  </div>
                  <ScoreGauge score={overview?.creditScore ?? 600} />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {loanTypes.slice(0, 6).map((type, i) => {
                const Icon = type.icon
                return (
                  <motion.button key={type.id} variants={itemVariants} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}
                    onClick={() => { setApplyOpen(true); setApplyStep(1); setApplyData(d => ({ ...d, loanType: type.id })) }}
                    className="relative group p-4 rounded-xl border bg-card text-left hover:shadow-lg transition-all overflow-hidden">
                    <div className={`absolute inset-0 bg-gradient-to-br ${type.gradient} opacity-0 group-hover:opacity-10 transition-opacity`} />
                    <div className="relative">
                      <div className={`p-2 rounded-lg w-fit bg-gradient-to-br ${type.gradient} text-white mb-3`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-medium">{type.label}</p>
                    </div>
                  </motion.button>
                )
              })}
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <RippleButton variant="gradient" className="h-24 text-lg" onClick={() => { setApplyOpen(true); setApplyStep(1) }}>
              <Plus className="mr-3 h-6 w-6" />Apply for Loan
            </RippleButton>
            <RippleButton variant="outline" className="h-24 text-lg" onClick={() => {
              const activeLoan = loans.find(l => l.status === "active" || l.status === "approved")
              if (activeLoan) { setPaymentLoan(activeLoan); setPaymentAmount(activeLoan.monthlyPayment); setPaymentOpen(true); setPaymentStep("amount") }
            }}>
              <Wallet className="mr-3 h-6 w-6" />Pay Loan
            </RippleButton>
            <RippleButton variant="outline" className="h-24 text-lg">
              <Download className="mr-3 h-6 w-6" />Download Statement
            </RippleButton>
          </motion.div>
        </TabsContent>

        {/* ===== MY LOANS TAB ===== */}
        <TabsContent value="my-loans" className="space-y-4">
          {loans.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-16 text-center">
                <div className="p-4 rounded-full bg-muted mb-4"><Wallet className="h-12 w-12 text-muted-foreground" /></div>
                <h3 className="text-xl font-semibold mb-2">You haven&apos;t applied for a loan yet</h3>
                <p className="text-sm text-muted-foreground mb-6">Start your journey to financial growth</p>
                <RippleButton variant="gradient" onClick={() => { setApplyOpen(true); setApplyStep(1) }}>Apply Now</RippleButton>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {loans.map(loan => (
                <motion.div key={loan.id} variants={itemVariants} layoutId={`loan-${loan.id}`}>
                  <Card className="cursor-pointer hover:shadow-lg transition-all group" onClick={() => handleSelectLoan(loan)}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg bg-gradient-to-br ${
                            loanTypes.find(t => t.id === loan.loanType)?.gradient ?? "from-blue-600 to-blue-400"
                          } text-white`}>
                            {(() => { const Icon = loanTypes.find(t => t.id === loan.loanType)?.icon ?? Wallet; return <Icon className="h-5 w-5" /> })()}
                          </div>
                          <div>
                            <p className="font-medium">{loan.loanType ? loan.loanType.charAt(0).toUpperCase() + loan.loanType.slice(1) : "Personal"} Loan</p>
                            <p className="text-xs text-muted-foreground">ID: {loan.id.slice(0, 8)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">R {loan.amount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</p>
                          <div className="flex items-center gap-2 mt-1 justify-end">
                            <Badge variant={loan.status === "active" ? "default" : loan.status === "paid" ? "secondary" : loan.status === "pending" ? "outline" : "destructive"}>
                              {loan.status.replace("_", " ")}
                            </Badge>
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ===== ELIGIBILITY CHECKER TAB ===== */}
        <TabsContent value="eligibility" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5" /> AI-Powered Eligibility Checker</CardTitle>
                <CardDescription>Fill in your details to check loan eligibility</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Monthly Income (ZAR)</Label><Input type="number" value={eligForm.monthlyIncome || ""} onChange={e => setEligForm(f => ({ ...f, monthlyIncome: parseFloat(e.target.value) || 0 }))} placeholder="e.g. 50000" /></div>
                  <div className="space-y-2"><Label>Employment Status</Label><Select value={eligForm.employmentStatus} onValueChange={v => setEligForm(f => ({ ...f, employmentStatus: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="employed">Employed</SelectItem><SelectItem value="self-employed">Self-Employed</SelectItem><SelectItem value="business">Business Owner</SelectItem><SelectItem value="contract">Contract</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><Label>Existing Debt (ZAR)</Label><Input type="number" value={eligForm.existingDebt || ""} onChange={e => setEligForm(f => ({ ...f, existingDebt: parseFloat(e.target.value) || 0 }))} placeholder="e.g. 10000" /></div>
                  <div className="space-y-2"><Label>Credit Score</Label><Input type="number" min={300} max={999} value={eligForm.creditScore} onChange={e => setEligForm(f => ({ ...f, creditScore: parseInt(e.target.value) || 300 }))} /></div>
                  <div className="space-y-2"><Label>Loan Purpose</Label><Select value={eligForm.loanPurpose} onValueChange={v => setEligForm(f => ({ ...f, loanPurpose: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="personal">Personal</SelectItem><SelectItem value="business">Business</SelectItem><SelectItem value="debt">Debt Consolidation</SelectItem><SelectItem value="education">Education</SelectItem><SelectItem value="home">Home Improvement</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><Label>Loan Amount (ZAR)</Label><Input type="number" value={eligForm.loanAmount} onChange={e => setEligForm(f => ({ ...f, loanAmount: parseInt(e.target.value) || 1000 }))} /></div>
                  <div className="space-y-2"><Label>Loan Term (months)</Label><Input type="number" min={1} max={120} value={eligForm.loanTermMonths} onChange={e => setEligForm(f => ({ ...f, loanTermMonths: parseInt(e.target.value) || 12 }))} /></div>
                </div>
                <RippleButton variant="gradient" className="w-full" onClick={handleEligibility} disabled={eligLoading}>
                  {eligLoading ? "Calculating..." : "Check Eligibility"}
                </RippleButton>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {eligibility ? (
                <>
                  <Card><CardContent className="p-6">
                    <div className="text-center mb-4">
                      <div className="relative inline-flex mb-4">
                        <ProgressRing progress={eligibility.eligibilityPercentage} size={120} strokeWidth={8}
                          color={eligibility.eligibilityPercentage >= 70 ? "#22c55e" : eligibility.eligibilityPercentage >= 50 ? "#eab308" : "#ef4444"} />
                      </div>
                      <h3 className="text-xl font-bold">{eligibility.eligibilityPercentage}% Eligible</h3>
                      <p className="text-sm text-muted-foreground">Approval Probability: {eligibility.approvalProbability}%</p>
                    </div>
                    <Separator className="my-4" />
                    <div className="grid grid-cols-2 gap-4">
                      <div><p className="text-xs text-muted-foreground">Max Loan Amount</p><p className="font-semibold">R {eligibility.maximumLoanAmount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</p></div>
                      <div><p className="text-xs text-muted-foreground">Interest Rate</p><p className="font-semibold">{eligibility.estimatedInterestRate}%</p></div>
                      <div><p className="text-xs text-muted-foreground">Monthly Installment</p><p className="font-semibold">R {eligibility.monthlyInstallment.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</p></div>
                      <div><p className="text-xs text-muted-foreground">Processing Time</p><p className="font-semibold">{eligibility.estimatedProcessingTime}</p></div>
                    </div>
                    <Separator className="my-4" />
                    <div><p className="text-xs font-medium text-muted-foreground mb-2">Required Documents</p>
                      <div className="flex flex-wrap gap-2">{eligibility.requiredDocuments.map(d => <Badge key={d} variant="secondary">{d}</Badge>)}</div>
                    </div>
                  </CardContent></Card>
                  <RippleButton variant="gradient" className="w-full" onClick={() => { setApplyOpen(true); setApplyStep(1) }}>
                    <ArrowRight className="mr-2 h-4 w-4" /> Proceed to Apply
                  </RippleButton>
                </>
              ) : (
                <Card><CardContent className="py-12 text-center text-muted-foreground">
                  <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">Check your eligibility</p>
                  <p className="text-sm">Fill in the details and click &quot;Check Eligibility&quot;</p>
                </CardContent></Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ===== CALCULATOR TAB ===== */}
        <TabsContent value="calculator" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5" /> Loan Calculator</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between"><Label>Loan Amount: R {calcAmount.toLocaleString()}</Label></div>
                  <Slider min={1000} max={5000000} step={1000} value={[calcAmount]} onValueChange={v => setCalcAmount(v[0])} />
                  <div className="flex justify-between text-xs text-muted-foreground"><span>R 1,000</span><span>R 5,000,000</span></div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between"><Label>Interest Rate: {calcRate}%</Label></div>
                  <Slider min={1} max={35} step={0.1} value={[calcRate]} onValueChange={v => setCalcRate(v[0])} />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between"><Label>Duration: {calcDuration} months</Label></div>
                  <Slider min={1} max={120} step={1} value={[calcDuration]} onValueChange={v => setCalcDuration(v[0])} />
                </div>
                <div className="space-y-2"><Label>Payment Frequency</Label>
                  <div className="flex gap-2">
                    {["monthly", "bi-weekly", "weekly"].map(f => (
                      <Button key={f} variant={calcFreq === f ? "default" : "outline"} size="sm" onClick={() => setCalcFreq(f)} className="flex-1">
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {calculator && (
                <>
                  <Card>
                    <CardContent className="p-6 space-y-4">
                      <div className="text-center p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5">
                        <p className="text-sm text-muted-foreground">Monthly Repayment</p>
                        <p className="text-3xl font-bold">R {calculator.monthlyRepayment.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="p-2 rounded-lg bg-muted/50"><p className="text-xs text-muted-foreground">Total</p><p className="text-sm font-semibold">R {calculator.totalRepayment.toLocaleString("en-ZA", { minimumFractionDigits: 0 })}</p></div>
                        <div className="p-2 rounded-lg bg-muted/50"><p className="text-xs text-muted-foreground">Interest</p><p className="text-sm font-semibold">R {calculator.totalInterest.toLocaleString("en-ZA", { minimumFractionDigits: 0 })}</p></div>
                        <div className="p-2 rounded-lg bg-muted/50"><p className="text-xs text-muted-foreground">Fee</p><p className="text-sm font-semibold">R {calculator.processingFee.toLocaleString("en-ZA", { minimumFractionDigits: 0 })}</p></div>
                      </div>
                      <Separator />
                      <div className="grid grid-cols-2 gap-3">
                        <div><p className="text-xs text-muted-foreground">Insurance</p><p className="text-sm font-semibold">R {calculator.insurance.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</p></div>
                        <div><p className="text-xs text-muted-foreground">Early Settlement</p><p className="text-sm font-semibold">R {calculator.earlySettlementAmount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</p></div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Repayment Schedule</CardTitle></CardHeader>
                    <CardContent className="max-h-48 overflow-y-auto space-y-1">
                      {calculator.repaymentSchedule.slice(0, 12).map(item => (
                        <div key={item.paymentNumber} className="flex justify-between text-xs py-1 border-b border-muted/30 last:border-0">
                          <span>#{item.paymentNumber}</span>
                          <span>R {item.total.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</span>
                          <span className="text-muted-foreground">{new Date(item.dueDate).toLocaleDateString()}</span>
                        </div>
                      ))}
                      {calculator.repaymentSchedule.length > 12 && <p className="text-xs text-center text-muted-foreground">+{calculator.repaymentSchedule.length - 12} more payments</p>}
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>

          {calculator && calculator.repaymentSchedule.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Repayment Graph</CardTitle></CardHeader>
              <CardContent>
                <div className="h-48 flex items-end gap-1">
                  {calculator.repaymentSchedule.slice(0, 24).map(item => {
                    const maxTotal = Math.max(...calculator.repaymentSchedule.slice(0, 24).map(i => i.total))
                    const height = (item.total / maxTotal) * 100
                    return (
                      <div key={item.paymentNumber} className="flex-1 flex flex-col items-center gap-1 group relative">
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 border shadow-sm">
                          R {item.total.toLocaleString()}
                        </div>
                        <div className="w-full rounded-t bg-gradient-to-t from-primary/60 to-primary/30 transition-all hover:from-primary/80"
                          style={{ height: `${height}%` }} />
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ===== CREDIT SCORE TAB ===== */}
        <TabsContent value="credit-score" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground mb-4">Your Credit Score</p>
                <ScoreGauge score={creditScore?.score ?? 600} />
                <Badge variant="outline" className="mt-4 text-base px-4 py-1">{creditScore?.rating ?? "Good"}</Badge>
                {creditScore?.nextMilestone && (
                  <div className="mt-4 p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Next Milestone</p>
                    <p className="text-sm font-semibold">{creditScore.nextMilestone}</p>
                    <p className="text-xs text-muted-foreground">{creditScore.scoreToNextMilestone} points away</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-sm">Score History</CardTitle></CardHeader>
              <CardContent>
                <div className="h-48 relative">
                  {creditScore?.history && creditScore.history.length > 0 && (
                    <svg className="w-full h-full" viewBox={`0 0 ${creditScore.history.length * 40} 180`} preserveAspectRatio="none">
                      <polyline fill="none" stroke="hsl(var(--primary))" strokeWidth="2"
                        points={creditScore.history.map((h, i) => `${i * 40 + 20},${180 - ((h.score - 300) / 700) * 160}`).join(" ")} />
                      {creditScore.history.map((h, i) => (
                        <circle key={i} cx={i * 40 + 20} cy={180 - ((h.score - 300) / 700) * 160} r="3" fill="hsl(var(--primary))" />
                      ))}
                    </svg>
                  )}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  {creditScore?.history.filter((_, i) => i % 3 === 0 || i === creditScore.history.length - 1).map(h => <span key={h.date}>{h.date}</span>)}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-sm">Factors Affecting Your Score</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {creditScore?.factors.map(f => (
                  <div key={f.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{f.name}</span>
                      <span className={f.status === "excellent" ? "text-emerald-500" : f.status === "good" ? "text-blue-500" : "text-yellow-500"}>
                        {f.score}/{f.maxScore}
                      </span>
                    </div>
                    <Progress value={(f.score / f.maxScore) * 100} className="h-2" />
                    {f.tip && <p className="text-xs text-muted-foreground mt-1">{f.tip}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Recommendations</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {creditScore?.recommendations.map(r => (
                  <div key={r.title} className="p-3 rounded-lg bg-muted/50 flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{r.title}</p>
                      <p className="text-xs text-muted-foreground">{r.description}</p>
                      <Badge variant={r.impact === "high" ? "default" : "outline"} className="mt-1 text-[10px]">{r.impact} impact</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===== ANALYTICS TAB ===== */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
            {[
              { label: "Total Interest Paid", value: analytics?.totalInterestPaid ?? 0, icon: Percent, color: "text-red-500" },
              { label: "Total Principal Paid", value: analytics?.totalPrincipalPaid ?? 0, icon: DollarSign, color: "text-emerald-500" },
              { label: "Credit Growth", value: analytics?.creditGrowth ?? 0, icon: TrendingUp, color: "text-blue-500" },
              { label: "Loan Utilization", value: analytics?.loanUtilization ?? 0, suffix: "%", icon: PieChart, color: "text-purple-500" },
            ].map(stat => {
              const Icon = stat.icon
              return (
                <Card key={stat.label}>
                  <CardContent className="p-4 text-center">
                    <Icon className={`h-5 w-5 mx-auto mb-2 ${stat.color}`} />
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-lg font-bold">R <AnimatedCounter value={stat.value} decimals={0} />{stat.suffix ?? ""}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4" /> Borrowing History</CardTitle></CardHeader>
              <CardContent>
                <div className="h-48 flex items-end gap-2">
                  {(analytics?.borrowingHistory ?? []).map((item, i) => {
                    const maxVal = Math.max(...(analytics?.borrowingHistory ?? []).map(d => d.value), 1)
                    const h = (item.value / maxVal) * 100
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full rounded-t bg-gradient-to-t from-blue-500/60 to-blue-500/30" style={{ height: `${h}%` }} />
                        <span className="text-[10px] text-muted-foreground rotate-45 origin-left">{item.label}</span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><TrendingDown className="h-4 w-4" /> Repayment Trend</CardTitle></CardHeader>
              <CardContent>
                <div className="h-48 flex items-end gap-2">
                  {(analytics?.repaymentTrend ?? []).map((item, i) => {
                    const maxVal = Math.max(...(analytics?.repaymentTrend ?? []).map(d => d.value), 1)
                    const h = (item.value / maxVal) * 100
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full rounded-t bg-gradient-to-t from-emerald-500/60 to-emerald-500/30" style={{ height: `${h}%` }} />
                        <span className="text-[10px] text-muted-foreground">{item.label}</span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Loan Utilization</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1"><Progress value={analytics?.loanUtilization ?? 0} className="h-4" /></div>
                <span className="text-lg font-bold">{Math.round(analytics?.loanUtilization ?? 0)}%</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== DOCUMENTS TAB ===== */}
        <TabsContent value="documents" className="space-y-4">
          {documents.length === 0 ? (
            <Card><CardContent className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No documents yet</p>
              <p className="text-sm">Documents will appear once you apply for a loan</p>
            </CardContent></Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {documents.map(doc => (
                <Card key={doc.id} className="group hover:shadow-lg transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10"><FileText className="h-5 w-5 text-primary" /></div>
                        <div>
                          <p className="text-sm font-medium">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">{doc.type} • {(doc.size / 1024).toFixed(0)} KB</p>
                        </div>
                      </div>
                      <Badge variant={doc.status === "available" ? "default" : "secondary"} className="text-[10px]">{doc.status}</Badge>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <RippleButton variant="outline" size="sm" className="flex-1"><Eye className="mr-1 h-3 w-3" /> View</RippleButton>
                      <RippleButton variant="outline" size="sm" className="flex-1"><Download className="mr-1 h-3 w-3" /> Download</RippleButton>
                      <RippleButton variant="outline" size="sm"><Share2 className="h-3 w-3" /></RippleButton>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ===== NOTIFICATIONS TAB ===== */}
        <TabsContent value="notifications" className="space-y-3">
          {notifications.length === 0 ? (
            <Card><CardContent className="text-center py-12 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No notifications</p>
              <p className="text-sm">Stay tuned for updates on your loans</p>
            </CardContent></Card>
          ) : (
            notifications.map(n => (
              <motion.div key={n.id} variants={itemVariants} initial="hidden" animate="visible">
                <Card className={`hover:shadow-md transition-all ${!n.read ? "border-l-4 border-l-primary" : ""}`}>
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className={`p-2 rounded-full shrink-0 ${
                      n.type === "success" ? "bg-emerald-500/10" : n.type === "warning" ? "bg-yellow-500/10" : "bg-blue-500/10"
                    }`}>
                      {n.type === "success" ? <CheckCircle className="h-4 w-4 text-emerald-500" /> :
                       n.type === "warning" ? <AlertTriangle className="h-4 w-4 text-yellow-500" /> :
                       <Info className="h-4 w-4 text-blue-500" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-muted-foreground">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* ===== APPLY LOAN WIZARD ===== */}
      <Dialog open={applyOpen} onOpenChange={v => { setApplyOpen(v); if (!v) setApplyStep(1) }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {applyStep === 1 ? "Choose Loan Type" : applyStep === 2 ? "Personal Details" : applyStep === 3 ? "Financial Information" :
               applyStep === 4 ? "Upload Documents" : applyStep === 5 ? "Review & Submit" : "Application Submitted"}
            </DialogTitle>
            <div className="flex gap-1 mt-2">
              {[1,2,3,4,5,6].map(s => (
                <div key={s} className={`flex-1 h-1.5 rounded-full ${s <= applyStep ? "bg-primary" : s === applyStep + 1 ? "bg-primary/30" : "bg-muted"}`} />
              ))}
            </div>
          </DialogHeader>

          {applyStep === 1 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {loanTypes.map(type => {
                const Icon = type.icon
                return (
                  <motion.button key={type.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={() => { setApplyData(d => ({ ...d, loanType: type.id })); setApplyStep(2) }}
                    className={`p-4 rounded-xl border text-left transition-all hover:shadow-lg ${
                      applyData.loanType === type.id ? "border-primary ring-2 ring-primary/20" : "border-border"
                    }`}>
                    <div className={`p-2 rounded-lg w-fit bg-gradient-to-br ${type.gradient} text-white mb-2`}><Icon className="h-5 w-5" /></div>
                    <p className="text-sm font-medium">{type.label}</p>
                  </motion.button>
                )
              })}
            </div>
          )}

          {applyStep === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Full Name</Label><Input value={applyData.fullName} onChange={e => setApplyData(d => ({ ...d, fullName: e.target.value }))} placeholder="John Doe" /></div>
                <div className="space-y-2"><Label>ID Number</Label><Input value={applyData.idNumber} onChange={e => setApplyData(d => ({ ...d, idNumber: e.target.value }))} placeholder="0000000000000" /></div>
                <div className="space-y-2"><Label>Phone</Label><Input value={applyData.phone} onChange={e => setApplyData(d => ({ ...d, phone: e.target.value }))} placeholder="+27 00 000 0000" /></div>
                <div className="space-y-2"><Label>Email</Label><Input value={applyData.email} onChange={e => setApplyData(d => ({ ...d, email: e.target.value }))} placeholder="john@example.com" /></div>
                <div className="space-y-2 col-span-2"><Label>Address</Label><Textarea value={applyData.address} onChange={e => setApplyData(d => ({ ...d, address: e.target.value }))} placeholder="Your residential address" /></div>
                <div className="space-y-2"><Label>Employment</Label><Select><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="employed">Employed</SelectItem><SelectItem value="self">Self-Employed</SelectItem><SelectItem value="business">Business</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>Employer</Label><Input value={applyData.employer} onChange={e => setApplyData(d => ({ ...d, employer: e.target.value }))} placeholder="Company name" /></div>
                <div className="space-y-2 col-span-2"><Label>Monthly Income (ZAR)</Label><Input type="number" value={applyData.monthlyIncome} onChange={e => setApplyData(d => ({ ...d, monthlyIncome: e.target.value }))} placeholder="e.g. 50000" /></div>
              </div>
              <div className="flex justify-between">
                <RippleButton variant="outline" onClick={() => setApplyStep(1)}><ChevronLeft className="mr-2 h-4 w-4" /> Back</RippleButton>
                <RippleButton variant="gradient" onClick={() => setApplyStep(3)}>Next <ChevronRight className="ml-2 h-4 w-4" /></RippleButton>
              </div>
            </div>
          )}

          {applyStep === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Bank</Label><Select><SelectTrigger><SelectValue placeholder="Select bank" /></SelectTrigger><SelectContent>
                  {["ABSA", "Capitec", "FNB", "Nedbank", "Standard Bank", "Bank Zero", "TymeBank"].map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent></Select></div>
                <div className="space-y-2"><Label>Monthly Expenses</Label><Input type="number" value={applyData.monthlyExpenses} onChange={e => setApplyData(d => ({ ...d, monthlyExpenses: e.target.value }))} placeholder="e.g. 15000" /></div>
                <div className="space-y-2"><Label>Existing Loans</Label><Input type="number" value={applyData.existingLoans} onChange={e => setApplyData(d => ({ ...d, existingLoans: e.target.value }))} placeholder="e.g. 50000" /></div>
                <div className="space-y-2"><Label>Assets</Label><Input type="number" value={applyData.assets} onChange={e => setApplyData(d => ({ ...d, assets: e.target.value }))} placeholder="e.g. 500000" /></div>
                <div className="space-y-2"><Label>Liabilities</Label><Input type="number" value={applyData.liabilities} onChange={e => setApplyData(d => ({ ...d, liabilities: e.target.value }))} placeholder="e.g. 100000" /></div>
                <div className="space-y-2"><Label>Credit History</Label><Select><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="excellent">Excellent</SelectItem><SelectItem value="good">Good</SelectItem><SelectItem value="fair">Fair</SelectItem><SelectItem value="poor">Poor</SelectItem></SelectContent></Select></div>
              </div>
              <div className="flex justify-between">
                <RippleButton variant="outline" onClick={() => setApplyStep(2)}><ChevronLeft className="mr-2 h-4 w-4" /> Back</RippleButton>
                <RippleButton variant="gradient" onClick={() => setApplyStep(4)}>Next <ChevronRight className="ml-2 h-4 w-4" /></RippleButton>
              </div>
            </div>
          )}

          {applyStep === 4 && (
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium">Drag & drop files here</p>
                <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { name: "ID Document", icon: FileText }, { name: "Proof of Address", icon: FileText },
                  { name: "Payslip", icon: FileText }, { name: "Bank Statement", icon: FileText },
                  { name: "Company Registration", icon: FileText }, { name: "Tax Clearance", icon: FileText },
                  { name: "Financial Statements", icon: FileText },
                ].map(doc => (
                  <div key={doc.name} className="flex items-center gap-2 p-2 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                    <doc.icon className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-xs">{doc.name}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between">
                <RippleButton variant="outline" onClick={() => setApplyStep(3)}><ChevronLeft className="mr-2 h-4 w-4" /> Back</RippleButton>
                <RippleButton variant="gradient" onClick={() => setApplyStep(5)}>Next <ChevronRight className="ml-2 h-4 w-4" /></RippleButton>
              </div>
            </div>
          )}

          {applyStep === 5 && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5">
                <div className="flex justify-between text-sm"><span>Loan Type</span><span className="font-medium capitalize">{applyData.loanType || "Personal"}</span></div>
                <Separator className="my-2" />
                <div className="flex justify-between text-sm"><span>Loan Amount</span><span className="font-medium">R {applyData.monthlyIncome ? (parseInt(applyData.monthlyIncome) * 3).toLocaleString() : "To be calculated"}</span></div>
                <Separator className="my-2" />
                <div className="flex justify-between text-sm"><span>Interest Rate</span><span className="font-medium">12.5%</span></div>
                <Separator className="my-2" />
                <div className="flex justify-between text-sm"><span>Repayment</span><span className="font-medium">24 months</span></div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2"><Switch id="terms" checked={applyData.agreeTerms} onCheckedChange={v => setApplyData(d => ({ ...d, agreeTerms: v }))} /><Label htmlFor="terms" className="text-sm">I accept the Terms & Conditions</Label></div>
                <div className="flex items-center gap-2"><Switch id="privacy" checked={applyData.agreePrivacy} onCheckedChange={v => setApplyData(d => ({ ...d, agreePrivacy: v }))} /><Label htmlFor="privacy" className="text-sm">I accept the Privacy Policy</Label></div>
              </div>
              <div className="flex justify-between">
                <RippleButton variant="outline" onClick={() => setApplyStep(4)}><ChevronLeft className="mr-2 h-4 w-4" /> Back</RippleButton>
                <RippleButton variant="gradient" onClick={handleApplySubmit} disabled={!applyData.agreeTerms || !applyData.agreePrivacy}>
                  <Check className="mr-2 h-4 w-4" /> Submit Application
                </RippleButton>
              </div>
            </div>
          )}

          {applyStep === 6 && (
            <div className="text-center py-8">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}>
                <div className="p-4 rounded-full bg-emerald-500/10 w-fit mx-auto mb-4">
                  <CheckCircle className="h-12 w-12 text-emerald-500" />
                </div>
              </motion.div>
              <h3 className="text-xl font-bold mb-2">Application Submitted!</h3>
              <p className="text-sm text-muted-foreground mb-4">Your loan application is being reviewed</p>
              <div className="p-4 rounded-lg bg-muted/50 mb-4">
                <p className="text-xs text-muted-foreground">Reference Number</p>
                <p className="text-lg font-mono font-bold">LN-{Date.now().toString(36).toUpperCase()}</p>
              </div>
              <Badge variant="outline" className="mb-2">Status: Pending Review</Badge>
              <p className="text-xs text-muted-foreground mb-4">Estimated review time: 2-4 hours</p>
              <div className="flex gap-2 justify-center">
                <RippleButton variant="gradient" onClick={() => { setApplyOpen(false); setApplyStep(1); fetchAll() }}>Track Application</RippleButton>
                <RippleButton variant="outline" onClick={() => { setApplyOpen(false); setApplyStep(1); fetchAll() }}>Back to Dashboard</RippleButton>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== LOAN DETAILS SIDEBAR ===== */}
      <Dialog open={!!selectedLoan} onOpenChange={v => { if (!v) setSelectedLoan(null) }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          {loanDetails && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="capitalize">{loanDetails.loanType || "Personal"} Loan - R {loanDetails.amount.toLocaleString()}</DialogTitle>
                    <p className="text-sm text-muted-foreground">Loan ID: {loanDetails.id}</p>
                  </div>
                  <Badge variant={loanDetails.status === "active" ? "default" : loanDetails.status === "paid" ? "secondary" : "outline"} className="text-sm px-3 py-1">
                    {loanDetails.status.replace("_", " ")}
                  </Badge>
                </div>
              </DialogHeader>

              <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 mb-4">
                <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Amount</p><p className="font-bold">R {loanDetails.amount.toLocaleString()}</p></CardContent></Card>
                <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Interest</p><p className="font-bold">{loanDetails.interestRate}%</p></CardContent></Card>
                <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Balance</p><p className="font-bold">R {loanDetails.balance.toLocaleString()}</p></CardContent></Card>
                <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Monthly</p><p className="font-bold">R {loanDetails.monthlyPayment.toLocaleString()}</p></CardContent></Card>
              </div>

              <div className="space-y-4">
                <div><h4 className="text-sm font-semibold mb-2">Loan Progress</h4>
                  <Progress value={loanDetails.amount > 0 ? (loanDetails.paidAmount / loanDetails.amount) * 100 : 0} className="h-3" />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>R {loanDetails.paidAmount.toLocaleString()} paid</span>
                    <span>R {loanDetails.balance.toLocaleString()} remaining</span>
                  </div>
                </div>

                <div><h4 className="text-sm font-semibold mb-2">Repayment Schedule</h4>
                  <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg p-2">
                    {repaymentSchedule.map(item => (
                      <div key={item.paymentNumber} className="flex items-center justify-between text-xs py-1.5 border-b border-muted/30 last:border-0">
                        <span className="font-medium">#{item.paymentNumber}</span>
                        <span>{new Date(item.dueDate).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}</span>
                        <span>R {item.principal.toLocaleString()}</span>
                        <span>R {item.interest.toLocaleString()}</span>
                        <Badge variant={item.status === "paid" ? "secondary" : item.status === "missed" ? "destructive" : "outline"} className="text-[10px]">{item.status}</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <RippleButton variant="gradient" className="flex-1" onClick={() => {
                    setPaymentLoan(loanDetails)
                    setPaymentAmount(loanDetails.monthlyPayment)
                    setPaymentOpen(true)
                    setPaymentStep("amount")
                  }}>
                    <Wallet className="mr-2 h-4 w-4" /> Pay Now
                  </RippleButton>
                  <RippleButton variant="outline"><Download className="mr-2 h-4 w-4" /> Receipt</RippleButton>
                  <RippleButton variant="outline"><Eye className="mr-2 h-4 w-4" /> Details</RippleButton>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== PAYMENT DIALOG ===== */}
      <Dialog open={paymentOpen} onOpenChange={v => { if (!v) setPaymentOpen(false); setPaymentStep("amount") }}>
        <DialogContent className="sm:max-w-md">
          {paymentStep === "amount" && (
            <>
              <DialogHeader><DialogTitle>Make a Payment</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Payment for Loan</p>
                  <p className="font-medium">R {paymentLoan?.amount.toLocaleString()}</p>
                </div>
                <div className="space-y-2"><Label>Amount</Label><Input type="number" value={paymentAmount || ""} onChange={e => setPaymentAmount(parseFloat(e.target.value) || 0)} /></div>
                <div className="space-y-2"><Label>Payment Method</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[{ id: "wallet", label: "Wallet", icon: Wallet }, { id: "transfer", label: "Bank Transfer", icon: Building2 },
                      { id: "card", label: "Debit Card", icon: CreditCard }, { id: "eft", label: "Instant EFT", icon: Zap },
                    ].map(m => {
                      const MIcon = m.icon
                      return (
                        <button key={m.id} onClick={() => setPaymentMethod(m.id)}
                          className={`flex items-center gap-2 p-3 rounded-lg border text-sm transition-all ${
                            paymentMethod === m.id ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "hover:bg-muted/50"
                          }`}>
                          <MIcon className="h-4 w-4" />{m.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <RippleButton variant="gradient" className="w-full" onClick={handlePayLoan}>
                  Pay R {(paymentAmount || paymentLoan?.monthlyPayment || 0).toLocaleString()}
                </RippleButton>
              </div>
            </>
          )}
          {paymentStep === "otp" && (
            <>
              <DialogHeader><DialogTitle>Verify Payment</DialogTitle><DialogDescription>Enter the OTP sent to your phone</DialogDescription></DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2 justify-center">
                  {[0,1,2,3,4,5].map(i => <Input key={i} className="w-12 h-14 text-center text-lg" maxLength={1} />)}
                </div>
                <RippleButton variant="gradient" className="w-full" onClick={handlePayLoan}>
                  <Lock className="mr-2 h-4 w-4" /> Verify & Pay
                </RippleButton>
              </div>
            </>
          )}
          {paymentStep === "success" && (
            <div className="text-center py-8">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}><CheckCircle className="h-16 w-16 mx-auto mb-4 text-emerald-500" /></motion.div>
              <h3 className="text-lg font-bold mb-2">Payment Successful!</h3>
              <p className="text-sm text-muted-foreground mb-4">Your payment has been processed</p>
              <div className="p-4 rounded-lg bg-muted/50 mb-4">
                <p className="text-xs text-muted-foreground">Amount Paid</p>
                <p className="text-xl font-bold">R {(paymentAmount || paymentLoan?.monthlyPayment || 0).toLocaleString()}</p>
              </div>
              <RippleButton variant="gradient" className="w-full" onClick={() => { setPaymentOpen(false); setPaymentStep("amount"); fetchAll() }}>Done</RippleButton>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== SUPPORT DIALOG ===== */}
      <Dialog open={supportOpen} onOpenChange={setSupportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Loan Support</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <RippleButton variant="outline" className="w-full justify-start h-12"><MessageCircle className="mr-3 h-5 w-5" /> Chat with Loan Officer</RippleButton>
            <RippleButton variant="outline" className="w-full justify-start h-12"><Phone className="mr-3 h-5 w-5" /> Request Callback</RippleButton>
            <RippleButton variant="outline" className="w-full justify-start h-12"><Upload className="mr-3 h-5 w-5" /> Upload Documents</RippleButton>
            <RippleButton variant="outline" className="w-full justify-start h-12"><Calendar className="mr-3 h-5 w-5" /> Schedule Meeting</RippleButton>
            <RippleButton variant="outline" className="w-full justify-start h-12"><AlertTriangle className="mr-3 h-5 w-5" /> Dispute Loan</RippleButton>
            <Separator />
            <RippleButton variant="gradient" className="w-full">View Support Tickets</RippleButton>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== FIXED SUPPORT FAB ===== */}
      <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1 }}
        onClick={() => setSupportOpen(true)}
        className="fixed bottom-6 right-6 p-4 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-110 transition-all z-50">
        <HelpCircle className="h-6 w-6" />
      </motion.button>
    </motion.div>
  )
}
