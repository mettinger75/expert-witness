import React from 'react'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { renderToBuffer } from '@react-pdf/renderer'
import { InvoicePDF } from '@/lib/invoice-pdf-template'
import { DOCUMENT_AUTHOR, scrubPdfMetadata } from '@/lib/document-metadata'
import type {
  InvoiceRow,
  InvoiceLineItemRow,
  ContactRow,
  CaseRow,
  InvoiceTemplateRow,
} from '@/types/database.types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; id: string }> }
) {
  try {
    const { token, id } = await params
    const supabase = getSupabaseAdmin()

    // Validate portal invite
    const { data: invite, error: inviteError } = await supabase
      .from('portal_invites')
      .select('id, case_id, can_view_billing, is_active, expires_at')
      .eq('token', token)
      .eq('is_active', true)
      .single()

    if (inviteError || !invite) {
      return NextResponse.json({ error: 'Portal link not found' }, { status: 404 })
    }

    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Portal link expired' }, { status: 410 })
    }

    if (!invite.can_view_billing) {
      return NextResponse.json({ error: 'Billing access not permitted' }, { status: 403 })
    }

    // Fetch invoice with line items — must belong to the invite's case
    const { data: invoice, error: invError } = await supabase
      .from('invoices')
      .select('*, invoice_line_items(*)')
      .eq('id', id)
      .eq('case_id', invite.case_id)
      .single()

    if (invError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Only allow download of invoices that have been sent/approved (not drafts)
    const visibleStatuses = ['sent', 'overdue', 'partial', 'paid', 'pending_review', 'approved']
    if (!visibleStatuses.includes(invoice.status)) {
      return NextResponse.json({ error: 'Invoice not available' }, { status: 403 })
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
    const scrubbedPdf = await scrubPdfMetadata(pdfBuffer, {
      title: `Invoice ${typedInvoice.invoice_number}`,
      author: DOCUMENT_AUTHOR,
    })

    return new NextResponse(new Uint8Array(scrubbedPdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${typedInvoice.invoice_number}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Portal invoice PDF error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
