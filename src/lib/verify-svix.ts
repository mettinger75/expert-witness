import crypto from 'crypto'

/**
 * Verify a Svix-style webhook signature (the scheme Resend uses for webhooks).
 *
 * The signed content is `${id}.${timestamp}.${rawBody}`, HMAC-SHA256'd with the
 * key = base64-decode of the secret's body (the part after the `whsec_` prefix),
 * and base64-encoded. The `svix-signature` header is a space-delimited list of
 * `v<version>,<base64sig>` entries; we accept if any `v1` entry matches.
 *
 * Compares in constant time and rejects timestamps outside a tolerance window to
 * blunt replay. Returns `false` (never throws) on any missing/malformed input so
 * callers can treat it as a hard reject.
 *
 * IMPORTANT: pass the RAW request body (`await request.text()`), not a
 * re-serialized object — the signature is over the exact bytes Svix sent.
 */
const TOLERANCE_SECONDS = 5 * 60

export function verifySvixSignature(
  rawBody: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  secret: string
): boolean {
  const { id, timestamp, signature } = headers
  if (!id || !timestamp || !signature || !secret) return false

  // Replay window: reject timestamps too far from now.
  const ts = Number.parseInt(timestamp, 10)
  if (!Number.isFinite(ts)) return false
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - ts) > TOLERANCE_SECONDS) return false

  let key: Buffer
  try {
    key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
  } catch {
    return false
  }
  if (key.length === 0) return false

  const signedContent = `${id}.${timestamp}.${rawBody}`
  const expected = crypto.createHmac('sha256', key).update(signedContent).digest('base64')
  const expectedBuf = Buffer.from(expected)

  // Header can carry multiple space-delimited signatures, e.g. "v1,aaa v1,bbb".
  for (const entry of signature.split(' ')) {
    const commaIdx = entry.indexOf(',')
    if (commaIdx === -1) continue
    const version = entry.slice(0, commaIdx)
    const sig = entry.slice(commaIdx + 1)
    if (version !== 'v1' || !sig) continue
    const sigBuf = Buffer.from(sig)
    if (sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return true
    }
  }
  return false
}
