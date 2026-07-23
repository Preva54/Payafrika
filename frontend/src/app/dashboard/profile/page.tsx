"use client"

import { useEffect, useState } from "react"
import { User } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { authApi, type UserInfo } from "@/lib/api"
import { Badge } from "@/components/ui/badge"

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const data = await authApi.me()
        setProfile(data)
      } catch {}
      setLoading(false)
    })()
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Profile</h1>
      <Card>
        <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3"><Skeleton className="h-5 w-48" /><Skeleton className="h-5 w-36" /><Skeleton className="h-5 w-56" /></div>
          ) : profile ? (
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Name</dt><dd className="font-medium">{profile.fullName}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Email</dt><dd className="font-medium">{profile.email}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">KYC Status</dt><dd><Badge variant={profile.kycStatus === "verified" ? "success" : "secondary"}>{profile.kycStatus ?? "Not submitted"}</Badge></dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Role</dt><dd><Badge>{profile.role}</Badge></dd></div>
            </dl>
          ) : (
            <p className="text-muted-foreground text-sm">Could not load profile.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
