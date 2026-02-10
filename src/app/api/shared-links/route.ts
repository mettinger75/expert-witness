import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      entityType,
      entityId,
      permission = 'view',
      recipientName,
      recipientEmail,
      expiresInDays = 30,
      pin,
      contactId,
    } = body

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'Missing entityType or entityId' },
        { status: 400 }
      )
    }

    if (!['report', 'contract', 'invoice'].includes(entityType)) {
      return NextResponse.json(
        { error: 'Invalid entityType' },
        { status: 400 }
      )
    }

    if (!['view', 'edit', 'sign'].includes(permission)) {
      return NextResponse.json(
        { error: 'Invalid permission' },
        { status: 400 }
      )
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex')

    // Calculate expiration
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    // Hash PIN if provided
    let pinHash: string | null = null
    if (pin) {
      // Simple hash for PIN (not bcrypt to avoid dependency — PIN is 4-6 digits)
      pinHash = crypto.createHash('sha256').update(pin).digest('hex')
    }

    const supabase = getSupabaseAdmin()

    // Verify the entity exists and get its current HTML for redline tracking
    const table = entityType === 'report' ? 'reports' : entityType === 'contract' ? 'contracts' : 'invoices'
    const { data: entity, error: entityError } = await supabase
      .from(table)
      .select('*')
      .eq('id', entityId)
      .single()

    if (entityError || !entity) {
      return NextResponse.json(
        { error: `${entityType} not found` },
        { status: 404 }
      )
    }

    // Capture original HTML snapshot for edit links (enables redline diff later)
    // Skip for invoices — no redline needed
    let originalHtml: string | null = null
    if (permission === 'edit' && entityType !== 'invoice') {
      if (entityType === 'report') {
        const reportContent = entity.content as Record<string, unknown> | null
        if (reportContent?.import_mode === 'monolithic') {
          originalHtml = (reportContent.html as string) || entity.rendered_html || ''
        } else if (entity.rendered_html) {
          originalHtml = entity.rendered_html
        } else {
          // Assemble from sections
          const sections = entity.sections_data as Record<string, { title: string; content: string }> | null
          if (sections) {
            const order = ['introduction', 'qualifications', 'narrative_summary', 'clinical_analysis', 'breach_analysis', 'causation', 'conclusion']
            originalHtml = order
              .filter((key) => sections[key])
              .map((key) => `<h2>${sections[key].title}</h2>${sections[key].content}`)
              .join('')
          }
        }
      } else {
        originalHtml = entity.rendered_html || ''
      }
    }

    // Create the shared link
    const { data: sharedLink, error } = await supabase
      .from('shared_links')
      .insert({
        entity_type: entityType,
        entity_id: entityId,
        token,
        permission,
        recipient_name: recipientName || null,
        recipient_email: recipientEmail || null,
        pin_hash: pinHash,
        expires_at: expiresAt.toISOString(),
        original_html: originalHtml,
        contact_id: contactId || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Create shared link error:', error)
      return NextResponse.json(
        { error: 'Failed to create share link' },
        { status: 500 }
      )
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://expert-witness.vercel.app'
    const url = `${appUrl}/shared/${token}`

    return NextResponse.json({ sharedLink, url })
  } catch (error) {
    console.error('Shared links error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
