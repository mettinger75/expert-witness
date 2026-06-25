import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Host-based split:
 *   - markettingermd.com (+ www) is the PUBLIC marketing site only.
 *   - platform.markettingermd.com is the actual app (dashboard, attorney
 *     portals, login, shared links, …).
 *
 * Any app path requested on the root domain is 307-redirected to the platform
 * subdomain. This keeps every portal/report link already sitting in attorneys'
 * inboxes (and your own bookmarks) working after the move. The `/` path is left
 * alone — src/app/page.tsx already routes it by host (root → /site, otherwise
 * → /dashboard).
 */

const ROOT_HOSTS = new Set(['markettingermd.com', 'www.markettingermd.com'])
const PLATFORM_HOST = 'platform.markettingermd.com'

/** The only things that live on the root (marketing) domain. */
function isPublicRootPath(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname === '/site' ||
    pathname.startsWith('/site/') ||
    // public "request a consult" inquiry form stays on the marketing domain
    pathname === '/portal/consult' ||
    pathname.startsWith('/portal/consult/')
  )
}

export function middleware(req: NextRequest) {
  const host = (req.headers.get('host') || '').toLowerCase().split(':')[0]

  // platform.* (and Vercel preview hosts) serve the full app untouched.
  if (!ROOT_HOSTS.has(host)) {
    return NextResponse.next()
  }

  const { pathname, search } = req.nextUrl
  if (isPublicRootPath(pathname)) {
    return NextResponse.next()
  }

  return NextResponse.redirect(`https://${PLATFORM_HOST}${pathname}${search}`, 307)
}

export const config = {
  // Page navigations only — never API, Next internals, or static files.
  matcher: ['/((?!api|_next|.*\\..*).*)'],
}
