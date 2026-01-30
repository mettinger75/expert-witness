import { supabase } from '@/lib/supabase'
import type {
  CaseContactRow,
  CaseContactInsert,
  ContactRow,
  CaseRow,
  CaseContactRole,
} from '@/types/database.types'

export interface CaseContactWithContact extends CaseContactRow {
  contacts: ContactRow
}

export interface CaseContactWithCase extends CaseContactRow {
  cases: CaseRow
}

export const caseContactsService = {
  async getByCaseId(caseId: string) {
    const { data, error } = await supabase
      .from('case_contacts')
      .select('*, contacts(*)')
      .eq('case_id', caseId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data ?? []) as CaseContactWithContact[]
  },

  async getByContactId(contactId: string) {
    const { data, error } = await supabase
      .from('case_contacts')
      .select('*, cases(*)')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as CaseContactWithCase[]
  },

  async add(input: CaseContactInsert) {
    const { data, error } = await supabase
      .from('case_contacts')
      .insert(input)
      .select('*, contacts(*)')
      .single()
    if (error) throw error
    return data as CaseContactWithContact
  },

  async remove(id: string) {
    const { error } = await supabase
      .from('case_contacts')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  async updateRole(id: string, role: CaseContactRole) {
    const { data, error } = await supabase
      .from('case_contacts')
      .update({ role })
      .eq('id', id)
      .select('*, contacts(*)')
      .single()
    if (error) throw error
    return data as CaseContactWithContact
  },
}
