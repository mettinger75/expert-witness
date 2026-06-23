import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

/**
 * Centralized validation for all `/api/portal/[token]/**` routes.
 *
 * Every token route must go through this so there is ONE place that enforces
 * (a) the invite exists and is active, (b) it has not expired, and optionally
 * (c) a specific permission flag. Returns either `{ error }` (a ready-to-return
 * NextResponse) or `{ invite, supabase }`.
 *
 * Usage:
 *   const v = await validatePortalInvite(token, { permission: 'can_view_reports' })
 *   if (v.error) return v.error
 *   const { invite, supabase } = v
 */
export type PortalInviteRecord = Record<string, unknown> & {
  id: string
  case_id: string
  contact_id: string
  expires_at: string
  is_active: boolean
}

type ValidateOk = {
  error?: undefined
  invite: PortalInviteRecord
  supabase: SupabaseClient
}
type ValidateErr = {
  error: NextResponse
  invite?: undefined
  supabase?: undefined
}

/** Word-boundary check for a column in a PostgREST select string. */
function selectIncludes(select: string, col: string): boolean {
  return new RegExp(`(^|[\\s,(])${col}(\\s|,|\\)|$)`).test(select)
}

export async function validatePortalInvite(
  token: string,
  opts: { select?: string; permission?: string } = {}
): Promise<ValidateOk | ValidateErr> {
  const supabase = getSupabaseAdmin()

  // When a caller passes a trimmed select, guarantee the columns this function
  // checks are present. Otherwise the checks silently no-op — e.g. an omitted
  // expires_at makes `invite.expires_at` undefined and lets EXPIRED links pass.
  let querySelect = opts.select || '*'
  if (opts.select && opts.select !== '*') {
    if (!selectIncludes(querySelect, 'expires_at')) querySelect += ', expires_at'
    if (opts.permission && !selectIncludes(querySelect, opts.permission)) {
      querySelect += `, ${opts.permission}`
    }
  }

  const { data, error } = await supabase
    .from('portal_invites')
    .select(querySelect)
    .eq('token', token)
    .eq('is_active', true)
    .single()

  if (error || !data) {
    return {
      error: NextResponse.json({ error: 'Portal link not found or expired' }, { status: 404 }),
    }
  }

  const invite = data as unknown as PortalInviteRecord

  if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
    return {
      error: NextResponse.json({ error: 'This portal link has expired' }, { status: 410 }),
    }
  }

  if (opts.permission && !invite[opts.permission]) {
    return {
      error: NextResponse.json({ error: 'This portal does not have permission for that action' }, { status: 403 }),
    }
  }

  return { invite, supabase }
}
