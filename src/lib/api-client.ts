import { supabase } from '@/lib/supabase'

/**
 * Returns an `Authorization: Bearer <access_token>` header for the current
 * dashboard user, or `{}` if there is no session. Spread into fetch headers on
 * any call to an admin-protected API route:
 *
 *   const res = await fetch('/api/portal?caseId=' + id, {
 *     headers: { ...(await authHeaders()) },
 *   })
 */
export async function authHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
}
