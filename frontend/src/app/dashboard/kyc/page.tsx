"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { kycApi, type KycStatusInfo } from "@/lib/api"
import { useAuthStore } from "@/stores/use-auth-store"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { motion } from "framer-motion"
import {
  Shield, ShieldCheck, ShieldAlert, IdCard, MapPin, Phone,
  Mail, Camera, Building2, Landmark, Receipt, ArrowRight,
  CheckCircle2, Clock, AlertCircle, XCircle, Loader2, WifiOff, Lock
} from "lucide-react"

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  completed: { label: "Verified", color: "text-green-500 bg-green-500/10 border-green-500/20", icon: <CheckCircle2 className="h-4 w-4" /> },
  pending: { label: "Pending", color: "text-muted-foreground bg-muted/50 border-border", icon: <Clock className="h-4 w-4" /> },
  rejected: { label: "Rejected", color: "text-red-500 bg-red-500/10 border-red-500/20", icon: <XCircle className="h-4 w-4" /> },
  verified: { label: "Verified", color: "text-green-500 bg-green-500/10 border-green-500/20", icon: <CheckCircle2 className="h-4 w-4" /> },
  locked: { label: "Locked", color: "text-muted-foreground bg-muted/50 border-border", icon: <Lock className="h-4 w-4" /> },
}

const VERIFICATION_STEPS = [
  { key: "identityStatus", label: "Identity Verification", icon: <IdCard className="h-5 w-5" />, desc: "Government ID verification" },
  { key: "addressStatus", label: "Address Verification", icon: <MapPin className="h-5 w-5" />, desc: "Proof of residence" },
  { key: "phoneStatus", label: "Phone Verification", icon: <Phone className="h-5 w-5" />, desc: "Phone number confirmation" },
  { key: "emailStatus", label: "Email Verification", icon: <Mail className="h-5 w-5" />, desc: "Email address confirmation" },
  { key: "selfieStatus", label: "Selfie Verification", icon: <Camera className="h-5 w-5" />, desc: "Live photo verification" },
  { key: "businessStatus", label: "Business Verification", icon: <Building2 className="h-5 w-5" />, desc: "Business/KYB verification" },
  { key: "bankStatus", label: "Bank Verification", icon: <Landmark className="h-5 w-5" />, desc: "Bank account verification" },
  { key: "taxStatus", label: "Tax Verification", icon: <Receipt className="h-5 w-5" />, desc: "Tax information verification" },
]

