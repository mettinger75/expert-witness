'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { authService } from '@/services/auth.service'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  LayoutDashboard,
  Briefcase,
  Users,
  FileText,
  DollarSign,
  FileCheck,
  Brain,
  Settings,
  LogOut,
  Scale,
  ChevronLeft,
  ChevronRight,
  Timer,
} from 'lucide-react'
import { toast } from 'sonner'

const navItems = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Cases', href: '/cases', icon: Briefcase },
  { title: 'Contacts', href: '/contacts', icon: Users },
  { title: 'Documents', href: '/documents', icon: FileText },
  { title: 'Billing', href: '/billing', icon: DollarSign },
  { title: 'Reports', href: '/reports', icon: FileCheck },
  { title: 'AI Assistant', href: '/ai', icon: Brain },
  { title: 'Settings', href: '/settings', icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { clearUser } = useAuthStore()
  const { sidebarCollapsed, toggleSidebar, activeTimer } = useUIStore()

  async function handleLogout() {
    try {
      await authService.logout()
      clearUser()
      router.push('/login')
    } catch {
      toast.error('Logout failed')
    }
  }

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-200',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 shrink-0">
        <div className="h-9 w-9 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
          <Scale className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        {!sidebarCollapsed && (
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold truncate">Expert Witness</span>
            <span className="text-xs text-sidebar-foreground/60 truncate">Practice Manager</span>
          </div>
        )}
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-2">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href))

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!sidebarCollapsed && <span>{item.title}</span>}
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      {/* Active Timer Indicator */}
      {activeTimer && (
        <>
          <Separator className="bg-sidebar-border" />
          <Link
            href={`/cases/${activeTimer.caseId}/billing`}
            className="flex items-center gap-2 px-4 py-2 text-xs text-sidebar-primary hover:bg-sidebar-accent/50"
          >
            <Timer className="h-4 w-4 animate-pulse shrink-0" />
            {!sidebarCollapsed && (
              <span className="truncate">Timer: {activeTimer.caseName}</span>
            )}
          </Link>
        </>
      )}

      <Separator className="bg-sidebar-border" />

      {/* Footer */}
      <div className="p-2 space-y-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span>Collapse</span>
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!sidebarCollapsed && <span className="ml-2">Sign Out</span>}
        </Button>
      </div>
    </aside>
  )
}
