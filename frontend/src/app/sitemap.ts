import type { MetadataRoute } from "next"

const baseUrl = "https://payafrika.com"

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 1.0 },
    { url: `${baseUrl}/auth/login`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.5 },
    { url: `${baseUrl}/auth/register`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${baseUrl}/auth/forgot-password`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.3 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.7 },
    { url: `${baseUrl}/dashboard`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.2 },
    { url: `${baseUrl}/business`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.2 },
    { url: `${baseUrl}/admin`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.1 },
  ]

  const blogPosts = [
    { slug: "transforming-cross-border-trade", date: "2026-07-15" },
    { slug: "future-digital-payments-africa", date: "2026-07-12" },
    { slug: "small-business-guide-loan", date: "2026-07-08" },
    { slug: "cryptocurrency-africa-opportunities", date: "2026-07-05" },
    { slug: "import-export-documentation-guide", date: "2026-06-28" },
    { slug: "digital-first-banking-africa", date: "2026-06-22" },
  ]

  const blogRoutes = blogPosts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }))

  return [...staticRoutes, ...blogRoutes]
}
