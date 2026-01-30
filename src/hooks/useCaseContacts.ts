import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { caseContactsService } from '@/services/caseContacts.service'
import type { CaseContactInsert, CaseContactRole } from '@/types/database.types'
import { toast } from 'sonner'

export function useCaseContacts(caseId: string) {
  return useQuery({
    queryKey: ['case_contacts', 'case', caseId],
    queryFn: () => caseContactsService.getByCaseId(caseId),
    enabled: !!caseId,
  })
}

export function useContactCases(contactId: string) {
  return useQuery({
    queryKey: ['case_contacts', 'contact', contactId],
    queryFn: () => caseContactsService.getByContactId(contactId),
    enabled: !!contactId,
  })
}

export function useAddCaseContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CaseContactInsert) => caseContactsService.add(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['case_contacts', 'case', variables.case_id] })
      queryClient.invalidateQueries({ queryKey: ['case_contacts', 'contact', variables.contact_id] })
      toast.success('Contact added to case')
    },
    onError: (error: Error) => {
      toast.error(`Failed to add contact to case: ${error.message}`)
    },
  })
}

export function useRemoveCaseContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, caseId, contactId }: { id: string; caseId: string; contactId: string }) =>
      caseContactsService.remove(id),
    onSuccess: (_, { caseId, contactId }) => {
      queryClient.invalidateQueries({ queryKey: ['case_contacts', 'case', caseId] })
      queryClient.invalidateQueries({ queryKey: ['case_contacts', 'contact', contactId] })
      toast.success('Contact removed from case')
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove contact from case: ${error.message}`)
    },
  })
}

export function useUpdateCaseContactRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, role, caseId, contactId }: { id: string; role: CaseContactRole; caseId: string; contactId: string }) =>
      caseContactsService.updateRole(id, role),
    onSuccess: (_, { caseId, contactId }) => {
      queryClient.invalidateQueries({ queryKey: ['case_contacts', 'case', caseId] })
      queryClient.invalidateQueries({ queryKey: ['case_contacts', 'contact', contactId] })
      toast.success('Contact role updated')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update contact role: ${error.message}`)
    },
  })
}
