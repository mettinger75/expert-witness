'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/stores/authStore'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function LoginPage() {
  const router = useRouter()
  const { setUser, setLoading } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const data = await authService.login(email, password)
      if (data.user) {
        setUser({ id: data.user.id, email: data.user.email ?? '' })
        setLoading(false)
        router.push('/dashboard')
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Login failed'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8F9FB' }}>
      <div className="w-full max-w-md bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
        {/* Navy header */}
        <div className="px-6 py-6 text-center" style={{ backgroundColor: '#091525' }}>
          <div className="flex justify-center mb-3">
            <div className="rounded-2xl p-3" style={{ backgroundColor: 'rgba(201, 168, 76, 0.15)' }}>
              <svg viewBox="0 0 310 310" width={48} height={48} xmlns="http://www.w3.org/2000/svg">
                <path fill="#C9A84C" d="M306.8,157.5l-114.9-28.1,52.4-66.5-68.3,50.8L152.8,0l-28.5,113.7L58.6,60.3l49.9,67.6L0,151.8l107.6,27.5-52,66.1,66.6-49.7,24.6,114.4,27.6-113.2,69.1,55.1-52.9-70.6,116.3-24ZM285.3,157l-114.4-1.9,17.3-22.1,97.1,24ZM230.1,76.5l-80.8,77.7v-18.2l80.8-59.5ZM152.2,21l-2.2,112.1-22-16.9,24.2-95.1ZM16.5,152l111,2.2-16.6,22-94.4-24.2ZM70.1,231.2l79.1-76.2h-18.2l-58.5-79.7,76.7,79.7-.9,19.3-78.2,56.8ZM147.5,289.3l1.8-113.2,21.9,17-23.7,96.1ZM228,235.3l-77.7-80.2h17.6l60.1,80.2Z"/>
              </svg>
            </div>
          </div>
          <h1
            className="text-xl font-semibold text-white"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Expert Witness Portal
          </h1>
          <p className="text-xs mt-1" style={{ color: '#B0B8C5' }}>
            Sign in to manage your cases and practice
          </p>
        </div>
        {/* Gold accent line */}
        <div style={{ height: 2, background: 'linear-gradient(90deg, #C9A84C, #DFC06A, #C9A84C)' }} />
        {/* Form */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-neutral-500">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-neutral-500">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-4 py-2.5 text-sm text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{ backgroundColor: '#091525' }}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
