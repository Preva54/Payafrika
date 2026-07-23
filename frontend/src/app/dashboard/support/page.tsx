"use client"

import { HelpCircle, Send } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function SupportPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Support</h1>
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Contact Us</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="Subject" />
            <Textarea placeholder="Describe your issue..." rows={5} />
            <Button variant="gradient" className="w-full"><Send className="mr-2 h-4 w-4" />Submit Ticket</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>FAQ</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div><p className="font-medium">How long do transfers take?</p><p className="text-muted-foreground">Typically 1-3 business days.</p></div>
            <div><p className="font-medium">What are the loan interest rates?</p><p className="text-muted-foreground">Rates vary based on credit assessment.</p></div>
            <div><p className="font-medium">How do I reset my password?</p><p className="text-muted-foreground">Go to Settings &gt; Security to change your password.</p></div>
            <div><p className="font-medium">How do I contact support?</p><p className="text-muted-foreground">Use this form or email support@payafrika.com.</p></div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
