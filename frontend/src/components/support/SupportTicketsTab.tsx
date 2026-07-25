"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { supportApi, SupportTicket, ChatMessage } from "@/lib/api"
import { Search, Send, Loader2, X, ChevronDown, MoreVertical } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { format } from "date-fns"

const STATUS_BADGES: Record<string, string> = {
  open: "bg-green-100 text-green-800",
  in_progress: "bg-blue-100 text-blue-800",
  waiting_customer: "bg-yellow-100 text-yellow-800",
  resolved: "bg-purple-100 text-purple-800",
  closed: "bg-gray-100 text-gray-800",
}

const PRIORITY_BADGES: Record<string, string> = {
  low: "bg-gray-100 text-gray-800",
  medium: "bg-blue-100 text-blue-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800",
}

export function SupportTicketsTab() {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState({
    status: "",
    priority: "",
    category: "",
    search: "",
  })
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showTicketDetail, setShowTicketDetail] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [newTicket, setNewTicket] = useState({
    subject: "",
    description: "",
    category: "general",
    priority: "medium",
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchTickets()
  }, [page, filters])

  const fetchTickets = async () => {
    setLoading(true)
    try {
      const response = await supportApi.getTickets({ ...filters, page, limit: 10 })
      setTickets(response.data)
      setTotalPages(response.totalPages)
      setTotal(response.total)
    } catch (error) {
      console.error("Failed to fetch tickets:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTicket = async () => {
    if (!newTicket.subject.trim() || !newTicket.description.trim()) return

    setSubmitting(true)
    try {
      await supportApi.createTicket(newTicket)
      setShowCreateDialog(false)
      setNewTicket({ subject: "", description: "", category: "general", priority: "medium" })
      fetchTickets()
    } catch (error) {
      console.error("Failed to create ticket:", error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleViewTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket)
    setShowTicketDetail(true)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-1/4 animate-pulse bg-muted rounded" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 w-full animate-pulse bg-muted rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search tickets..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
            className="max-w-xs"
          />
        </div>
        <div className="flex gap-2">
          <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value, page: 1 })}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="waiting_customer">Waiting Customer</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.priority} onValueChange={(value) => setFilters({ ...filters, priority: value, page: 1 })}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Priorities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.category} onValueChange={(value) => setFilters({ ...filters, category: value, page: 1 })}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Categories</SelectItem>
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
      </div>

      {tickets.length === 0 ? (
        <div className="text-center py-12">
          <Search className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">No tickets found</h3>
          <p className="text-muted-foreground">Create a new ticket to get help from our support team.</p>
          <Button variant="gradient" onClick={() => setShowCreateDialog(true)} className="mt-4">
            Submit Ticket
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => handleViewTicket(ticket)}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{ticket.subject}</h4>
                  <p className="text-sm text-muted-foreground truncate mt-1">{ticket.description}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={STATUS_BADGES[ticket.status] || "bg-gray-100 text-gray-800"}>
                    {ticket.status.replace("_", " ")}
                  </Badge>
                  <Badge className={PRIORITY_BADGES[ticket.priority] || "bg-gray-100 text-gray-800"}>
                    {ticket.priority}
                  </Badge>
                  <Badge variant="outline" className="text-xs">{ticket.category}</Badge>
                  {ticket.unreadCount > 0 && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      {ticket.unreadCount} new
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between mt-3 pt-3 border-t text-xs text-muted-foreground">
                <span>Updated {formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true })}</span>
                <span>{ticket.messageCount} messages</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({total} total)
          </span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            Next
          </Button>
        </div>
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Support Ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={newTicket.subject}
                onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                placeholder="Brief summary of your issue"
                maxLength={300}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={newTicket.category} onValueChange={(value) => setNewTicket({ ...newTicket, category: value })}>
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
              <Select value={newTicket.priority} onValueChange={(value) => setNewTicket({ ...newTicket, priority: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newTicket.description}
                onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                placeholder="Describe your issue in detail..."
                rows={5}
                maxLength={10000}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button variant="gradient" onClick={handleCreateTicket} disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Submit Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showTicketDetail && selectedTicket && (
        <TicketDetailDialog ticket={selectedTicket} onClose={() => setShowTicketDetail(false)} />
      )}
    </div>
  )
}

function TicketDetailDialog({ ticket, onClose }: { ticket: SupportTicket; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [showInternalNote, setShowInternalNote] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTicketDetail()
  }, [ticket.id])

  const fetchTicketDetail = async () => {
    try {
      const response = await supportApi.getTicket(ticket.id)
      setMessages(response.messages || [])
    } catch (error) {
      console.error("Failed to fetch ticket detail:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return

    setSending(true)
    try {
      const message = await supportApi.addMessage(ticket.id, { content: newMessage, isInternalNote: showInternalNote })
      setMessages((prev) => [...prev, message])
      setNewMessage("")
    } catch (error) {
      console.error("Failed to send message:", error)
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <DialogTitle>{ticket.subject}</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={STATUS_BADGES[ticket.status] || "bg-gray-100 text-gray-800"}>
                  {ticket.status.replace("_", " ")}
                </Badge>
                <Badge className={PRIORITY_BADGES[ticket.priority] || "bg-gray-100 text-gray-800"}>
                  {ticket.priority}
                </Badge>
                <Badge variant="outline" className="text-xs">{ticket.category}</Badge>
              </div>
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No messages yet. Be the first to respond.
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.isFromAgent ? "flex-row-reverse" : ""}`}>
                <Avatar className="shrink-0">
                  <AvatarImage src={msg.userAvatar} />
                  <AvatarFallback>{msg.userName.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className={`flex-1 ${msg.isFromAgent ? "text-right" : ""}`}>
                  <div className={`rounded-2xl p-4 ${msg.isFromAgent ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-medium">{msg.userName}</span>
                      <span className="text-xs opacity-70">{formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}</span>
                    </div>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    {msg.isInternalNote && <span className="text-xs opacity-60">Internal Note</span>}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="border-t p-4 space-y-3">
          <Label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={showInternalNote} onChange={(e) => setShowInternalNote(e.target.checked)} className="rounded" />
            Internal Note (agents only)
          </Label>
          <div className="flex gap-2">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              rows={2}
              className="flex-1"
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
            />
            <Button variant="gradient" onClick={handleSendMessage} disabled={sending || !newMessage.trim()}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}