import { supabase } from '@/lib/supabase'
import type { ContactRow, ContactInsert, ContactUpdate } from '@/types/database.types'

export interface ContactFilters {
  search?: string
  contact_type?: string
  is_active?: boolean
}

export const contactsService = {
  async getAll(filters?: ContactFilters) {
    let query = supabase
      .from('contacts')
      .select('*')
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true })

    if (filters?.contact_type) query = query.eq('contact_type', filters.contact_type)
    if (filters?.is_active !== undefined) query = query.eq('is_active', filters.is_active)
    if (filters?.search) {
      query = query.or(
        `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,organization.ilike.%${filters.search}%`
      )
    }

    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as ContactRow[]
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as ContactRow
  },

  async create(input: ContactInsert) {
    const { data, error } = await supabase
      .from('contacts')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data as ContactRow
  },

  async update(id: string, input: ContactUpdate) {
    const { data, error } = await supabase
      .from('contacts')
      .update(input)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as ContactRow
  },

  async archive(id: string) {
    return contactsService.update(id, { is_active: false })
  },

  async search(query: string) {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('is_active', true)
      .or(
        `first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,organization.ilike.%${query}%`
      )
      .order('last_name', { ascending: true })
      .limit(20)
    if (error) throw error
    return (data ?? []) as ContactRow[]
  },
}
