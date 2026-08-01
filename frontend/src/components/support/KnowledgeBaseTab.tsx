"use client"

import { useEffect, useState } from "react"
import { Search, ChevronRight, Star, Eye, HelpCircle, BookOpen, Loader2, ChevronLeft, ThumbsUp, ThumbsDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supportApi, KnowledgeBaseArticle, PaginatedResponse } from "@/lib/api"
import Link from "next/link"

const CATEGORIES = [
  { key: "general", label: "General", icon: HelpCircle },
  { key: "billing", label: "Billing & Payments", icon: "CreditCard" },
  { key: "account", label: "Account & Login", icon: "User" },
  { key: "transfers", label: "Transfers & Exchange", icon: "ArrowRightLeft" },
  { key: "loans", label: "Loans & Credit", icon: "CreditCard" },
  { key: "security", label: "Security & Privacy", icon: "Shield" },
  { key: "technical", label: "Technical Issues", icon: "Monitor" },
]

export function KnowledgeBaseTab() {
  const [articles, setArticles] = useState<KnowledgeBaseArticle[]>([])
  const [featuredArticles, setFeaturedArticles] = useState<KnowledgeBaseArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState({ page: 1, limit: 12, category: "", search: "", isFeatured: false })
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [activeCategory, setActiveCategory] = useState<string>("all")

  useEffect(() => {
    fetchArticles()
    fetchFeaturedArticles()
  }, [query])

  const fetchArticles = async () => {
    setLoading(true)
    try {
      const response = await supportApi.getKnowledgeBase(query)
      setArticles(response.data)
      setTotalPages(response.totalPages)
      setTotal(response.total)
    } catch (error) {
      console.error("Failed to fetch articles:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchFeaturedArticles = async () => {
    try {
      const response = await supportApi.getKnowledgeBase({ isFeatured: true, limit: 5 })
      setFeaturedArticles(response.data)
    } catch (error) {
      console.error("Failed to fetch featured articles:", error)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setQuery({ ...query, search: query.search, page: 1 })
  }

  const getIcon = (name: string) => {
    const icons: Record<string, React.ComponentType<{ className?: string }>> = {
      HelpCircle: () => <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.5-3.146 2.5-1.85 0-2.73-.89-3.038-1.65" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
      CreditCard: () => <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v7a3 3 0 003 3z" /></svg>,
      User: () => <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
      ArrowRightLeft: () => <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>,
      Shield: () => <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
      Monitor: () => <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
    }
    return icons[name] || icons.HelpCircle
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <CardTitle>Knowledge Base</CardTitle>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="py-6">
                <div className="space-y-3">
                  <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-full bg-muted animate-pulse rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Knowledge Base</h1>
          <p className="text-muted-foreground">Find answers to common questions and learn more about PayAfrika</p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Search articles..."
          value={query.search}
          onChange={(e) => setQuery({ ...query, search: e.target.value })}
          className="pl-10"
        />
      </form>

      {featuredArticles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <CardTitle>Featured Articles</CardTitle>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {featuredArticles.map((article) => (
              <ArticleCard key={article.id} article={article} featured />
            ))}
          </div>
        </div>
      )}

      <Tabs value={activeCategory} onValueChange={setActiveCategory} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 md:grid-cols-8 gap-2">
          <TabsTrigger value="all" className="capitalize">All</TabsTrigger>
          {CATEGORIES.map((cat) => (
            <TabsTrigger key={cat.key} value={cat.key} className="capitalize text-sm">
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all">
          <ArticleList articles={articles} loading={loading} />
        </TabsContent>

        {CATEGORIES.map((cat) => (
          <TabsContent key={cat.key} value={cat.key}>
            <ArticleList articles={articles.filter((a) => a.category === cat.key)} loading={loading} />
          </TabsContent>
        ))}
      </Tabs>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setQuery({ ...query, page: query.page - 1 })} disabled={query.page <= 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">Page {query.page} of {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setQuery({ ...query, page: query.page + 1 })} disabled={query.page >= totalPages}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

function ArticleList({ articles, loading }: { articles: KnowledgeBaseArticle[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardContent className="py-6">
              <div className="space-y-3">
                <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
                <div className="h-4 w-full bg-muted animate-pulse rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (articles.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-1">No articles found</h3>
          <p className="text-muted-foreground">Try adjusting your search or browse a different category</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} />
      ))}
    </div>
  )
}

function ArticleCard({ article, featured }: { article: KnowledgeBaseArticle; featured?: boolean }) {
  const IconComponent = getCategoryIcon(article.category)

  return (
    <Link href={`/dashboard/support/knowledge-base/${article.slug}`}>
      <Card className={`hover:shadow-lg transition-shadow ${featured ? "border-primary/30" : ""}`}>
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <IconComponent className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {featured && <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />}
                <Badge variant="outline" className="text-xs capitalize">{article.category}</Badge>
              </div>
              <h3 className="font-medium text-lg line-clamp-1">{article.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{article.excerpt || article.content.slice(0, 150)}</p>
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {article.viewCount.toLocaleString()} views
                </span>
                <span className="flex items-center gap-1">
                  <HelpCircle className="h-3 w-3" />
                  {article.helpfulCount} helpful
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function getCategoryIcon(category: string) {
  const cat = CATEGORIES.find((c) => c.key === category)
  if (!cat) return getIcon("HelpCircle")
  return typeof cat.icon === "string" ? getIcon(cat.icon) : cat.icon
}

function getIcon(name: string) {
  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    HelpCircle: () => <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.5-3.146 2.5-1.85 0-2.73-.89-3.038-1.65" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    CreditCard: () => <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v7a3 3 0 003 3z" /></svg>,
    User: () => <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
    ArrowRightLeft: () => <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>,
    Shield: () => <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
    Monitor: () => <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  }
  return icons[name] || icons.HelpCircle
}