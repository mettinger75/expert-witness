import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  testimonyHistoryService,
  type TestimonyHistoryFilters,
  type TestimonyHistoryInsert,
  type TestimonyHistoryUpdate,
} from '@/services/testimonyHistory.service'
import { toast } from 'sonner'

const KEY = 'testimony_history'

export function useTestimonyHistory(filters: TestimonyHistoryFilters = {}) {
  return useQuery({
    queryKey: [KEY, filters],
    queryFn: () => testimonyHistoryService.list(filters),
  })
}

export function useCreateTestimonyHistory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: TestimonyHistoryInsert) =>
      testimonyHistoryService.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      toast.success('Testimony entry added')
    },
    onError: (e: Error) => toast.error(`Failed: ${e.message}`),
  })
}

export function useUpdateTestimonyHistory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TestimonyHistoryUpdate }) =>
      testimonyHistoryService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      toast.success('Testimony entry updated')
    },
    onError: (e: Error) => toast.error(`Failed: ${e.message}`),
  })
}

export function useDeleteTestimonyHistory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => testimonyHistoryService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      toast.success('Testimony entry deleted')
    },
    onError: (e: Error) => toast.error(`Failed: ${e.message}`),
  })
}
