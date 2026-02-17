import type { ContactRow, ContactInsert, ContactUpdate } from '@/types/database.types'

export interface ContactFilters {
  search?: string
  contact_type?: string
  is_active?: boolean
}

export const contactsService = {
  async getAll(filters?: ContactFilters) {
    const params = new URLSearchParams()
    if (filters?.search) params.set('search', filters.search)
    if (filters?.contact_type) params.set('contact_type', filters.contact_type)
    if (filters?.is_active !== undefined) params.set('is_active', String(filters.is_active))

    const res = await fetch(`/api/contacts?${params.toString()}`)
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Failed to fetch contacts')
    }
    return (await res.json()) as ContactRow[]
  },

  async getById(id: string) {
    const res = await fetch(`/api/contacts/${id}`)
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Failed to fetch contact')
    }
    return (await res.json()) as ContactRow
  },

  async create(input: ContactInsert) {
    const res = await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Failed to create contact')
    }
    return (await res.json()) as ContactRow
  },

  async update(id: string, input: ContactUpdate) {
    const res = await fetch(`/api/contacts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Failed to update contact')
    }
    return (await res.json()) as ContactRow
  },

  async archive(id: string) {
    return contactsService.update(id, { is_active: false })
  },

  async delete(id: string, force = false) {
    const url = force ? `/api/contacts/${id}?force=true` : `/api/contacts/${id}`
    const res = await fetch(url, { method: 'DELETE' })
    if (!res.ok) {
      const err = await res.json()
      throw Object.assign(new Error(err.error || 'Failed to delete contact'), {
        linkedCases: err.linkedCases,
        activePortalInvites: err.activePortalInvites,
        details: err.message,
      })
    }
    return (await res.json()) as { success: boolean }
  },

  async search(query: string) {
    const params = new URLSearchParams({
      search: query,
      is_active: 'true',
    })
    const res = await fetch(`/api/contacts?${params.toString()}`)
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Failed to search contacts')
    }
    const data = (await res.json()) as ContactRow[]
    return data.slice(0, 20)
  },
}
