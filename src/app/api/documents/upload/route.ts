import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/tiff',
  'text/plain',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

const ALLOWED_EXTENSIONS = [
  'pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'tiff', 'txt', 'csv', 'xls', 'xlsx',
]

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    const file = formData.get('file') as File | null
    const caseId = formData.get('caseId') as string | null
    const category = formData.get('category') as string | null
    const folderId = formData.get('folderId') as string | null
    const description = formData.get('description') as string | null

    if (!file || !caseId || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: file, caseId, category' },
        { status: 400 }
      )
    }

    // Validate file type by extension
    const filename = file.name
    const extension = filename.split('.').pop()?.toLowerCase()
    if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
      return NextResponse.json(
        {
          error: `Invalid file type. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`,
        },
        { status: 400 }
      )
    }

    // Also validate by MIME type if available
    if (file.type && !ALLOWED_FILE_TYPES.includes(file.type)) {
      // Some browsers may not set MIME type correctly, so only warn via extension check above
      console.warn(`Unexpected MIME type: ${file.type} for file: ${filename}`)
    }

    const supabase = getSupabaseAdmin()

    // Generate storage path
    const timestamp = Date.now()
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
    const folder = folderId || 'root'
    const storagePath = `cases/${caseId}/${folder}/${timestamp}_${sanitizedFilename}`

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('case-documents')
      .upload(storagePath, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json(
        { error: `File upload failed: ${uploadError.message}` },
        { status: 500 }
      )
    }

    // Create document record in the database
    const { data: documentRecord, error: dbError } = await supabase
      .from('documents')
      .insert({
        case_id: caseId,
        file_name: sanitizedFilename,
        original_file_name: filename,
        file_path: storagePath,
        file_size: file.size,
        mime_type: file.type || 'application/octet-stream',
        category,
        description: description || null,
        folder_id: folderId || null,
        ocr_status: file.type === 'application/pdf' ? 'pending' : 'not_needed',
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
      storagePath: uploadData?.path,
    })
  } catch (error) {
    console.error('Document upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
