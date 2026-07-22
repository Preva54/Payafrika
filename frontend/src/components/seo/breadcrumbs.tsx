import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"
import { BreadcrumbSchema } from "./schema-markup"

interface BreadcrumbItem {
  name: string
  url: string
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const allItems = [{ name: "Home", url: "/" }, ...items]

  return (
    <>
      <BreadcrumbSchema items={allItems} />
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
        <Link href="/" className="hover:text-foreground transition-colors">
          <Home className="h-4 w-4" />
        </Link>
        {items.map((item, index) => (
          <span key={item.url} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3" />
            {index === items.length - 1 ? (
              <span className="text-foreground font-medium" aria-current="page">
                {item.name}
              </span>
            ) : (
              <Link href={item.url} className="hover:text-foreground transition-colors">
                {item.name}
              </Link>
            )}
          </span>
        ))}
      </nav>
    </>
  )
}
