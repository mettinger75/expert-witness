import React from 'react'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireAdminUser } from '@/lib/api-admin-auth'
import { renderToBuffer } from '@react-pdf/renderer'
import { InvoicePDF } from '@/lib/invoice-pdf-template'
import type {
  InvoiceRow,
  InvoiceLineItemRow,
  ContactRow,
  CaseRow,
  InvoiceTemplateRow,
} from '@/types/database.types'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminUser(request)
    if (auth.error) return auth.error

    const body = await request.json()
    const { invoiceId } = body

    if (!invoiceId) {
      return NextResponse.json(
        { error: 'Missing required field: invoiceId' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Fetch invoice with line items
    const { data: invoice, error: invError } = await supabase
      .from('invoices')
      .select('*, invoice_line_items(*)')
      .eq('id', invoiceId)
      .single()

    if (invError || !invoice) {
      return NextResponse.json(
        { error: invError?.message || 'Invoice not found' },
        { status: 404 }
      )
    }

    const typedInvoice = invoice as InvoiceRow & { invoice_line_items: InvoiceLineItemRow[] }

    // Fetch bill-to contact if linked
    let contact: ContactRow | null = null
    if (typedInvoice.bill_to_contact_id) {
      const { data: contactData } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', typedInvoice.bill_to_contact_id)
        .single()
      contact = (contactData as ContactRow) ?? null
    }

    // Fetch case info
    let caseName = ''
    let caseNumber = ''
    if (typedInvoice.case_id) {
      const { data: caseData } = await supabase
        .from('cases')
        .select('case_name, case_number')
        .eq('id', typedInvoice.case_id)
        .single()
      if (caseData) {
        caseName = (caseData as CaseRow).case_name
        caseNumber = (caseData as CaseRow).case_number
      }
    }

    // Fetch template if linked
    let template: InvoiceTemplateRow | null = null
    if (typedInvoice.template_id) {
      const { data: templateData } = await supabase
        .from('invoice_templates')
        .select('*')
        .eq('id', typedInvoice.template_id)
        .single()
      template = (templateData as InvoiceTemplateRow) ?? null
    }

    // Render the PDF
    const pdfElement = React.createElement(InvoicePDF, {
      invoice: typedInvoice,
      contact,
      caseName,
      caseNumber,
      template,
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(pdfElement as any)

    // Return PDF response
    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${typedInvoice.invoice_number}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Invoice PDF export error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
