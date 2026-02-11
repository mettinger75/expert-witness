'use client'

import { useCallback } from 'react'
import { OptionListManager } from '@/components/settings/OptionListManager'
import { useAppOptions } from '@/components/providers/OptionsProvider'
import { OPTION_KEYS, type OptionItem } from '@/lib/constants'

export function ContactsRolesSettings() {
  const { getOptions, refresh } = useAppOptions()

  const handleSave = useCallback(
    async (settingKey: string, options: OptionItem[]) => {
      const res = await fetch('/api/settings/options', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
        settingKey={OPTION_KEYS.CONTACT_TYPES}
        title="Contact Types"
        description="Types of contacts (attorneys, providers, etc.)"
        options={getOptions(OPTION_KEYS.CONTACT_TYPES)}
        onSave={(opts) => handleSave(OPTION_KEYS.CONTACT_TYPES, opts)}
      />
      <OptionListManager
        settingKey={OPTION_KEYS.CASE_CONTACT_ROLES}
        title="Case Contact Roles"
        description="Roles contacts can have on a case"
        options={getOptions(OPTION_KEYS.CASE_CONTACT_ROLES)}
        onSave={(opts) => handleSave(OPTION_KEYS.CASE_CONTACT_ROLES, opts)}
      />
    </div>
  )
}
