"use client"

import { useState } from "react"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { HelpCircle, TicketPlus, Search, Settings, LayoutDashboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SupportTicketsTab } from "@/components/support/SupportTicketsTab"
import { KnowledgeBaseTab } from "@/components/support/KnowledgeBaseTab"

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState("tickets")

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Support Center</h1>
          <p className="text-muted-foreground">Get help, browse articles, or contact our support team</p>
        </div>
        <Button variant="gradient" asChild>
          <Link href="/dashboard/support/tickets/new">
            <TicketPlus className="mr-2 h-4 w-4" />
            Submit Ticket
          </Link>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tickets">
            <HelpCircle className="mr-2 h-4 w-4" />
            My Tickets
          </TabsTrigger>
          <TabsTrigger value="knowledge-base">
            <Search className="mr-2 h-4 w-4" />
            Knowledge Base
          </TabsTrigger>
          <TabsTrigger value="categories">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Categories
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tickets">
          <SupportTicketsTab />
        </TabsContent>

        <TabsContent value="knowledge-base">
          <KnowledgeBaseTab />
        </TabsContent>

        <TabsContent value="categories">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Support Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <CategoryCard
                    name="Billing & Payments"
                    key="billing"
                    icon="CreditCard"
                    color="bg-blue-100 text-blue-600"
                    description="Questions about charges, invoices, and payment methods"
                    count={12}
                  />
                  <CategoryCard
                    name="Account & Login"
                    key="account"
                    icon="User"
                    color="bg-green-100 text-green-600"
                    description="Help with account access, verification, and settings"
                    count={8}
                  />
                  <CategoryCard
                    name="Transfers & Exchange"
                    key="transfers"
                    icon="ArrowRightLeft"
                    color="bg-purple-100 text-purple-600"
                    description="Domestic and international transfers, currency exchange"
                    count={15}
                  />
                  <CategoryCard
                    name="Loans & Credit"
                    key="loans"
                    icon="CreditCard"
                    color="bg-orange-100 text-orange-600"
                    description="Loan applications, repayments, and credit questions"
                    count={6}
                  />
                  <CategoryCard
                    name="Security & Privacy"
                    key="security"
                    icon="Shield"
                    color="bg-red-100 text-red-600"
                    description="2FA, fraud prevention, data protection, and privacy"
                    count={4}
                  />
                  <CategoryCard
                    name="Technical Issues"
                    key="technical"
                    icon="Monitor"
                    color="bg-gray-100 text-gray-600"
                    description="App bugs, performance issues, and feature requests"
                    count={9}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function CategoryCard({ name, key, icon, color, description, count }: {
  name: string
  key: string
  icon: string
  color: string
  description: string
  count: number
}) {
  const IconComponent = getIcon(icon)

  return (
    <Link href={`/dashboard/support/knowledge-base?category=${key}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${color}`}>
              <IconComponent className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg">{name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs text-muted-foreground">{count} articles</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function getIcon(name: string) {
  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    CreditCard: () => <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 0h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v7a3 3 0 003 3z" /></svg>,
    User: () => <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
    ArrowRightLeft: () => <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>,
    Shield: () => <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
    Monitor: () => <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  }
  return icons[name] || icons.CreditCard
}