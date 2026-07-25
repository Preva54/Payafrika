"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cmsApi, type DashboardStats } from "@/lib/cms-api"
import {
  FileText, PenSquare, Settings, ShoppingBag, MessageCircle, Users,
  Handshake, Briefcase, HelpCircle, Image, Megaphone, MessageSquareText, Rocket, RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const statIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  totalPages: FileText,
  publishedPages: FileText,
  draftPages: FileText,
  totalBlogPosts: PenSquare,
  totalServices: Settings,
  totalProducts: ShoppingBag,
  totalTestimonials: MessageCircle,
  totalTeamMembers: Users,
  totalPartners: Handshake,
  totalJobs: Briefcase,
  totalFaqs: HelpCircle,
  totalMediaFiles: Image,
  totalPopups: Megaphone,
  totalForms: MessageSquareText,
  totalCampaigns: Rocket,
}

const labels: Record<string, string> = {
  totalPages: "Total Pages",
  publishedPages: "Published",
  draftPages: "Drafts",
  totalBlogPosts: "Blog Posts",
  totalServices: "Services",
  totalProducts: "Products",
  totalTestimonials: "Testimonials",
  totalTeamMembers: "Team Members",
  totalPartners: "Partners",
  totalJobs: "Jobs",
  totalFaqs: "FAQs",
  totalMediaFiles: "Media Files",
  totalPopups: "Popups",
  totalForms: "Forms",
  totalCampaigns: "Campaigns",
}

export default function CmsDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = () => {
    setLoading(true)
    cmsApi.dashboard()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchStats() }, [])

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {Array.from({ length: 15 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-10 w-16" /><Skeleton className="h-4 w-20 mt-2" /></CardContent></Card>
          ))}
        </div>
      </div>
    )
  }

  const statEntries = stats ? Object.entries(stats).filter(([k]) => k in labels) : []

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">CMS Dashboard</h1>
          <p className="text-muted-foreground">Overview of all content on the platform.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchStats}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {statEntries.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No stats available</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {statEntries.map(([key, value], i) => {
            const Icon = statIcons[key] || FileText
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
              >
                <Card className="hover:shadow-card-hover transition-all">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{labels[key]}</CardTitle>
                    <div className="h-9 w-9 rounded-xl gradient-bg flex items-center justify-center">
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{(value ?? 0).toLocaleString()}</div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
