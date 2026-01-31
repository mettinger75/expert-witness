import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { casesService, type CaseFilters } from '@/services/cases.service'
import type { CaseInsert, CaseUpdate } from '@/types/database.types'
import { toast } from 'sonner'

export function useCases(filters?: CaseFilters) {
  return useQuery({
    queryKey: ['cases', filters],
    queryFn: () => casesService.getAll(filters),
  })
}

export function useCase(id: string) {
  return useQuery({
    queryKey: ['cases', id],
    queryFn: () => casesService.getById(id),
    enabled: !!id,
  })
}

export function useCaseStats() {
  return useQuery({
    queryKey: ['cases', 'stats'],
    queryFn: () => casesService.getStats(),
  })
}

export function useCreateCase() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CaseInsert) => casesService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] })
      toast.success('Case created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create case: ${error.message}`)
    },
  })
}

export function useUpdateCase() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CaseUpdate }) =>
      casesService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['cases'] })
      queryClient.invalidateQueries({ queryKey: ['cases', id] })
      toast.success('Case updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update case: ${error.message}`)
    },
  })
}

export function useArchiveCase() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => casesService.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] })
      toast.success('Case archived')
    },
    onError: (error: Error) => {
      toast.error(`Failed to archive case: ${error.message}`)
    },
  })
}

export function useSynthesizeCase() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (caseId: string) => {
      const response = await fetch(`/api/cases/${caseId}/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!response.ok) {
        let errorMsg = `Synthesis failed (${response.status})`
        try { const err = await response.json(); errorMsg = err.error || errorMsg } catch { /* non-JSON */ }
        throw new Error(errorMsg)
      }
      return response.json()
    },
    onSuccess: (_, caseId) => {
      queryClient.invalidateQueries({ queryKey: ['cases', caseId] })
      toast.success('Case analysis updated')
    },
    onError: (error: Error) => {
      toast.error(`Case synthesis failed: ${error.message}`)
    },
  })
}
