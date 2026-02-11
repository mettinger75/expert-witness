import { supabase } from '@/lib/supabase'
import type { SystemSettingRow, Json } from '@/types/database.types'

export const settingsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .order('category', { ascending: true })
      .order('setting_key', { ascending: true })
    if (error) throw error
    return (data ?? []) as SystemSettingRow[]
  },

  async getByKey(key: string) {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .eq('setting_key', key)
      .single()
    if (error) throw error
    return data as SystemSettingRow
  },

  async update(key: string, value: Json) {
    const { data, error } = await supabase
      .from('system_settings')
      .update({ setting_value: value })
      .eq('setting_key', key)
      .select()
      .single()
    if (error) throw error
    return data as SystemSettingRow
  },

  async upsert(
    key: string,
    value: Json,
    opts?: { setting_type?: string; category?: string; description?: string }
  ) {
    const { data, error } = await supabase
      .from('system_settings')
      .upsert(
        {
          setting_key: key,
          setting_value: value,
          setting_type: opts?.setting_type ?? 'json',
          category: opts?.category ?? 'general',
          description: opts?.description ?? null,
        },
        { onConflict: 'setting_key' }
      )
      .select()
      .single()
    if (error) throw error
    return data as SystemSettingRow
  },

  async getByCategory(category: string) {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .eq('category', category)
      .order('setting_key', { ascending: true })
    if (error) throw error
    return (data ?? []) as SystemSettingRow[]
  },
}
