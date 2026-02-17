import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const maxDuration = 60

const ALLOWED_EXTENSIONS = [
  'pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'tiff', 'tif', 'bmp',
  'txt', 'csv', 'xls', 'xlsx', 'rtf', 'heic',
]

const CATEGORY_MAP: Record<string, string> = {
  medical_records: 'medical_record',
  medical_record: 'medical_record',
  billing_records: 'billing_record',
  billing_record: 'billing_record',
  deposition_transcript: 'deposition_transcript',
  pleading: 'pleading',
  discovery: 'other',
  correspondence: 'correspondence',
  imaging: 'imaging',
  lab_result: 'lab_result',
  operative_report: 'operative_report',
  anesthesia_record: 'anesthesia_record',
  nursing_notes: 'nursing_notes',
  physician_notes: 'physician_notes',
  discharge_summary: 'discharge_summary',
  autopsy_report: 'autopsy_report',
  expert_report: 'expert_report',
  insurance_document: 'insurance_document',
  photograph: 'photograph',
  video: 'video',
  audio: 'audio',
  other: 'other',
}

// POST: Two-step upload flow
// Step 1: { action: 'get-upload-url', caseId, fileName, folderId? } → returns uploadUrl + storagePath
// Step 2: { action: 'confirm-upload', storagePath, caseId, fileName, fileSize, mimeType, category, description?, folderId? } → creates DB record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = getSupabaseAdmin()

    // Step 1: Request a signed upload URL
    if (body.action === 'get-upload-url') {
      const { caseId, fileName, folderId } = body
      if (!caseId || !fileName) {
        return NextResponse.json({ error: 'caseId and fileName are required' }, { status: 400 })
      }

      // Validate extension
      const extension = fileName.split('.').pop()?.toLowerCase()
      if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
        return NextResponse.json(
          { error: `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` },
          { status: 400 }
        )
      }

      const timestamp = Date.now()
      const sanitizedFilename = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
      const folder = folderId || 'root'
      const storagePath = `cases/${caseId}/${folder}/${timestamp}_${sanitizedFilename}`

      const { data: signedData, error: signError } = await supabase.storage
        .from('case-documents')
        .createSignedUploadUrl(storagePath)

      if (signError) throw signError

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const uploadUrl = `${supabaseUrl}/storage/v1/object/upload/sign/case-documents/${storagePath}?token=${signedData.token}`

      return NextResponse.json({
        uploadUrl,
        storagePath,
        sanitizedFilename,
      })
    }

    // Step 2: Confirm upload and create DB record
    if (body.action === 'confirm-upload') {
      const { storagePath, caseId, fileName, fileSize, mimeType, category, description, folderId } = body

      if (!storagePath || !caseId || !fileName) {
        return NextResponse.json(
          { error: 'storagePath, caseId, and fileName are required' },
          { status: 400 }
        )
      }

      const sanitizedFilename = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
      const ext = fileName.split('.').pop()?.toLowerCase() || ''
      const fileType = ext || 'unknown'
      const documentType = CATEGORY_MAP[category || 'other'] || 'other'

      const { data: documentRecord, error: dbError } = await supabase
        .from('documents')
        .insert({
          case_id: caseId,
          file_name: sanitizedFilename,
          original_file_name: fileName,
          file_type: fileType,
          file_size_bytes: fileSize || 0,
          mime_type: mimeType || 'application/octet-stream',
          storage_path: storagePath,
          document_type: documentType,
          description: description || null,
          folder_id: folderId || null,
          review_status: 'pending',
          ocr_status: mimeType === 'application/pdf' ? 'pending' : 'not_needed',
          is_privileged: false,
          version: 1,
        })
        .select()
        .single()

      if (dbError) {
        console.error('Database insert error:', dbError)
        // Attempt to clean up the uploaded file
        await supabase.storage.from('case-documents').remove([storagePath])
        return NextResponse.json(
          { error: `Failed to create document record: ${dbError.message}` },
          { status: 500 }
        )
      }

      return NextResponse.json({
        document: documentRecord,
        storagePath,
      })
    }

    return NextResponse.json(
      { error: 'Invalid action. Use get-upload-url or confirm-upload.' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Document upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
