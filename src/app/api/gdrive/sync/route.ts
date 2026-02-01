import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { createDriveClient, getAllFilesRecursive, downloadFile, extractFolderIdFromUrl, shouldProcessFile } from '@/lib/gdrive'

export async function POST(request: NextRequest) {
  try {
    const { caseId, folderId: providedFolderId, folderUrl } = await request.json()

    if (!caseId) return NextResponse.json({ error: 'Missing caseId' }, { status: 400 })

    const folderId = providedFolderId || extractFolderIdFromUrl(folderUrl || '')
    if (!folderId) return NextResponse.json({ error: 'Missing folder ID or URL' }, { status: 400 })

    const supabase = getSupabaseAdmin()

    const { data: tokenSetting } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'gdrive_tokens')
      .single()

    if (!tokenSetting?.setting_value) {
      return NextResponse.json({ error: 'Google Drive not connected. Please connect in Settings first.' }, { status: 401 })
    }

    const tokens = tokenSetting.setting_value as { access_token: string; refresh_token?: string }
    const drive = createDriveClient(tokens.access_token, tokens.refresh_token)

    const files = await getAllFilesRecursive(drive, folderId)
    const processableFiles = files.filter(shouldProcessFile)

    const { data: existingDocs } = await supabase
      .from('documents')
      .select('original_file_name, file_size')
      .eq('case_id', caseId)

    const existingSet = new Set(existingDocs?.map(d => `${d.original_file_name}:${d.file_size}`) || [])

    const result = { synced: [] as string[], skipped: [] as string[], errors: [] as string[] }

    for (const file of processableFiles) {
      if (existingSet.has(`${file.name}:${file.size || 0}`)) {
        result.skipped.push(file.name)
        continue
      }

      try {
        const buffer = await downloadFile(drive, file.id, file.mimeType)
        const fileName = file.mimeType === 'application/vnd.google-apps.document'
          ? file.name.replace(/\.[^/.]+$/, '') + '.pdf'
          : file.name
        const storagePath = `cases/${caseId}/documents/${Date.now()}_${fileName}`

        const { error: uploadError } = await supabase.storage.from('case-documents').upload(storagePath, buffer, {
          contentType: 'application/pdf',
        })

        if (uploadError) {
          result.errors.push(`${file.name}: ${uploadError.message}`)
          continue
        }

        const { data: doc } = await supabase.from('documents').insert({
          case_id: caseId,
          file_name: fileName,
          original_file_name: file.name,
          file_path: storagePath,
          file_size: buffer.length,
          mime_type: 'application/pdf',
          source_provider: `Google Drive: ${file.path}`,
          ocr_status: 'pending',
        }).select('id').single()

        result.synced.push(file.name)

        // Trigger AI processing in the background
        if (doc?.id) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://expert-witness.vercel.app'
          fetch(`${appUrl}/api/documents/process`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ documentId: doc.id }),
          }).catch(() => { /* fire and forget */ })
        }
      } catch (err) {
        result.errors.push(`${file.name}: ${err instanceof Error ? err.message : 'failed'}`)
      }
    }

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('Google Drive sync error:', error)
    const message = error instanceof Error ? error.message : 'Sync failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
