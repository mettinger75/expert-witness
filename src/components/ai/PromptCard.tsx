'use client'

import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { truncateText } from '@/lib/formatters'
import type { AIPromptsLibraryRow } from '@/types/database.types'
import { Sparkles, Hash, TrendingUp } from 'lucide-react'

interface PromptCardProps {
  prompt: AIPromptsLibraryRow
  onClick?: (prompt: AIPromptsLibraryRow) => void
}

const categoryColorMap: Record<string, string> = {
  document_analysis: 'blue',
  case_analysis: 'purple',
  report_generation: 'green',
  research: 'orange',
  deposition: 'yellow',
  trial: 'red',
  general: 'slate',
  custom: 'gray',
}

const categoryLabels: Record<string, string> = {
  document_analysis: 'Document Analysis',
  case_analysis: 'Case Analysis',
  report_generation: 'Report Generation',
  research: 'Research',
  deposition: 'Deposition',
  trial: 'Trial',
  general: 'General',
  custom: 'Custom',
}

export function PromptCard({ prompt, onClick }: PromptCardProps) {
  const categoryColor = categoryColorMap[prompt.category] ?? 'gray'
  const categoryLabel = categoryLabels[prompt.category] ?? prompt.category

  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onClick?.(prompt)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <h3 className="font-semibold text-sm">{prompt.name}</h3>
          </div>
          <StatusBadge label={categoryLabel} color={categoryColor} />
        </div>

        {prompt.description && (
          <p className="text-sm text-muted-foreground mt-2">
            {truncateText(prompt.description, 100)}
          </p>
        )}

        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            <span>{prompt.usage_count} uses</span>
          </div>
          {prompt.required_variables && prompt.required_variables.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Hash className="h-3 w-3" />
              <span>{prompt.required_variables.length} variables</span>
            </div>
          )}
          {prompt.avg_rating != null && (
            <div className="text-xs text-muted-foreground">
              Rating: {prompt.avg_rating.toFixed(1)}/5
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
