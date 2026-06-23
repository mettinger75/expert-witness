import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireAdminUser } from '@/lib/api-admin-auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminUser(request)
    if (auth.error) return auth.error

    const { id } = await params
    const body = await request.json()
    const supabase = getSupabaseAdmin()

    // Only allow updating specific fields
    const allowedFields = ['description', 'document_date', 'document_type', 'is_key_document', 'review_status', 'tags']
    const updateData: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (key in body) {
        updateData[key] = body[key]
      }
    }
    updateData.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('documents')
      .update(updateData)
      .eq('id', id)
      .select('id')
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, id: data.id })
  } catch (error) {
    console.error('Document update error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update document' },
      { status: 500 }
    )
  }
}
