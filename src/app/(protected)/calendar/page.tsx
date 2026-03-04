'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Flag,
  Briefcase,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'

// ─── Types ───────────────────────────────────────────────────────────────────

interface CalendarEvent {
  id: string
  title: string
  start: string
  timeZone: string
  durationMinutes: number
  allDay: boolean
  type: 'calendar' | 'milestone'
  location: string | null
  description: string | null
  freeBusy: string
  caseId?: string
  caseName?: string
  milestoneType?: string
  status?: string
  isCompleted?: boolean
}

type ViewMode = 'month' | 'week'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - day)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function isToday(date: Date): boolean {
  return isSameDay(date, new Date())
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function formatDateRange(start: string, durationMinutes: number): string {
  const s = new Date(start)
  const e = new Date(s.getTime() + durationMinutes * 60 * 1000)
  return `${formatTime(start)} – ${e.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })}`
}

function getMonthDays(year: number, month: number): Date[] {
  const first = new Date(year, month, 1)
  const start = startOfWeek(first)
  const days: Date[] = []
  // Always show 6 weeks (42 days) for consistent grid
  for (let i = 0; i < 42; i++) {
    days.push(addDays(start, i))
  }
  return days
}

function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(date)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

// ─── Event Detail Panel ──────────────────────────────────────────────────────

function EventDetailPanel({
  event,
  onClose,
}: {
  event: CalendarEvent
  onClose: () => void
}) {
  const isMilestone = event.type === 'milestone'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div
          className="px-5 py-4"
          style={{
            backgroundColor: isMilestone ? '#0E1F35' : '#C9A84C',
          }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {isMilestone ? (
                <Flag className="h-4 w-4 text-[#C9A84C]" />
              ) : (
                <CalendarIcon className="h-4 w-4 text-[#0E1F35]" />
              )}
              <span
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: isMilestone ? '#C9A84C' : '#0E1F35' }}
              >
                {isMilestone ? event.milestoneType || 'Milestone' : 'Calendar Event'}
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white text-lg leading-none"
            >
              &times;
            </button>
          </div>
          <h3 className="text-lg font-semibold text-white mt-2">{event.title}</h3>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          {/* Time */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="h-4 w-4 text-gray-400" />
            {event.allDay ? (
              <span>
                All day &middot;{' '}
                {new Date(event.start + (event.start.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            ) : (
              <span>
                {formatDateRange(event.start, event.durationMinutes)}
                {' \u00b7 '}
                {new Date(event.start).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            )}
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4 text-gray-400" />
              <span>{event.location}</span>
            </div>
          )}

          {/* Case link for milestones */}
          {isMilestone && event.caseId && (
            <div className="flex items-center gap-2 text-sm">
              <Briefcase className="h-4 w-4 text-gray-400" />
              <Link
                href={`/cases/${event.caseId}`}
                className="text-[#C9A84C] hover:underline font-medium"
              >
                {event.caseName}
              </Link>
              {event.isCompleted && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  Completed
                </span>
              )}
              {!event.isCompleted && event.status && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                  {event.status}
                </span>
              )}
            </div>
          )}

          {/* Description */}
          {event.description && (
            <p className="text-sm text-gray-600 border-t pt-3 mt-3">
              {event.description}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-gray-50 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-[#0E1F35] text-white hover:bg-[#0E1F35]/90 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Day Cell (Month View) ───────────────────────────────────────────────────

function DayCell({
  date,
  events,
  currentMonth,
  onSelectEvent,
}: {
  date: Date
  events: CalendarEvent[]
  currentMonth: number
  onSelectEvent: (e: CalendarEvent) => void
}) {
  const inMonth = date.getMonth() === currentMonth
  const today = isToday(date)
  const maxVisible = 3

  return (
    <div
      className={`min-h-[100px] border-r border-b p-1.5 transition-colors ${
        inMonth ? 'bg-white' : 'bg-gray-50/50'
      }`}
      style={{ borderColor: 'rgba(14, 31, 53, 0.08)' }}
    >
      {/* Date number */}
      <div className="flex items-center justify-between mb-1">
        <span
          className={`text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full ${
            today
              ? 'bg-[#C9A84C] text-white'
              : inMonth
                ? 'text-[#0E1F35]'
                : 'text-gray-300'
          }`}
        >
          {date.getDate()}
        </span>
      </div>

      {/* Events */}
      <div className="space-y-0.5">
        {events.slice(0, maxVisible).map((event) => (
          <button
            key={event.id}
            onClick={() => onSelectEvent(event)}
            className={`w-full text-left text-[11px] leading-tight px-1.5 py-0.5 rounded truncate transition-opacity hover:opacity-80 ${
              event.type === 'milestone'
                ? 'bg-[#0E1F35] text-white'
                : 'bg-[#C9A84C]/15 text-[#0E1F35]'
            }`}
          >
            {!event.allDay && (
              <span className="font-medium">{formatTime(event.start)} </span>
            )}
            {event.title}
          </button>
        ))}
        {events.length > maxVisible && (
          <span className="text-[10px] text-gray-400 pl-1.5">
            +{events.length - maxVisible} more
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Week View ───────────────────────────────────────────────────────────────

function WeekView({
  days,
  eventsByDate,
  onSelectEvent,
}: {
  days: Date[]
  eventsByDate: Map<string, CalendarEvent[]>
  onSelectEvent: (e: CalendarEvent) => void
}) {
  const hours = Array.from({ length: 14 }, (_, i) => i + 7) // 7am to 8pm

  return (
    <div className="overflow-auto">
      {/* Day headers */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] sticky top-0 bg-white z-10 border-b" style={{ borderColor: 'rgba(14, 31, 53, 0.08)' }}>
        <div className="p-2" />
        {days.map((d) => {
          const today = isToday(d)
          return (
            <div
              key={d.toISOString()}
              className="p-2 text-center border-l"
              style={{ borderColor: 'rgba(14, 31, 53, 0.08)' }}
            >
              <div className="text-[10px] uppercase tracking-wider text-gray-400">
                {d.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <div
                className={`text-lg font-semibold inline-flex items-center justify-center w-8 h-8 rounded-full ${
                  today ? 'bg-[#C9A84C] text-white' : 'text-[#0E1F35]'
                }`}
              >
                {d.getDate()}
              </div>
            </div>
          )
        })}
      </div>

      {/* All-day events row */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b" style={{ borderColor: 'rgba(14, 31, 53, 0.08)' }}>
        <div className="p-1 text-[10px] text-gray-400 text-right pr-2">all day</div>
        {days.map((d) => {
          const key = d.toISOString().split('T')[0]
          const allDayEvents = (eventsByDate.get(key) || []).filter((e) => e.allDay)
          return (
            <div
              key={key}
              className="border-l p-1 min-h-[32px] space-y-0.5"
              style={{ borderColor: 'rgba(14, 31, 53, 0.08)' }}
            >
              {allDayEvents.map((event) => (
                <button
                  key={event.id}
                  onClick={() => onSelectEvent(event)}
                  className={`w-full text-left text-[11px] px-1.5 py-0.5 rounded truncate hover:opacity-80 ${
                    event.type === 'milestone'
                      ? 'bg-[#0E1F35] text-white'
                      : 'bg-[#C9A84C]/20 text-[#0E1F35]'
                  }`}
                >
                  {event.title}
                </button>
              ))}
            </div>
          )
        })}
      </div>

      {/* Time grid */}
      {hours.map((hour) => (
        <div
          key={hour}
          className="grid grid-cols-[60px_repeat(7,1fr)] border-b"
          style={{ borderColor: 'rgba(14, 31, 53, 0.04)', minHeight: 48 }}
        >
          <div className="text-[10px] text-gray-400 text-right pr-2 pt-1">
            {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
          </div>
          {days.map((d) => {
            const key = d.toISOString().split('T')[0]
            const hourEvents = (eventsByDate.get(key) || []).filter((e) => {
              if (e.allDay) return false
              const eventHour = new Date(e.start).getHours()
              return eventHour === hour
            })
            return (
              <div
                key={`${key}-${hour}`}
                className="border-l relative"
                style={{ borderColor: 'rgba(14, 31, 53, 0.06)' }}
              >
                {hourEvents.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => onSelectEvent(event)}
                    className="absolute inset-x-0.5 top-0.5 text-left text-[11px] px-1.5 py-1 rounded bg-[#C9A84C]/15 text-[#0E1F35] hover:bg-[#C9A84C]/25 truncate border border-[#C9A84C]/20"
                    style={{
                      height: Math.max(
                        24,
                        (event.durationMinutes / 60) * 48 - 4
                      ),
                    }}
                  >
                    <span className="font-medium">{formatTime(event.start)}</span>{' '}
                    {event.title}
                  </button>
                ))}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ─── Main Calendar Page ──────────────────────────────────────────────────────

export default function CalendarPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    setError(null)

    let start: string
    let end: string

    if (viewMode === 'month') {
      // Fetch a bit wider than the visible month for the grid edges
      const firstVisible = startOfWeek(new Date(year, month, 1))
      const lastVisible = addDays(firstVisible, 42)
      start = firstVisible.toISOString()
      end = lastVisible.toISOString()
    } else {
      const weekStart = startOfWeek(currentDate)
      start = weekStart.toISOString()
      end = addDays(weekStart, 7).toISOString()
    }

    try {
      const res = await fetch(
        `/api/calendar/events?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
      )
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to fetch events')
      }
      const data = await res.json()
      setEvents(data.events || [])
    } catch (err) {
      console.error('Calendar fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load calendar')
    } finally {
      setLoading(false)
    }
  }, [viewMode, year, month, currentDate])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  // Group events by date
  const eventsByDate = new Map<string, CalendarEvent[]>()
  events.forEach((e) => {
    const dateStr = e.start.includes('T')
      ? e.start.split('T')[0]
      : e.start
    const existing = eventsByDate.get(dateStr) || []
    existing.push(e)
    eventsByDate.set(dateStr, existing)
  })

  // Navigation
  function goToday() {
    setCurrentDate(new Date())
  }

  function goPrev() {
    if (viewMode === 'month') {
      setCurrentDate(new Date(year, month - 1, 1))
    } else {
      setCurrentDate(addDays(startOfWeek(currentDate), -7))
    }
  }

  function goNext() {
    if (viewMode === 'month') {
      setCurrentDate(new Date(year, month + 1, 1))
    } else {
      setCurrentDate(addDays(startOfWeek(currentDate), 7))
    }
  }

  const monthDays = getMonthDays(year, month)
  const weekDays = getWeekDays(currentDate)

  const headerLabel =
    viewMode === 'month'
      ? currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : `${weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0E1F35]">Calendar</h1>
        <p className="text-sm text-gray-500 mt-1">
          Expert witness schedule and case deadlines
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={goToday}
            className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 text-[#0E1F35] hover:bg-gray-50 transition-colors"
          >
            Today
          </button>
          <button
            onClick={goPrev}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <button
            onClick={goNext}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </button>
          <h2 className="text-lg font-semibold text-[#0E1F35] ml-2">
            {headerLabel}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Legend */}
          <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500 mr-2">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#C9A84C]/30" />
              Calendar
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#0E1F35]" />
              Deadline
            </span>
          </div>

          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === 'month'
                  ? 'bg-[#0E1F35] text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === 'week'
                  ? 'bg-[#0E1F35] text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Week
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: 'rgba(14, 31, 53, 0.1)' }}>
        {loading ? (
          <div className="flex items-center justify-center py-32 text-gray-400">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Loading calendar...
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-32 text-gray-400">
            <p className="text-red-500 mb-2">{error}</p>
            <button
              onClick={fetchEvents}
              className="text-sm text-[#C9A84C] hover:underline"
            >
              Retry
            </button>
          </div>
        ) : viewMode === 'month' ? (
          <>
            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 border-b" style={{ borderColor: 'rgba(14, 31, 53, 0.08)' }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div
                  key={d}
                  className="text-center text-[10px] uppercase tracking-wider font-medium text-gray-400 py-2"
                >
                  {d}
                </div>
              ))}
            </div>
            {/* Day grid */}
            <div className="grid grid-cols-7">
              {monthDays.map((date) => {
                const key = date.toISOString().split('T')[0]
                return (
                  <DayCell
                    key={key}
                    date={date}
                    events={eventsByDate.get(key) || []}
                    currentMonth={month}
                    onSelectEvent={setSelectedEvent}
                  />
                )
              })}
            </div>
          </>
        ) : (
          <WeekView
            days={weekDays}
            eventsByDate={eventsByDate}
            onSelectEvent={setSelectedEvent}
          />
        )}
      </div>

      {/* Event Detail Panel */}
      {selectedEvent && (
        <EventDetailPanel
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  )
}
