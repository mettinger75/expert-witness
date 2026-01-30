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
import type { DepositionInsert, DepositionRow } from '@/types/database.types'
import { Loader2 } from 'lucide-react'

const depositionSchema = z.object({
  deponent_name: z.string().min(1, 'Deponent name is required'),
  deponent_role: z.string().min(1, 'Deponent role is required'),
  deponent_title: z.string().optional(),
  deponent_organization: z.string().optional(),
  deposition_date: z.string().min(1, 'Deposition date is required'),
  deposition_location: z.string().optional(),
  is_video_recorded: z.boolean().default(false),
  status: z.string().default('scheduled'),
  preparation_notes: z.string().optional(),
})

type DepositionFormValues = z.infer<typeof depositionSchema>

interface DepositionFormProps {
  caseId: string
  initialData?: DepositionRow
  onSubmit: (data: DepositionInsert) => Promise<void>
  isSubmitting: boolean
}

export function DepositionForm({ caseId, initialData, onSubmit, isSubmitting }: DepositionFormProps) {
  const form = useForm<DepositionFormValues>({
    resolver: zodResolver(depositionSchema) as any,
    defaultValues: {
      deponent_name: initialData?.deponent_name ?? '',
      deponent_role: initialData?.deponent_role ?? 'fact_witness',
      deponent_title: initialData?.deponent_title ?? '',
      deponent_organization: initialData?.deponent_organization ?? '',
      deposition_date: initialData?.deposition_date ?? '',
      deposition_location: initialData?.deposition_location ?? '',
      is_video_recorded: initialData?.is_video_recorded ?? false,
      status: initialData?.status ?? 'scheduled',
      preparation_notes: initialData?.preparation_notes ?? '',
    },
  })

  const isRemote = form.watch('is_video_recorded')

  async function handleFormSubmit(values: DepositionFormValues) {
    const cleaned: Record<string, unknown> = { case_id: caseId }
    for (const [key, val] of Object.entries(values)) {
      if (val === '' || val === undefined) {
        cleaned[key] = null
      } else {
        cleaned[key] = val
      }
    }
    // Keep required fields
    cleaned.deponent_name = values.deponent_name
    cleaned.deponent_role = values.deponent_role
    cleaned.deposition_date = values.deposition_date
    cleaned.is_video_recorded = values.is_video_recorded
    cleaned.status = values.status

    await onSubmit(cleaned as unknown as DepositionInsert)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Deponent Information */}
        <Card>
          <CardHeader>
            <CardTitle>Deponent Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="deponent_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deponent Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Full name of deponent" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="deponent_role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deponent Role *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="plaintiff">Plaintiff</SelectItem>
                        <SelectItem value="defendant_provider">Defendant Provider</SelectItem>
                        <SelectItem value="fact_witness">Fact Witness</SelectItem>
                        <SelectItem value="expert_plaintiff">Expert (Plaintiff)</SelectItem>
                        <SelectItem value="expert_defense">Expert (Defense)</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="deponent_title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., MD, RN" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="deponent_organization"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization</FormLabel>
                    <FormControl>
                      <Input placeholder="Hospital or practice name" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Schedule & Location */}
        <Card>
          <CardHeader>
            <CardTitle>Schedule & Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="deposition_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deposition Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="postponed">Postponed</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="deposition_location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="Address or conference room" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_video_recorded"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel>Video Recorded</FormLabel>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Preparation Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Preparation Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="preparation_notes"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="Expert preparation notes, key topics to address..."
                      rows={6}
                      {...field}
                    />
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
            {initialData ? 'Update Deposition' : 'Create Deposition'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
