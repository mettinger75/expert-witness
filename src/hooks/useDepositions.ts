import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { depositionsService } from '@/services/depositions.service'
import { depositionExcerptsService } from '@/services/depositionExcerpts.service'
import type {
  DepositionInsert,
  DepositionUpdate,
  DepositionExcerptInsert,
} from '@/types/database.types'
import { toast } from 'sonner'

// ── Depositions ──────────────────────────────────────────────────────────────

export function useDepositions(caseId: string) {
  return useQuery({
    queryKey: ['depositions', 'case', caseId],
    queryFn: () => depositionsService.getByCaseId(caseId),
    enabled: !!caseId,
  })
}

export function useDeposition(id: string) {
  return useQuery({
    queryKey: ['depositions', id],
    queryFn: () => depositionsService.getById(id),
    enabled: !!id,
  })
}

export function useCreateDeposition() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: DepositionInsert) => depositionsService.create(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['depositions', 'case', data.case_id] })
      toast.success('Deposition created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create deposition: ${error.message}`)
    },
  })
}

export function useUpdateDeposition() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: DepositionUpdate }) =>
      depositionsService.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['depositions', 'case', data.case_id] })
      queryClient.invalidateQueries({ queryKey: ['depositions', data.id] })
      toast.success('Deposition updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update deposition: ${error.message}`)
    },
  })
}

// ── Deposition Excerpts ──────────────────────────────────────────────────────

export function useDepositionExcerpts(depositionId: string) {
  return useQuery({
    queryKey: ['deposition_excerpts', 'deposition', depositionId],
    queryFn: () => depositionExcerptsService.getByDepositionId(depositionId),
    enabled: !!depositionId,
  })
}

export function useCreateExcerpt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: DepositionExcerptInsert) => depositionExcerptsService.create(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['deposition_excerpts', 'deposition', data.deposition_id] })
      toast.success('Excerpt created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create excerpt: ${error.message}`)
    },
  })
}

export function useDeleteExcerpt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, depositionId }: { id: string; depositionId: string }) =>
      depositionExcerptsService.delete(id),
    onSuccess: (_, { depositionId }) => {
      queryClient.invalidateQueries({ queryKey: ['deposition_excerpts', 'deposition', depositionId] })
      toast.success('Excerpt deleted')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete excerpt: ${error.message}`)
    },
  })
}
