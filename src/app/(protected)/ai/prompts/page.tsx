'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/shared/EmptyState'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, Search, Sparkles, MoreVertical, Edit, Trash2 } from 'lucide-react'

// Prompt categories
const PROMPT_CATEGORIES = [
  { value: 'case_analysis', label: 'Case Analysis' },
  { value: 'document_review', label: 'Document Review' },
  { value: 'report_generation', label: 'Report Generation' },
  { value: 'deposition_prep', label: 'Deposition Prep' },
  { value: 'research', label: 'Research' },
  { value: 'general', label: 'General' },
]

function getCategoryLabel(category: string): string {
  return PROMPT_CATEGORIES.find((c) => c.value === category)?.label ?? category
}

// Placeholder prompts
const placeholderPrompts = [
  { id: '1', name: 'Standard of Care Analysis', category: 'case_analysis', description: 'Analyze the standard of care applicable to the case based on specialty, jurisdiction, and clinical guidelines.', usage_count: 24 },
  { id: '2', name: 'Medical Record Summary', category: 'document_review', description: 'Generate a comprehensive summary of the medical records, highlighting key findings and chronology.', usage_count: 31 },
  { id: '3', name: 'Expert Opinion Draft', category: 'report_generation', description: 'Draft the opinion section of an expert report, including standard of care analysis and causation opinions.', usage_count: 18 },
  { id: '4', name: 'Deposition Question Generator', category: 'deposition_prep', description: 'Generate potential deposition questions based on the case facts and opposing expert positions.', usage_count: 12 },
  { id: '5', name: 'Literature Search', category: 'research', description: 'Identify relevant medical literature, guidelines, and standards for the clinical issues in this case.', usage_count: 15 },
  { id: '6', name: 'Timeline Generator', category: 'case_analysis', description: 'Create a detailed chronological timeline from the medical records with event categorization.', usage_count: 20 },
  { id: '7', name: 'Causation Analysis', category: 'case_analysis', description: 'Analyze causation factors including proximate cause, contributing factors, and damages assessment.', usage_count: 14 },
  { id: '8', name: 'Rebuttal Points', category: 'report_generation', description: 'Generate point-by-point rebuttal arguments for opposing expert opinions.', usage_count: 9 },
]

export default function AIPromptsPage() {
  const [search, setSearch] = useState('')

  const filteredPrompts = placeholderPrompts.filter((prompt) => {
    if (search) {
      const term = search.toLowerCase()
      return prompt.name.toLowerCase().includes(term) || prompt.description.toLowerCase().includes(term)
    }
    return true
  })

  return (
    <div>
      <PageHeader
        title="Prompts Library"
        description="Reusable AI prompts for case analysis and report generation"
        action={
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Prompt
          </Button>
        }
      />

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search prompts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Prompts Grid */}
      {filteredPrompts.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No prompts found"
          description="Create reusable prompts to streamline your AI-assisted workflow."
          action={
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Prompt
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPrompts.map((prompt) => (
            <Card key={prompt.id} className="hover:bg-muted/50 transition-colors">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm">{prompt.name}</h3>
                    <Badge variant="secondary" className="mt-1.5 text-xs">
                      {getCategoryLabel(prompt.category)}
                    </Badge>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {prompt.description}
                </p>
                <div className="mt-3 text-xs text-muted-foreground">
                  Used {prompt.usage_count} times
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
