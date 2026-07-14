'use client'

import { useCallback } from 'react'
import { authHeaders } from '@/lib/api-client'
import { OptionListManager } from '@/components/settings/OptionListManager'
import { useAppOptions } from '@/components/providers/OptionsProvider'
import { OPTION_KEYS, type OptionItem } from '@/lib/constants'

export function DocumentsTimelineSettings() {
  const { getOptions, refresh } = useAppOptions()

  const handleSave = useCallback(
    async (settingKey: string, options: OptionItem[]) => {
      const res = await fetch('/api/settings/options', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ settingKey, options }),
      })
      if (!res.ok) throw new Error('Failed to save')
      await refresh()
    },
    [refresh]
  )

  return (
    <div className="space-y-6">
      <OptionListManager
        settingKey={OPTION_KEYS.DOCUMENT_CATEGORIES}
        title="Document Categories"
        description="Types of documents that can be uploaded"
        options={getOptions(OPTION_KEYS.DOCUMENT_CATEGORIES)}
        onSave={(opts) => handleSave(OPTION_KEYS.DOCUMENT_CATEGORIES, opts)}
      />
      <OptionListManager
        settingKey={OPTION_KEYS.TIMELINE_EVENT_TYPES}
        title="Timeline Event Types"
        description="Types of events on the medical records timeline"
        options={getOptions(OPTION_KEYS.TIMELINE_EVENT_TYPES)}
        onSave={(opts) => handleSave(OPTION_KEYS.TIMELINE_EVENT_TYPES, opts)}
      />
      <OptionListManager
        settingKey={OPTION_KEYS.NOTE_TYPES}
        title="Note Types"
        description="Types of case notes"
        options={getOptions(OPTION_KEYS.NOTE_TYPES)}
        onSave={(opts) => handleSave(OPTION_KEYS.NOTE_TYPES, opts)}
      />
      <OptionListManager
        settingKey={OPTION_KEYS.MILESTONE_TYPES}
        title="Milestone Types"
        description="Case milestone/deadline types"
        options={getOptions(OPTION_KEYS.MILESTONE_TYPES)}
        onSave={(opts) => handleSave(OPTION_KEYS.MILESTONE_TYPES, opts)}
      />
    </div>
  )
}
