'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { MeetingRecorder } from '@/components/meetings/MeetingRecorder'
import { MeetingUploader } from '@/components/meetings/MeetingUploader'
import { MeetingDetail } from '@/components/meetings/MeetingDetail'
import { formatDate } from '@/lib/formatters'
import {
  MEETING_TYPES,
  TRANSCRIPT_STATUSES,
  getLabelForValue,
  getColorForValue,
} from '@/lib/constants'
import {
  useMeetings,
  useCreateMeeting,
  useUploadRecording,
} from '@/hooks/useMeetings'
import type { MeetingRow, MeetingType } from '@/types/database.types'
import { toast } from 'sonner'
import {
  Plus,
  Mic,
  Upload,
  CalendarPlus,
  ChevronDown,
  ChevronUp,
  Phone,
  Video,
  Users,
  Gavel,
  Headphones,
  Loader2,
  Brain,
  FileText,
  AudioLines,
} from 'lucide-react'

// Icons for meeting types
function getMeetingTypeIcon(type: string) {
  switch (type) {
    case 'phone_call':
    case 'client_call':
      return Phone
    case 'video_call':
      return Video
    case 'in_person':
    case 'conference':
      return Users
    case 'deposition_prep':
      return Gavel
    case 'expert_conference':
      return Headphones
    default:
      return Phone
  }
}

