"use client"

import { useState } from "react"
import { settingsApi } from "@/lib/api"
import { SectionWrapper, SettingsCard } from "../SettingsShared"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { motion } from "framer-motion"
import { Trash2, AlertTriangle, Download, Loader2, ArrowRight } from "lucide-react"

export function DeleteAccountSection() {
  const [step, setStep] = useState<"confirm" | "password" | "done">("confirm")
  const [password, setPassword] = useState("")
  const [downloadData, setDownloadData] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState("")

  const handleDelete = async () => {
    if (!password) return
    setDeleting(true)
    setError("")
    try {
      await settingsApi.deleteAccount({ password, downloadData })
      setStep("done")
    } catch {
      setError("Incorrect password. Please try again.")
    }
    setDeleting(false)
  }

  if (step === "done") {
    return (
      <SectionWrapper title="Delete Account">
        <SettingsCard className="text-center py-12">
          <div className="h-16 w-16 rounded-2xl bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
          </div>
          <h3 className="text-xl font-bold mb-2">Deletion Requested</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Your account deletion has been requested. We&apos;ve sent a confirmation email.
            Your account will be permanently deleted after a 30-day grace period.
            You can cancel this request by logging in within the next 30 days.
          </p>
        </SettingsCard>
      </SectionWrapper>
    )
  }

  return (
    <SectionWrapper title="Delete Account" description="Permanently delete your account and all associated data.">
      <SettingsCard className="border-red-500/20">
        {step === "confirm" && (
          <div className="space-y-6 py-4">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-red-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-red-500">Warning: This action cannot be undone</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Deleting your account will permanently remove all your data, transactions, wallet balances,
                  and associated records. This action is irreversible after 30 days.
                </p>
                <ul className="text-sm text-muted-foreground mt-3 space-y-1">
                  <li>• All wallet balances will be forfeited</li>
                  <li>• Active subscriptions will be cancelled</li>
                  <li>• Team members will lose access</li>
                  <li>• API keys will be revoked</li>
                  <li>• All personal data will be erased</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 glass rounded-xl">
                <SettingsCheckbox checked={downloadData} onCheckedChange={(v) => setDownloadData(v as boolean)} />
              <label className="text-sm cursor-pointer">Download my data before deletion</label>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => {}}>Cancel</Button>
              <Button variant="destructive" onClick={() => setStep("password")}>
                Continue <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {step === "password" && (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Please enter your password to confirm account deletion.
            </p>
            <div className="space-y-2 max-w-sm">
              <Label>Current Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-xl"
                autoFocus
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { setStep("confirm"); setPassword(""); setError("") }}>
                Back
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting || !password}>
                {deleting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
                Permanently Delete Account
              </Button>
            </div>
          </div>
        )}
      </SettingsCard>
    </SectionWrapper>
  )
}

function SettingsCheckbox({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onCheckedChange(!checked)}
      className={`h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all ${
        checked ? "bg-primary border-primary text-white" : "border-border"
      }`}
    >
      {checked && <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
    </button>
  )
}