import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireAdminUser } from '@/lib/api-admin-auth'

// DELETE: Hard-delete a case and all linked records (FK cascades)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminUser(request)
    if (auth.error) return auth.error
    const { id } = await params
    const supabase = getSupabaseAdmin()

    // Verify case exists
    const { data: caseData, error: fetchError } = await supabase
      .from('cases')
      .select('id, case_name, case_number')
      .eq('id', id)
      .single()

    if (fetchError || !caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    // Count linked records to warn user
    const [documents, reports, invoices, timeEntries, portalInvites, milestones, notes] = await Promise.all([
      supabase.from('documents').select('*', { count: 'exact', head: true }).eq('case_id', id),
      supabase.from('reports').select('*', { count: 'exact', head: true }).eq('case_id', id),
      supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('case_id', id),
      supabase.from('time_entries').select('*', { count: 'exact', head: true }).eq('case_id', id),
      supabase.from('portal_invites').select('*', { count: 'exact', head: true }).eq('case_id', id),
      supabase.from('case_milestones').select('*', { count: 'exact', head: true }).eq('case_id', id),
      supabase.from('case_notes').select('*', { count: 'exact', head: true }).eq('case_id', id),
    ])

    const linkedCounts = {
      documents: documents.count ?? 0,
      reports: reports.count ?? 0,
      invoices: invoices.count ?? 0,
      timeEntries: timeEntries.count ?? 0,
      portalInvites: portalInvites.count ?? 0,
      milestones: milestones.count ?? 0,
      notes: notes.count ?? 0,
    }

    const totalLinked = Object.values(linkedCounts).reduce((sum, c) => sum + c, 0)

    // Allow force delete via query param
    const force = request.nextUrl.searchParams.get('force') === 'true'

    if (!force && totalLinked > 0) {
      return NextResponse.json({
        error: 'Case has linked records',
        caseName: caseData.case_name,
        caseNumber: caseData.case_number,
        linkedCounts,
        totalLinked,
        message: `This case has ${totalLinked} linked record(s). Use force=true to permanently delete.`,
      }, { status: 409 })
    }

    // Deactivate portal invites first (so tokens stop working immediately)
    if (linkedCounts.portalInvites > 0) {
      await supabase
        .from('portal_invites')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('case_id', id)
        .eq('is_active', true)
    }

    // Delete the case — FK cascades handle all child records
    const { error: deleteError } = await supabase
      .from('cases')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Case delete error:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, deletedCounts: linkedCounts })
  } catch (error) {
    console.error('Case DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
