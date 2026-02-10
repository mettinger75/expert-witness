import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

// POST: Upload a document from the attorney portal
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabase = getSupabaseAdmin()

    // Validate portal token
    const { data: invite } = await supabase
      .from('portal_invites')
      .select('id, case_id, contact_id, can_upload_documents, contacts(first_name, last_name)')
      .eq('token', token)
      .eq('is_active', true)
      .single()

    if (!invite) {
      return NextResponse.json({ error: 'Portal not found' }, { status: 404 })
    }
    if (!invite.can_upload_documents) {
      return NextResponse.json({ error: 'Document upload not enabled' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const category = formData.get('category') as string || 'other'
    const description = formData.get('description') as string || null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Upload to storage
    const timestamp = Date.now()
    const filePath = `cases/${invite.case_id}/documents/${timestamp}_${file.name}`
    const fileBuffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from('case-documents')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) throw uploadError

    const contact = invite.contacts as unknown as { first_name: string; last_name: string } | null
    const uploaderName = contact ? `${contact.first_name} ${contact.last_name}` : 'Attorney'

    // Create document record
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        case_id: invite.case_id,
        file_name: file.name,
        original_file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        category,
        description: description || `Uploaded by ${uploaderName} via case portal`,
        source_provider: uploaderName,
        review_status: 'not_started',
        review_priority: 'normal',
        ocr_status: 'not_needed',
        is_exhibit: false,
        is_privileged: false,
        version: 1,
      })
      .select()
      .single()

    if (docError) throw docError

    return NextResponse.json({ document })
  } catch (error) {
    console.error('Portal document upload error:', error)
    return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 })
  }
}
