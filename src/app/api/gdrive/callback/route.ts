import { NextRequest, NextResponse } from 'next/server'
import { getTokensFromCode } from '@/lib/gdrive'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')
  const error = request.nextUrl.searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://expert-witness.vercel.app'

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/settings?error=google_auth_failed`)
  }

  try {
    const tokens = await getTokensFromCode(code)
    const supabase = getSupabaseAdmin()

    await supabase.from('system_settings').upsert({
      setting_key: 'gdrive_tokens',
      setting_value: tokens,
      setting_type: 'credentials',
      category: 'integrations',
      is_sensitive: true,
    }, { onConflict: 'setting_key' })

    let redirectUrl = `${appUrl}/settings?success=google_connected`
    if (state) {
      try {
        const { caseId } = JSON.parse(state)
        if (caseId) redirectUrl = `${appUrl}/cases/${caseId}/documents?success=google_connected`
      } catch { /* invalid state JSON */ }
    }

    return NextResponse.redirect(redirectUrl)
  } catch (err) {
    console.error('Google Drive callback error:', err)
    return NextResponse.redirect(`${appUrl}/settings?error=google_auth_failed`)
  }
}
