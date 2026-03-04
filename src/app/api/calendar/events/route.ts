import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const MORGEN_BASE = 'https://api.morgen.so/v3'

// Cache the Expert Witness calendar ID for 1 hour
let cachedCalendar: { id: string; accountId: string; expiresAt: number } | null = null

async function getMorgenHeaders() {
  const apiKey = process.env.MORGEN_API_KEY
  if (!apiKey) throw new Error('Missing MORGEN_API_KEY')
  return {
    Authorization: `ApiKey ${apiKey}`,
    accept: 'application/json',
  }
}

async function getExpertWitnessCalendar(): Promise<{ id: string; accountId: string }> {
  // Return cached if still valid
  if (cachedCalendar && Date.now() < cachedCalendar.expiresAt) {
    return { id: cachedCalendar.id, accountId: cachedCalendar.accountId }
  }

  const headers = await getMorgenHeaders()
  const res = await fetch(`${MORGEN_BASE}/calendars/list`, { headers })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Morgen calendars/list failed (${res.status}): ${text}`)
  }

  const json = await res.json()
  const calendars = json?.data?.calendars || []

  // Find the Expert Witness calendar by name (check overrideName and name)
  const ewCal = calendars.find(
    (c: Record<string, unknown>) => {
      const meta = c['morgen.so:metadata'] as Record<string, unknown> | undefined
      const overrideName = meta?.overrideName as string | undefined
      const name = c.name as string
      return (
        overrideName?.toLowerCase().includes('expert witness') ||
        name?.toLowerCase().includes('expert witness')
      )
    }
  )

  if (!ewCal) {
    // Fall back to first calendar if no Expert Witness calendar found
    if (calendars.length === 0) {
      throw new Error('No calendars found in Morgen account')
    }
    const fallback = calendars[0]
    cachedCalendar = {
      id: fallback.id,
      accountId: fallback.accountId,
      expiresAt: Date.now() + 60 * 60 * 1000,
    }
    return { id: fallback.id, accountId: fallback.accountId }
  }

  cachedCalendar = {
    id: ewCal.id,
    accountId: ewCal.accountId,
    expiresAt: Date.now() + 60 * 60 * 1000,
  }

  return { id: ewCal.id, accountId: ewCal.accountId }
}

interface MorgenEvent {
  id: string
  title: string
  description?: string
  start: string
  timeZone?: string
  duration?: string
  showWithoutTime?: boolean
  freeBusyStatus?: string
  locations?: Record<string, { name?: string }>
  participants?: Record<string, { email?: string; role?: string; status?: string }>
}

function parseDuration(iso: string): number {
  // Parse ISO 8601 duration like PT1H, PT30M, PT1H30M into minutes
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/)
  if (!match) return 60
  const hours = parseInt(match[1] || '0', 10)
  const minutes = parseInt(match[2] || '0', 10)
  return hours * 60 + minutes
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const start = searchParams.get('start')
    const end = searchParams.get('end')

    if (!start || !end) {
      return NextResponse.json(
        { error: 'start and end query params required (ISO 8601)' },
        { status: 400 }
      )
    }

    // Fetch Morgen events and Supabase milestones in parallel
    const [morgenEvents, milestones] = await Promise.all([
      fetchMorgenEvents(start, end),
      fetchMilestones(start, end),
    ])

    // Combine into unified format
    const events = [
      ...morgenEvents.map((e) => ({
        id: e.id,
        title: e.title || '(No title)',
        start: e.start,
        timeZone: e.timeZone || 'America/Los_Angeles',
        durationMinutes: e.duration ? parseDuration(e.duration) : 60,
        allDay: e.showWithoutTime || false,
        type: 'calendar' as const,
        location: e.locations
          ? Object.values(e.locations).map((l) => l.name).filter(Boolean).join(', ')
          : null,
        description: e.description || null,
        freeBusy: e.freeBusyStatus || 'busy',
      })),
      ...milestones.map((m) => ({
        id: m.id,
        title: m.milestone_name,
        start: m.target_date,
        timeZone: 'America/Los_Angeles',
        durationMinutes: 0,
        allDay: true,
        type: 'milestone' as const,
        location: null,
        description: m.description || null,
        freeBusy: 'free',
        caseId: m.case_id,
        caseName: m.case_name,
        milestoneType: m.milestone_type,
        status: m.status,
        isCompleted: m.is_completed,
      })),
    ]

    return NextResponse.json({ events })
  } catch (error) {
    console.error('Calendar events error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

async function fetchMorgenEvents(start: string, end: string): Promise<MorgenEvent[]> {
  try {
    const { id: calendarId, accountId } = await getExpertWitnessCalendar()
    const headers = await getMorgenHeaders()
    const params = new URLSearchParams({
      accountId,
      calendarIds: calendarId,
      start,
      end,
    })

    const res = await fetch(`${MORGEN_BASE}/events/list?${params}`, { headers })

    if (!res.ok) {
      const text = await res.text()
      console.error(`Morgen events/list failed (${res.status}):`, text)
      return [] // Gracefully degrade - still show milestones
    }

    const json = await res.json()
    return json?.data?.events || []
  } catch (error) {
    console.error('Morgen API error:', error)
    return [] // Gracefully degrade
  }
}

interface MilestoneRow {
  id: string
  case_id: string
  milestone_type: string
  milestone_name: string
  description: string | null
  target_date: string
  status: string
  is_completed: boolean
  cases: { case_name: string } | null
}

async function fetchMilestones(start: string, end: string) {
  const supabase = getSupabaseAdmin()

  const startDate = start.split('T')[0]
  const endDate = end.split('T')[0]

  const { data, error } = await supabase
    .from('case_milestones')
    .select(`
      id,
      case_id,
      milestone_type,
      milestone_name,
      description,
      target_date,
      status,
      is_completed,
      cases!inner(case_name)
    `)
    .gte('target_date', startDate)
    .lte('target_date', endDate)
    .order('target_date', { ascending: true })

  if (error) {
    console.error('Milestones query error:', error)
    return []
  }

  return ((data || []) as unknown as MilestoneRow[]).map((m) => ({
    id: m.id,
    case_id: m.case_id,
    milestone_type: m.milestone_type,
    milestone_name: m.milestone_name,
    description: m.description,
    target_date: m.target_date,
    status: m.status,
    is_completed: m.is_completed,
    case_name: m.cases?.case_name || 'Unknown Case',
  }))
}
