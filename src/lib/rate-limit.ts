import { getSupabaseAdmin } from '@/lib/supabase-admin'

/**
 * DB-backed sliding-window rate limit (there is no Redis in the stack, so this
 * lives in Postgres via the check_rate_limit RPC). Returns true if the request
 * is ALLOWED, false if `bucket` has exceeded `max` within `windowSeconds`.
 *
 * Fails OPEN (returns true) if the limiter itself errors, so a limiter outage
 * never blocks legitimate users.
 */
export async function checkRateLimit(
  bucket: string,
  max: number,
  windowSeconds: number
): Promise<boolean> {
  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_bucket: bucket,
      p_max: max,
      p_window_seconds: windowSeconds,
    })
    if (error) {
      console.error('checkRateLimit RPC error:', error)
      return true
    }
    return data === true
  } catch (err) {
    console.error('checkRateLimit error:', err)
    return true
  }
}

/** Best-effort client IP from forwarded headers. */
export function clientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return request.headers.get('x-real-ip') || 'unknown'
}
