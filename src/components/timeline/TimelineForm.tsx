'use client'

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
import { TIMELINE_EVENT_TYPES } from '@/lib/constants'
import type { MedicalRecordsTimelineInsert, MedicalRecordsTimelineRow } from '@/types/database.types'
import { Loader2 } from 'lucide-react'

const timelineSchema = z.object({
  event_type: z.string().min(1, 'Event type is required'),
  event_date: z.string().min(1, 'Event date is required'),
  event_time: z.string().optional(),
  event_end_date: z.string().optional(),
  event_end_time: z.string().optional(),
  provider_name: z.string().optional(),
  provider_specialty: z.string().optional(),
  facility_name: z.string().optional(),
  event_title: z.string().min(1, 'Summary is required'),
  event_description: z.string().optional(),
  is_critical_event: z.boolean().default(false),
  critical_event_reason: z.string().optional(),
  source_page_number: z.string().optional(),
  source_bates_number: z.string().optional(),
})

type TimelineFormValues = z.infer<typeof timelineSchema>

interface TimelineFormProps {
  caseId: string
  initialData?: MedicalRecordsTimelineRow
  onSubmit: (data: MedicalRecordsTimelineInsert) => Promise<void>
  isSubmitting: boolean
}

export function TimelineForm({ caseId, initialData, onSubmit, isSubmitting }: TimelineFormProps) {
  const form = useForm<TimelineFormValues>({
    resolver: zodResolver(timelineSchema) as any,
    defaultValues: {
      event_type: initialData?.event_type ?? 'procedure',
      event_date: initialData?.event_date ?? '',
      event_time: initialData?.event_time ?? '',
      event_end_date: initialData?.event_end_date ?? '',
      event_end_time: initialData?.event_end_time ?? '',
      provider_name: initialData?.provider_name ?? '',
      provider_specialty: initialData?.provider_specialty ?? '',
      facility_name: initialData?.facility_name ?? '',
      event_title: initialData?.event_title ?? '',
      event_description: initialData?.event_description ?? '',
      is_critical_event: initialData?.is_critical_event ?? false,
      critical_event_reason: initialData?.critical_event_reason ?? '',
      source_page_number: initialData?.source_page_number?.toString() ?? '',
      source_bates_number: initialData?.source_bates_number ?? '',
    },
  })

  const isCritical = form.watch('is_critical_event')

  async function handleFormSubmit(values: TimelineFormValues) {
    const cleaned: Record<string, unknown> = { case_id: caseId }
    for (const [key, val] of Object.entries(values)) {
      if (key === 'source_page_number') {
        cleaned[key] = val ? parseInt(val as string, 10) : null
      } else if (val === '' || val === undefined) {
        cleaned[key] = null
      } else {
        cleaned[key] = val
      }
    }
    // Keep required fields
    cleaned.event_type = values.event_type
    cleaned.event_date = values.event_date
    cleaned.event_title = values.event_title
    cleaned.is_critical_event = values.is_critical_event

    await onSubmit(cleaned as unknown as MedicalRecordsTimelineInsert)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Event Details */}
        <Card>
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="event_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TIMELINE_EVENT_TYPES.map((t) => (
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
                name="event_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="event_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="event_title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Summary *</FormLabel>
                  <FormControl>
                    <Input placeholder="Brief summary of the event" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="provider_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provider Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Dr. Smith" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="provider_specialty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provider Specialty</FormLabel>
                    <FormControl>
                      <Input placeholder="Anesthesiologist" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="facility_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Facility Name</FormLabel>
                    <FormControl>
                      <Input placeholder="General Hospital" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Clinical Details */}
        <Card>
          <CardHeader>
            <CardTitle>Clinical Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="event_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Clinical Details</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Detailed clinical information..." rows={4} {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex items-center gap-3">
              <FormField
                control={form.control}
                name="is_critical_event"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3 space-y-0">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel>Critical Event</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            {isCritical && (
              <FormField
                control={form.control}
                name="critical_event_reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Critical Event Reason</FormLabel>
                    <FormControl>
                      <Input placeholder="Why is this event critical?" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="source_page_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source Page Number</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 15" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="source_bates_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bates Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., DEF-001-005" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => window.history.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {initialData ? 'Update Entry' : 'Add Entry'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
