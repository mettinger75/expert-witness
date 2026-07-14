'use client'

import { useCallback } from 'react'
import { authHeaders } from '@/lib/api-client'
import { OptionListManager } from '@/components/settings/OptionListManager'
import { useAppOptions } from '@/components/providers/OptionsProvider'
import { OPTION_KEYS, type OptionItem } from '@/lib/constants'

export function CaseOptionsSettings() {
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
        settingKey={OPTION_KEYS.CASE_STATUSES}
        title="Case Statuses"
        description="Manage case lifecycle statuses"
        hasColor
        options={getOptions(OPTION_KEYS.CASE_STATUSES)}
        onSave={(opts) => handleSave(OPTION_KEYS.CASE_STATUSES, opts)}
      />
      <OptionListManager
        settingKey={OPTION_KEYS.CASE_TYPES}
        title="Case Types"
        description="Types of expert witness cases"
        options={getOptions(OPTION_KEYS.CASE_TYPES)}
        onSave={(opts) => handleSave(OPTION_KEYS.CASE_TYPES, opts)}
      />
      <OptionListManager
        settingKey={OPTION_KEYS.CASE_PRIORITIES}
        title="Case Priorities"
        description="Priority levels for cases"
        hasColor
        options={getOptions(OPTION_KEYS.CASE_PRIORITIES)}
        onSave={(opts) => handleSave(OPTION_KEYS.CASE_PRIORITIES, opts)}
      />
      <OptionListManager
        settingKey={OPTION_KEYS.SPECIALTY_AREAS}
        title="Specialty Areas"
        description="Anesthesiology subspecialty areas"
        options={getOptions(OPTION_KEYS.SPECIALTY_AREAS)}
        onSave={(opts) => handleSave(OPTION_KEYS.SPECIALTY_AREAS, opts)}
      />
      <OptionListManager
        settingKey={OPTION_KEYS.PATIENT_OUTCOMES}
        title="Patient Outcomes"
        description="Possible patient outcome classifications"
        options={getOptions(OPTION_KEYS.PATIENT_OUTCOMES)}
        onSave={(opts) => handleSave(OPTION_KEYS.PATIENT_OUTCOMES, opts)}
      />
    </div>
  )
}
