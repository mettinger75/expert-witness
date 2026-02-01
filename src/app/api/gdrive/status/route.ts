import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    const { data: tokenSetting } = await supabase
      .from('system_settings')
      .select('setting_value, updated_at')
      .eq('setting_key', 'gdrive_tokens')
      .single()

    if (!tokenSetting?.setting_value) {
      return NextResponse.json({ connected: false })
    }

    return NextResponse.json({
      connected: true,
      lastUpdated: tokenSetting.updated_at,
    })
  } catch {
    return NextResponse.json({ connected: false })
  }
}

export async function DELETE() {
  try {
    const supabase = getSupabaseAdmin()
    await supabase.from('system_settings').delete().eq('setting_key', 'gdrive_tokens')
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to disconnect'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
