"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ThumbsUp, ThumbsDown, Eye, Share2, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { supportApi, KnowledgeBaseArticle } from "@/lib/api"
import { formatDistanceToNow, format } from "date-fns"

interface ArticlePageProps {
  params: Promise<{ slug: string }>
}

export default function ArticlePage({ params }: ArticlePageProps) {
  const [article, setArticle] = useState<KnowledgeBaseArticle | null>(null)
  const [loading, setLoading] = useState(true)
  const [helpful, setHelpful] = useState<"helpful" | "not-helpful" | null>(null)

  useEffect(() => {
    fetchArticle()
  }, [])

  const fetchArticle = async () => {
    const { slug } = await params
    try {
      const response = await supportApi.getKnowledgeBaseArticle(slug)
      setArticle(response)
    } catch (error) {
      console.error("Failed to fetch article:", error)
      notFound()
    } finally {
      setLoading(false)
    }
  }

  const handleFeedback = async (type: "helpful" | "not-helpful") => {
    if (!article) return
    setHelpful(type)
    // In a real app, you would call an API to submit feedback
    console.log(`Article ${type}:`, article.id)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-1/4 animate-pulse bg-muted rounded" />
        <Card>
          <CardContent className="py-12">
            <div className="space-y-4 max-w-3xl">
              <div className="h-4 w-full animate-pulse bg-muted rounded" />
              <div className="h-4 w-3/4 animate-pulse bg-muted rounded" />
              <div className="h-4 w-full animate-pulse bg-muted rounded" />
              <div className="h-4 w-full animate-pulse bg-muted rounded" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!article) {
    notFound()
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/dashboard/support" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ChevronLeft className="h-4 w-4" />
        Back to Knowledge Base
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="capitalize">{article.category}</Badge>
            {article.isFeatured && <Badge className="bg-yellow-100 text-yellow-800">Featured</Badge>}
            <Badge variant="outline">{article.status}</Badge>
          </div>
          <h1 className="text-3xl font-bold">{article.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="prose prose-gray max-w-none">
            <div className="whitespace-pre-wrap">{article.content}</div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">Was this article helpful?</span>
        <Button
          variant={helpful === "helpful" ? "default" : "outline"}
          size="sm"
          onClick={() => handleFeedback("helpful")}
          className="gap-2"
        >
          <ThumbsUp className="h-4 w-4" />
          Yes ({article.helpfulCount})
        </Button>
        <Button
          variant={helpful === "not-helpful" ? "destructive" : "outline"}
          size="sm"
          onClick={() => handleFeedback("not-helpful")}
          className="gap-2"
        >
          <ThumbsDown className="h-4 w-4" />
          No ({article.notHelpfulCount})
        </Button>
      </div>

      <Separator className="my-6" />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            {article.viewCount.toLocaleString()} views
          </span>
          <span>•</span>
          <span>Updated {formatDistanceToNow(new Date(article.updatedAt), { addSuffix: true })}</span>
          {article.publishedAt && (
            <>
              <span>•</span>
              <span>Published {format(new Date(article.publishedAt), "MMM d, yyyy")}</span>
            </>
          )}
          {article.authorName && (
            <>
              <span>•</span>
              <span>By {article.authorName}</span>
            </>
          )}
        </div>
        <Link href="/dashboard/support" className="text-sm font-medium text-primary hover:underline">
          Browse more articles
        </Link>
      </div>
    </div>
  )
}