import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { communicationLogsService } from '@/services/communicationLogs.service'
import type { CommunicationLogInsert } from '@/types/database.types'
import { toast } from 'sonner'

export function useCommunicationLogs(caseId: string) {
  return useQuery({
    queryKey: ['communication_logs', 'case', caseId],
    queryFn: () => communicationLogsService.getByCaseId(caseId),
    enabled: !!caseId,
  })
}

export function useCreateCommunicationLog() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CommunicationLogInsert) => communicationLogsService.create(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['communication_logs', 'case', data.case_id] })
      toast.success('Communication log created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create communication log: ${error.message}`)
    },
  })
}
