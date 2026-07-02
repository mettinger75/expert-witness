import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reportsService } from '@/services/reports.service'
import type { ReportInsert, ReportUpdate } from '@/types/database.types'
import { authHeaders } from '@/lib/api-client'
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

export function useDeleteReport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => reportsService.delete(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reports', 'case', data.case_id] })
      queryClient.invalidateQueries({ queryKey: ['reports', data.id] })
      toast.success('Report deleted')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete report: ${error.message}`)
    },
  })
}

export function useReportTemplates() {
  return useQuery({
    queryKey: ['report-templates'],
    queryFn: () => reportsService.getTemplates(),
  })
}

export function useReportTemplateWithSections(templateId: string) {
  return useQuery({
    queryKey: ['report-templates', templateId, 'sections'],
    queryFn: () => reportsService.getTemplateWithSections(templateId),
    enabled: !!templateId,
  })
}

export function useGenerateReport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (params: {
      caseId: string
      templateId: string
      sectionKeys?: string[]
      reportId?: string
    }) => {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify(params),
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to generate report')
      }
      return response.json()
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reports', 'case', variables.caseId] })
      if (variables.reportId) {
        queryClient.invalidateQueries({ queryKey: ['reports', variables.reportId] })
      }
      toast.success('Report generated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to generate report: ${error.message}`)
    },
  })
}

export function useSaveReportSections() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, sectionsData }: { id: string; sectionsData: Record<string, unknown> }) =>
      reportsService.updateSections(id, sectionsData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reports', 'case', data.case_id] })
      queryClient.invalidateQueries({ queryKey: ['reports', data.id] })
      toast.success('Report saved')
    },
    onError: (error: Error) => {
      toast.error(`Failed to save report: ${error.message}`)
    },
  })
}
