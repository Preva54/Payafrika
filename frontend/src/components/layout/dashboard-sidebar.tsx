"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/stores/use-auth-store"
import {
  LayoutDashboard, Wallet, ArrowLeftRight, HandCoins,
  Bell, Settings, User, FileText, HelpCircle, LogOut, Shield, Repeat,
  UserCheck, Send, ArrowDownLeft, Building2, History, CalendarClock, Banknote,
} from "lucide-react"

const mainLinks = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Wallet", href: "/dashboard/wallet", icon: Wallet },
  { label: "Exchange", href: "/dashboard/exchange", icon: Repeat },
  { label: "Transactions", href: "/dashboard/transactions", icon: ArrowLeftRight },
  { label: "Loans", href: "/dashboard/loans", icon: HandCoins },
]

const paymentLinks = [
  { label: "Send Money", href: "/dashboard/payments?tab=send", icon: Send },
  { label: "Receive Money", href: "/dashboard/payments?tab=receive", icon: ArrowDownLeft },
  { label: "Bank Transfer", href: "/dashboard/payments?tab=transfers", icon: Building2 },
  { label: "Beneficiaries", href: "/dashboard/beneficiaries", icon: UserCheck },
  { label: "Payment History", href: "/dashboard/payments?tab=history", icon: History },
  { label: "Scheduled Payments", href: "/dashboard/payments?tab=bills", icon: CalendarClock },
  { label: "Payment Methods", href: "/dashboard/settings?section=payment-methods", icon: Banknote },
]

const accountLinks = [
  { label: "KYC Verification", href: "/dashboard/kyc", icon: Shield },
  { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
  { label: "Profile", href: "/dashboard/profile", icon: User },
  { label: "Documents", href: "/dashboard/documents", icon: FileText },
  { label: "Support", href: "/dashboard/support", icon: HelpCircle },
]

function isActive(pathname: string, search: string, href: string): boolean {
  const [path, query] = href.split("?")
  if (!query) return pathname === path || pathname.startsWith(path + "/")

  const paramName = query.split("=")[0]
  const paramValue = query.split("=")[1]
  return pathname === path && new URLSearchParams(search).get(paramName) === paramValue
}

export function DashboardSidebar({ type = "customer" }: { type?: "customer" | "business" | "admin" }) {
  const pathname = usePathname()
  const router = useRouter()
  const { logout } = useAuthStore()
  const [search, setSearch] = useState("")

  useEffect(() => {
    setSearch(window.location.search)
  }, [pathname])

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-background/95 backdrop-blur-xl">
      <div className="p-4 border-b border-border">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg gradient-bg flex items-center justify-center">
            <span className="text-white font-bold text-sm">P</span>
          </div>
          <div>
            <span className="font-bold text-sm">PayAfrika</span>
            <p className="text-[10px] text-muted-foreground capitalize">{type} Dashboard</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
        <SidebarGroup title="General" links={mainLinks} pathname={pathname} search={search} />
        <SidebarGroup title="Payments" links={paymentLinks} pathname={pathname} search={search} />
        <SidebarGroup title="Account" links={accountLinks} pathname={pathname} search={search} />
      </nav>

      <div className="p-3 border-t border-border">
        <button
          onClick={() => { logout(); router.push("/auth/login") }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all w-full"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}

function SidebarGroup({ title, links, pathname, search }: {
  title: string
  links: { label: string; href: string; icon: typeof Send }[]
  pathname: string
  search: string
}) {
  return (
    <div>
      <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">{title}</p>
      <div className="space-y-1">
        {links.map((link) => {
          const Icon = link.icon
          const active = isActive(pathname, search, link.href)

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                active
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
