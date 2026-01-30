import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reportsService } from '@/services/reports.service'
import type { ReportInsert, ReportUpdate } from '@/types/database.types'
import { toast } from 'sonner'

export function useReports(caseId: string) {
  return useQuery({
    queryKey: ['reports', 'case', caseId],
    queryFn: () => reportsService.getByCaseId(caseId),
    enabled: !!caseId,
  })
}

export function useReport(id: string) {
  return useQuery({
    queryKey: ['reports', id],
    queryFn: () => reportsService.getById(id),
    enabled: !!id,
  })
}

export function useCreateReport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ReportInsert) => reportsService.create(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reports', 'case', data.case_id] })
      toast.success('Report created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create report: ${error.message}`)
    },
  })
}

export function useUpdateReport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReportUpdate }) =>
      reportsService.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reports', 'case', data.case_id] })
      queryClient.invalidateQueries({ queryKey: ['reports', data.id] })
      toast.success('Report updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update report: ${error.message}`)
    },
  })
}
