"use client"

import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { kycApi } from "@/lib/api"
import { useAuthStore } from "@/stores/use-auth-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { motion, AnimatePresence } from "framer-motion"
import {
  Shield, ArrowRight, ArrowLeft, Check, Upload, Camera,
  IdCard, MapPin, Phone, Building2, Landmark, Loader2,
  FileText, Image as ImageIcon, X, AlertCircle, CheckCircle2,
  Sparkles, Clock, Globe, Mail, User, Calendar, HelpCircle
} from "lucide-react"

const STEPS = [
  { id: "welcome", label: "Welcome", icon: <Shield className="h-5 w-5" /> },
  { id: "personal", label: "Personal Info", icon: <User className="h-5 w-5" /> },
  { id: "contact", label: "Contact", icon: <Globe className="h-5 w-5" /> },
  { id: "documents", label: "Documents", icon: <FileText className="h-5 w-5" /> },
  { id: "selfie", label: "Selfie", icon: <Camera className="h-5 w-5" /> },
  { id: "address", label: "Address", icon: <MapPin className="h-5 w-5" /> },
  { id: "bank", label: "Bank", icon: <Landmark className="h-5 w-5" /> },
  { id: "submit", label: "Submit", icon: <Check className="h-5 w-5" /> },
]

export default function KycVerifyPage() {
  const router = useRouter()
  const { user, fetchUser } = useAuthStore()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [completed, setCompleted] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const selfieInputRef = useRef<HTMLInputElement>(null)
  const addressInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    firstName: "", middleName: "", lastName: "", dateOfBirth: "",
    gender: "", nationality: "", countryOfResidence: "",
    nationalIdNumber: "", passportNumber: "", driversLicenseNumber: "", taxNumber: "",
    phoneCountryCode: "", residentialAddress: "", province: "", city: "", postalCode: "",
    bankName: "", accountNumber: "", branchCode: "", accountHolderName: "",
  })

  const [docs, setDocs] = useState<{ idCard?: File; idCardBack?: File; selfie?: File; addressProof?: File }>({})
  const [uploading, setUploading] = useState<string | null>(null)
  const [previews, setPreviews] = useState<Record<string, string>>({})

  const update = (key: string, value: string) => setForm({ ...form, [key]: value })

  const handleFileSelect = useCallback(async (field: string, file: File) => {
    setDocs({ ...docs, [field]: file })
    const reader = new FileReader()
    reader.onload = (e) => setPreviews({ ...previews, [field]: e.target?.result as string })
    reader.readAsDataURL(file)

    if (field === "selfie" || field === "addressProof" || field.startsWith("idCard")) {
      setUploading(field)
      try {
        const docType = field === "idCard" ? "national_id" : field === "idCardBack" ? "national_id" : field === "selfie" ? "selfie" : "utility_bill"
        const side = field === "idCardBack" ? "back" : "front"
        await kycApi.uploadDocument(docType, side, file)
      } catch { /* ignore */ }
      setUploading(null)
    }
  }, [docs, previews])

  const saveStep = async () => {
    if (step === 1) await kycApi.updatePersonalInfo({
      firstName: form.firstName, middleName: form.middleName, lastName: form.lastName,
      dateOfBirth: form.dateOfBirth, gender: form.gender, nationality: form.nationality,
      countryOfResidence: form.countryOfResidence, nationalIdNumber: form.nationalIdNumber,
      passportNumber: form.passportNumber, driversLicenseNumber: form.driversLicenseNumber,
      taxNumber: form.taxNumber,
    })
    if (step === 2) await kycApi.updateContact({
      phoneCountryCode: form.phoneCountryCode, residentialAddress: form.residentialAddress,
      province: form.province, city: form.city, postalCode: form.postalCode,
    })
    if (step === 6) await kycApi.updateBank({
      bankName: form.bankName, accountNumber: form.accountNumber,
      branchCode: form.branchCode, accountHolderName: form.accountHolderName,
    })
    if (step === 7) {
      setSubmitting(true)
      try {
        const res = await kycApi.submitForReview()
        await fetchUser()
        setCompleted(true)
      } catch { /* ignore */ }
      setSubmitting(false)
      return
    }
    setStep(step + 1)
  }

  const progress = ((step) / (STEPS.length - 1)) * 100

  if (completed) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card rounded-2xl p-10 text-center max-w-md">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }} className="h-20 w-20 rounded-full gradient-bg flex items-center justify-center mx-auto mb-6">
            <Check className="h-10 w-10 text-white" />
          </motion.div>
          <h2 className="text-2xl font-bold mb-2">Application Submitted!</h2>
          <p className="text-muted-foreground mb-6">Your KYC application has been submitted for review. We typically process applications within 24-48 hours. You&apos;ll receive a notification once it&apos;s complete.</p>
          <Button variant="gradient" onClick={() => router.push("/dashboard/kyc")}>
            Back to Dashboard
          </Button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold">Identity Verification</h1>
          <span className="text-sm text-muted-foreground">Step {step + 1} of {STEPS.length}</span>
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
              <div className="grid grid-cols-2 gap-3 text-left">
                {[
                  { icon: <ArrowRight className="h-4 w-4" />, text: "Higher transaction limits" },
                  { icon: <ArrowRight className="h-4 w-4" />, text: "Faster payouts" },
                  { icon: <ArrowRight className="h-4 w-4" />, text: "Secure account protection" },
                  { icon: <ArrowRight className="h-4 w-4" />, text: "Regulatory compliance" },
                  { icon: <ArrowRight className="h-4 w-4" />, text: "Access to merchant services" },
                  { icon: <ArrowRight className="h-4 w-4" />, text: "Multi-currency support" },
                ].map((b, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="text-primary">{b.icon}</span>
                    <span>{b.text}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" /> Estimated completion: <strong>5-10 Minutes</strong>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Personal Information</h2>
              <p className="text-sm text-muted-foreground">Enter your legal name as it appears on your ID document.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>First Name</Label><Input value={form.firstName} onChange={(e) => update("firstName", e.target.value)} className="rounded-xl" /></div>
                <div className="space-y-2"><Label>Middle Name (Optional)</Label><Input value={form.middleName} onChange={(e) => update("middleName", e.target.value)} className="rounded-xl" /></div>
                <div className="space-y-2"><Label>Last Name</Label><Input value={form.lastName} onChange={(e) => update("lastName", e.target.value)} className="rounded-xl" /></div>
                <div className="space-y-2"><Label>Date of Birth</Label><Input type="date" value={form.dateOfBirth} onChange={(e) => update("dateOfBirth", e.target.value)} className="rounded-xl" /></div>
                <div className="space-y-2"><Label>Gender</Label><select className="glass rounded-xl px-3 py-2.5 text-sm w-full" value={form.gender} onChange={(e) => update("gender", e.target.value)}><option value="">Select</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></div>
                <div className="space-y-2"><Label>Nationality</Label><Input value={form.nationality} onChange={(e) => update("nationality", e.target.value)} className="rounded-xl" /></div>
                <div className="space-y-2"><Label>Country of Residence</Label><Input value={form.countryOfResidence} onChange={(e) => update("countryOfResidence", e.target.value)} className="rounded-xl" /></div>
                <div className="space-y-2"><Label>National ID Number</Label><Input value={form.nationalIdNumber} onChange={(e) => update("nationalIdNumber", e.target.value)} className="rounded-xl" /></div>
                <div className="space-y-2"><Label>Passport Number (Optional)</Label><Input value={form.passportNumber} onChange={(e) => update("passportNumber", e.target.value)} className="rounded-xl" /></div>
                <div className="space-y-2"><Label>Driver&apos;s License (Optional)</Label><Input value={form.driversLicenseNumber} onChange={(e) => update("driversLicenseNumber", e.target.value)} className="rounded-xl" /></div>
                <div className="space-y-2 md:col-span-2"><Label>Tax Number (Optional)</Label><Input value={form.taxNumber} onChange={(e) => update("taxNumber", e.target.value)} className="rounded-xl" /></div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Contact Details</h2>
              <p className="text-sm text-muted-foreground">How can we reach you and where do you live?</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Email</Label><Input value={user?.email || ""} disabled className="rounded-xl opacity-60" /></div>
                <div className="space-y-2"><Label>Phone Country Code</Label><Input value={form.phoneCountryCode} onChange={(e) => update("phoneCountryCode", e.target.value)} placeholder="+27" className="rounded-xl" /></div>
                <div className="space-y-2 md:col-span-2"><Label>Residential Address</Label><Input value={form.residentialAddress} onChange={(e) => update("residentialAddress", e.target.value)} className="rounded-xl" /></div>
                <div className="space-y-2"><Label>Province / State</Label><Input value={form.province} onChange={(e) => update("province", e.target.value)} className="rounded-xl" /></div>
                <div className="space-y-2"><Label>City</Label><Input value={form.city} onChange={(e) => update("city", e.target.value)} className="rounded-xl" /></div>
                <div className="space-y-2"><Label>Postal Code</Label><Input value={form.postalCode} onChange={(e) => update("postalCode", e.target.value)} className="rounded-xl" /></div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Identity Document Upload</h2>
              <p className="text-sm text-muted-foreground">Upload a clear photo of your government-issued ID. We accept JPG, PNG, PDF (max 20MB).</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <UploadZone
                  label="ID Front"
                  icon={<IdCard className="h-6 w-6" />}
                  file={docs.idCard}
                  preview={previews.idCard}
                  uploading={uploading === "idCard"}
                  onSelect={(f) => handleFileSelect("idCard", f)}
                />
                <UploadZone
                  label="ID Back"
                  icon={<IdCard className="h-6 w-6" />}
                  file={docs.idCardBack}
                  preview={previews.idCardBack}
                  uploading={uploading === "idCardBack"}
                  onSelect={(f) => handleFileSelect("idCardBack", f)}
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm"><ImageIcon className="h-4 w-4 mr-1" /> National ID</Button>
                <Button variant="outline" size="sm"><ImageIcon className="h-4 w-4 mr-1" /> Passport</Button>
                <Button variant="outline" size="sm"><ImageIcon className="h-4 w-4 mr-1" /> Driver&apos;s License</Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Selfie Verification</h2>
              <p className="text-sm text-muted-foreground">Take a live selfie to confirm your identity. Make sure your face is clearly visible and well-lit.</p>
              <UploadZone
                label="Take Selfie"
                icon={<Camera className="h-8 w-8" />}
                file={docs.selfie}
                preview={previews.selfie}
                uploading={uploading === "selfie"}
                onSelect={(f) => handleFileSelect("selfie", f)}
                large
              />
              <div className="glass rounded-xl p-4 text-sm text-muted-foreground">
                <p className="flex items-center gap-2"><HelpCircle className="h-4 w-4" /> Tips for a good selfie:</p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
                  <li>Ensure your face is well-lit</li>
                  <li>Look directly at the camera</li>
                  <li>Remove sunglasses or face coverings</li>
                  <li>Use a plain background</li>
                </ul>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Address Verification</h2>
              <p className="text-sm text-muted-foreground">Upload a utility bill, bank statement, or government letter less than 3 months old showing your full name and address.</p>
              <UploadZone
                label="Proof of Address"
                icon={<FileText className="h-8 w-8" />}
                file={docs.addressProof}
                preview={previews.addressProof}
                uploading={uploading === "addressProof"}
                onSelect={(f) => handleFileSelect("addressProof", f)}
                large
              />
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm">Utility Bill</Button>
                <Button variant="outline" size="sm">Bank Statement</Button>
                <Button variant="outline" size="sm">Government Letter</Button>
                <Button variant="outline" size="sm">Lease Agreement</Button>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Bank Verification</h2>
              <p className="text-sm text-muted-foreground">Enter your bank account details for verification and payouts.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Bank Name</Label><Input value={form.bankName} onChange={(e) => update("bankName", e.target.value)} className="rounded-xl" /></div>
                <div className="space-y-2"><Label>Account Number</Label><Input value={form.accountNumber} onChange={(e) => update("accountNumber", e.target.value)} className="rounded-xl" /></div>
                <div className="space-y-2"><Label>Branch Code (Optional)</Label><Input value={form.branchCode} onChange={(e) => update("branchCode", e.target.value)} className="rounded-xl" /></div>
                <div className="space-y-2"><Label>Account Holder Name</Label><Input value={form.accountHolderName} onChange={(e) => update("accountHolderName", e.target.value)} className="rounded-xl" /></div>
              </div>
              <div className="glass rounded-xl p-4 text-sm text-muted-foreground flex items-start gap-2">
                <Shield className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Your bank details are encrypted and securely stored. We use micro-deposit verification to confirm account ownership.</span>
              </div>
            </div>
          )}

          {step === 7 && (
            <div className="text-center space-y-6 py-8">
              <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="h-20 w-20 rounded-2xl gradient-bg-green flex items-center justify-center mx-auto">
                <Sparkles className="h-10 w-10 text-white" />
              </motion.div>
              <div>
                <h2 className="text-2xl font-bold">Almost Done!</h2>
                <p className="text-muted-foreground mt-2">Please review your information before submitting. Our AI will verify your documents within seconds.</p>
              </div>
              <div className="glass rounded-xl p-4 text-left space-y-2 text-sm">
                <p><strong>Name:</strong> {form.firstName} {form.middleName} {form.lastName}</p>
                <p><strong>Country:</strong> {form.countryOfResidence}</p>
                <p><strong>Documents:</strong> {Object.keys(docs).length} uploaded</p>
                <p><strong>Bank:</strong> {form.bankName} ****{form.accountNumber.slice(-4)}</p>
              </div>
            </div>
          )}

          <div className="flex justify-between mt-8 pt-4 border-t border-border/50">
            <Button variant="outline" onClick={() => step > 0 ? setStep(step - 1) : router.push("/dashboard/kyc")} disabled={submitting}>
              <ArrowLeft className="h-4 w-4 mr-1" /> {step === 0 ? "Back" : "Previous"}
            </Button>
            <Button variant="gradient" onClick={saveStep} disabled={submitting || step === 3 && !docs.idCard}>
              {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              {step === STEPS.length - 1 ? (submitting ? "Submitting..." : "Submit Application") : "Continue"}
              {!submitting && step < STEPS.length - 1 && <ArrowRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function UploadZone({
  label, icon, file, preview, uploading, onSelect, large,
}: {
  label: string; icon: React.ReactNode; file?: File; preview?: string;
  uploading?: boolean; onSelect: (f: File) => void; large?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div
      onClick={() => inputRef.current?.click()}
      className={`glass rounded-2xl border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-all flex flex-col items-center justify-center text-center ${large ? "p-12" : "p-6"}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf,image/heic"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onSelect(f) }}
      />
      {uploading ? (
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
      ) : preview ? (
        <img src={preview} alt={label} className={`object-cover rounded-xl mb-2 ${large ? "max-h-40" : "h-20 w-full"}`} />
      ) : (
        <div className="text-primary mb-2">{icon}</div>
      )}
      <p className="text-sm font-medium">{file ? file.name : label}</p>
      <p className="text-xs text-muted-foreground mt-1">{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : "Click to upload"}</p>
    </div>
  )
}