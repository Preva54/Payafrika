"use client"

import { useEffect, useState } from "react"
import { Search, Filter, Loader2, ChevronLeft, ChevronRight, MoreVertical, Eye, MessageSquare, AlertCircle, Clock, CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { adminSupportApi, SupportTicket, ChatMessage } from "@/lib/api"
import { formatDistanceToNow } from "date-fns"

const STATUS_BADGES: Record<string, string> = {
  open: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  waiting_customer: "bg-orange-100 text-orange-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-800",
}

const PRIORITY_BADGES: Record<string, string> = {
  low: "bg-gray-100 text-gray-800",
  medium: "bg-blue-100 text-blue-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800",
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    open: "Open",
    in_progress: "In Progress",
    waiting_customer: "Waiting for Customer",
    resolved: "Resolved",
    closed: "Closed",
  }
  return labels[status] || status
}

export default function AdminTicketsPage() {
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
  const [showTicketDetail, setShowTicketDetail] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [showInternalNote, setShowInternalNote] = useState(false)

  useEffect(() => {
    fetchTickets()
  }, [page, filters])

  const fetchTickets = async () => {
    setLoading(true)
    try {
      const response = await adminSupportApi.getTickets({ ...filters, page, limit: 20 })
      setTickets(response.data)
      setTotalPages(response.totalPages)
      setTotal(response.total)
    } catch (error) {
      console.error("Failed to fetch tickets:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewTicket = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket)
    setShowTicketDetail(true)
    try {
      const response = await adminSupportApi.getTicket(ticket.id)
      setMessages(response.messages || [])
    } catch (error) {
      console.error("Failed to fetch ticket:", error)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return

    setSending(true)
    try {
      const message = await adminSupportApi.addMessage(selectedTicket.id, {
        content: newMessage,
        isInternalNote: showInternalNote,
      })
      setMessages((prev) => [...prev, message])
      setNewMessage("")
    } catch (error) {
      console.error("Failed to send message:", error)
    } finally {
      setSending(false)
    }
  }

  const handleStatusChange = async (ticketId: string, status: string) => {
    try {
      await adminSupportApi.updateTicket(ticketId, { status })
      fetchTickets()
      if (selectedTicket?.id === ticketId) {
        const response = await adminSupportApi.getTicket(ticketId)
        setSelectedTicket(response)
      }
    } catch (error) {
      console.error("Failed to update ticket:", error)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <CardTitle>Support Tickets</CardTitle>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Support Tickets</h1>
          <p className="text-muted-foreground">{total} total tickets</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Search tickets..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
          className="max-w-sm"
        />
        <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value, page: 1 })}>
          <SelectTrigger className="w-[180px]">
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
          <SelectTrigger className="w-[160px]">
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
          <SelectTrigger className="w-[180px]">
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

      {tickets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-1">No tickets found</h3>
            <p className="text-muted-foreground">Try adjusting your filters</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {tickets.map((ticket) => (
                <div key={ticket.id} className="p-4 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => handleViewTicket(ticket)}>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium truncate">{ticket.subject}</h4>
                        <Badge className={STATUS_BADGES[ticket.status] || "bg-gray-100 text-gray-800"}>
                          {getStatusLabel(ticket.status)}
                        </Badge>
                        <Badge className={PRIORITY_BADGES[ticket.priority] || "bg-gray-100 text-gray-800"}>
                          {ticket.priority}
                        </Badge>
                        <Badge variant="outline" className="text-xs capitalize">{ticket.category}</Badge>
                        {ticket.unreadCount > 0 && (
                          <Badge variant="secondary" className="bg-primary/10 text-primary">
                            {ticket.unreadCount} new
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 truncate">{ticket.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3.5 w-3.5" />
                          {ticket.messageCount} messages
                        </span>
                        <span>Created {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}</span>
                        <span>Updated {formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true })}</span>
                        {ticket.assignedToName && (
                          <span className="flex items-center gap-1">
                            Assigned to: {ticket.assignedToName}
                          </span>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewTicket(ticket)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {ticket.status !== "closed" && (
                          <>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(ticket.id, "in_progress"); }}>
                              Mark In Progress
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(ticket.id, "waiting_customer"); }}>
                              Waiting Customer
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(ticket.id, "resolved"); }}>
                              Mark Resolved
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(ticket.id, "closed"); }}>
                              Close Ticket
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({total} total)
          </span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {showTicketDetail && selectedTicket && (
        <TicketDetailDialog
          ticket={selectedTicket}
          messages={messages}
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          sending={sending}
          showInternalNote={showInternalNote}
          setShowInternalNote={setShowInternalNote}
          handleSendMessage={handleSendMessage}
          handleStatusChange={handleStatusChange}
          onClose={() => {
            setShowTicketDetail(false)
            setSelectedTicket(null)
            setMessages([])
          }}
        />
      )}
    </div>
  )
}

function TicketDetailDialog({
  ticket,
  messages,
  newMessage,
  setNewMessage,
  sending,
  showInternalNote,
  setShowInternalNote,
  handleSendMessage,
  handleStatusChange,
  onClose,
}: {
  ticket: SupportTicket
  messages: ChatMessage[]
  newMessage: string
  setNewMessage: (value: string) => void
  sending: boolean
  showInternalNote: boolean
  setShowInternalNote: (value: boolean) => void
  handleSendMessage: () => Promise<void>
  handleStatusChange: (id: string, status: string) => Promise<void>
  onClose: () => void
}) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <DialogTitle>{ticket.subject}</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={STATUS_BADGES[ticket.status] || "bg-gray-100 text-gray-800"}>
                  {getStatusLabel(ticket.status)}
                </Badge>
                <Badge className={PRIORITY_BADGES[ticket.priority] || "bg-gray-100 text-gray-800"}>
                  {ticket.priority}
                </Badge>
                <Badge variant="outline" className="text-xs capitalize">{ticket.category}</Badge>
              </div>
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {messages.map((msg) => (
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
          ))}
        </div>
        <div className="border-t p-4 space-y-3">
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={showInternalNote} onChange={(e) => setShowInternalNote(e.target.checked)} className="rounded" />
              Internal Note (agents only)
            </label>
          </div>
          <div className="flex gap-2">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your response..."
              rows={2}
              className="flex-1"
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
            />
            <Button variant="gradient" onClick={handleSendMessage} disabled={sending || !newMessage.trim()}>
              {sending ? "Sending..." : "Send"}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {ticket.status !== "closed" && (
              <>
                <Button variant="outline" size="sm" onClick={() => handleStatusChange(ticket.id, "in_progress")}>
                  In Progress
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleStatusChange(ticket.id, "waiting_customer")}>
                  Waiting Customer
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleStatusChange(ticket.id, "resolved")}>
                  Resolved
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleStatusChange(ticket.id, "closed")}>
                  Close
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}