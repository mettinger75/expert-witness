import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { timeEntriesService, type TimeEntryFilters } from '@/services/timeEntries.service'
import type { TimeEntryInsert, TimeEntryUpdate } from '@/types/database.types'
import { toast } from 'sonner'

export function useTimeEntries(filters?: TimeEntryFilters) {
  return useQuery({
    queryKey: ['time_entries', filters],
    queryFn: () => timeEntriesService.getAll(filters),
  })
}

export function useCaseTimeEntries(caseId: string) {
  return useQuery({
    queryKey: ['time_entries', 'case', caseId],
    queryFn: () => timeEntriesService.getByCaseId(caseId),
    enabled: !!caseId,
  })
}

export function useUnbilledTime(caseId: string) {
  return useQuery({
    queryKey: ['time_entries', 'unbilled', caseId],
    queryFn: () => timeEntriesService.getUnbilled(caseId),
    enabled: !!caseId,
  })
}

export function useCreateTimeEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: TimeEntryInsert) => timeEntriesService.create(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['time_entries'] })
      queryClient.invalidateQueries({ queryKey: ['time_entries', 'case', data.case_id] })
      queryClient.invalidateQueries({ queryKey: ['time_entries', 'unbilled', data.case_id] })
      toast.success('Time entry created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create time entry: ${error.message}`)
    },
  })
}

export function useUpdateTimeEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TimeEntryUpdate }) =>
      timeEntriesService.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['time_entries'] })
      queryClient.invalidateQueries({ queryKey: ['time_entries', 'case', data.case_id] })
      queryClient.invalidateQueries({ queryKey: ['time_entries', 'unbilled', data.case_id] })
      toast.success('Time entry updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update time entry: ${error.message}`)
    },
  })
}

export function useDeleteTimeEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, caseId }: { id: string; caseId: string }) =>
      timeEntriesService.delete(id),
    onSuccess: (_, { caseId }) => {
      queryClient.invalidateQueries({ queryKey: ['time_entries'] })
      queryClient.invalidateQueries({ queryKey: ['time_entries', 'case', caseId] })
      queryClient.invalidateQueries({ queryKey: ['time_entries', 'unbilled', caseId] })
      toast.success('Time entry deleted')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete time entry: ${error.message}`)
    },
  })
}
