import { NextRequest, NextResponse } from 'next/server'
import { buildEmail } from '@/lib/email-templates'
import type { EmailEventType } from '@/lib/email-config'

export async function GET(request: NextRequest) {
  const eventType = (request.nextUrl.searchParams.get('type') || 'outreach') as EmailEventType
  const recipientName = request.nextUrl.searchParams.get('name') || 'Mr. Johnson'

  const email = buildEmail(eventType, {
    recipientName,
    message: request.nextUrl.searchParams.get('message') || undefined,
  })

  return new NextResponse(email.html, {
    headers: { 'Content-Type': 'text/html' },
  })
}
