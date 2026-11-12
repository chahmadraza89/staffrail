"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"
import {
  Bell,
  BookOpenCheck,
  FileText,
  GraduationCap,
  Home,
  MessageSquare,
  ShieldCheck,
} from "lucide-react"

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

const EMPLOYEE_NAV_ITEMS = [
  { href: "/employee", label: "Dashboard", icon: Home, matchPrefix: false },
  { href: "/employee/guide", label: "Guide", icon: BookOpenCheck, matchPrefix: true },
  { href: "/employee/training", label: "Trainings", icon: GraduationCap, matchPrefix: true },
  { href: "/employee/clearance", label: "Verify", icon: ShieldCheck, matchPrefix: true },
  { href: "/employee/messages", label: "Messages", icon: MessageSquare, matchPrefix: true },
  { href: "/employee/notifications", label: "Notifications", icon: Bell, matchPrefix: true },
]

export interface EmployeeShellProps {
  employeeUid: string
  employeeEmail: string
  employeeName: string
  children: ReactNode
}

export function EmployeeShell({
  employeeUid,
  employeeEmail,
  employeeName,
  children,
}: EmployeeShellProps) {
  const pathname = usePathname()

  const initials = employeeName
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <div className="bg-background flex min-h-svh">
      <aside className="bg-background sticky top-0 hidden h-svh w-[250px] shrink-0 flex-col border-r md:flex">
        <div className="px-6 pt-8 pb-6">
          <span className="text-primary text-lg font-bold tracking-tight">StaffRail</span>
          <p className="text-muted-foreground text-xs">Employee Portal</p>
        </div>

        <nav className="flex-1 space-y-1 px-4" aria-label="Employee Navigation">
          {EMPLOYEE_NAV_ITEMS.map((item) => {
            const isActive = item.matchPrefix
              ? pathname.startsWith(item.href)
              : pathname === item.href
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

        <div className="border-t p-4">
          <Link
            href="/employee/profile/documents"
            className="text-muted-foreground hover:text-foreground flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium"
          >
            <FileText className="size-3.5" />
            Document Center
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-20 border-b backdrop-blur">
          <div className="flex items-center justify-between px-6 py-3">
            <div className="min-w-0 text-sm">
              <p className="text-muted-foreground truncate">
                Welcome, <span className="text-foreground font-medium">{employeeName}</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <NotificationBell
                userId={employeeUid}
                href="/employee/notifications"
                active={pathname.startsWith("/employee/notifications")}
              />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="bg-primary/10 text-primary hover:bg-primary/20 flex size-9 items-center justify-center rounded-full text-xs font-semibold transition-colors"
                    aria-label="Employee account menu"
                  >
                    {initials || "EM"}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="truncate">
                    {employeeName}
                    <p className="text-muted-foreground text-xs font-normal">{employeeEmail}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/employee/profile">Profile &amp; Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/employee/profile/documents">Document Center</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/employee/profile/support">Contact Support</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <div className="p-1">
                    <SignOutButton className="w-full justify-start" variant="ghost" />
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <nav className="flex gap-1 overflow-x-auto border-t px-4 py-2 md:hidden">
            {EMPLOYEE_NAV_ITEMS.map((item) => {
              const isActive = item.matchPrefix
                ? pathname.startsWith(item.href)
                : pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    "shrink-0 rounded-md px-2.5 py-1 text-xs font-medium " +
                    (isActive ? "bg-primary/10 text-primary" : "text-muted-foreground")
                  }
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </header>

        <main className="bg-muted/40 flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  )
}
