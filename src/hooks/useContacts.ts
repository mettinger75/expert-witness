import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contactsService, type ContactFilters } from '@/services/contacts.service'
import type { ContactInsert, ContactUpdate } from '@/types/database.types'
import { toast } from 'sonner'

export function useContacts(filters?: ContactFilters) {
  return useQuery({
    queryKey: ['contacts', filters],
    queryFn: () => contactsService.getAll(filters),
  })
}

export function useContact(id: string) {
  return useQuery({
    queryKey: ['contacts', id],
    queryFn: () => contactsService.getById(id),
    enabled: !!id,
  })
}

export function useCreateContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ContactInsert) => contactsService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      toast.success('Contact created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create contact: ${error.message}`)
    },
  })
}

export function useUpdateContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ContactUpdate }) =>
      contactsService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      queryClient.invalidateQueries({ queryKey: ['contacts', id] })
      toast.success('Contact updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update contact: ${error.message}`)
    },
  })
}

export function useArchiveContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => contactsService.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      toast.success('Contact archived')
    },
    onError: (error: Error) => {
      toast.error(`Failed to archive contact: ${error.message}`)
    },
  })
}

export function useDeleteContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, force }: { id: string; force?: boolean }) =>
      contactsService.delete(id, force),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      toast.success('Contact deleted')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete contact: ${error.message}`)
    },
  })
}
