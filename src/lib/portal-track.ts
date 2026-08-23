/**
 * Lightweight client-side tracking helper for the portal.
 *
 * Ensures a stable per-session id in sessionStorage, and fires
 * fire-and-forget beacons to /api/portal/[token]/track.
 *
 * No-ops in preview mode (when the URL includes ?preview=1), so admin
 * previewing via the CreatePortalInviteDialog doesn't pollute real logs.
 */

const SID_KEY = 'pi_sid'

export function isPreviewContext(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const sp = new URLSearchParams(window.location.search)
    return sp.get('preview') === '1'
  } catch {
    return false
  }
}

/**
 * Carry preview mode through to a portal API call.
 *
 * The server only skips the view_count bump, portal_access_log write, and
 * first-view case-status advance when it actually sees ?preview=1. The portal
 * page previously fetched the bare path, so opening a link with ?preview=1 in a
 * browser still recorded the visit as the recipient's — silently corrupting the
 * engagement stats of whoever the invite belongs to. Route portal fetches
 * through this so the flag survives.
 */
export function portalApiUrl(path: string): string {
  if (!isPreviewContext()) return path
  return path + (path.includes('?') ? '&' : '?') + 'preview=1'
}

function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  let sid = ''
  try {
    sid = window.sessionStorage.getItem(SID_KEY) || ''
  } catch {
    // ignore
  }
  if (!sid) {
    sid =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    try {
      window.sessionStorage.setItem(SID_KEY, sid)
      // Also drop as a cookie so server-side route can dedup
      document.cookie = `${SID_KEY}=${sid}; path=/; max-age=1800; samesite=lax`
    } catch {
      // ignore
    }
  }
  return sid
}

export function trackPortalEvent(
  token: string,
  eventType: string,
  eventData?: Record<string, unknown>
): void {
  if (typeof window === 'undefined') return
  if (isPreviewContext()) return
  if (!token) return

  const payload = JSON.stringify({
    event_type: eventType,
    event_data: eventData ?? null,
    session_id: getSessionId(),
  })

  // Prefer keepalive fetch so events fire even during nav/unload
  try {
    fetch(`/api/portal/${token}/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {})
  } catch {
    // swallow — tracking is best-effort
  }
}
