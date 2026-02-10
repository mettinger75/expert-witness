'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { authService } from '@/services/auth.service'
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
  Timer,
  Inbox,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'

interface SubItem {
  title: string
  href: string
}

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  subItems?: SubItem[]
}

const navItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  {
    title: 'Cases',
    href: '/cases',
    icon: Briefcase,
    subItems: [
      { title: 'All Cases', href: '/cases' },
      { title: 'New Case', href: '/cases/new' },
    ],
  },
  { title: 'Inbox', href: '/inbox', icon: Inbox },
  {
    title: 'Contacts',
    href: '/contacts',
    icon: Users,
    subItems: [
      { title: 'All Contacts', href: '/contacts' },
    ],
  },
  { title: 'Documents', href: '/documents', icon: FileText },
  {
    title: 'Billing',
    href: '/billing',
    icon: DollarSign,
    subItems: [
      { title: 'Overview', href: '/billing' },
      { title: 'Rates', href: '/billing/rates' },
    ],
  },
  {
    title: 'Reports',
    href: '/reports',
    icon: FileCheck,
    subItems: [
      { title: 'All Reports', href: '/reports' },
    ],
  },
  { title: 'AI Assistant', href: '/ai', icon: Brain },
  { title: 'Settings', href: '/settings', icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { clearUser, user } = useAuthStore()
  const { activeTimer } = useUIStore()
  const [expanded, setExpanded] = useState(false)
  const [openSections, setOpenSections] = useState<Set<string>>(new Set())

  async function handleLogout() {
    try {
      await authService.logout()
      clearUser()
      router.push('/login')
    } catch {
      toast.error('Logout failed')
    }
  }

  function toggleSection(title: string) {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(title)) {
        next.delete(title)
      } else {
        next.add(title)
      }
      return next
    })
  }

  function isActive(href: string) {
    return pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'))
  }

  function isSectionActive(item: NavItem) {
    if (isActive(item.href)) return true
    if (item.subItems) {
      return item.subItems.some((sub) => isActive(sub.href))
    }
    return false
  }

  return (
    <aside
      className="fixed left-0 top-0 h-full z-40 flex flex-col overflow-hidden"
      style={{
        width: expanded ? 240 : 60,
        background: 'linear-gradient(180deg, #091525 0%, #0E1F35 100%)',
        transition: 'width 200ms ease',
        borderRight: '1px solid rgba(201, 168, 76, 0.15)',
      }}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-3 h-16 shrink-0"
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
        {expanded && (
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-white tracking-wide">Mark Ettinger, M.D.</span>
            <span className="text-[10px] uppercase tracking-[0.15em]" style={{ color: '#C9A84C' }}>
              Expert Witness
            </span>
          </div>
        )}
      </div>

      {/* Gold accent line */}
      <div style={{ height: 2, background: 'linear-gradient(90deg, #C9A84C, #DFC06A, #C9A84C)' }} />

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3">
        <nav className="space-y-0.5">
          {navItems.map((item) => {
            const active = isSectionActive(item)
            const hasSubItems = item.subItems && item.subItems.length > 0
            const isOpen = openSections.has(item.title)

            return (
              <div key={item.href}>
                {/* Main nav item */}
                <div className="flex items-center">
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors flex-1 min-w-0',
                      !expanded && 'justify-center px-0'
                    )}
                    style={{
                      backgroundColor: active ? 'rgba(201, 168, 76, 0.12)' : 'transparent',
                      color: active ? '#C9A84C' : '#8892A2',
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'
                        e.currentTarget.style.color = '#ffffff'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.backgroundColor = 'transparent'
                        e.currentTarget.style.color = '#8892A2'
                      }
                    }}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {expanded && <span className="truncate">{item.title}</span>}
                  </Link>
                  {expanded && hasSubItems && (
                    <button
                      onClick={() => toggleSection(item.title)}
                      className="p-1 rounded hover:bg-white/5 shrink-0"
                      style={{ color: '#8892A2' }}
                    >
                      {isOpen ? (
                        <ChevronDown className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                </div>

                {/* Sub-items */}
                {expanded && hasSubItems && isOpen && (
                  <div
                    className="ml-5 mt-0.5 space-y-0.5 pl-3"
                    style={{ borderLeft: '1px solid rgba(201, 168, 76, 0.2)' }}
                  >
                    {item.subItems!.map((sub) => {
                      const subActive = pathname === sub.href
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          className="block rounded px-2 py-1 text-xs transition-colors"
                          style={{
                            backgroundColor: subActive ? 'rgba(201, 168, 76, 0.1)' : 'transparent',
                            color: subActive ? '#C9A84C' : '#8892A2',
                          }}
                          onMouseEnter={(e) => {
                            if (!subActive) {
                              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'
                              e.currentTarget.style.color = '#ffffff'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!subActive) {
                              e.currentTarget.style.backgroundColor = 'transparent'
                              e.currentTarget.style.color = '#8892A2'
                            }
                          }}
                        >
                          {sub.title}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
      </div>

      {/* Active Timer Indicator */}
      {activeTimer && (
        <>
          <div style={{ borderTop: '1px solid rgba(201, 168, 76, 0.15)' }} />
          <Link
            href={`/cases/${activeTimer.caseId}/billing`}
            className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5"
            style={{ color: '#C9A84C' }}
          >
            <Timer className="h-4 w-4 animate-pulse shrink-0" />
            {expanded && (
              <span className="truncate">Timer: {activeTimer.caseName}</span>
            )}
          </Link>
        </>
      )}

      <div style={{ borderTop: '1px solid rgba(201, 168, 76, 0.15)' }} />

      {/* User menu / Footer */}
      <div className="p-2 space-y-1">
        {expanded && user && (
          <div className="px-3 py-1 mb-1">
            <p className="text-xs truncate" style={{ color: '#8892A2' }}>{user.email}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-white/5"
          style={{ color: '#8892A2' }}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {expanded && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  )
}
