'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, setUser, setLoading, _hasHydrated } = useAuthStore()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (!_hasHydrated) return

    async function checkAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setUser({ id: session.user.id, email: session.user.email ?? '' })
          setLoading(false)
        } else {
          router.push('/login')
          return
        }
      } catch {
        router.push('/login')
        return
      }
      setChecking(false)
    }

    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          setUser(null)
          router.push('/login')
        } else {
          setUser({ id: session.user.id, email: session.user.email ?? '' })
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [_hasHydrated, router, setUser, setLoading])

  if (!_hasHydrated || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}
