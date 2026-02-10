'use client'

import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { formatCurrency } from '@/lib/formatters'
import type { InvoiceInsert, InvoiceRow } from '@/types/database.types'
import { Loader2, Plus, Trash2 } from 'lucide-react'

const lineItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.coerce.number().positive('Quantity must be positive'),
  unit_price: z.coerce.number().min(0, 'Price must be non-negative'),
  is_expense: z.boolean().default(false),
})

const invoiceSchema = z.object({
  invoice_number: z.string().min(1, 'Invoice number is required'),
  bill_to_contact_id: z.string().optional(),
  payment_terms: z.string().optional(),
  due_date: z.string().min(1, 'Due date is required'),
  invoice_date: z.string().min(1, 'Invoice date is required'),
  notes: z.string().optional(),
  line_items: z.array(lineItemSchema).min(1, 'At least one line item is required'),
})

type InvoiceFormValues = z.infer<typeof invoiceSchema>

interface InvoiceFormProps {
  caseId: string
  initialData?: InvoiceRow
  onSubmit: (data: InvoiceInsert & { line_items: Array<{ description: string; quantity: number; unit_price: number; is_expense: boolean }> }) => Promise<void>
  isSubmitting: boolean
  contacts?: Array<{ id: string; first_name: string; last_name: string; organization?: string | null }>
}

function generateInvoiceNumber(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  const seq = Math.floor(Math.random() * 9000 + 1000)
  return `INV-${year}${month}-${seq}`
}

export function InvoiceForm({ caseId, initialData, onSubmit, isSubmitting, contacts = [] }: InvoiceFormProps) {
  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema) as any,
    defaultValues: {
      invoice_number: initialData?.invoice_number ?? generateInvoiceNumber(),
      bill_to_contact_id: initialData?.bill_to_contact_id ?? '',
      payment_terms: initialData?.payment_terms != null ? String(initialData.payment_terms) : '30',
      due_date: initialData?.due_date ?? '',
      invoice_date: initialData?.invoice_date ?? new Date().toISOString().split('T')[0],
      notes: initialData?.notes ?? '',
      line_items: [{ description: '', quantity: 1, unit_price: 0, is_expense: false }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'line_items',
  })

  const lineItems = form.watch('line_items')
  const subtotal = lineItems.reduce((sum, item) => {
    return sum + (item.quantity || 0) * (item.unit_price || 0)
  }, 0)

  async function handleFormSubmit(values: InvoiceFormValues) {
    await onSubmit({
      case_id: caseId,
      invoice_number: values.invoice_number,
      bill_to_contact_id: values.bill_to_contact_id || null,
      payment_terms: values.payment_terms ? parseInt(values.payment_terms, 10) : null,
      due_date: values.due_date,
      invoice_date: values.invoice_date,
      notes: values.notes || null,
      subtotal,
      total_amount: subtotal,
      balance_due: subtotal,
      line_items: values.line_items,
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Invoice Details */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="invoice_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Number *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="invoice_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="bill_to_contact_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bill To *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select contact" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {contacts.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.first_name} {c.last_name}
                            {c.organization ? ` - ${c.organization}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="payment_terms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Terms (days)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select terms" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0">Due on Receipt</SelectItem>
                        <SelectItem value="15">Net 15</SelectItem>
                        <SelectItem value="30">Net 30</SelectItem>
                        <SelectItem value="45">Net 45</SelectItem>
                        <SelectItem value="60">Net 60</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Invoice notes or additional information..." rows={3} {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Line Items</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ description: '', quantity: 1, unit_price: 0, is_expense: false })}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Line
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field, index) => {
              const lineTotal = (lineItems[index]?.quantity || 0) * (lineItems[index]?.unit_price || 0)
              return (
                <div key={field.id} className="space-y-3">
                  {index > 0 && <Separator />}
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-3">
                      <FormField
                        control={form.control}
                        name={`line_items.${index}.description`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description *</FormLabel>
                            <FormControl>
                              <Input placeholder="Service or expense description" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-3 gap-3">
                        <FormField
                          control={form.control}
                          name={`line_items.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Quantity</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.25" min="0" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`line_items.${index}.unit_price`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Unit Price ($)</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.01" min="0" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div>
                          <FormLabel>Line Total</FormLabel>
                          <div className="h-10 flex items-center text-sm font-medium">
                            {formatCurrency(lineTotal)}
                          </div>
                        </div>
                      </div>
                      <FormField
                        control={form.control}
                        name={`line_items.${index}.is_expense`}
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-3 space-y-0">
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel>Expense (non-time item)</FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="mt-8"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}

            <Separator />
            <div className="flex justify-end">
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Subtotal</div>
                <div className="text-lg font-bold">{formatCurrency(subtotal)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => window.history.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {initialData ? 'Update Invoice' : 'Create Invoice'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
