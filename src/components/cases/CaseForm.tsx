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
import { CASE_TYPES, CASE_PRIORITIES, SPECIALTY_AREAS } from '@/lib/constants'
import type { CaseInsert, CaseRow } from '@/types/database.types'
import { Loader2 } from 'lucide-react'

const caseSchema = z.object({
  case_name: z.string().min(1, 'Case name is required'),
  case_type: z.string().min(1, 'Case type is required'),
  specialty_area: z.string().optional(),
  side: z.enum(['plaintiff', 'defense', 'neutral']),
  priority: z.enum(['urgent', 'high', 'normal', 'low']).default('normal'),
  date_of_incident: z.string().optional(),
  date_of_referral: z.string().optional(),
  deadline_next: z.string().optional(),
  deadline_description: z.string().optional(),
  jurisdiction_state: z.string().optional(),
  court_name: z.string().optional(),
  court_case_number: z.string().optional(),
  patient_name: z.string().optional(),
  patient_dob: z.string().optional(),
  patient_age_at_incident: z.coerce.number().int().positive().optional().or(z.literal('')),
  patient_outcome: z.string().optional(),
  brief_summary: z.string().optional(),
  preliminary_opinion: z.string().optional(),
  opinion_summary: z.string().optional(),
  retainer_received: z.boolean().default(true),
  retainer_amount: z.coerce.number().positive().optional().or(z.literal('')),
  estimated_hours: z.coerce.number().positive().optional().or(z.literal('')),
  notion_page_url: z.string().optional(),
})

type CaseFormValues = z.infer<typeof caseSchema>

interface CaseFormProps {
  initialData?: CaseRow
  defaultValues?: Partial<CaseInsert>
  onSubmit: (data: CaseInsert) => Promise<void>
  isSubmitting: boolean
}

export function CaseForm({ initialData, defaultValues, onSubmit, isSubmitting }: CaseFormProps) {
  // Merge initialData and defaultValues (initialData takes precedence for editing existing cases)
  const d = initialData ?? defaultValues
  const form = useForm<CaseFormValues>({
    resolver: zodResolver(caseSchema) as any,
    defaultValues: {
      case_name: d?.case_name ?? '',
      case_type: d?.case_type ?? 'medical_malpractice',
      specialty_area: d?.specialty_area ?? 'general_anesthesia',
      side: (d?.side as 'plaintiff' | 'defense' | 'neutral') ?? 'defense',
      priority: (d?.priority as 'urgent' | 'high' | 'normal' | 'low') ?? 'normal',
      date_of_incident: d?.date_of_incident ?? '',
      date_of_referral: d?.date_of_referral ?? new Date().toISOString().split('T')[0],
      deadline_next: d?.deadline_next ?? '',
      deadline_description: d?.deadline_description ?? '',
      jurisdiction_state: d?.jurisdiction_state ?? '',
      court_name: d?.court_name ?? '',
      court_case_number: d?.court_case_number ?? '',
      patient_name: d?.patient_name ?? '',
      patient_dob: d?.patient_dob ?? '',
      patient_age_at_incident: d?.patient_age_at_incident ?? '',
      patient_outcome: d?.patient_outcome ?? '',
      brief_summary: d?.brief_summary ?? '',
      preliminary_opinion: d?.preliminary_opinion ?? '',
      opinion_summary: d?.opinion_summary ?? '',
      retainer_received: d?.retainer_received ?? true,
      retainer_amount: initialData?.retainer_amount ?? '',
      estimated_hours: initialData?.estimated_hours ?? '',
      notion_page_url: d?.notion_page_url ?? '',
    },
  })

  async function handleFormSubmit(values: CaseFormValues) {
    const cleaned: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(values)) {
      if (val === '' || val === undefined) {
        cleaned[key] = null
      } else {
        cleaned[key] = val
      }
    }
    // Keep required fields
    cleaned.case_name = values.case_name
    cleaned.case_type = values.case_type
    cleaned.side = values.side
    cleaned.priority = values.priority
    cleaned.retainer_received = values.retainer_received
    if (values.date_of_referral) cleaned.date_of_referral = values.date_of_referral

    await onSubmit(cleaned as unknown as CaseInsert)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="case_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Case Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Smith v. General Hospital" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="case_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Case Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CASE_TYPES.map((t) => (
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
                name="side"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Side *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="plaintiff">Plaintiff</SelectItem>
                        <SelectItem value="defense">Defense</SelectItem>
                        <SelectItem value="neutral">Neutral</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CASE_PRIORITIES.map((p) => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="specialty_area"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Specialty Area</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select specialty" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SPECIALTY_AREAS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="brief_summary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Brief Summary</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Brief description of the case..." rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Patient Information */}
        <Card>
          <CardHeader>
            <CardTitle>Patient Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="patient_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Patient Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="patient_dob"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="patient_age_at_incident"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Age at Incident</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="patient_outcome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Outcome</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select outcome" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="death">Death</SelectItem>
                      <SelectItem value="permanent_injury">Permanent Injury</SelectItem>
                      <SelectItem value="temporary_injury">Temporary Injury</SelectItem>
                      <SelectItem value="no_injury">No Injury</SelectItem>
                      <SelectItem value="unknown">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Dates & Deadlines */}
        <Card>
          <CardHeader>
            <CardTitle>Dates & Deadlines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date_of_incident"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Incident</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date_of_referral"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Referral</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="deadline_next"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next Deadline</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="deadline_description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deadline Description</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Report due, Deposition, Trial" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Jurisdiction */}
        <Card>
          <CardHeader>
            <CardTitle>Jurisdiction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="jurisdiction_state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="court_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Court</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="court_case_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Court Case Number</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notion Integration */}
        <Card>
          <CardHeader>
            <CardTitle>Notion Integration</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="notion_page_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notion Page URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://www.notion.so/Your-Case-Page-abc123..." {...field} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground mt-1">
                    Paste the URL of a Notion page to link it with this case for AI analysis and syncing.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Financial */}
        <Card>
          <CardHeader>
            <CardTitle>Financial</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="retainer_received"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3 space-y-0">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel>Retainer Received</FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="retainer_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Retainer Amount ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="5000.00" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="estimated_hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Hours</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.5" {...field} />
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
            {initialData ? 'Update Case' : 'Create Case'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
