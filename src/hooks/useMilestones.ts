import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { milestonesService } from '@/services/milestones.service'
import type { CaseMilestoneInsert } from '@/types/database.types'
import { toast } from 'sonner'

export function useMilestones(caseId: string) {
  return useQuery({
    queryKey: ['milestones', 'case', caseId],
    queryFn: () => milestonesService.getByCaseId(caseId),
    enabled: !!caseId,
  })
}

export function useCreateMilestone() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CaseMilestoneInsert) => milestonesService.create(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['milestones', 'case', data.case_id] })
      toast.success('Milestone created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create milestone: ${error.message}`)
    },
  })
}

export function useToggleMilestone() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; caseId: string }) =>
      milestonesService.toggleComplete(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['milestones', 'case', data.case_id] })
      toast.success(data.is_completed ? 'Milestone completed' : 'Milestone reopened')
    },
    onError: (error: Error) => {
      toast.error(`Failed to toggle milestone: ${error.message}`)
    },
  })
}
