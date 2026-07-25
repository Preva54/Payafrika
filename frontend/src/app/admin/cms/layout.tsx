"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, FileText, PenSquare, FolderOpen, Settings, ShoppingBag,
  MessageCircle, Users, Handshake, Briefcase, HelpCircle, Image, Menu,
  ArrowDownToLine, Megaphone, MessageSquareText, Scale, BookOpen, HeadphonesIcon, Rocket,
} from "lucide-react"

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/admin/cms", icon: LayoutDashboard },
  { label: "Pages", href: "/admin/cms/pages", icon: FileText },
  { label: "Blog Posts", href: "/admin/cms/blog/posts", icon: PenSquare },
  { label: "Blog Categories", href: "/admin/cms/blog/categories", icon: FolderOpen },
  { label: "Services", href: "/admin/cms/services", icon: Settings },
  { label: "Products", href: "/admin/cms/products", icon: ShoppingBag },
  { label: "Testimonials", href: "/admin/cms/testimonials", icon: MessageCircle },
  { label: "Team", href: "/admin/cms/team", icon: Users },
  { label: "Partners", href: "/admin/cms/partners", icon: Handshake },
  { label: "Careers", href: "/admin/cms/careers", icon: Briefcase },
  { label: "FAQ", href: "/admin/cms/faq", icon: HelpCircle },
  { label: "Media Library", href: "/admin/cms/media", icon: Image },
  { label: "Navigation", href: "/admin/cms/navigation", icon: Menu },
  { label: "Footer", href: "/admin/cms/footer", icon: ArrowDownToLine },
  { label: "Popups", href: "/admin/cms/popups", icon: Megaphone },
  { label: "Announcements", href: "/admin/cms/announcements", icon: MessageSquareText },
  { label: "Forms", href: "/admin/cms/forms", icon: MessageSquareText },
  { label: "Legal Pages", href: "/admin/cms/legal", icon: Scale },
  { label: "API Docs", href: "/admin/cms/api-docs", icon: BookOpen },
  { label: "Support Content", href: "/admin/cms/support-content", icon: HeadphonesIcon },
  { label: "Campaigns", href: "/admin/cms/campaigns", icon: Rocket },
]

export default function CmsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex gap-6">
      <aside className="w-56 shrink-0 hidden lg:block">
        <nav className="space-y-0.5 sticky top-6">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive =
              item.href === "/admin/cms"
                ? pathname === "/admin/cms"
                : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </aside>
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  )
}
