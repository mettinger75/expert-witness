'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { authService } from '@/services/auth.service'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  ChevronLeft,
  ChevronRight,
  Timer,
  Inbox,
} from 'lucide-react'
import { toast } from 'sonner'

const navItems = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Cases', href: '/cases', icon: Briefcase },
  { title: 'Inbox', href: '/inbox', icon: Inbox },
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
        'flex flex-col h-screen border-r transition-all duration-200',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
      style={{
        background: 'linear-gradient(180deg, #091525 0%, #0E1F35 100%)',
        borderColor: 'rgba(201, 168, 76, 0.15)',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-4 h-16 shrink-0"
        style={{ borderBottom: '1px solid rgba(201, 168, 76, 0.15)' }}
      >
        <div
          className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: '#C9A84C' }}
        >
          <svg viewBox="0 0 310 310" width={22} height={22} xmlns="http://www.w3.org/2000/svg">
            <path fill="#FFFFFF" d="M306.8,157.5l-114.9-28.1,52.4-66.5-68.3,50.8L152.8,0l-28.5,113.7L58.6,60.3l49.9,67.6L0,151.8l107.6,27.5-52,66.1,66.6-49.7,24.6,114.4,27.6-113.2,69.1,55.1-52.9-70.6,116.3-24ZM285.3,157l-114.4-1.9,17.3-22.1,97.1,24ZM230.1,76.5l-80.8,77.7v-18.2l80.8-59.5ZM152.2,21l-2.2,112.1-22-16.9,24.2-95.1ZM16.5,152l111,2.2-16.6,22-94.4-24.2ZM70.1,231.2l79.1-76.2h-18.2l-58.5-79.7,76.7,79.7-.9,19.3-78.2,56.8ZM147.5,289.3l1.8-113.2,21.9,17-23.7,96.1ZM228,235.3l-77.7-80.2h17.6l60.1,80.2Z"/>
          </svg>
        </div>
        {!sidebarCollapsed && (
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-white tracking-wide">Expert Witness</span>
            <span className="text-[10px] uppercase tracking-[0.15em]" style={{ color: '#C9A84C' }}>
              Practice Manager
            </span>
          </div>
        )}
      </div>

      {/* Gold accent line */}
      <div style={{ height: 2, background: 'linear-gradient(90deg, #C9A84C, #DFC06A, #C9A84C)' }} />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-3">
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
                  sidebarCollapsed && 'justify-center px-2'
                )}
                style={{
                  backgroundColor: isActive ? 'rgba(201, 168, 76, 0.12)' : 'transparent',
                  color: isActive ? '#C9A84C' : '#8892A2',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'
                    e.currentTarget.style.color = '#ffffff'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = '#8892A2'
                  }
                }}
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
          <div style={{ borderTop: '1px solid rgba(201, 168, 76, 0.15)' }} />
          <Link
            href={`/cases/${activeTimer.caseId}/billing`}
            className="flex items-center gap-2 px-4 py-2 text-xs hover:bg-white/5"
            style={{ color: '#C9A84C' }}
          >
            <Timer className="h-4 w-4 animate-pulse shrink-0" />
            {!sidebarCollapsed && (
              <span className="truncate">Timer: {activeTimer.caseName}</span>
            )}
          </Link>
        </>
      )}

      <div style={{ borderTop: '1px solid rgba(201, 168, 76, 0.15)' }} />

      {/* Footer */}
      <div className="p-2 space-y-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="w-full justify-start hover:bg-white/5"
          style={{ color: '#8892A2' }}
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
          className="w-full justify-start hover:bg-white/5"
          style={{ color: '#8892A2' }}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!sidebarCollapsed && <span className="ml-2">Sign Out</span>}
        </Button>
      </div>
    </aside>
  )
}
