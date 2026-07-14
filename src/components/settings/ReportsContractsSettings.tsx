'use client'

import { useCallback } from 'react'
import { authHeaders } from '@/lib/api-client'
import { OptionListManager } from '@/components/settings/OptionListManager'
import { useAppOptions } from '@/components/providers/OptionsProvider'
import { OPTION_KEYS, type OptionItem } from '@/lib/constants'

export function ReportsContractsSettings() {
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
        settingKey={OPTION_KEYS.REPORT_TYPES}
        title="Report Types"
        description="Types of expert reports and documents"
        options={getOptions(OPTION_KEYS.REPORT_TYPES)}
        onSave={(opts) => handleSave(OPTION_KEYS.REPORT_TYPES, opts)}
      />
      <OptionListManager
        settingKey={OPTION_KEYS.CONTRACT_TYPES}
        title="Contract Types"
        description="Types of engagement contracts"
        options={getOptions(OPTION_KEYS.CONTRACT_TYPES)}
        onSave={(opts) => handleSave(OPTION_KEYS.CONTRACT_TYPES, opts)}
      />
      <OptionListManager
        settingKey={OPTION_KEYS.CONTRACT_STATUSES}
        title="Contract Statuses"
        description="Contract lifecycle statuses"
        hasColor
        options={getOptions(OPTION_KEYS.CONTRACT_STATUSES)}
        onSave={(opts) => handleSave(OPTION_KEYS.CONTRACT_STATUSES, opts)}
      />
      <OptionListManager
        settingKey={OPTION_KEYS.MEETING_TYPES}
        title="Meeting Types"
        description="Types of meetings and conferences"
        options={getOptions(OPTION_KEYS.MEETING_TYPES)}
        onSave={(opts) => handleSave(OPTION_KEYS.MEETING_TYPES, opts)}
      />
    </div>
  )
}
