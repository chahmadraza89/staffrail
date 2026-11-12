"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"
import { Activity, Bell, GraduationCap, Home, ShieldCheck, Users } from "lucide-react"

import { NotificationBell } from "@/components/admin/notification-bell"
import { SignOutButton } from "@/components/auth/sign-out-button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/**
 * Admin web shell — port of the Flutter AdminWebNavigation
 * (lib/features/shell/admin_shell/web/admin_navigation_web.dart):
 * fixed 260px sidebar, app logo, Dashboard / Directory / Training / Verify.
 */

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: Home, matchPrefix: false },
  { href: "/dashboard/directory", label: "Directory", icon: Users, matchPrefix: true },
  { href: "/dashboard/training", label: "Training", icon: GraduationCap, matchPrefix: true },
  { href: "/dashboard/verify", label: "Verify", icon: ShieldCheck, matchPrefix: true },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell, matchPrefix: true },
  { href: "/dashboard/audit", label: "Audit Logs", icon: Activity, matchPrefix: true },
]

interface AdminShellProps {
  adminUid?: string
  adminEmail: string
  adminName: string
  children: ReactNode
}

export function AdminShell({ adminUid, adminEmail, adminName, children }: AdminShellProps) {
  const pathname = usePathname()

  return (
    <div className="bg-background flex min-h-svh">
      <Sidebar activePath={pathname} />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          adminUid={adminUid}
          adminEmail={adminEmail}
          adminName={adminName}
          activePath={pathname}
        />

        <main className="bg-muted/40 flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  )
}

function Sidebar({ activePath }: { activePath: string }) {
  return (
    <aside className="bg-background sticky top-0 flex h-svh w-[260px] shrink-0 flex-col border-r">
      {/* 1. app logo & header */}
      <div className="px-6 pt-8 pb-6">
        <span className="text-primary text-lg font-bold tracking-tight">StaffRail</span>
        <p className="text-muted-foreground text-xs">Admin Console</p>
      </div>

      {/* 2. navigation items */}
      <nav className="flex-1 space-y-1 px-4">
        {NAV_ITEMS.map((item) => {
          const isActive = item.matchPrefix
            ? activePath.startsWith(item.href)
            : activePath === item.href
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors " +
                (isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground")
              }
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <p className="text-muted-foreground px-6 pb-6 text-[11px]">
        Local demo workspace · StaffRail compliance portal
      </p>
    </aside>
  )
}

function TopBar({
  adminUid,
  adminEmail,
  adminName,
  activePath,
}: {
  adminUid?: string
  adminEmail: string
  adminName: string
  activePath: string
}) {
  const initials = adminName
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-20 border-b backdrop-blur">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="min-w-0 text-sm">
          <p className="text-muted-foreground truncate">
            Signed in as <span className="text-foreground font-medium">{adminEmail}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {adminUid ? (
            <NotificationBell
              userId={adminUid}
              href="/dashboard/notifications"
              active={activePath.startsWith("/dashboard/notifications")}
            />
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="bg-primary/10 text-primary hover:bg-primary/20 flex size-9 items-center justify-center rounded-full text-xs font-semibold transition-colors"
                aria-label="Account menu"
              >
                {initials || "AD"}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="truncate">
                {adminName}
                <p className="text-muted-foreground text-xs font-normal">{adminEmail}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/profile">Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="p-1">
                <SignOutButton className="w-full justify-start" variant="ghost" />
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
