import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import crypto from 'crypto'

// POST: Create a portal invite
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      caseId,
      contactId,
      expiresInDays = 90,
      canViewSummary = true,
      canViewTimeline = false,
      canMessage = true,
      canViewReports = true,
      canEditReports = false,
      canUploadDocuments = true,
      invitationMessage,
    } = body

    if (!caseId || !contactId) {
      return NextResponse.json({ error: 'Missing caseId or contactId' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const token = crypto.randomBytes(32).toString('hex')

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    const { data: invite, error } = await supabase
      .from('portal_invites')
      .insert({
        case_id: caseId,
        contact_id: contactId,
        token,
        can_view_summary: canViewSummary,
        can_view_timeline: canViewTimeline,
        can_message: canMessage,
        can_view_reports: canViewReports,
        can_edit_reports: canEditReports,
        can_upload_documents: canUploadDocuments,
        expires_at: expiresAt.toISOString(),
        invitation_message: invitationMessage || null,
      })
      .select()
      .single()

    if (error) throw error

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://expert-witness.vercel.app'
    const portalUrl = `${appUrl}/portal/${token}`

    return NextResponse.json({ invite, portalUrl })
  } catch (error) {
    console.error('Portal invite creation error:', error)
    return NextResponse.json({ error: 'Failed to create portal invite' }, { status: 500 })
  }
}

// GET: List portal invites for a case
export async function GET(request: NextRequest) {
  try {
    const caseId = request.nextUrl.searchParams.get('caseId')
    if (!caseId) {
      return NextResponse.json({ error: 'Missing caseId' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const { data: invites, error } = await supabase
      .from('portal_invites')
      .select('*, contacts(*)')
      .eq('case_id', caseId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ invites: invites || [] })
  } catch (error) {
    console.error('Portal invites fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch invites' }, { status: 500 })
  }
}
