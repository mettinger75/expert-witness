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
  event_datetime: z.string().min(1, 'Event date is required'),
  event_end_datetime: z.string().optional(),
  provider_name: z.string().optional(),
  provider_role: z.string().optional(),
  facility: z.string().optional(),
  title: z.string().min(1, 'Summary is required'),
  description: z.string().optional(),
  is_significant: z.boolean().default(false),
  significance_note: z.string().optional(),
  page_reference: z.string().optional(),
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
      event_datetime: initialData?.event_datetime ?? '',
      event_end_datetime: initialData?.event_end_datetime ?? '',
      provider_name: initialData?.provider_name ?? '',
      provider_role: initialData?.provider_role ?? '',
      facility: initialData?.facility ?? '',
      title: initialData?.title ?? '',
      description: initialData?.description ?? '',
      is_significant: initialData?.is_significant ?? false,
      significance_note: initialData?.significance_note ?? '',
      page_reference: initialData?.page_reference ?? '',
    },
  })

  const isSignificant = form.watch('is_significant')

  async function handleFormSubmit(values: TimelineFormValues) {
    const cleaned: Record<string, unknown> = { case_id: caseId }
    for (const [key, val] of Object.entries(values)) {
      if (val === '' || val === undefined) {
        cleaned[key] = null
      } else {
        cleaned[key] = val
      }
    }
    // Keep required fields
    cleaned.event_type = values.event_type
    cleaned.event_datetime = values.event_datetime
    cleaned.title = values.title
    cleaned.is_significant = values.is_significant

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
                name="event_datetime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Date/Time *</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="event_end_datetime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date/Time</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="title"
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
                name="provider_role"
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
                name="facility"
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
              name="description"
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
                name="is_significant"
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

            {isSignificant && (
              <FormField
                control={form.control}
                name="significance_note"
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

            <FormField
              control={form.control}
              name="page_reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Page Reference</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Bates 001-005" {...field} />
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
            {initialData ? 'Update Entry' : 'Add Entry'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
