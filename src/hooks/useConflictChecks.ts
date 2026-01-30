import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { conflictChecksService } from '@/services/conflictChecks.service'
import type { ConflictCheckInsert, ConflictResolution } from '@/types/database.types'
import { toast } from 'sonner'

export function useConflictChecks(caseId: string) {
  return useQuery({
    queryKey: ['conflict_checks', 'case', caseId],
    queryFn: () => conflictChecksService.getByCaseId(caseId),
    enabled: !!caseId,
  })
}

export function useCreateConflictCheck() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ConflictCheckInsert) => conflictChecksService.create(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['conflict_checks', 'case', data.case_id] })
      toast.success('Conflict check created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create conflict check: ${error.message}`)
    },
  })
}

export function useResolveConflictCheck() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      resolution,
      notes,
    }: {
      id: string
      resolution: ConflictResolution
      notes: string
      caseId: string
    }) => conflictChecksService.resolve(id, resolution, notes),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['conflict_checks', 'case', data.case_id] })
      toast.success('Conflict check resolved')
    },
    onError: (error: Error) => {
      toast.error(`Failed to resolve conflict check: ${error.message}`)
    },
  })
}
