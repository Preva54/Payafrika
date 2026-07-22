"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Calendar, Clock, ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const posts = [
  {
    title: "How PayAfrika is Transforming Cross-Border Trade in Africa",
    excerpt: "Discover how our platform is breaking down barriers and making cross-border trade accessible to businesses of all sizes across the continent.",
    category: "Trade",
    author: "PayAfrika Team",
    date: "July 15, 2026",
    readTime: "5 min read",
    gradient: "from-payafrika-500 to-sky",
  },
  {
    title: "The Future of Digital Payments in Africa: 2026 and Beyond",
    excerpt: "Explore the trends shaping Africa's digital payment landscape and how PayAfrika is at the forefront of this financial revolution.",
    category: "Finance",
    author: "PayAfrika Team",
    date: "July 12, 2026",
    readTime: "7 min read",
    gradient: "from-accent to-green-500",
  },
  {
    title: "Small Business Guide: Securing Your First Business Loan",
    excerpt: "Everything you need to know about applying for and securing a business loan for your African enterprise.",
    category: "Business",
    author: "PayAfrika Team",
    date: "July 8, 2026",
    readTime: "10 min read",
    gradient: "from-amber-500 to-orange-500",
  },
  {
    title: "Cryptocurrency in Africa: Opportunities and Challenges",
    excerpt: "A comprehensive look at how digital currencies are gaining traction across African markets and what it means for your business.",
    category: "Cryptocurrency",
    author: "PayAfrika Team",
    date: "July 5, 2026",
    readTime: "6 min read",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    title: "Import/Export Documentation: A Complete Guide",
    excerpt: "Navigate the complex world of trade documentation with our comprehensive guide to import and export paperwork.",
    category: "Trade",
    author: "PayAfrika Team",
    date: "June 28, 2026",
    readTime: "12 min read",
    gradient: "from-payafrika-500 to-sky",
  },
  {
    title: "Why African Businesses Are Choosing Digital-First Banking",
    excerpt: "The shift towards digital banking in Africa is accelerating. Here's why forward-thinking businesses are making the switch.",
    category: "Finance",
    author: "PayAfrika Team",
    date: "June 22, 2026",
    readTime: "4 min read",
    gradient: "from-accent to-green-500",
  },
]

export default function BlogPage() {
  return (
    <div className="min-h-screen pt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <Badge variant="premium" className="mb-4">Blog</Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Insights &{" "}
            <span className="gradient-text">Updates</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            The latest news, guides, and insights from the PayAfrika team.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post, i) => (
            <motion.article
              key={post.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="group glass-card rounded-2xl overflow-hidden hover:shadow-card-hover transition-all duration-300"
            >
              <div className={`h-48 bg-gradient-to-br ${post.gradient} flex items-center justify-center`}>
                <div className="text-white/20 text-6xl font-bold">{post.category[0]}</div>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="secondary" className="text-[10px]">{post.category}</Badge>
                  <span className="text-[10px] text-muted-foreground">{post.date}</span>
                </div>
                <h2 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                  {post.title}
                </h2>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{post.excerpt}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {post.readTime}
                  </div>
                  <Button variant="ghost" size="sm" className="group/btn">
                    Read More
                    <ArrowRight className="ml-1 h-3 w-3 group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </div>
  )
}
