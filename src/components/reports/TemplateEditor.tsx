'use client'

import { useState } from 'react'
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
import { Separator } from '@/components/ui/separator'
import { REPORT_TYPES } from '@/lib/constants'
import type { ReportTemplateRow, TemplateSectionRow } from '@/types/database.types'
import { Loader2, Plus, Trash2, ChevronUp, ChevronDown, GripVertical } from 'lucide-react'

const templateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  report_type: z.string().min(1, 'Report type is required'),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
})

type TemplateFormValues = z.infer<typeof templateSchema>

interface SectionItem {
  id: string
  name: string
  title: string
  description: string
  default_prompt: string
  is_required: boolean
  is_ai_generated: boolean
}

interface TemplateEditorProps {
  template?: ReportTemplateRow
  sections?: TemplateSectionRow[]
  onSave: (data: {
    template: TemplateFormValues
    sections: SectionItem[]
  }) => Promise<void>
}

export function TemplateEditor({ template, sections: initialSections, onSave }: TemplateEditorProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sections, setSections] = useState<SectionItem[]>(
    initialSections?.map((s) => ({
      id: s.id,
      name: s.name,
      title: s.title,
      description: s.description ?? '',
      default_prompt: s.default_prompt ?? '',
      is_required: s.is_required,
      is_ai_generated: s.is_ai_generated,
    })) ?? []
  )

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema) as any,
    defaultValues: {
      name: template?.name ?? '',
      report_type: template?.report_type ?? 'expert_report',
      description: template?.description ?? '',
      is_active: template?.is_active ?? true,
    },
  })

  function addSection() {
    const newSection: SectionItem = {
      id: `new-${Date.now()}`,
      name: '',
      title: '',
      description: '',
      default_prompt: '',
      is_required: false,
      is_ai_generated: true,
    }
    setSections([...sections, newSection])
  }

  function removeSection(index: number) {
    setSections(sections.filter((_, i) => i !== index))
  }

  function updateSection(index: number, updates: Partial<SectionItem>) {
    setSections(sections.map((s, i) => (i === index ? { ...s, ...updates } : s)))
  }

  function moveSection(index: number, direction: 'up' | 'down') {
    const newSections = [...sections]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newSections.length) return
    ;[newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]]
    setSections(newSections)
  }

  async function handleFormSubmit(values: TemplateFormValues) {
    setIsSubmitting(true)
    try {
      await onSave({ template: values, sections })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Template Metadata */}
        <Card>
          <CardHeader>
            <CardTitle>Template Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Standard Expert Report" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="report_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Report Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {REPORT_TYPES.map((t) => (
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
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3 space-y-0 pt-8">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel>Active (Default Template)</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe the purpose of this template..." rows={2} {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Sections */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Sections</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addSection}>
                <Plus className="h-4 w-4 mr-2" />
                Add Section
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {sections.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No sections defined. Add sections to structure your report template.
              </p>
            )}
            {sections.map((section, index) => (
              <div key={section.id}>
                {index > 0 && <Separator className="mb-4" />}
                <div className="flex items-start gap-2">
                  <div className="flex flex-col gap-1 mt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={index === 0}
                      onClick={() => moveSection(index, 'up')}
                    >
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                    <GripVertical className="h-4 w-4 text-muted-foreground mx-auto" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={index === sections.length - 1}
                      onClick={() => moveSection(index, 'down')}
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">
                        Section {index + 1}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Section Name</label>
                        <Input
                          value={section.name}
                          onChange={(e) => updateSection(index, { name: e.target.value })}
                          placeholder="e.g., background"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Display Title</label>
                        <Input
                          value={section.title}
                          onChange={(e) => updateSection(index, { title: e.target.value })}
                          placeholder="e.g., Background & Qualifications"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">AI Prompt</label>
                      <Textarea
                        value={section.default_prompt}
                        onChange={(e) => updateSection(index, { default_prompt: e.target.value })}
                        placeholder="AI generation prompt for this section..."
                        rows={2}
                        className="text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={section.is_required}
                          onCheckedChange={(checked) => updateSection(index, { is_required: checked })}
                        />
                        <span className="text-sm">Required</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={section.is_ai_generated}
                          onCheckedChange={(checked) => updateSection(index, { is_ai_generated: checked })}
                        />
                        <span className="text-sm">AI Generated</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mt-6"
                    onClick={() => removeSection(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => window.history.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {template ? 'Update Template' : 'Create Template'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
