import { supabase } from '@/lib/supabase'
import type { SharedLinkRow, SharedLinkInsert, SharedLinkUpdate } from '@/types/database.types'

export const sharedLinksService = {
  async getByEntity(entityType: string, entityId: string): Promise<SharedLinkRow[]> {
    const { data, error } = await supabase
      .from('shared_links')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data || []) as SharedLinkRow[]
  },

  async getById(id: string): Promise<SharedLinkRow> {
    const { data, error } = await supabase
      .from('shared_links')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data as SharedLinkRow
  },

  async create(input: SharedLinkInsert): Promise<SharedLinkRow> {
    const { data, error } = await supabase
      .from('shared_links')
      .insert(input)
      .select()
      .single()

    if (error) throw error
    return data as SharedLinkRow
  },

  async update(id: string, input: SharedLinkUpdate): Promise<SharedLinkRow> {
    const { data, error } = await supabase
      .from('shared_links')
      .update(input)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as SharedLinkRow
  },

  async getByContactId(contactId: string): Promise<SharedLinkRow[]> {
    const { data, error } = await supabase
      .from('shared_links')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data || []) as SharedLinkRow[]
  },

  async revoke(id: string): Promise<void> {
    const { error } = await supabase
      .from('shared_links')
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
      } as SharedLinkUpdate)
      .eq('id', id)

    if (error) throw error
  },
}
