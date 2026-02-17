import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const maxDuration = 60

// Helper to validate portal token
async function validatePortalToken(token: string) {
  const supabase = getSupabaseAdmin()
  const { data: invite } = await supabase
    .from('portal_invites')
    .select('id, case_id, contact_id, can_upload_documents, can_view_reports, contacts(first_name, last_name)')
    .eq('token', token)
    .eq('is_active', true)
    .single()

  if (!invite) return { error: 'Portal not found', status: 404 }
  return { invite }
}

// GET: Fetch all documents for this portal's case
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabase = getSupabaseAdmin()

    const validation = await validatePortalToken(token)
    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: validation.status })
    }
    const { invite } = validation

    if (!invite.can_upload_documents) {
      return NextResponse.json({ error: 'Document access not enabled' }, { status: 403 })
    }

    const { data: documents, error } = await supabase
      .from('documents')
      .select('id, file_name, original_file_name, file_size_bytes, document_type, description, source_provider, created_at, mime_type')
      .eq('case_id', invite.case_id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ documents: documents || [] })
  } catch (error) {
    console.error('Portal documents fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
  }
}

// Helper to validate portal token and upload permissions
async function validatePortalUpload(token: string) {
  const supabase = getSupabaseAdmin()
  const { data: invite } = await supabase
    .from('portal_invites')
    .select('id, case_id, contact_id, can_upload_documents, contacts(first_name, last_name)')
    .eq('token', token)
    .eq('is_active', true)
    .single()

  if (!invite) return { error: 'Portal not found', status: 404 }
  if (!invite.can_upload_documents) return { error: 'Document upload not enabled', status: 403 }
  return { invite }
}

// POST: Two-step upload
// Step 1: { action: 'get-upload-url', fileName, fileType } → returns uploadUrl + storagePath
// Step 2: { action: 'confirm-upload', storagePath, fileName, fileSize, mimeType, category, description } → creates DB record
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabase = getSupabaseAdmin()

    const validation = await validatePortalUpload(token)
    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: validation.status })
    }
    const { invite } = validation

    const body = await request.json()

    // Step 1: Request a signed upload URL
    if (body.action === 'get-upload-url') {
      const { fileName } = body
      if (!fileName) {
        return NextResponse.json({ error: 'fileName is required' }, { status: 400 })
      }

      const timestamp = Date.now()
      const storagePath = `cases/${invite.case_id}/documents/${timestamp}_${fileName}`

      const { data: signedData, error: signError } = await supabase.storage
        .from('case-documents')
        .createSignedUploadUrl(storagePath)

      if (signError) throw signError

      // Return the full upload URL that the client can PUT to directly
      // Format: {supabaseUrl}/storage/v1/object/upload/sign/case-documents/{path}?token={token}
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const uploadUrl = `${supabaseUrl}/storage/v1/object/upload/sign/case-documents/${storagePath}?token=${signedData.token}`

      return NextResponse.json({
        uploadUrl,
        storagePath,
      })
    }

    // Step 2: Confirm upload and create DB record
    if (body.action === 'confirm-upload') {
      const { storagePath, fileName, fileSize, mimeType, category, description } = body

      if (!storagePath || !fileName) {
        return NextResponse.json({ error: 'storagePath and fileName are required' }, { status: 400 })
      }

      // Map frontend categories to valid document_type enum values
      const CATEGORY_MAP: Record<string, string> = {
        medical_records: 'medical_record',
        billing_records: 'billing_record',
        deposition_transcript: 'deposition_transcript',
        pleading: 'pleading',
        discovery: 'other',
        correspondence: 'correspondence',
        other: 'other',
      }
      const documentType = CATEGORY_MAP[category || 'other'] || 'other'

      const ext = fileName.split('.').pop()?.toLowerCase() || ''
      const fileType = ext || 'unknown'

      const contact = invite.contacts as unknown as { first_name: string; last_name: string } | null
      const uploaderName = contact ? `${contact.first_name} ${contact.last_name}` : 'Attorney'

      const { data: document, error: docError } = await supabase
        .from('documents')
        .insert({
          case_id: invite.case_id,
          file_name: fileName,
          original_file_name: fileName,
          file_type: fileType,
          file_size_bytes: fileSize || 0,
          mime_type: mimeType || 'application/octet-stream',
          storage_path: storagePath,
          document_type: documentType,
          description: description || `Uploaded by ${uploaderName} via case portal`,
          source_provider: uploaderName,
          review_status: 'pending',
          ocr_status: 'not_needed',
          is_privileged: false,
          version: 1,
        })
        .select()
        .single()

      if (docError) throw docError

      return NextResponse.json({ document })
    }

    return NextResponse.json({ error: 'Invalid action. Use get-upload-url or confirm-upload.' }, { status: 400 })
  } catch (error) {
    console.error('Portal document upload error:', error)
    return NextResponse.json({ error: 'Failed to process document request' }, { status: 500 })
  }
}
