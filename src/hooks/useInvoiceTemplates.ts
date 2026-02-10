import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { invoiceTemplatesService } from '@/services/invoiceTemplates.service'
import type { InvoiceTemplateInsert, InvoiceTemplateUpdate } from '@/types/database.types'
import { toast } from 'sonner'

export function useInvoiceTemplates() {
  return useQuery({
    queryKey: ['invoice-templates'],
    queryFn: () => invoiceTemplatesService.getAll(),
  })
}

export function useInvoiceTemplate(id: string) {
  return useQuery({
    queryKey: ['invoice-templates', id],
    queryFn: () => invoiceTemplatesService.getById(id),
    enabled: !!id,
  })
}

export function useDefaultInvoiceTemplate() {
  return useQuery({
    queryKey: ['invoice-templates', 'default'],
    queryFn: () => invoiceTemplatesService.getDefault(),
  })
}

export function useCreateInvoiceTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: InvoiceTemplateInsert) => invoiceTemplatesService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice-templates'] })
      toast.success('Invoice template created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create template: ${error.message}`)
    },
  })
}

export function useUpdateInvoiceTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: InvoiceTemplateUpdate }) =>
      invoiceTemplatesService.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoice-templates'] })
      queryClient.invalidateQueries({ queryKey: ['invoice-templates', data.id] })
      toast.success('Invoice template updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update template: ${error.message}`)
    },
  })
}

export function useDeleteInvoiceTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => invoiceTemplatesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice-templates'] })
      toast.success('Invoice template deleted')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete template: ${error.message}`)
    },
  })
}
