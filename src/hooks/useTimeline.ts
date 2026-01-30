import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { timelineService, type TimelineFilters } from '@/services/timeline.service'
import type { MedicalRecordsTimelineInsert, MedicalRecordsTimelineUpdate } from '@/types/database.types'
import { toast } from 'sonner'

export function useTimeline(caseId: string, filters?: TimelineFilters) {
  return useQuery({
    queryKey: ['timeline', 'case', caseId, filters],
    queryFn: () => timelineService.getByCaseId(caseId, filters),
    enabled: !!caseId,
  })
}

export function useCreateTimelineEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: MedicalRecordsTimelineInsert) => timelineService.create(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['timeline', 'case', data.case_id] })
      toast.success('Timeline entry created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create timeline entry: ${error.message}`)
    },
  })
}

export function useUpdateTimelineEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MedicalRecordsTimelineUpdate }) =>
      timelineService.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['timeline', 'case', data.case_id] })
      toast.success('Timeline entry updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update timeline entry: ${error.message}`)
    },
  })
}

export function useDeleteTimelineEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, caseId }: { id: string; caseId: string }) =>
      timelineService.delete(id),
    onSuccess: (_, { caseId }) => {
      queryClient.invalidateQueries({ queryKey: ['timeline', 'case', caseId] })
      toast.success('Timeline entry deleted')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete timeline entry: ${error.message}`)
    },
  })
}
