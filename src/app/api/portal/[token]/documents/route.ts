import { NextRequest, NextResponse } from 'next/server'
import { validatePortalInvite } from '@/lib/portal-auth'

export const maxDuration = 60

// GET: Fetch all documents for this portal's case
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const v = await validatePortalInvite(token, {
      select: 'id, case_id, contact_id, can_upload_documents, can_view_reports, contacts(first_name, last_name)',
    })
    if (v.error) return v.error
    const { invite, supabase } = v
    const inv = invite as {
      case_id: string
      can_upload_documents?: boolean
      contacts?: { first_name: string; last_name: string } | null
    }

    if (!inv.can_upload_documents) {
      return NextResponse.json({ error: 'Document access not enabled' }, { status: 403 })
    }

    const { data: documents, error } = await supabase
      .from('documents')
      .select('id, file_name, original_file_name, file_size_bytes, document_type, description, source_provider, created_at, mime_type')
      .eq('case_id', inv.case_id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ documents: documents || [] })
  } catch (error) {
    console.error('Portal documents fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
  }
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

    const v = await validatePortalInvite(token, {
      select: 'id, case_id, contact_id, can_upload_documents, contacts(first_name, last_name)',
    })
    if (v.error) return v.error
    const { invite, supabase } = v
    const inv = invite as {
      case_id: string
      can_upload_documents?: boolean
      contacts?: { first_name: string; last_name: string } | null
    }

    if (!inv.can_upload_documents) {
      return NextResponse.json({ error: 'Document upload not enabled' }, { status: 403 })
    }

    const body = await request.json()

    // Step 1: Request a signed upload URL
    if (body.action === 'get-upload-url') {
      const { fileName } = body
      if (!fileName) {
        return NextResponse.json({ error: 'fileName is required' }, { status: 400 })
      }

      const timestamp = Date.now()
      const storagePath = `cases/${inv.case_id}/documents/${timestamp}_${fileName}`

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

      const contact = inv.contacts
      const uploaderName = contact ? `${contact.first_name} ${contact.last_name}` : 'Attorney'

      const { data: document, error: docError } = await supabase
        .from('documents')
        .insert({
          case_id: inv.case_id,
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

      // Send notification email to Dr. Ettinger
      try {
        const resendKey = process.env.RESEND_API_KEY
        if (resendKey) {
          const { data: caseData } = await supabase
            .from('cases')
            .select('case_name, case_number')
            .eq('id', inv.case_id)
            .single()

          const contact = inv.contacts
          const uploaderDisplay = contact ? `${contact.first_name} ${contact.last_name}` : 'Attorney'

          const fileSizeMB = fileSize ? `${(fileSize / (1024 * 1024)).toFixed(1)} MB` : 'Unknown size'

          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${resendKey}`,
            },
            body: JSON.stringify({
              from: 'Mark Ettinger, M.D. <mark@markettingermd.com>',
              to: 'markettingermd@gmail.com',
              subject: `Document Uploaded: ${caseData?.case_name || 'Unknown Case'}`,
              html: `
                <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto;">
                  <div style="background-color: #0E1F35; color: white; padding: 24px 32px;">
                    <h1 style="margin: 0; font-size: 20px; color: #DFC06A;">Document Uploaded</h1>
                  </div>
                  <div style="padding: 32px; border: 1px solid #e5e7eb; border-top: none;">
                    <p style="color: #374151; font-size: 15px; line-height: 1.6;">
                      <strong>${uploaderDisplay}</strong> has uploaded a document for
                      <strong>${caseData?.case_name || 'a case'}</strong> (${caseData?.case_number || ''}).
                    </p>
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">File:</td>
                        <td style="padding: 8px 0; font-size: 14px; font-weight: 600;">${fileName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Size:</td>
                        <td style="padding: 8px 0; font-size: 14px;">${fileSizeMB}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Category:</td>
                        <td style="padding: 8px 0; font-size: 14px; text-transform: capitalize;">${(category || 'other').replace(/_/g, ' ')}</td>
                      </tr>
                      ${description ? `<tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Description:</td><td style="padding: 8px 0; font-size: 14px;">${description}</td></tr>` : ''}
                    </table>
                    <p style="color: #6b7280; font-size: 13px; margin-top: 24px;">
                      View documents in the
                      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://markettingermd.com'}/cases/${inv.case_id}" style="color: #DFC06A;">case dashboard</a>.
                    </p>
                  </div>
                </div>
              `,
            }),
          })
        }
      } catch (emailError) {
        console.error('Failed to send document upload notification email:', emailError)
      }

      return NextResponse.json({ document })
    }

    return NextResponse.json({ error: 'Invalid action. Use get-upload-url or confirm-upload.' }, { status: 400 })
  } catch (error) {
    console.error('Portal document upload error:', error)
    return NextResponse.json({ error: 'Failed to process document request' }, { status: 500 })
  }
}