function formatDurationSeconds(seconds: number | null): string {
  if (seconds == null) return '-'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export default function CaseMeetingsPage() {
  const params = useParams()
  const caseId = params.id as string

  // Data hooks
  const { data: meetings = [], isLoading } = useMeetings(caseId)
  const createMeeting = useCreateMeeting()
  const uploadRecording = useUploadRecording()

  // UI state
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [recordDialogOpen, setRecordDialogOpen] = useState(false)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [transcribingId, setTranscribingId] = useState<string | null>(null)
  const [summarizingId, setSummarizingId] = useState<string | null>(null)

  // Record dialog form state
  const [recordName, setRecordName] = useState('')
  const [recordType, setRecordType] = useState<string>('phone_call')
  const [recordingFile, setRecordingFile] = useState<File | null>(null)
  const [recordingDuration, setRecordingDuration] = useState<number>(0)
  const [isSavingRecord, setIsSavingRecord] = useState(false)

  // Upload dialog form state
  const [uploadName, setUploadName] = useState('')
  const [uploadType, setUploadType] = useState<string>('phone_call')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [isSavingUpload, setIsSavingUpload] = useState(false)

  // Add meeting (no recording) form state
  const [addName, setAddName] = useState('')
  const [addType, setAddType] = useState<string>('phone_call')
  const [addDate, setAddDate] = useState('')
  const [addNotes, setAddNotes] = useState('')

  // Reset form helpers
  function resetRecordForm() {
    setRecordName('')
    setRecordType('phone_call')
    setRecordingFile(null)
    setRecordingDuration(0)
  }

  function resetUploadForm() {
    setUploadName('')
    setUploadType('phone_call')
    setUploadFile(null)
  }

  function resetAddForm() {
    setAddName('')
    setAddType('phone_call')
    setAddDate('')
    setAddNotes('')
  }

  // Handle recording complete from MeetingRecorder
  function handleRecordingComplete(file: File, duration: number) {
    setRecordingFile(file)
    setRecordingDuration(duration)
  }

  // Save recorded meeting
  async function handleSaveRecording() {
    if (!recordName.trim()) {
      toast.error('Please enter a meeting name')
      return
    }
    if (!recordingFile) {
      toast.error('Please record audio first')
      return
    }

    setIsSavingRecord(true)
    try {
      // Upload the recording
      const filePath = await uploadRecording.mutateAsync({
        caseId,
        file: recordingFile,
      })

      // Create the meeting record
      await createMeeting.mutateAsync({
        case_id: caseId,
        meeting_name: recordName.trim(),
        meeting_type: recordType as MeetingType,
        meeting_date: new Date().toISOString(),
        duration_seconds: recordingDuration,
        recording_file_path: filePath,
        recording_file_size: recordingFile.size,
        transcript_status: 'none',
      })

      resetRecordForm()
      setRecordDialogOpen(false)
    } catch {
      // Errors handled by mutation hooks
    } finally {
      setIsSavingRecord(false)
    }
  }

  // Save uploaded meeting
  async function handleSaveUpload() {
    if (!uploadName.trim()) {
      toast.error('Please enter a meeting name')
      return
    }
    if (!uploadFile) {
      toast.error('Please select an audio file')
      return
    }

    setIsSavingUpload(true)
    try {
      const filePath = await uploadRecording.mutateAsync({
        caseId,
        file: uploadFile,
      })

      await createMeeting.mutateAsync({
        case_id: caseId,
        meeting_name: uploadName.trim(),
        meeting_type: uploadType as MeetingType,
        meeting_date: new Date().toISOString(),
        recording_file_path: filePath,
        recording_file_size: uploadFile.size,
        transcript_status: 'none',
      })

      resetUploadForm()
      setUploadDialogOpen(false)
    } catch {
      // Errors handled by mutation hooks
    } finally {
      setIsSavingUpload(false)
    }
  }

  // Save meeting without recording
  function handleSaveAdd() {
    if (!addName.trim()) {
      toast.error('Please enter a meeting name')
      return
    }
    if (!addDate) {
      toast.error('Please select a date')
      return
    }

    createMeeting.mutate(
      {
        case_id: caseId,
        meeting_name: addName.trim(),
        meeting_type: addType as MeetingType,
        meeting_date: addDate,
        notes: addNotes.trim() || null,
        transcript_status: 'none',
      },
      {
        onSuccess: () => {
          resetAddForm()
          setAddDialogOpen(false)
        },
      }
    )
  }

  // Transcribe a meeting
  async function handleTranscribe(meetingId: string) {
    setTranscribingId(meetingId)
    try {
      const response = await fetch('/api/meetings/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId }),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Transcription failed' }))
        throw new Error(err.error || 'Transcription failed')
      }
      toast.success('Transcription complete')
      // Refetch meetings to get updated data
      window.location.reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Transcription failed')
    } finally {
      setTranscribingId(null)
    }
  }

  // Summarize a meeting
  async function handleSummarize(meetingId: string) {
    setSummarizingId(meetingId)
    try {
      const response = await fetch('/api/meetings/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId }),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Summarization failed' }))
        throw new Error(err.error || 'Summarization failed')
      }
      toast.success('Summary generated')
      window.location.reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Summarization failed')
    } finally {
      setSummarizingId(null)
    }
  }

  if (isLoading) {
    return <LoadingSpinner className="py-20" />
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">Meetings</h2>
          <p className="text-sm text-muted-foreground">
            Record, transcribe, and summarize meetings
            {meetings.length > 0 && ` (${meetings.length} total)`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Record Meeting */}
          <Dialog
            open={recordDialogOpen}
            onOpenChange={(open) => {
              setRecordDialogOpen(open)
              if (!open) resetRecordForm()
            }}
          >
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Mic className="h-4 w-4" />
                Record
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Record Meeting</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="record-name">Meeting Name *</Label>
                  <Input
                    id="record-name"
                    placeholder="e.g., Call with Attorney Smith"
                    value={recordName}
                    onChange={(e) => setRecordName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="record-type">Meeting Type</Label>
                  <Select value={recordType} onValueChange={setRecordType}>
                    <SelectTrigger id="record-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MEETING_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="border rounded-lg p-4">
                  <MeetingRecorder
                    caseId={caseId}
                    onRecordingComplete={handleRecordingComplete}
                  />
                </div>

                {recordingFile && (
                  <p className="text-sm text-green-700">
                    Recording ready ({(recordingFile.size / (1024 * 1024)).toFixed(1)}MB)
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      resetRecordForm()
                      setRecordDialogOpen(false)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveRecording}
                    disabled={!recordingFile || isSavingRecord}
                  >
                    {isSavingRecord ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Meeting'
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Upload Recording */}
          <Dialog
            open={uploadDialogOpen}
            onOpenChange={(open) => {
              setUploadDialogOpen(open)
              if (!open) resetUploadForm()
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Upload className="h-4 w-4" />
                Upload
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Upload Recording</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="upload-name">Meeting Name *</Label>
                  <Input
                    id="upload-name"
                    placeholder="e.g., Deposition Prep Call"
                    value={uploadName}
                    onChange={(e) => setUploadName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="upload-type">Meeting Type</Label>
                  <Select value={uploadType} onValueChange={setUploadType}>
                    <SelectTrigger id="upload-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MEETING_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <MeetingUploader
                  caseId={caseId}
                  onFileSelected={(file) => setUploadFile(file)}
                />

                {uploadFile && (
                  <p className="text-sm text-green-700">
                    Selected: {uploadFile.name} ({(uploadFile.size / (1024 * 1024)).toFixed(1)}MB)
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      resetUploadForm()
                      setUploadDialogOpen(false)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveUpload}
                    disabled={!uploadFile || isSavingUpload}
                  >
                    {isSavingUpload ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      'Save Meeting'
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Add Meeting (no recording) */}
          <Dialog
            open={addDialogOpen}
            onOpenChange={(open) => {
              setAddDialogOpen(open)
              if (!open) resetAddForm()
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarPlus className="h-4 w-4" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Meeting</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="add-name">Meeting Name *</Label>
                  <Input
                    id="add-name"
                    placeholder="e.g., Strategy Call with Counsel"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="add-type">Meeting Type</Label>
                    <Select value={addType} onValueChange={setAddType}>
                      <SelectTrigger id="add-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MEETING_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="add-date">Date *</Label>
                    <Input
                      id="add-date"
                      type="date"
                      value={addDate}
                      onChange={(e) => setAddDate(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="add-notes">Notes</Label>
                  <Textarea
                    id="add-notes"
                    placeholder="Meeting notes..."
                    rows={3}
                    value={addNotes}
                    onChange={(e) => setAddNotes(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      resetAddForm()
                      setAddDialogOpen(false)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveAdd}
                    disabled={createMeeting.isPending}
                  >
                    {createMeeting.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      'Add Meeting'
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Meetings List */}
      {meetings.length === 0 ? (
        <EmptyState
          icon={AudioLines}
          title="No meetings"
          description="Record, upload, or log meetings related to this case."
          action={
            <Button onClick={() => setRecordDialogOpen(true)} className="gap-2">
              <Mic className="h-4 w-4" />
              Record Meeting
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {meetings.map((meeting: MeetingRow) => {
            const TypeIcon = getMeetingTypeIcon(meeting.meeting_type)
            const isExpanded = expandedId === meeting.id
            const hasRecording = !!meeting.recording_file_path
            const hasTranscript =
              meeting.transcript_status === 'completed' && !!meeting.transcript_text
            const hasSummary = !!meeting.ai_summary
            const isTranscribing = transcribingId === meeting.id
            const isSummarizing = summarizingId === meeting.id

            return (
              <Card key={meeting.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <TypeIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <h3 className="font-semibold">{meeting.meeting_name}</h3>
                        <StatusBadge
                          label={getLabelForValue(MEETING_TYPES, meeting.meeting_type)}
                          color="blue"
                        />
                        <StatusBadge
                          label={getLabelForValue(
                            TRANSCRIPT_STATUSES,
                            meeting.transcript_status
                          )}
                          color={getColorForValue(
                            TRANSCRIPT_STATUSES,
                            meeting.transcript_status
                          )}
                        />
                      </div>
                      <div className="flex items-center gap-4 mt-1.5 text-sm text-muted-foreground">
                        <span>{formatDate(meeting.meeting_date)}</span>
                        {meeting.duration_seconds && (
                          <span>{formatDurationSeconds(meeting.duration_seconds)}</span>
                        )}
                        {hasRecording && (
                          <span className="flex items-center gap-1">
                            <Mic className="h-3.5 w-3.5" />
                            Recording
                          </span>
                        )}
                        {hasSummary && (
                          <span className="flex items-center gap-1">
                            <Brain className="h-3.5 w-3.5" style={{ color: '#DFC06A' }} />
                            AI Summary
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      {/* Transcribe button */}
                      {hasRecording && !hasTranscript && meeting.transcript_status !== 'processing' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTranscribe(meeting.id)}
                          disabled={isTranscribing}
                          className="text-xs"
                        >
                          {isTranscribing ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                              Transcribing...
                            </>
                          ) : (
                            <>
                              <FileText className="h-3.5 w-3.5 mr-1" />
                              Transcribe
                            </>
                          )}
                        </Button>
                      )}

                      {/* Summarize button */}
                      {hasTranscript && !hasSummary && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSummarize(meeting.id)}
                          disabled={isSummarizing}
                          className="text-xs"
                        >
                          {isSummarizing ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                              Summarizing...
                            </>
                          ) : (
                            <>
                              <Brain className="h-3.5 w-3.5 mr-1" />
                              Summarize
                            </>
                          )}
                        </Button>
                      )}

                      {/* Expand/collapse */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : meeting.id)
                        }
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                        <span className="ml-1 text-xs">Details</span>
                      </Button>
                    </div>
                  </div>

                  {/* Expanded detail view */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t">
                      <MeetingDetail meeting={meeting} />
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
