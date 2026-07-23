"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAdminAuthStore } from "@/stores/use-admin-auth-store"
import {
  LayoutDashboard, Users, HandCoins, CreditCard, Shield, 
  Ticket, FileText, ScrollText, UsersRound, KeyRound,
  BarChart3, Settings, LogOut, ChevronDown, ChevronRight,
} from "lucide-react"
import { useState } from "react"

interface NavSection {
  label: string
  items: { label: string; href: string; icon: React.ElementType }[]
}

const navSections: NavSection[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { label: "Reports", href: "/admin/reports", icon: BarChart3 },
    ],
  },
  {
    label: "Management",
    items: [
      { label: "Users", href: "/admin/users", icon: Users },
      { label: "KYC Verification", href: "/admin/kyc", icon: Shield },
      { label: "Loans", href: "/admin/loans", icon: HandCoins },
      { label: "Payments", href: "/admin/payments", icon: CreditCard },
      { label: "Support Tickets", href: "/admin/tickets", icon: Ticket },
    ],
  },
  {
    label: "Content",
    items: [
      { label: "CMS", href: "/admin/cms", icon: FileText },
      { label: "Affiliates", href: "/admin/affiliates", icon: UsersRound },
    ],
  },
  {
    label: "Security",
    items: [
      { label: "Audit Logs", href: "/admin/audit-logs", icon: ScrollText },
      { label: "Roles & Permissions", href: "/admin/roles", icon: KeyRound },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { logout } = useAdminAuthStore()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside className={cn(
      "hidden lg:flex flex-col border-r border-border bg-background/95 backdrop-blur-xl transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      <div className="p-4 border-b border-border flex items-center gap-3">
        <Link href="/" className="shrink-0">
          <div className="h-8 w-8 rounded-lg gradient-bg flex items-center justify-center">
            <span className="text-white font-bold text-sm">P</span>
          </div>
        </Link>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <span className="font-bold text-sm block truncate">PayAfrika</span>
            <p className="text-[10px] text-muted-foreground truncate">Admin Panel</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="h-6 w-6 rounded-lg border border-border flex items-center justify-center hover:bg-secondary shrink-0"
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      <nav className="flex-1 p-3 overflow-y-auto space-y-4">
        {navSections.map((section) => (
          <div key={section.label}>
            {!collapsed && (
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((link) => {
                const Icon = link.icon
                const isActive = pathname === link.href

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                      collapsed && "justify-center px-0",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    )}
                    title={collapsed ? link.label : undefined}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">{link.label}</span>}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-border">
        <button
          onClick={() => { logout(); router.push("/admin/login") }}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 w-full",
            "text-muted-foreground hover:text-foreground hover:bg-secondary",
            collapsed && "justify-center px-0"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  )
}
