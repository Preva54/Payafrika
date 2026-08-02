"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { kycApi, type KycAdminDetail } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { motion } from "framer-motion"
import {
  ShieldCheck, ShieldAlert, ArrowLeft, Check, X,
  AlertTriangle, ZoomIn, FileText,
  User, MapPin, Building2, Landmark, Clock, Loader2,
  ChevronDown, ChevronUp
} from "lucide-react"

export default function AdminKycDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [app, setApp] = useState<KycAdminDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState("")
  const [actionLoading, setActionLoading] = useState(false)
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null)
  const [escalationOpen, setEscalationOpen] = useState(false)
  const [escalationReason, setEscalationReason] = useState("")

  useEffect(() => {
    if (params.id) {
      kycApi.getApplicationDetail(params.id as string).then((res) => { setApp(res); setLoading(false) })
    }
  }, [params.id])

  const handleAction = async (action: string) => {
    if (!app) return
    setActionLoading(true)
    try {
      await kycApi.reviewApplication(app.id, { action, notes })
      const updated = await kycApi.getApplicationDetail(app.id)
      setApp(updated)
    } catch { /* ignore */ }
    setActionLoading(false)
    setNotes("")
  }

  const handleEscalate = async () => {
    if (!app || !escalationReason.trim()) return
    setActionLoading(true)
    try {
      await kycApi.escalateApplication(app.id, escalationReason)
      const updated = await kycApi.getApplicationDetail(app.id)
      setApp(updated)
    } catch { /* ignore */ }
    setActionLoading(false)
    setEscalationReason("")
    setEscalationOpen(false)
  }

  if (loading) return (
    <div className="space-y-4">
      <div className="h-8 bg-muted rounded w-48 animate-pulse" />
      <div className="glass-card rounded-2xl p-6 animate-pulse"><div className="h-4 bg-muted rounded w-full mb-3" /><div className="h-32 bg-muted rounded-xl" /></div>
    </div>
  )

  if (!app) return <div className="text-center py-12"><ShieldAlert className="h-12 w-12 mx-auto mb-3 text-muted-foreground" /><p>Application not found</p></div>

  const statusColor = (s: string) => {
    switch (s) {
      case "approved": return "text-green-500 bg-green-500/10 border-green-500/20"
      case "rejected": return "text-red-500 bg-red-500/10 border-red-500/20"
      case "under_review": return "text-blue-500 bg-blue-500/10 border-blue-500/20"
      case "additional_info": return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20"
      default: return "text-muted-foreground bg-muted/50 border-border"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/admin/kyc")}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{app.userName}</h1>
            <Badge className={`${statusColor(app.status)} text-sm px-3 py-1`}>
              {app.status === "approved" ? <ShieldCheck className="h-4 w-4 mr-1" /> : app.status === "rejected" ? <ShieldAlert className="h-4 w-4 mr-1" /> : <Clock className="h-4 w-4 mr-1" />}
              {app.status.replace("_", " ").toUpperCase()}
            </Badge>
            <Badge className="bg-primary/10 text-primary border-primary/20 text-sm px-3 py-1">
              Level {app.level || 0}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{app.userEmail} · {app.applicationType} · Submitted {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : "N/A"}</p>
        </div>
      </div>

      {app.escalated && (
        <div className="glass rounded-2xl p-4 flex items-start gap-3 border-orange-500/20 bg-orange-500/5">
          <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium">Escalated for compliance review</p>
            <p className="text-xs text-muted-foreground mt-0.5">{app.escalationReason || "No reason provided"}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><User className="h-4 w-4" /> Personal Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {app.personalInfo && (
                <>
                  <InfoRow label="First Name" value={app.personalInfo.firstName} />
                  <InfoRow label="Middle Name" value={app.personalInfo.middleName} />
                  <InfoRow label="Last Name" value={app.personalInfo.lastName} />
                  <InfoRow label="Date of Birth" value={app.personalInfo.dateOfBirth ? new Date(app.personalInfo.dateOfBirth).toLocaleDateString() : "N/A"} />
                  <InfoRow label="Gender" value={app.personalInfo.gender} />
                  <InfoRow label="Nationality" value={app.personalInfo.nationality} />
                  <InfoRow label="Country of Residence" value={app.personalInfo.countryOfResidence} />
                  <InfoRow label="National ID" value={app.personalInfo.nationalIdNumber} />
                  <InfoRow label="Passport" value={app.personalInfo.passportNumber} />
                  <InfoRow label="Driver&apos;s License" value={app.personalInfo.driversLicenseNumber} />
                  <InfoRow label="Tax Number" value={app.personalInfo.taxNumber} />
                </>
              )}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card rounded-2xl p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><MapPin className="h-4 w-4" /> Contact</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <InfoRow label="Email" value={app.userEmail} />
              <InfoRow label="Phone" value={app.contact?.phoneCountryCode} />
              <InfoRow label="Address" value={app.contact?.residentialAddress} className="col-span-2" />
              <InfoRow label="Province" value={app.contact?.province} />
              <InfoRow label="City" value={app.contact?.city} />
              <InfoRow label="Postal Code" value={app.contact?.postalCode} />
            </div>
          </motion.div>

          {app.bank && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2"><Landmark className="h-4 w-4" /> Bank Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <InfoRow label="Bank Name" value={app.bank.bankName} />
                <InfoRow label="Account Number" value={`****${app.bank.accountNumber.slice(-4)}`} />
                <InfoRow label="Branch Code" value={app.bank.branchCode} />
                <InfoRow label="Account Holder" value={app.bank.accountHolderName} />
              </div>
            </motion.div>
          )}

          {app.business && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2"><Building2 className="h-4 w-4" /> Business Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <InfoRow label="Business Name" value={app.business.businessName} />
                <InfoRow label="Registration No" value={app.business.registrationNumber} />
                <InfoRow label="Tax Number" value={app.business.taxNumber} />
                <InfoRow label="VAT Number" value={app.business.vatNumber} />
                <InfoRow label="Industry" value={app.business.industry} />
                <InfoRow label="Website" value={app.business.website} />
                <InfoRow label="Years in Operation" value={app.business.yearsInOperation} />
              </div>
            </motion.div>
          )}

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card rounded-2xl p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><FileText className="h-4 w-4" /> Documents</h3>
            <div className="space-y-3">
              {app.documents.length === 0 && <p className="text-sm text-muted-foreground">No documents uploaded</p>}
              {app.documents.map((doc, i) => (
                <div key={doc.id} className="glass rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg gradient-bg flex items-center justify-center text-white"><FileText className="h-4 w-4" /></div>
                      <div>
                        <p className="text-sm font-medium">{doc.fileName}</p>
                        <p className="text-xs text-muted-foreground">{doc.documentType} · {(doc.fileSize / 1024 / 1024).toFixed(1)} MB</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs ${doc.status === "submitted" || doc.status === "verified" ? "bg-green-500/10 text-green-500" : doc.status === "rejected" ? "bg-red-500/10 text-red-500" : "bg-blue-500/10 text-blue-500"}`}>{doc.status}</Badge>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}>
                        {expandedDoc === doc.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  {expandedDoc === doc.id && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <div className="aspect-[4/3] glass rounded-xl flex items-center justify-center mb-3 overflow-hidden">
                        <img
                          src={kycApi.getDocumentImageUrl(app.id, doc.id)}
                          alt={doc.fileName}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      {doc.rejectionReason && (
                        <p className="text-xs text-red-500 mb-2">{doc.rejectionReason}</p>
                      )}
                      {doc.documentNumber && (
                        <p className="text-xs text-muted-foreground mb-1">Document number: <span className="font-mono">{doc.documentNumber}</span></p>
                      )}
                      {doc.expiryDate && (
                        <p className="text-xs text-muted-foreground mb-2">Expiry: {new Date(doc.expiryDate).toLocaleDateString()}</p>
                      )}
                      {doc.ocrData && (
                        <div className="text-xs font-mono glass rounded-lg p-2">
                          <p className="font-semibold mb-1">OCR Data:</p>
                          <pre className="whitespace-pre-wrap">{JSON.stringify(JSON.parse(doc.ocrData), null, 2)}</pre>
                        </div>
                      )}
                      <div className="flex gap-2 mt-2">
                        <Button variant="outline" size="sm" onClick={() => window.open(kycApi.getDocumentImageUrl(app.id, doc.id), "_blank")}><ZoomIn className="h-3 w-3 mr-1" /> Open in new tab</Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-2xl p-6">
            <h3 className="font-semibold mb-4">Verification Timeline</h3>
            <div className="space-y-3">
              {app.timeline.map((event, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`h-2 w-2 rounded-full mt-2 shrink-0 ${
                    event.eventType === "approved" ? "bg-green-500" :
                    event.eventType === "rejected" ? "bg-red-500" :
                    "bg-primary"
                  }`} />
                  <div>
                    <p className="text-sm">{event.description}</p>
                    <p className="text-xs text-muted-foreground">{new Date(event.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-card rounded-2xl p-6">
            <h3 className="font-semibold mb-4">Risk Assessment</h3>
            <div className="space-y-4">
              <RiskBar label="Risk Score" value={app.riskScore} />
              <RiskBar label="Fraud Score" value={app.fraudScore} color="red" />
              <RiskBar label="AI Confidence" value={app.aiConfidenceScore} color="green" />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }} className="glass-card rounded-2xl p-6">
            <h3 className="font-semibold mb-4">Review</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add review notes..."
                  className="rounded-xl min-h-[120px]"
                />
              </div>
              <div className="space-y-2">
                <Button className="w-full gradient-bg" onClick={() => handleAction("approve")} disabled={actionLoading || app.status === "approved"}>
                  {actionLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                  Approve
                </Button>
                <Button className="w-full" variant="outline" onClick={() => handleAction("request_info")} disabled={actionLoading}>
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Request Info
                </Button>
                <Button className="w-full" variant="destructive" onClick={() => handleAction("reject")} disabled={actionLoading}>
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
                {!app.escalated && (
                  <>
                    <Button className="w-full" variant="outline" onClick={() => setEscalationOpen(!escalationOpen)} disabled={actionLoading}>
                      <AlertTriangle className="h-4 w-4 mr-1 text-orange-500" />
                      Escalate
                    </Button>
                    {escalationOpen && (
                      <div className="space-y-2 glass rounded-xl p-3">
                        <Label>Escalation Reason</Label>
                        <Textarea
                          value={escalationReason}
                          onChange={(e) => setEscalationReason(e.target.value)}
                          placeholder="e.g. High risk jurisdiction, suspected document tampering..."
                          className="rounded-xl min-h-[80px]"
                        />
                        <Button className="w-full" size="sm" variant="outline" onClick={handleEscalate} disabled={actionLoading || !escalationReason.trim()}>
                          {actionLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <AlertTriangle className="h-4 w-4 mr-1 text-orange-500" />}
                          Confirm Escalation
                        </Button>
                      </div>
                    )}
                  </>
                )}
                {app.escalated && (
                  <Badge className="w-full justify-center bg-orange-500/10 text-orange-500 border-orange-500/20 py-2">
                    <AlertTriangle className="h-4 w-4 mr-1" /> Escalated
                  </Badge>
                )}
              </div>
            </div>
          </motion.div>

          {app.reviews.length > 0 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-6">
              <h3 className="font-semibold mb-4">Review History</h3>
              <div className="space-y-3">
                {app.reviews.map((r) => (
                  <div key={r.id} className="text-sm glass rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{r.reviewerName}</span>
                      <Badge className={`text-xs ${
                        r.action === "approve" ? "bg-green-500/10 text-green-500" :
                        r.action === "reject" ? "bg-red-500/10 text-red-500" :
                        "bg-yellow-500/10 text-yellow-500"
                      }`}>{r.action}</Badge>
                    </div>
                    {r.notes && <p className="text-xs text-muted-foreground mt-1">{r.notes}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{new Date(r.createdAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value, className }: { label: string; value?: string; className?: string }) {
  return (
    <div className={className}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value || "—"}</p>
    </div>
  )
}

function RiskBar({ label, value, color = "blue" }: { label: string; value: number; color?: string }) {
  const colors: Record<string, string> = {
    blue: "bg-primary", red: "bg-red-500", green: "bg-green-500",
  }
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <Progress value={value} className={`h-1.5 ${colors[color] || colors.blue}`} />
    </div>
  )
}