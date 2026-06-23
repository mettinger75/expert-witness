import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

// GET: List contacts with optional filters
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const contact_type = searchParams.get('contact_type')
    const is_active = searchParams.get('is_active')
    const parent_contact_id = searchParams.get('parent_contact_id')

    let query = supabase
      .from('contacts')
      .select('*, case_contacts(case_id, role, cases(case_name, case_number)), parent_contact:contacts!parent_contact_id(id, organization_name)')
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true })

    if (contact_type) query = query.eq('contact_type', contact_type)
    if (is_active !== null && is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true')
    }
    if (parent_contact_id) {
      query = query.eq('parent_contact_id', parent_contact_id)
    }
    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,organization_name.ilike.%${search}%`
      )
    }

    const { data, error } = await query
    if (error) {
      console.error('Contacts fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data ?? [])
  } catch (error) {
    console.error('Contacts GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: Create a new contact
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json()

    // Validate required fields
    if (!body.first_name || !body.last_name || !body.contact_type) {
      return NextResponse.json(
        { error: 'first_name, last_name, and contact_type are required' },
        { status: 400 }
      )
    }

    // Ensure preferred_communication is valid (DB constraint: email, phone, fax)
    if (body.preferred_communication && !['email', 'phone', 'fax'].includes(body.preferred_communication)) {
      body.preferred_communication = 'email'
    }

    const { data, error } = await supabase
      .from('contacts')
      .insert(body)
      .select()
      .single()

    if (error) {
      console.error('Contact creation error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Contacts POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
