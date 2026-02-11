'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import { OPTION_DEFAULTS, type OptionItem } from '@/lib/constants'

interface OptionsContextValue {
  /** Get the options for a given key. Returns DB-backed options if loaded, else defaults. */
  getOptions: (key: string) => OptionItem[]
  /** Get only active options for dropdowns */
  getActiveOptions: (key: string) => OptionItem[]
  /** Get the label for a value within an option key */
  getLabel: (key: string, value: string) => string
  /** Get the color for a value within an option key */
  getColor: (key: string, value: string) => string
  /** Whether options have been loaded from the API */
  isLoaded: boolean
  /** Force refresh options from API */
  refresh: () => Promise<void>
}

const OptionsContext = createContext<OptionsContextValue | null>(null)

// Cache TTL: 5 minutes
const CACHE_TTL = 5 * 60 * 1000
let cachedOptions: Record<string, OptionItem[]> | null = null
let cacheTimestamp = 0

export function OptionsProvider({ children }: { children: ReactNode }) {
  const [dbOptions, setDbOptions] = useState<Record<string, OptionItem[]>>(
    cachedOptions ?? {}
  )
  const [isLoaded, setIsLoaded] = useState(!!cachedOptions)

  const fetchOptions = useCallback(async () => {
    // Use cache if fresh
    if (cachedOptions && Date.now() - cacheTimestamp < CACHE_TTL) {
      setDbOptions(cachedOptions)
      setIsLoaded(true)
      return
    }

    try {
      const res = await fetch('/api/settings/options')
      if (!res.ok) throw new Error('Failed to fetch options')
      const data = await res.json()

      // Parse the response into OptionItem arrays
      const parsed: Record<string, OptionItem[]> = {}
      for (const [key, value] of Object.entries(data)) {
        if (Array.isArray(value)) {
          parsed[key] = value as OptionItem[]
        }
      }

      cachedOptions = parsed
      cacheTimestamp = Date.now()
      setDbOptions(parsed)
    } catch (err) {
      console.error('OptionsProvider: fetch error', err)
      // Fall back to defaults — already in OPTION_DEFAULTS
    } finally {
      setIsLoaded(true)
    }
  }, [])

  useEffect(() => {
    fetchOptions()
  }, [fetchOptions])

  const getOptions = useCallback(
    (key: string): OptionItem[] => {
      // Prefer DB options, fall back to defaults
      const fullKey = key.startsWith('options.') || key.startsWith('dashboard.')
        ? key
        : `options.${key}`
      return dbOptions[fullKey] ?? OPTION_DEFAULTS[fullKey] ?? []
    },
    [dbOptions]
  )

  const getActiveOptions = useCallback(
    (key: string): OptionItem[] => {
      return getOptions(key).filter((o) => o.is_active !== false)
    },
    [getOptions]
  )

  const getLabel = useCallback(
    (key: string, value: string): string => {
      const opts = getOptions(key)
      return opts.find((o) => o.value === value)?.label ?? value
    },
    [getOptions]
  )

  const getColor = useCallback(
    (key: string, value: string): string => {
      const opts = getOptions(key)
      return opts.find((o) => o.value === value)?.color ?? 'gray'
    },
    [getOptions]
  )

  const refresh = useCallback(async () => {
    cachedOptions = null
    cacheTimestamp = 0
    await fetchOptions()
  }, [fetchOptions])

  return (
    <OptionsContext.Provider
      value={{ getOptions, getActiveOptions, getLabel, getColor, isLoaded, refresh }}
    >
      {children}
    </OptionsContext.Provider>
  )
}

export function useAppOptions() {
  const ctx = useContext(OptionsContext)
  if (!ctx) {
    throw new Error('useAppOptions must be used within OptionsProvider')
  }
  return ctx
}
