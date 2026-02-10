'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatDate } from '@/lib/formatters'
import {
  MEETING_TYPES,
  TRANSCRIPT_STATUSES,
  getLabelForValue,
  getColorForValue,
} from '@/lib/constants'
import { meetingsService } from '@/services/meetings.service'
import { useUpdateMeeting } from '@/hooks/useMeetings'
import type { MeetingRow } from '@/types/database.types'
import {
  Clock,
  Users,
  Calendar,
  FileText,
  Brain,
  CheckCircle2,
  Pencil,
  Check,
  X,
  Loader2,
} from 'lucide-react'

interface MeetingDetailProps {
  meeting: MeetingRow
}

export function MeetingDetail({ meeting }: MeetingDetailProps) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesValue, setNotesValue] = useState(meeting.notes || '')
  const updateMeeting = useUpdateMeeting()

  // Fetch signed audio URL if recording exists
  useEffect(() => {
    let cancelled = false
    if (meeting.recording_file_path) {
      meetingsService
        .getRecordingUrl(meeting.recording_file_path)
        .then((url) => {
          if (!cancelled) setAudioUrl(url)
        })
        .catch(() => {
          if (!cancelled) setAudioUrl(null)
        })
    }
    return () => {
      cancelled = true
    }
  }, [meeting.recording_file_path])

  // Format duration from seconds
  function formatDurationSeconds(seconds: number | null): string {
    if (seconds == null) return '-'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}h ${m}m ${s}s`
    if (m > 0) return `${m}m ${s}s`
    return `${s}s`
  }

  function handleSaveNotes() {
    updateMeeting.mutate(
      { id: meeting.id, data: { notes: notesValue.trim() || null } },
      { onSuccess: () => setEditingNotes(false) }
    )
  }

  const keyPoints = Array.isArray(meeting.ai_key_points)
    ? (meeting.ai_key_points as string[])
    : []
  const actionItems = Array.isArray(meeting.ai_action_items)
    ? (meeting.ai_action_items as string[])
    : []
  const participants = Array.isArray(meeting.participants)
    ? (meeting.participants as string[])
    : []

  return (
    <div className="space-y-4">
      {/* Metadata */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>{formatDate(meeting.meeting_date)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <StatusBadge
            label={getLabelForValue(MEETING_TYPES, meeting.meeting_type)}
            color="blue"
          />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>{formatDurationSeconds(meeting.duration_seconds)}</span>
        </div>
        {participants.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{participants.join(', ')}</span>
          </div>
        )}
      </div>

      {/* Audio Playback */}
      {audioUrl && (
        <Card>
          <CardContent className="py-3">
            <Label className="text-xs text-muted-foreground mb-2 block">Recording</Label>
            <audio controls className="w-full" src={audioUrl}>
              Your browser does not support audio playback.
            </audio>
          </CardContent>
        </Card>
      )}

      {/* Transcript */}
      {meeting.transcript_status === 'completed' && meeting.transcript_text && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Transcript</Label>
              <StatusBadge
                label={getLabelForValue(TRANSCRIPT_STATUSES, meeting.transcript_status)}
                color={getColorForValue(TRANSCRIPT_STATUSES, meeting.transcript_status)}
              />
            </div>
            <div className="max-h-64 overflow-y-auto rounded-md bg-slate-50 p-3 text-sm leading-relaxed whitespace-pre-wrap">
              {meeting.transcript_text}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Summary */}
      {meeting.ai_summary && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="h-4 w-4" style={{ color: '#C9A84C' }} />
              <Label className="text-sm font-medium">AI Summary</Label>
            </div>
            <p className="text-sm leading-relaxed">{meeting.ai_summary}</p>

            {keyPoints.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Key Points
                </p>
                <ul className="space-y-1.5">
                  {keyPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: '#C9A84C' }} />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {actionItems.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Action Items
                </p>
                <ul className="space-y-1.5">
                  {actionItems.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span
                        className="flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold shrink-0 mt-0.5"
                        style={{ backgroundColor: '#0E1F35', color: '#fff' }}
                      >
                        {i + 1}
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-medium">Notes</Label>
            {!editingNotes ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setNotesValue(meeting.notes || '')
                  setEditingNotes(true)
                }}
                className="h-7 px-2 text-xs"
              >
                <Pencil className="h-3 w-3 mr-1" />
                Edit
              </Button>
            ) : (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSaveNotes}
                  disabled={updateMeeting.isPending}
                  className="h-7 px-2 text-xs text-green-700"
                >
                  {updateMeeting.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Check className="h-3 w-3" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingNotes(false)}
                  className="h-7 px-2 text-xs text-red-500"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
          {editingNotes ? (
            <Textarea
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              rows={4}
              placeholder="Add meeting notes..."
            />
          ) : (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {meeting.notes || 'No notes yet.'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
