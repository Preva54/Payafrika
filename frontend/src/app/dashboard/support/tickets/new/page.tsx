"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { supportApi, CreateTicketRequest } from "@/lib/api"

export default function NewTicketPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState<CreateTicketRequest>({
    subject: "",
    description: "",
    category: "general",
    priority: "medium",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.subject.trim() || !formData.description.trim()) return

    setSubmitting(true)
    setError("")

    try {
      await supportApi.createTicket(formData)
      router.push("/dashboard/support")
      router.refresh()
    } catch (err) {
      setError("Failed to create ticket. Please try again.")
      console.error("Create ticket error:", err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/dashboard/support" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to Support
      </Link>

      <div>
        <h1 className="text-2xl font-bold">Create Support Ticket</h1>
        <p className="text-muted-foreground">Fill in the details below to get help from our support team</p>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Ticket Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Brief summary of your issue"
                maxLength={300}
                required
              />
              <p className="text-xs text-muted-foreground">{formData.subject.length}/300 characters</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="billing">Billing & Payments</SelectItem>
                  <SelectItem value="account">Account & Login</SelectItem>
                  <SelectItem value="transfers">Transfers & Exchange</SelectItem>
                  <SelectItem value="loans">Loans & Credit</SelectItem>
                  <SelectItem value="security">Security & Privacy</SelectItem>
                  <SelectItem value="technical">Technical Issues</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low - General question</SelectItem>
                  <SelectItem value="medium">Medium - Need help soon</SelectItem>
                  <SelectItem value="high">High - Urgent issue</SelectItem>
                  <SelectItem value="urgent">Urgent - Critical problem</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your issue in detail. Include any error messages, steps to reproduce, and what you've already tried."
                rows={8}
                maxLength={10000}
                required
              />
              <p className="text-xs text-muted-foreground">{formData.description.length}/10000 characters</p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Link href="/dashboard/support">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
              <Button type="submit" variant="gradient" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Ticket"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-primary">
        <CardContent className="pt-6">
          <h3 className="font-medium mb-2">Tips for faster resolution</h3>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">• Be specific about the issue</li>
            <li className="flex items-center gap-2">• Include error messages or screenshots</li>
            <li className="flex items-center gap-2">• Mention steps you&apos;ve already tried</li>
            <li className="flex items-center gap-2">• Select the most relevant category</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}