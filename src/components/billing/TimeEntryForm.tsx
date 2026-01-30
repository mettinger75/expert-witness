'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Switch } from '@/components/ui/switch'
import { ACTIVITY_TYPES } from '@/lib/constants'
import type { TimeEntryInsert, TimeEntryRow } from '@/types/database.types'
import { Loader2 } from 'lucide-react'

const timeEntrySchema = z.object({
  case_id: z.string().min(1, 'Case is required'),
  activity_type: z.string().min(1, 'Activity type is required'),
  description: z.string().min(1, 'Description is required'),
  date: z.string().min(1, 'Date is required'),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  duration_hours: z.coerce.number().positive('Duration must be positive'),
  rate: z.coerce.number().min(0).default(0),
  is_billable: z.boolean().default(true),
  notes: z.string().optional(),
})

type TimeEntryFormValues = z.infer<typeof timeEntrySchema>

interface TimeEntryFormProps {
  caseId?: string
  initialData?: TimeEntryRow
  onSubmit: (data: TimeEntryInsert) => Promise<void>
  isSubmitting: boolean
  cases?: Array<{ id: string; case_name: string }>
}

export function TimeEntryForm({ caseId, initialData, onSubmit, isSubmitting, cases = [] }: TimeEntryFormProps) {
  const form = useForm<TimeEntryFormValues>({
    resolver: zodResolver(timeEntrySchema) as any,
    defaultValues: {
      case_id: caseId ?? initialData?.case_id ?? '',
      activity_type: initialData?.activity_type ?? 'record_review',
      description: initialData?.description ?? '',
      date: initialData?.date ?? new Date().toISOString().split('T')[0],
      start_time: initialData?.start_time ?? '',
      end_time: initialData?.end_time ?? '',
      duration_hours: initialData?.duration_hours ?? 0,
      rate: initialData?.rate ?? 0,
      is_billable: initialData?.is_billable ?? true,
      notes: initialData?.notes ?? '',
    },
  })

  // Auto-calculate duration from start and end times
  const startTime = form.watch('start_time')
  const endTime = form.watch('end_time')

  useEffect(() => {
    if (startTime && endTime) {
      const [startH, startM] = startTime.split(':').map(Number)
      const [endH, endM] = endTime.split(':').map(Number)
      const startMinutes = startH * 60 + startM
      const endMinutes = endH * 60 + endM
      if (endMinutes > startMinutes) {
        const durationMinutes = endMinutes - startMinutes
        const durationHours = Math.round((durationMinutes / 60) * 100) / 100
        form.setValue('duration_hours', durationHours)
      }
    }
  }, [startTime, endTime, form])

  async function handleFormSubmit(values: TimeEntryFormValues) {
    const cleaned: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(values)) {
      if (val === '' || val === undefined) {
        cleaned[key] = null
      } else {
        cleaned[key] = val
      }
    }
    // Keep required fields
    cleaned.case_id = values.case_id
    cleaned.activity_type = values.activity_type
    cleaned.description = values.description
    cleaned.date = values.date
    cleaned.duration_hours = values.duration_hours
    cleaned.rate = values.rate
    cleaned.is_billable = values.is_billable

    await onSubmit(cleaned as unknown as TimeEntryInsert)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Time Entry Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!caseId && (
              <FormField
                control={form.control}
                name="case_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Case *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select case" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {cases.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.case_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="activity_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Activity Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select activity" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ACTIVITY_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Input placeholder="Describe the work performed" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="end_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="duration_hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (hours) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.25" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rate ($/hr)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="is_billable"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3 space-y-0 pt-8">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel>Billable</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Additional notes..." rows={3} {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => window.history.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {initialData ? 'Update Entry' : 'Add Time Entry'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
