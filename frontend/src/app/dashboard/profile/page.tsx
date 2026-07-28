"use client"

import { useEffect, useState } from "react"
import { User, Copy, Check, Share2, QrCode, Shield, CreditCard } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { authApi, type UserInfo } from "@/lib/api"
import { Badge } from "@/components/ui/badge"

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState("")
  const [showQR, setShowQR] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const data = await authApi.me()
        setProfile(data)
      } catch {}
      setLoading(false)
    })()
  }, [])

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(""), 2000)
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "business": return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800">Verified Business</Badge>
      case "admin": return <Badge className="bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-800">Admin</Badge>
      default: return <Badge variant="success">Verified Customer</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Profile</h1>

      <Card className="overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-primary to-accent" />
        <CardContent className="relative px-6 pb-6">
          <div className="-mt-12 flex items-end gap-4 mb-6">
            <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border-4 border-background flex items-center justify-center text-3xl font-bold">
              {profile?.fullName?.split(" ").map(n => n[0]).join("") || "U"}
            </div>
            <div className="pb-1">
              {loading ? (
                <Skeleton className="h-6 w-40 mb-1" />
              ) : (
                <>
                  <h2 className="text-xl font-bold">{profile?.fullName}</h2>
                  {profile?.username && (
                    <p className="text-sm text-muted-foreground font-mono">{profile.username}</p>
                  )}
                </>
              )}
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-5 w-56" />
            </div>
          ) : profile ? (
            <div className="space-y-6">
              {profile.username && (
                <div className="rounded-2xl border border-border p-4 bg-gradient-to-r from-primary/5 to-accent/5">
                  <p className="text-xs text-muted-foreground mb-2">PayAfrika Username</p>
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                      {profile.username}
                    </p>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => copyToClipboard(profile.username!, "username")}>
                        {copied === "username" ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setShowQR(true)}>
                        <QrCode className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-3">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => copyToClipboard(profile.username!, "username2")}>
                      {copied === "username2" ? <Check className="mr-2 h-4 w-4 text-accent" /> : <Copy className="mr-2 h-4 w-4" />}
                      Copy Username
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Share2 className="mr-2 h-4 w-4" />
                      Share
                    </Button>
                  </div>
                </div>
              )}

              <dl className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <dt className="text-muted-foreground">Name</dt>
                  <dd className="font-medium">{profile.fullName}</dd>
                </div>
                <div className="flex justify-between items-center">
                  <dt className="text-muted-foreground">Email</dt>
                  <dd className="font-medium">{profile.email}</dd>
                </div>
                <div className="flex justify-between items-center">
                  <dt className="text-muted-foreground">Account Type</dt>
                  <dd>{getRoleBadge(profile.role)}</dd>
                </div>
                <div className="flex justify-between items-center">
                  <dt className="text-muted-foreground">KYC Status</dt>
                  <dd>
                    <Badge variant={profile.kycStatus === "verified" ? "success" : "secondary"}>
                      {profile.kycStatus ?? "Not submitted"}
                    </Badge>
                  </dd>
                </div>
              </dl>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-border p-3 text-center">
                  <Shield className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xs font-medium">Security</p>
                </div>
                <div className="rounded-xl border border-border p-3 text-center">
                  <CreditCard className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xs font-medium">Payment Methods</p>
                </div>
                <div className="rounded-xl border border-border p-3 text-center cursor-pointer hover:bg-secondary/50 transition-all" onClick={() => setShowQR(true)}>
                  <QrCode className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xs font-medium">QR Code</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Could not load profile.</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Your QR Code</DialogTitle>
            <DialogDescription>Share this QR code to receive payments</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-6">
            <div className="h-56 w-56 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center border-2 border-dashed border-primary/30">
              <QrCode className="h-40 w-40 text-primary/40" />
            </div>
          </div>
          {profile?.username && (
            <div className="text-center">
              <p className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {profile.username}
              </p>
              <p className="text-sm text-muted-foreground mt-1">{profile.fullName}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
