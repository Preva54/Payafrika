"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { kycApi, type KycStatusInfo, type KycDocumentInfo, type KycCountryConfig } from "@/lib/api"
import { useAuthStore } from "@/stores/use-auth-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { motion, AnimatePresence } from "framer-motion"
import {
  Shield, ShieldCheck, ArrowRight, ArrowLeft, Check, Camera,
  IdCard, MapPin, FileText, Loader2, AlertCircle, CheckCircle2,
  Clock, User, XCircle, PartyPopper
} from "lucide-react"

const DOC_TYPE_LABELS: Record<string, string> = {
  national_id: "National ID",
  passport: "Passport",
  drivers_license: "Driver's License",
  utility_bill: "Utility Bill",
  bank_statement: "Bank Statement",
  government_letter: "Government Letter",
  lease_agreement: "Lease Agreement",
}

const STEPS = [
  { id: "welcome", label: "Welcome", icon: <Shield className="h-5 w-5" /> },
  { id: "personal", label: "Personal Info", icon: <User className="h-5 w-5" /> },
  { id: "identity", label: "Identity Document", icon: <IdCard className="h-5 w-5" /> },
  { id: "selfie", label: "Selfie", icon: <Camera className="h-5 w-5" /> },
  { id: "address", label: "Address", icon: <MapPin className="h-5 w-5" /> },
  { id: "review", label: "Review & Submit", icon: <Check className="h-5 w-5" /> },
]

type DocsMap = Record<string, { info?: KycDocumentInfo; preview?: string }>

