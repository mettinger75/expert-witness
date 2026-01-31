'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { REPORT_TYPES, getLabelForValue } from '@/lib/constants'
import { ArrowLeft, Save, GripVertical, Brain, Plus } from 'lucide-react'

// Placeholder template data
const placeholderTemplate = {
  id: '1',
  name: 'Standard Expert Report',
  report_type: 'expert_report',
  description: 'Comprehensive expert report with opinion sections, standard of care analysis, and conclusions.',
  sections: [
    { id: 's1', title: 'Qualifications', description: 'Expert qualifications and experience', ai_instructions: 'Summarize the expert\'s qualifications relevant to this case type.' },
    { id: 's2', title: 'Materials Reviewed', description: 'List of all materials reviewed', ai_instructions: 'Generate a comprehensive list of all documents reviewed for this case.' },
    { id: 's3', title: 'Background & Facts', description: 'Relevant medical history and facts', ai_instructions: 'Compile the relevant medical history and factual background from the case records.' },
    { id: 's4', title: 'Standard of Care Analysis', description: 'Analysis of applicable standard of care', ai_instructions: 'Analyze the applicable standard of care based on the medical specialty, jurisdiction, and case facts.' },
    { id: 's5', title: 'Opinions', description: 'Expert opinions with supporting analysis', ai_instructions: 'Draft expert opinions based on the case analysis, supported by medical evidence and literature.' },
    { id: 's6', title: 'Conclusions', description: 'Summary of conclusions', ai_instructions: 'Summarize the key conclusions and their basis.' },
  ],
}

export default function TemplateEditorPage() {
  const params = useParams()
  const templateId = params.id as string

  const template = placeholderTemplate

  return (
    <div>
      <Link href="/reports" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Templates
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{template.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Template Editor - {getLabelForValue(REPORT_TYPES, template.report_type)}
          </p>
        </div>
        <Button>
          <Save className="h-4 w-4 mr-2" />
          Save Template
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template Metadata */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Template Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="template-name">Name</Label>
                <Input id="template-name" defaultValue={template.name} />
              </div>
              <div>
                <Label htmlFor="template-type">Report Type</Label>
                <Select defaultValue={template.report_type}>
                  <SelectTrigger id="template-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REPORT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="template-description">Description</Label>
                <Textarea
                  id="template-description"
                  defaultValue={template.description}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sections Editor */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Sections</h2>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Section
            </Button>
          </div>

          {template.sections.map((section, index) => (
            <Card key={section.id}>
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 cursor-grab text-muted-foreground">
                    <GripVertical className="h-5 w-5" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        Section {index + 1}
                      </Badge>
                      <Input
                        defaultValue={section.title}
                        className="font-medium"
                        placeholder="Section title"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Description</Label>
                      <Input
                        defaultValue={section.description}
                        placeholder="Brief description of this section"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs flex items-center gap-1">
                        <Brain className="h-3.5 w-3.5" />
                        AI Instructions
                      </Label>
                      <Textarea
                        defaultValue={section.ai_instructions}
                        placeholder="Instructions for AI content generation..."
                        rows={3}
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
