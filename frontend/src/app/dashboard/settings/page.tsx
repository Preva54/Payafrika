"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle>Profile Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2"><label className="text-sm font-medium">First Name</label><Input placeholder="John" /></div>
                <div className="space-y-2"><label className="text-sm font-medium">Last Name</label><Input placeholder="Doe" /></div>
              </div>
              <div className="space-y-2"><label className="text-sm font-medium">Email</label><Input type="email" placeholder="john@example.com" /></div>
              <Button variant="gradient">Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="security" className="mt-4">
          <Card><CardHeader><CardTitle>Change Password</CardTitle></CardHeader><CardContent className="space-y-4">
            <Input type="password" placeholder="Current password" />
            <Input type="password" placeholder="New password" />
            <Input type="password" placeholder="Confirm new password" />
            <Button variant="gradient">Update Password</Button>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="notifications" className="mt-4">
          <Card><CardContent className="text-center py-8 text-muted-foreground">Notification preferences coming soon.</CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
