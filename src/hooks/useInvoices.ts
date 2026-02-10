import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { invoicesService, type InvoiceFilters } from '@/services/invoices.service'
import type { InvoiceInsert, InvoiceUpdate } from '@/types/database.types'
import { toast } from 'sonner'

export function useInvoices(filters?: InvoiceFilters) {
  return useQuery({
    queryKey: ['invoices', filters],
    queryFn: () => invoicesService.getAll(filters),
  })
}

export function useCaseInvoices(caseId: string) {
  return useQuery({
    queryKey: ['invoices', 'case', caseId],
    queryFn: () => invoicesService.getByCaseId(caseId),
    enabled: !!caseId,
  })
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: ['invoices', id],
    queryFn: () => invoicesService.getById(id),
    enabled: !!id,
  })
}

export function useCreateInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: InvoiceInsert) => invoicesService.create(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoices', 'case', data.case_id] })
      toast.success('Invoice created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create invoice: ${error.message}`)
    },
  })
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: InvoiceUpdate }) =>
      invoicesService.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoices', 'case', data.case_id] })
      queryClient.invalidateQueries({ queryKey: ['invoices', data.id] })
      toast.success('Invoice updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update invoice: ${error.message}`)
    },
  })
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; caseId: string }) =>
      invoicesService.delete(id),
    onSuccess: (_, { caseId }) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoices', 'case', caseId] })
      queryClient.invalidateQueries({ queryKey: ['time_entries'] })
      queryClient.invalidateQueries({ queryKey: ['charges'] })
      toast.success('Invoice deleted')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete invoice: ${error.message}`)
    },
  })
}

export function useGenerateInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      caseId: string
      timeEntryIds: string[]
      chargeIds: string[]
      billToContactId?: string
      billToName?: string
      billToOrganization?: string
      billToAddress?: string
      billToEmail?: string
      templateId?: string
      dueDate?: string
      paymentTerms?: number
      taxRate?: number
      paymentInstructions?: string
      notes?: string
    }) => invoicesService.generateFromUnbilledItems(input.caseId, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['time_entries'] })
      queryClient.invalidateQueries({ queryKey: ['charges'] })
      toast.success(`Invoice ${data.invoice_number} created`)
    },
    onError: (error: Error) => {
      toast.error(`Failed to generate invoice: ${error.message}`)
    },
  })
}

export function useAddToInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      invoiceId: string
      timeEntryIds: string[]
      chargeIds: string[]
    }) => invoicesService.addItemsToInvoice(input.invoiceId, input.timeEntryIds, input.chargeIds),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['time_entries'] })
      queryClient.invalidateQueries({ queryKey: ['charges'] })
      toast.success(`Items added to invoice ${data.invoice_number}`)
    },
    onError: (error: Error) => {
      toast.error(`Failed to add items: ${error.message}`)
    },
  })
}