export default function KycDashboardPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [status, setStatus] = useState<KycStatusInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    kycApi.getStatus()
      .then((res) => { setStatus(res); setLoading(false) })
      .catch(() => { setError("Could not connect to verification service. Make sure the backend server is running."); setLoading(false) })
  }, [])

  const startApplication = async () => {
    setStarting(true)
    try {
      const res = await kycApi.start(user?.role === "business" ? "business" : "individual")
      setStatus(res)
    } catch { /* ignore */ }
    setStarting(false)
  }

  if (loading) return (
    <div className="space-y-6">
      <div className="h-8 bg-muted rounded w-48 animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="glass-card rounded-2xl p-6 animate-pulse"><div className="h-4 bg-muted rounded w-24 mb-3" /><div className="h-12 bg-muted rounded-xl" /></div>)}
      </div>
    </div>
  )

  if (error) return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold gradient-text">Identity Verification</h1>
      <div className="glass-card rounded-2xl p-8 text-center">
        <div className="h-16 w-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
          <WifiOff className="h-8 w-8 text-amber-500" />
        </div>
        <h2 className="text-xl font-bold mb-2">Backend Not Connected</h2>
        <p className="text-muted-foreground max-w-md mx-auto">{error}</p>
        <p className="text-sm text-muted-foreground mt-2">Start the .NET backend server locally, or deploy it and update <code className="text-primary">NEXT_PUBLIC_API_URL</code>.</p>
      </div>
    </div>
  )

  const appStatus = status?.status || "not_started"
  const isVerified = user?.kycStatus === "verified" || appStatus === "approved"
  const isRejected = user?.kycStatus === "rejected" || appStatus === "rejected"
  const underReview = appStatus === "under_review" || (appStatus === "pending" && status?.submittedAt)
  const needsInfo = appStatus === "additional_info"
  const inProgress = ["pending", "under_review", "additional_info"].includes(appStatus)

  const getStepStatus = (key: string) => {
    if (!status) return "pending"
    const step = status[key as keyof KycStatusInfo] as { status: string } | undefined
    return step?.status || "pending"
  }

  const statusCopy = () => {
    if (isVerified) return { title: "Verification Complete", desc: "You have full access to all PayAfrika features.", icon: <ShieldCheck className="h-8 w-8 text-green-500" /> }
    if (isRejected) return { title: "Verification Rejected", desc: status?.reason || "Your verification was not approved. Please review the reason and re-apply.", icon: <ShieldAlert className="h-8 w-8 text-red-500" /> }
    if (needsInfo) return { title: "Additional Information Required", desc: status?.reason || "Our team needs more information to complete your verification. Please re-submit the requested documents.", icon: <AlertCircle className="h-8 w-8 text-amber-500" /> }
    if (underReview) return { title: "Verification Under Review", desc: "Your documents have been received and are being reviewed. Estimated time: 24-48 hours.", icon: <Clock className="h-8 w-8 text-primary" /> }
    if (inProgress) return { title: "Verification In Progress", desc: "Complete the remaining steps below to finish your verification.", icon: <Shield className="h-8 w-8 text-primary" /> }
    return { title: "Verify Your Identity", desc: "Complete a few steps to verify your identity and unlock higher limits and more features.", icon: <Shield className="h-8 w-8 text-primary" /> }
  }

  const copy = statusCopy()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Identity Verification</h1>
          <p className="text-muted-foreground">Verify your identity to unlock all PayAfrika features</p>
        </div>
        <div className="flex items-center gap-2">
          {status && status.level > 0 && (
            <Badge className="bg-primary/10 text-primary border-primary/20 text-sm px-4 py-2">
              <ShieldCheck className="h-4 w-4 mr-1" /> Level {status.level} Verified
            </Badge>
          )}
          {isVerified && (
            <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-sm px-4 py-2">
              <ShieldCheck className="h-4 w-4 mr-1" /> Fully Verified
            </Badge>
          )}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-6"
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            {copy.icon}
            <div>
              <h3 className="font-semibold text-lg">{copy.title}</h3>
              <p className="text-sm text-muted-foreground max-w-xl">{copy.desc}</p>
              {status?.escalated && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <ShieldAlert className="h-3.5 w-3.5" /> Your application has been escalated for compliance review.
                </p>
              )}
            </div>
          </div>
          {!isVerified && !inProgress && (
            <Button variant="gradient" size="lg" onClick={startApplication} disabled={starting}>
              {starting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Shield className="h-5 w-5 mr-2" />}
              {starting ? "Starting..." : "Start Verification"}
            </Button>
          )}
          {(inProgress || isRejected) && !isVerified && (
            <Button variant="gradient" size="lg" onClick={() => router.push("/dashboard/kyc/verify")}>
              {isRejected || needsInfo ? "Re-apply" : "Continue"} <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>

        {inProgress && (
          <div className="space-y-2 mt-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-medium">{status?.overallProgress || 0}%</span>
            </div>
            <Progress value={status?.overallProgress || 0} className="h-2" />
          </div>
        )}
      </motion.div>

      <div>
        <h3 className="font-semibold mb-3">Verification Levels</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(status?.levels && status.levels.length > 0 ? status.levels : []).map((level, i) => {
            const cfg = STATUS_CONFIG[level.status] || STATUS_CONFIG.locked
            return (
              <motion.div
                key={level.level}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card rounded-2xl p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${level.status === "completed" ? "gradient-bg text-white" : "bg-muted text-muted-foreground"}`}>
                    {level.status === "completed" ? <ShieldCheck className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                  </div>
                  <Badge className={`${cfg.color} text-xs`}>
                    {cfg.icon} {cfg.label}
                  </Badge>
                </div>
                <h4 className="font-medium text-sm">Level {level.level} — {level.name}</h4>
                <p className="text-xs text-muted-foreground mt-1">{level.description}</p>
              </motion.div>
            )
          })}
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-3">Verification Steps</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {VERIFICATION_STEPS.map((step, i) => {
            const stepStatus = getStepStatus(step.key)
            const config = STATUS_CONFIG[stepStatus] || STATUS_CONFIG.pending

            return (
              <motion.div
                key={step.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card rounded-2xl p-5 hover:shadow-card-hover transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${stepStatus === "completed" || stepStatus === "verified" ? "gradient-bg text-white" : "bg-muted text-muted-foreground"}`}>
                    {step.icon}
                  </div>
                  <Badge className={`${config.color} text-xs`}>
                    {config.icon} {config.label}
                  </Badge>
                </div>
                <h4 className="font-medium text-sm">{step.label}</h4>
                <p className="text-xs text-muted-foreground mt-1">{step.desc}</p>
              </motion.div>
            )
          })}
        </div>
      </div>

      {status && status.timeline.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-6"
        >
          <h3 className="font-semibold mb-4">Verification Timeline</h3>
          <div className="space-y-3">
            {status.timeline.map((event, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />
                <div>
                  <p className="text-sm font-medium">{event.description}</p>
                  <p className="text-xs text-muted-foreground">{new Date(event.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <div className="glass-card rounded-2xl p-6">
        <h3 className="font-semibold mb-4">Benefits of Verification</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: <ArrowRight className="h-5 w-5" />, title: "Higher Limits", desc: "Increase your transaction and withdrawal limits" },
            { icon: <ArrowRight className="h-5 w-5" />, title: "Faster Payouts", desc: "Get your money faster with priority processing" },
            { icon: <ArrowRight className="h-5 w-5" />, title: "Full Access", desc: "Unlock all PayAfrika features and services" },
          ].map((benefit, i) => (
            <div key={i} className="flex items-start gap-3 p-3 glass rounded-xl">
              <div className="h-8 w-8 rounded-lg gradient-bg flex items-center justify-center text-white shrink-0">
                {benefit.icon}
              </div>
              <div>
                <p className="font-medium text-sm">{benefit.title}</p>
                <p className="text-xs text-muted-foreground">{benefit.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
