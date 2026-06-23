import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/api-admin-auth'
import { sendPortalInviteEmail } from '@/lib/portal-email'

/**
 * Admin-only branded portal-invite email sender (dashboard use). The actual
 * send logic lives in `@/lib/portal-email` so server routes (add-contact,
 * recover) can call it directly without going through this public HTTP
 * endpoint. Supports legacy param names from older dialogs.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdminUser(request)
  if (auth.error) return auth.error

  try {
    const body = await request.json()
    const result = await sendPortalInviteEmail({
      recipientEmail: body.recipientEmail || body.contactEmail,
      recipientName: body.recipientName || body.contactName,
      portalUrl: body.portalUrl,
      caseName: body.caseName,
      caseId: body.caseId,
      invitationMessage: body.invitationMessage || body.message,
      features: body.features,
      contractTitle: body.contractTitle,
      isInquiry: body.isInquiry === true,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      )
    }
    return NextResponse.json({ success: true, emailId: result.emailId })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Portal invite email error:', error)
    return NextResponse.json({ error: 'Internal server error', details: message }, { status: 500 })
  }
}
