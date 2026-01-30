import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { caseNotesService } from '@/services/caseNotes.service'
import type { CaseNoteInsert, CaseNoteUpdate } from '@/types/database.types'
import { toast } from 'sonner'

export function useCaseNotes(caseId: string) {
  return useQuery({
    queryKey: ['case_notes', 'case', caseId],
    queryFn: () => caseNotesService.getByCaseId(caseId),
    enabled: !!caseId,
  })
}

export function useCreateCaseNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CaseNoteInsert) => caseNotesService.create(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['case_notes', 'case', data.case_id] })
      toast.success('Note created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create note: ${error.message}`)
    },
  })
}

export function useUpdateCaseNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CaseNoteUpdate }) =>
      caseNotesService.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['case_notes', 'case', data.case_id] })
      toast.success('Note updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update note: ${error.message}`)
    },
  })
}

export function useDeleteCaseNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, caseId }: { id: string; caseId: string }) =>
      caseNotesService.delete(id),
    onSuccess: (_, { caseId }) => {
      queryClient.invalidateQueries({ queryKey: ['case_notes', 'case', caseId] })
      toast.success('Note deleted')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete note: ${error.message}`)
    },
  })
}

export function useTogglePin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; caseId: string }) =>
      caseNotesService.togglePin(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['case_notes', 'case', data.case_id] })
      toast.success(data.is_pinned ? 'Note pinned' : 'Note unpinned')
    },
    onError: (error: Error) => {
      toast.error(`Failed to toggle pin: ${error.message}`)
    },
  })
}
