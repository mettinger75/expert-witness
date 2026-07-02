import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireAdminUser } from '@/lib/api-admin-auth'

// GET: Fetch a single contact by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminUser(request)
    if (auth.error) return auth.error
    const { id } = await params
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Contact fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Contact GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: Delete a contact
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminUser(request)
    if (auth.error) return auth.error
    const { id } = await params
    const supabase = getSupabaseAdmin()

    // Check for linked cases
    const { count: caseCount } = await supabase
      .from('case_contacts')
      .select('*', { count: 'exact', head: true })
      .eq('contact_id', id)

    // Check for active portal invites
    const { count: portalCount } = await supabase
      .from('portal_invites')
      .select('*', { count: 'exact', head: true })
      .eq('contact_id', id)
      .eq('is_active', true)

    // Allow force delete via query param
    const force = request.nextUrl.searchParams.get('force') === 'true'

    if (!force && ((caseCount ?? 0) > 0 || (portalCount ?? 0) > 0)) {
      return NextResponse.json({
        error: 'Contact has linked records',
        linkedCases: caseCount ?? 0,
        activePortalInvites: portalCount ?? 0,
        message: `This contact is linked to ${caseCount ?? 0} case(s) and has ${portalCount ?? 0} active portal invite(s). Use force=true to delete anyway.`,
      }, { status: 409 })
    }

    // Deactivate portal invites first (if force)
    if ((portalCount ?? 0) > 0) {
      await supabase
        .from('portal_invites')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('contact_id', id)
        .eq('is_active', true)
    }

    // Delete the contact (case_contacts will cascade, invoices/comm logs will SET NULL)
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Contact delete error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Contact DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT: Update a contact
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminUser(request)
    if (auth.error) return auth.error
    const { id } = await params
    const supabase = getSupabaseAdmin()
    const body = await request.json()

    // Ensure preferred_communication is valid (DB constraint: email, phone, fax)
    if (body.preferred_communication && !['email', 'phone', 'fax'].includes(body.preferred_communication)) {
      body.preferred_communication = 'email'
    }

    const { data, error } = await supabase
      .from('contacts')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Contact update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Contact PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
