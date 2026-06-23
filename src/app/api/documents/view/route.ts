import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireAdminUser } from '@/lib/api-admin-auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminUser(request)
    if (auth.error) return auth.error

    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('id')

    if (!documentId) {
      return NextResponse.json({ error: 'Missing document ID' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Fetch document record to get the file path
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('id, storage_path, mime_type, file_name, original_file_name')
      .eq('id', documentId)
      .single()

    if (docError || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Generate a signed URL (valid for 1 hour)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('case-documents')
      .createSignedUrl(doc.storage_path, 3600)

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error('Signed URL error:', signedUrlError)
      return NextResponse.json(
        { error: `Failed to generate view URL: ${signedUrlError?.message || 'unknown error'}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      url: signedUrlData.signedUrl,
      mimeType: doc.mime_type,
      fileName: doc.original_file_name || doc.file_name,
    })
  } catch (error) {
    console.error('Document view error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
