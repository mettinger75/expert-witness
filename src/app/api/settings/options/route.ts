import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireAdminUser } from '@/lib/api-admin-auth'
import { OPTION_KEYS, CONSTRAINT_MAP } from '@/lib/constants'

// GET /api/settings/options — fetch all option settings
export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value')
      .eq('category', 'options')
      .order('setting_key')

    if (error) throw error

    // Also fetch dashboard layout
    const { data: dashData } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value')
      .eq('setting_key', 'dashboard.layout')
      .single()

    const options: Record<string, unknown> = {}
    for (const row of data ?? []) {
      options[row.setting_key] = row.setting_value
    }
    if (dashData) {
      options[dashData.setting_key] = dashData.setting_value
    }

    return NextResponse.json(options)
  } catch (error) {
    console.error('GET /api/settings/options error:', error)
    return NextResponse.json({ error: 'Failed to fetch options' }, { status: 500 })
  }
}

// PUT /api/settings/options — save an option list + update CHECK constraint if needed
export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAdminUser(req)
    if (auth.error) return auth.error

    const body = await req.json()
    const { settingKey, options } = body as {
      settingKey: string
      options: Array<{
        value: string
        label: string
        color?: string
        is_active: boolean
        sort_order: number
      }>
    }

    if (!settingKey || !Array.isArray(options)) {
      return NextResponse.json(
        { error: 'settingKey and options array are required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // 1. Upsert the setting
    const category = settingKey.startsWith('dashboard.') ? 'dashboard' : 'options'
    const { error: upsertError } = await supabase
      .from('system_settings')
      .upsert(
        {
          setting_key: settingKey,
          setting_value: options,
          setting_type: 'json',
          category,
        },
        { onConflict: 'setting_key' }
      )

    if (upsertError) throw upsertError

    // 2. Update CHECK constraint if this option key has one
    const constraintKey = settingKey.replace('options.', '') as keyof typeof CONSTRAINT_MAP
    const constraintInfo = CONSTRAINT_MAP[constraintKey]

    if (constraintInfo) {
      // Get all option values (including inactive — they may already be referenced by records)
      const allValues = options.map((o) => o.value)

      for (const { table, column, constraint } of constraintInfo) {
        const valuesList = allValues.map((v) => `'${v.replace(/'/g, "''")}'`).join(', ')
        const ddl = `
          ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${constraint};
          ALTER TABLE ${table} ADD CONSTRAINT ${constraint}
            CHECK (${column}::text = ANY(ARRAY[${valuesList}]::text[]));
        `
        const { error: ddlError } = await supabase.rpc('execute_admin_query', {
          query_text: ddl,
        })
        if (ddlError) {
          console.error(`Failed to update constraint ${constraint}:`, ddlError)
          // Don't fail the whole request — the setting was saved successfully
        }
      }
    }

    return NextResponse.json({ success: true, settingKey })
  } catch (error) {
    console.error('PUT /api/settings/options error:', error)
    return NextResponse.json({ error: 'Failed to save options' }, { status: 500 })
  }
}
