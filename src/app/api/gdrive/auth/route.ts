import { NextRequest, NextResponse } from 'next/server'
import { getAuthUrl } from '@/lib/gdrive'

export async function GET(request: NextRequest) {
  try {
    const caseId = request.nextUrl.searchParams.get('caseId')
    const state = caseId ? JSON.stringify({ caseId }) : ''
    return NextResponse.redirect(getAuthUrl(state))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate auth URL'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