export default function KycVerifyPage() {
  const router = useRouter()
  const { user, fetchUser } = useAuthStore()
  const [step, setStep] = useState(0)
  const [status, setStatus] = useState<KycStatusInfo | null>(null)
  const [countryConfig, setCountryConfig] = useState<KycCountryConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [confirmed, setConfirmed] = useState(false)

  const [form, setForm] = useState({
    firstName: "", middleName: "", lastName: "", dateOfBirth: "",
    gender: "", nationality: "", countryOfResidence: "",
    phoneCountryCode: "", residentialAddress: "", province: "", city: "", postalCode: "",
  })

  const [docs, setDocs] = useState<DocsMap>({})
  const [uploading, setUploading] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      kycApi.getStatus(),
      kycApi.getDocuments(),
      kycApi.getCountryConfig(user?.country || undefined),
    ])
      .then(([statusRes, docsRes, config]) => {
        setStatus(statusRes)
        setCountryConfig(config)

        const map: DocsMap = {}
        docsRes.forEach((d) => {
          map[`${d.documentType}:front`] = { info: d }
        })
        setDocs(map)

        const completed = statusRes.completedSteps || []
        const firstIncomplete =
          completed.includes("personal_info") && completed.includes("contact") ? (completed.includes("identity") ? (completed.includes("selfie") ? (completed.includes("address") ? 5 : 4) : 3) : 2) : 1
        setStep(firstIncomplete)
        setLoading(false)
      })
      .catch(() => {
        setError("Could not load your verification status. Please try again.")
        setLoading(false)
      })
  }, [user?.country])

  const update = (key: string, value: string) => setForm({ ...form, [key]: value })

  const uploadFile = useCallback(async (docType: string, side: string, file: File) => {
    const key = `${docType}:${side}`
    setUploading(key)
    setError("")
    try {
      const info = await kycApi.uploadDocument(docType, side, file)
      setDocs((prev) => ({ ...prev, [key]: { info, preview: info.status === "rejected" ? undefined : prev[key]?.preview } }))
      return info
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed"
      setError(msg)
      throw e
    } finally {
      setUploading(null)
    }
  }, [])

  const handleFileSelect = useCallback(async (docType: string, side: string, file: File) => {
    const key = `${docType}:${side}`
    const reader = new FileReader()
    reader.onload = (e) => setDocs((prev) => ({ ...prev, [key]: { ...prev[key], preview: e.target?.result as string } }))
    reader.readAsDataURL(file)
    await uploadFile(docType, side, file)
  }, [uploadFile])

  const saveStep = async () => {
    setError("")
    if (step === 1) {
      if (!form.firstName || !form.lastName || !form.dateOfBirth || !form.gender || !form.nationality || !form.countryOfResidence) {
        setError("Please fill in all required personal information fields.")
        return
      }
      try {
        await kycApi.updatePersonalInfo({
          firstName: form.firstName, middleName: form.middleName, lastName: form.lastName,
          dateOfBirth: form.dateOfBirth, gender: form.gender, nationality: form.nationality,
          countryOfResidence: form.countryOfResidence,
        })
        await kycApi.updateContact({
          phoneCountryCode: form.phoneCountryCode, residentialAddress: form.residentialAddress,
          province: form.province, city: form.city, postalCode: form.postalCode,
        })
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save your information.")
        return
      }
    }

    if (step === STEPS.length - 1) {
      setSubmitting(true)
      try {
        const res = await kycApi.submitForReview()
        await fetchUser()
        setStatus({ ...status!, status: res.status })
        setStep(6)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not submit your application.")
      }
      setSubmitting(false)
      return
    }
    setStep(step + 1)
  }

  const identityTypes = countryConfig?.identityDocumentTypes?.length ? countryConfig.identityDocumentTypes : ["national_id", "passport"]
  const addressTypes = countryConfig?.addressDocumentTypes?.length ? countryConfig.addressDocumentTypes : ["utility_bill", "bank_statement"]
  const backRequired = countryConfig?.identityDocBackRequired ?? false

  const docStatus = (docType: string, side = "front") => docs[`${docType}:${side}`]?.info?.status
  const isUploaded = (s?: string) => s === "ok" || s === "submitted" || s === "pending"
  const allIdentityUploaded = identityTypes.every((t) => isUploaded(docStatus(t))) &&
    (!backRequired || identityTypes.every((t) => isUploaded(docStatus(t, "back"))))
  const selfieUploaded = isUploaded(docStatus("selfie"))
  const addressUploaded = addressTypes.every((t) => isUploaded(docStatus(t)))

  const canContinueFrom = (s: number) => {
    if (s === 2) return allIdentityUploaded
    if (s === 3) return selfieUploaded
    if (s === 4) return addressUploaded
    return true
  }

  const rejectionReason = status?.reason || ""
  const needsResubmit = status?.status === "rejected" || status?.status === "additional_info"

  if (loading) return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="h-8 bg-muted rounded w-48 animate-pulse" />
      <div className="glass-card rounded-2xl p-8 h-64 animate-pulse" />
    </div>
  )

  if (error && !status) return (
    <div className="max-w-2xl mx-auto glass-card rounded-2xl p-8 text-center">
      <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
      <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
      <p className="text-muted-foreground mb-4">{error}</p>
      <Button variant="gradient" onClick={() => router.push("/dashboard/kyc")}>Back to Verification</Button>
    </div>
  )

  const statusText = status?.status || "not_started"

  if (statusText === "approved") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card rounded-2xl p-10 text-center max-w-md">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }} className="h-20 w-20 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="h-10 w-10 text-green-500" />
          </motion.div>
          <h2 className="text-2xl font-bold mb-2">You&apos;re Verified!</h2>
          <p className="text-muted-foreground mb-2">Your identity has been verified at Level {status?.level || 3}. All PayAfrika features are now unlocked.</p>
          <Button variant="gradient" onClick={() => router.push("/dashboard/kyc")}>
            Back to Dashboard
          </Button>
        </motion.div>
      </div>
    )
  }

  if (statusText === "under_review" || (statusText === "pending" && status?.submittedAt)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card rounded-2xl p-10 text-center max-w-md">
          <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Clock className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Under Review</h2>
          <p className="text-muted-foreground mb-2">Your application is being reviewed by our team. Estimated time: 24-48 hours. You&apos;ll receive a notification once it&apos;s complete.</p>
          <Button variant="gradient" onClick={() => router.push("/dashboard/kyc")}>
            Back to Dashboard
          </Button>
        </motion.div>
      </div>
    )
  }

  const progress = (step / (STEPS.length - 1)) * 100

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold">Identity Verification</h1>
          <span className="text-sm text-muted-foreground">Step {Math.min(step + 1, STEPS.length)} of {STEPS.length}</span>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between mt-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className={`text-xs ${i <= step ? "text-primary" : "text-muted-foreground"} ${i === step ? "font-bold" : ""}`}>
              {s.label}
            </div>
          ))}
        </div>
      </div>

      {needsResubmit && (
        <div className="glass rounded-2xl p-4 mb-6 flex items-start gap-3 border-amber-500/20 bg-amber-500/5">
          <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium">Additional information required</p>
            <p className="text-xs text-muted-foreground">{rejectionReason || "Please re-upload the affected document(s) and resubmit your application."}</p>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="glass-card rounded-2xl p-6 md:p-8"
        >
          {step === 0 && (
            <div className="text-center space-y-6">
              <div className="h-20 w-20 rounded-2xl gradient-bg flex items-center justify-center mx-auto">
                <Shield className="h-10 w-10 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Welcome to KYC Verification</h2>
                <p className="text-muted-foreground mt-2">Verify your identity to unlock all PayAfrika features. This takes about 5-10 minutes.</p>
              </div>
              <div className="glass rounded-xl p-4 text-left space-y-2 text-sm">
                {[
                  { icon: <ArrowRight className="h-4 w-4" />, text: "Higher transaction and withdrawal limits" },
                  { icon: <ArrowRight className="h-4 w-4" />, text: "Faster payouts" },
                  { icon: <ArrowRight className="h-4 w-4" />, text: "Access to loans, merchant and international services" },
                  { icon: <ArrowRight className="h-4 w-4" />, text: "Secure account protection" },
                ].map((b, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-primary">{b.icon}</span>
                    <span>{b.text}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" /> Estimated completion: <strong>5-10 minutes</strong>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Personal Information</h2>
              <p className="text-sm text-muted-foreground">Enter your legal name and details as they appear on your ID document.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>First Name *</Label><Input value={form.firstName} onChange={(e) => update("firstName", e.target.value)} className="rounded-xl" /></div>
                <div className="space-y-2"><Label>Middle Name (Optional)</Label><Input value={form.middleName} onChange={(e) => update("middleName", e.target.value)} className="rounded-xl" /></div>
                <div className="space-y-2"><Label>Last Name *</Label><Input value={form.lastName} onChange={(e) => update("lastName", e.target.value)} className="rounded-xl" /></div>
                <div className="space-y-2"><Label>Date of Birth *</Label><Input type="date" value={form.dateOfBirth} onChange={(e) => update("dateOfBirth", e.target.value)} className="rounded-xl" /></div>
                <div className="space-y-2"><Label>Gender *</Label><select className="glass rounded-xl px-3 py-2.5 text-sm w-full" value={form.gender} onChange={(e) => update("gender", e.target.value)}><option value="">Select</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></div>
                <div className="space-y-2"><Label>Nationality *</Label><Input value={form.nationality} onChange={(e) => update("nationality", e.target.value)} className="rounded-xl" /></div>
                <div className="space-y-2"><Label>Country of Residence *</Label><Input value={form.countryOfResidence} onChange={(e) => update("countryOfResidence", e.target.value)} className="rounded-xl" /></div>
                <div className="space-y-2"><Label>Phone Number *</Label><Input value={form.phoneCountryCode} onChange={(e) => update("phoneCountryCode", e.target.value)} placeholder="+2348000000000" className="rounded-xl" /></div>
                <div className="space-y-2 md:col-span-2"><Label>Residential Address *</Label><Input value={form.residentialAddress} onChange={(e) => update("residentialAddress", e.target.value)} className="rounded-xl" /></div>
                <div className="space-y-2"><Label>Province / State</Label><Input value={form.province} onChange={(e) => update("province", e.target.value)} className="rounded-xl" /></div>
                <div className="space-y-2"><Label>City *</Label><Input value={form.city} onChange={(e) => update("city", e.target.value)} className="rounded-xl" /></div>
                <div className="space-y-2"><Label>Postal Code</Label><Input value={form.postalCode} onChange={(e) => update("postalCode", e.target.value)} className="rounded-xl" /></div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Identity Document</h2>
              <p className="text-sm text-muted-foreground">
                Upload a clear photo of one of the accepted documents for {form.countryOfResidence || "your country"}. We accept JPG, PNG, WEBP or PDF (max 10MB).
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {identityTypes.map((docType) => (
                  <div key={docType} className="space-y-3">
                    <UploadZone
                      label={`${DOC_TYPE_LABELS[docType] || docType} — Front`}
                      icon={<IdCard className="h-6 w-6" />}
                      info={docs[`${docType}:front`]?.info}
                      uploading={uploading === `${docType}:front`}
                      onSelect={(f) => handleFileSelect(docType, "front", f)}
                    />
                    {backRequired && (
                      <UploadZone
                        label={`${DOC_TYPE_LABELS[docType] || docType} — Back`}
                        icon={<IdCard className="h-6 w-6" />}
                        info={docs[`${docType}:back`]?.info}
                        uploading={uploading === `${docType}:back`}
                        onSelect={(f) => handleFileSelect(docType, "back", f)}
                      />
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" /> Upload one document. The document must be valid and unexpired.
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Selfie Verification</h2>
              <p className="text-sm text-muted-foreground">Take a live selfie to confirm your identity. Make sure your face is clearly visible and well-lit.</p>
              <UploadZone
                label="Take Selfie"
                icon={<Camera className="h-8 w-8" />}
                info={docs["selfie:front"]?.info}
                uploading={uploading === "selfie:front"}
                onSelect={(f) => handleFileSelect("selfie", "front", f)}
                large
              />
              <div className="glass rounded-xl p-4 text-sm text-muted-foreground">
                <p className="flex items-center gap-2"><AlertCircle className="h-4 w-4" /> Tips for a good selfie:</p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
                  <li>Ensure your face is well-lit</li>
                  <li>Look directly at the camera</li>
                  <li>Remove sunglasses or face coverings</li>
                  <li>Use a plain background</li>
                </ul>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Address Verification</h2>
              <p className="text-sm text-muted-foreground">
                Upload a recent proof of address ({countryConfig?.addressDocMaxAgeMonths || 3} months old at most) showing your full name and address.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {addressTypes.map((docType) => (
                  <UploadZone
                    key={docType}
                    label={DOC_TYPE_LABELS[docType] || docType}
                    icon={<FileText className="h-6 w-6" />}
                    info={docs[`${docType}:front`]?.info}
                    uploading={uploading === `${docType}:front`}
                    onSelect={(f) => handleFileSelect(docType, "front", f)}
                  />
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="h-16 w-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                  <PartyPopper className="h-8 w-8 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold">Review &amp; Submit</h2>
                <p className="text-muted-foreground mt-1 text-sm">Please review your information before submitting. Our team will verify your documents within 24-48 hours.</p>
              </div>

              <div className="glass rounded-xl p-4 space-y-2 text-sm">
                <p><strong>Full name:</strong> {form.firstName} {form.middleName} {form.lastName}</p>
                <p><strong>Date of birth:</strong> {form.dateOfBirth}</p>
                <p><strong>Country of residence:</strong> {form.countryOfResidence}</p>
                <p><strong>Phone:</strong> {form.phoneCountryCode}</p>
                <p><strong>Address:</strong> {[form.residentialAddress, form.city, form.province, form.postalCode].filter(Boolean).join(", ") || "—"}</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Uploaded documents</p>
                {Object.entries(docs).map(([key, value]) => {
                  const [docType, side] = key.split(":")
                  const s = value.info?.status
                  return (
                    <div key={key} className="flex items-center justify-between glass rounded-xl px-3 py-2 text-sm">
                      <span className="flex items-center gap-2">
                        {isUploaded(s) ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : s === "rejected" ? <XCircle className="h-4 w-4 text-red-500" /> : <Clock className="h-4 w-4 text-amber-500" />}
                        {DOC_TYPE_LABELS[docType] || docType}{side === "back" ? " (back)" : ""}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {isUploaded(s) ? "Submitted" : s === "rejected" ? (value.info?.rejectionReason || "Rejected") : "Processing"}
                      </span>
                    </div>
                  )
                })}
                {Object.keys(docs).length === 0 && <p className="text-xs text-muted-foreground">No documents uploaded yet.</p>}
              </div>

              <label className="flex items-start gap-3 glass rounded-xl p-4 cursor-pointer">
                <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--primary)]" />
                <span className="text-sm">
                  I confirm that the information provided is accurate and complete. I understand that providing false information may result in rejection or account suspension.
                </span>
              </label>

              {error && <p className="text-sm text-red-500 flex items-center gap-1"><AlertCircle className="h-4 w-4" /> {error}</p>}
            </div>
          )}

          {step === 6 && (
            <div className="text-center space-y-6 py-8">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }} className="h-20 w-20 rounded-full gradient-bg flex items-center justify-center mx-auto">
                <Check className="h-10 w-10 text-white" />
              </motion.div>
              <div>
                <h2 className="text-2xl font-bold">Application Submitted!</h2>
                <p className="text-muted-foreground mt-2">Your KYC application has been submitted for review. We typically process applications within 24-48 hours. You&apos;ll receive a notification once it&apos;s complete.</p>
              </div>
              <Button variant="gradient" onClick={() => router.push("/dashboard/kyc")}>
                Back to Dashboard
              </Button>
            </div>
          )}

          {step < 6 && (
            <div className="flex justify-between mt-8 pt-4 border-t border-border/50">
              <Button variant="outline" onClick={() => step > 0 ? setStep(step - 1) : router.push("/dashboard/kyc")} disabled={submitting}>
                <ArrowLeft className="h-4 w-4 mr-1" /> {step === 0 ? "Back" : "Previous"}
              </Button>
              <Button
                variant="gradient"
                onClick={saveStep}
                disabled={submitting || (step === 5 && !confirmed) || !canContinueFrom(step)}
              >
                {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                {step === 5 ? (submitting ? "Submitting..." : needsResubmit ? "Resubmit Application" : "Submit Application") : "Continue"}
                {!submitting && step < 5 && <ArrowRight className="h-4 w-4 ml-1" />}
              </Button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function UploadZone({
  label, icon, info, uploading, onSelect, large,
}: {
  label: string; icon: React.ReactNode; info?: KycDocumentInfo;
  uploading?: boolean; onSelect: (f: File) => void; large?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const rejected = info?.status === "rejected"
  const uploaded = info !== undefined && !rejected
  const showPreview = uploading || uploaded

  return (
    <div
      onClick={() => inputRef.current?.click()}
      className={`glass rounded-2xl border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-all flex flex-col items-center justify-center text-center relative ${large ? "p-12" : "p-6"} ${rejected ? "border-red-500/40 bg-red-500/5" : ""}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf,.webp"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onSelect(f) }}
      />
      {uploading ? (
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
      ) : !showPreview ? (
        <div className="text-primary mb-2">{icon}</div>
      ) : (
        <div className="text-green-500 mb-2">{rejected ? <XCircle className="h-8 w-8 text-red-500" /> : <CheckCircle2 className="h-8 w-8" />}</div>
      )}
      <p className="text-sm font-medium">{label}</p>
      {rejected && info?.rejectionReason && (
        <p className="text-xs text-red-500 mt-1">Rejected: {info.rejectionReason} — click to re-upload</p>
      )}
      {uploaded && info && (
        <p className="text-xs text-muted-foreground mt-1">Uploaded</p>
      )}
      {!uploaded && !uploading && !rejected && <p className="text-xs text-muted-foreground mt-1">Click to upload</p>}
    </div>
  )
}
