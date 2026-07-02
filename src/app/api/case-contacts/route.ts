import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireAdminUser } from '@/lib/api-admin-auth'

// GET: List all contacts associated with a case
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminUser(request)
    if (auth.error) return auth.error

    const caseId = request.nextUrl.searchParams.get('caseId')
    if (!caseId) {
      return NextResponse.json({ error: 'Missing caseId' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const { data: contacts, error } = await supabase
      .from('case_contacts')
      .select('id, contact_id, role, is_primary, contacts(id, first_name, last_name, email, organization_name, contact_type)')
      .eq('case_id', caseId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json({ contacts: contacts || [] })
  } catch (error) {
    console.error('Case contacts fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch case contacts' }, { status: 500 })
  }
}
