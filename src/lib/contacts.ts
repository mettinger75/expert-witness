/**
 * Shared contact-lookup helpers.
 *
 * `contacts.email` is NOT unique. The column holds NULLs, empty strings and
 * genuine duplicate addresses, and there is no unique index behind it — only
 * the non-unique `idx_contacts_email`. Every find-by-email in the codebase
 * therefore has to be written to survive a multi-row result.
 *
 * The specific trap this module exists to close: PostgREST's singular
 * representation (`.single()` / `.maybeSingle()`) answers 406 / PGRST116 when
 * the result set holds more than one row. A caller that destructures only
 * `data` swallows that error, reads `undefined`, and concludes no contact
 * exists — so a lookup written to PREVENT duplicates creates another one.
 * Selecting a bounded, ordered list and taking the first element cannot fail
 * that way.
 *
 * Note that `.limit(1)` alone also masks the problem, because PostgREST applies
 * LIMIT in SQL before the singular coercion. That makes `.limit(1).single()`
 * work by accident, which is worse than it sounds: drop or reorder the limit
 * and the bug reappears silently. Prefer these helpers over hand-rolling it.
 */

import type { getSupabaseAdmin } from './supabase-admin'

type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>

/**
 * Escapes LIKE metacharacters so an address is matched literally. Without this
 * an underscore — legal and common in email addresses — is a single-character
 * wildcard, so `a_b@x.com` would match `a.b@x.com` and silently adopt the wrong
 * person's contact record.
 */
export function escapeLikeLiteral(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`)
}

/**
 * Trims an address for storage, collapsing "no address" to NULL.
 *
 * Casing is deliberately preserved: matching is done case-insensitively via
 * `ilike`, so there is nothing to gain by rewriting how counsel capitalises
 * their own address in Dr. Ettinger's records.
 */
export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * Resolves an email address to a single contact id, or null when there is no
 * match. Case-insensitive, duplicate-tolerant, and safe on a blank address.
 */
export async function findContactIdByEmail(
  supabase: SupabaseAdmin,
  email: unknown,
  opts: { activeOnly?: boolean } = {},
): Promise<string | null> {
  const normalized = normalizeEmail(email)

  // A blank address must never be used as a lookup key. `.eq('email', '')`
  // matches every placeholder contact on file — eight of them today — and would
  // attach the caller's case to whichever unrelated person the planner happened
  // to return first.
  if (!normalized) return null

  let query = supabase
    .from('contacts')
    .select('id')
    .ilike('email', escapeLikeLiteral(normalized))

  if (opts.activeOnly) query = query.eq('is_active', true)

  // Oldest first, deliberately. Where duplicates already exist the earliest row
  // is the one other records were linked against, so it is the one worth
  // converging on. Matches the tie-break already used by the portal
  // add-contact route.
  const { data, error } = await query.order('created_at', { ascending: true }).limit(1)

  if (error) {
    // Surfaced rather than swallowed: a failed lookup means the caller is about
    // to create a contact it may not need, and that is worth a line in the log.
    console.error('[contacts] findContactIdByEmail failed:', error)
    return null
  }

  return data?.[0]?.id ?? null
}
