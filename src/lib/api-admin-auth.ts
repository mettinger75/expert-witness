import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Require an authenticated internal (dashboard) user before a route handler
 * uses the Supabase service role.
 *
 * The protected app layout only guards the browser; API route handlers do NOT
 * inherit that protection. Since Supabase auth lives client-side, dashboard
 * fetches must attach `Authorization: Bearer <access_token>` (see
 * `authHeaders()` in `@/lib/api-client`). This validates that token with the
 * anon client.
 *
 * Usage:
 *   const auth = await requireAdminUser(request)
 *   if (auth.error) return auth.error
 *   // ...auth.user is the verified Supabase user
 */
type AdminOk = { error?: undefined; user: { id: string; email?: string } }
type AdminErr = { error: NextResponse; user?: undefined }

export async function requireAdminUser(request: NextRequest): Promise<AdminOk | AdminErr> {
  const header = request.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : ''

  if (!token) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    return { error: NextResponse.json({ error: 'Auth not configured' }, { status: 500 }) }
  }

  const supabase = createClient(url, anon)
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  return { user: { id: data.user.id, email: data.user.email ?? undefined } }
}
