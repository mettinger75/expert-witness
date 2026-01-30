'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useUIStore } from '@/stores/uiStore'
import { useCreateTimeEntry } from '@/hooks/useTimeEntries'
import { useCases } from '@/hooks/useCases'
import { ACTIVITY_TYPES } from '@/lib/constants'
import { Play, Square, Clock, Loader2 } from 'lucide-react'

export function TimerWidget() {
  const { activeTimer, startTimer, stopTimer, getTimerElapsed } = useUIStore()
  const createTimeEntry = useCreateTimeEntry()
  const { data: cases = [] } = useCases()

  const [elapsed, setElapsed] = useState(0)
  const [showStartForm, setShowStartForm] = useState(false)
  const [formCaseId, setFormCaseId] = useState('')
  const [formCaseName, setFormCaseName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formActivityType, setFormActivityType] = useState('record_review')

  // Update elapsed every second when timer is running
  useEffect(() => {
    if (!activeTimer) {
      setElapsed(0)
      return
    }

    const interval = setInterval(() => {
      setElapsed(getTimerElapsed())
    }, 1000)

    // Set initial value
    setElapsed(getTimerElapsed())

    return () => clearInterval(interval)
  }, [activeTimer, getTimerElapsed])

  function formatElapsedTime(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  function handleStart() {
    if (!formCaseId || !formDescription) return
    startTimer({
      caseId: formCaseId,
      caseName: formCaseName,
      description: formDescription,
      activityType: formActivityType,
    })
    setShowStartForm(false)
    setFormDescription('')
  }

  async function handleStop() {
    const timer = stopTimer()
    if (!timer) return

    const elapsedSeconds = Math.floor((Date.now() - timer.startTime) / 1000)
    const durationHours = elapsedSeconds / 3600

    await createTimeEntry.mutateAsync({
      case_id: timer.caseId,
      activity_type: timer.activityType as TimeEntryActivityType,
      description: timer.description,
      date: new Date().toISOString().split('T')[0],
      duration_hours: Math.round(durationHours * 100) / 100,
      rate: 0, // Will be set by backend based on billing rates
      is_billable: true,
    })
  }

  // Timer is running
  if (activeTimer) {
    return (
      <Card className="border-primary">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-primary animate-pulse" />
            <span className="text-xs font-medium text-primary">Timer Running</span>
          </div>
          <div className="text-xs text-muted-foreground truncate mb-1">
            {activeTimer.caseName}
          </div>
          <div className="text-xs text-muted-foreground truncate mb-2">
            {activeTimer.description}
          </div>
          <div className="text-2xl font-mono font-bold text-center mb-3">
            {formatElapsedTime(elapsed)}
          </div>
          <Button
            variant="destructive"
            size="sm"
            className="w-full"
            onClick={handleStop}
            disabled={createTimeEntry.isPending}
          >
            {createTimeEntry.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Square className="h-4 w-4 mr-2" />
            )}
            Stop & Save
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Show start form
  if (showStartForm) {
    return (
      <Card>
        <CardContent className="p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Start Timer</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => setShowStartForm(false)}
            >
              Cancel
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Case</Label>
            <Select
              value={formCaseId}
              onValueChange={(val) => {
                setFormCaseId(val)
                const selected = cases.find((c: { id: string }) => c.id === val)
                if (selected) setFormCaseName((selected as { case_name: string }).case_name)
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select case" />
              </SelectTrigger>
              <SelectContent>
                {cases.map((c: { id: string; case_name: string }) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    {c.case_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Activity Type</Label>
            <Select value={formActivityType} onValueChange={setFormActivityType}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value} className="text-xs">
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Description</Label>
            <Input
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="What are you working on?"
              className="h-8 text-xs"
            />
          </div>

          <Button
            size="sm"
            className="w-full"
            onClick={handleStart}
            disabled={!formCaseId || !formDescription}
          >
            <Play className="h-4 w-4 mr-2" />
            Start Timer
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Default: show start button
  return (
    <Card>
      <CardContent className="p-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setShowStartForm(true)}
        >
          <Play className="h-4 w-4 mr-2" />
          Start Timer
        </Button>
      </CardContent>
    </Card>
  )
}

// Type helper for activity type
type TimeEntryActivityType = Parameters<ReturnType<typeof useCreateTimeEntry>['mutateAsync']>[0]['activity_type']
