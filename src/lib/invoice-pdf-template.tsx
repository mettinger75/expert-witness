import React from 'react'
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Image,
} from '@react-pdf/renderer'
import type { InvoiceRow, InvoiceLineItemRow, ContactRow, InvoiceTemplateRow } from '@/types/database.types'

// ---------------------------------------------------------------------------
// Color palette (Meridian Design System)
// ---------------------------------------------------------------------------
const NAVY = '#0E1F35'
const NAVY_DARK = '#091525'
const GOLD = '#C9A84C'
const GRAY_50 = '#F9FAFB'
const GRAY_200 = '#E5E7EB'
const GRAY_500 = '#6B7280'
const GRAY_700 = '#374151'
const WHITE = '#FFFFFF'

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 50,
    color: GRAY_700,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: GOLD,
    paddingBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  logo: {
    width: 44,
    height: 44,
  },
  companyName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 18,
    color: NAVY,
    marginBottom: 2,
  },
  companySubtitle: {
    fontSize: 10,
    color: GOLD,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  companyDetail: {
    fontSize: 8.5,
    color: GRAY_500,
    lineHeight: 1.5,
  },
  invoiceTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 28,
    color: NAVY,
    textAlign: 'right',
  },

  // Invoice details box
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  detailsBox: {
    backgroundColor: GRAY_50,
    borderWidth: 1,
    borderColor: GRAY_200,
    borderRadius: 4,
    padding: 14,
    width: '48%',
  },
  detailsBoxTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: NAVY,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  detailLine: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  detailLabel: {
    fontSize: 9,
    color: GRAY_500,
    width: 90,
  },
  detailValue: {
    fontSize: 9,
    color: NAVY_DARK,
    fontFamily: 'Helvetica-Bold',
  },
  billToName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: NAVY_DARK,
    marginBottom: 2,
  },
  billToOrg: {
    fontSize: 9,
    color: GRAY_700,
    marginBottom: 2,
  },
  billToLine: {
    fontSize: 9,
    color: GRAY_500,
    lineHeight: 1.4,
  },

  // Case reference
  caseRef: {
    backgroundColor: NAVY,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  caseRefLabel: {
    fontSize: 9,
    color: GOLD,
    fontFamily: 'Helvetica-Bold',
  },
  caseRefValue: {
    fontSize: 9,
    color: WHITE,
  },

  // Table
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: NAVY,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  tableHeaderText: {
    color: WHITE,
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: GRAY_200,
  },
  tableRowAlt: {
    backgroundColor: GRAY_50,
  },
  tableCell: {
    fontSize: 9,
    color: GRAY_700,
  },
  tableCellBold: {
    fontSize: 9,
    color: NAVY_DARK,
    fontFamily: 'Helvetica-Bold',
  },

  // Column widths
  colDesc: { width: '50%' },
  colQty: { width: '15%', textAlign: 'right' },
  colRate: { width: '17%', textAlign: 'right' },
  colAmount: { width: '18%', textAlign: 'right' },

  // Totals
  totalsContainer: {
    marginTop: 4,
    alignItems: 'flex-end',
  },
  totalsBox: {
    width: 240,
    borderWidth: 1,
    borderColor: GRAY_200,
    borderRadius: 4,
    overflow: 'hidden',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  totalsRowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: GRAY_200,
  },
  totalsLabel: {
    fontSize: 9,
    color: GRAY_500,
  },
  totalsValue: {
    fontSize: 9,
    color: NAVY_DARK,
    fontFamily: 'Helvetica-Bold',
  },
  totalsFinalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: NAVY,
  },
  totalsFinalLabel: {
    fontSize: 11,
    color: GOLD,
    fontFamily: 'Helvetica-Bold',
  },
  totalsFinalValue: {
    fontSize: 11,
    color: WHITE,
    fontFamily: 'Helvetica-Bold',
  },

  // Payment instructions
  paymentBox: {
    marginTop: 24,
    backgroundColor: GRAY_50,
    borderWidth: 1,
    borderColor: GRAY_200,
    borderRadius: 4,
    padding: 14,
  },
  paymentTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: NAVY,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  paymentText: {
    fontSize: 9,
    color: GRAY_700,
    lineHeight: 1.5,
  },

  // Notes
  notesBox: {
    marginTop: 14,
    padding: 14,
  },
  notesTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: NAVY,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  notesText: {
    fontSize: 9,
    color: GRAY_500,
    lineHeight: 1.5,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 50,
    right: 50,
    borderTopWidth: 1,
    borderTopColor: GOLD,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 8,
    color: GRAY_500,
  },
  footerThank: {
    fontSize: 8,
    color: GOLD,
    fontFamily: 'Helvetica-Bold',
  },
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmtCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtQty(qty: number): string {
  if (qty === Math.floor(qty)) return String(qty)
  return qty.toFixed(2)
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface InvoicePDFProps {
  invoice: InvoiceRow & { invoice_line_items: InvoiceLineItemRow[] }
  contact: ContactRow | null
  caseName: string
  caseNumber: string
  template?: InvoiceTemplateRow | null
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function InvoicePDF({ invoice, contact, caseName, caseNumber, template }: InvoicePDFProps) {
  const lineItems = (invoice.invoice_line_items ?? []).sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  )

  const paymentInstructions =
    invoice.payment_instructions ??
    template?.payment_instructions ??
    'Please make checks payable to Mark Ettinger, M.D.'

  const footerText = template?.footer_text ?? null
  const headerText = template?.header_text ?? null

  const paymentTermsLabel =
    invoice.payment_terms ? `Net ${invoice.payment_terms}` : template?.default_payment_terms ? `Net ${template.default_payment_terms}` : 'Due on Receipt'

  // Use bill_to fields or fallback to contact
  const billToName = invoice.bill_to_name ?? (contact ? `${contact.first_name} ${contact.last_name}` : null)
  const billToOrg = invoice.bill_to_organization ?? contact?.organization_name ?? null
  const billToAddress = invoice.bill_to_address ?? (contact ? [contact.address_street, contact.address_city && contact.address_state ? `${contact.address_city}, ${contact.address_state} ${contact.address_zip ?? ''}`.trim() : null].filter(Boolean).join('\n') : null)
  const billToEmail = invoice.bill_to_email ?? contact?.email ?? null

  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        {/* ----- Header ----- */}
        <View style={s.headerRow}>
          <View style={s.headerLeft}>
            <View>
              <Text style={s.companyName}>Mark Ettinger, M.D.</Text>
              <Text style={s.companySubtitle}>Medical Expert Consulting</Text>
              {headerText ? (
                <Text style={s.companyDetail}>{headerText}</Text>
              ) : (
                <>
                  <Text style={s.companyDetail}>Board Certified Anesthesiologist</Text>
                  <Text style={s.companyDetail}>mark@ettingerexpert.com</Text>
                </>
              )}
            </View>
          </View>
          <Text style={s.invoiceTitle}>INVOICE</Text>
        </View>

        {/* ----- Invoice Details + Bill To ----- */}
        <View style={s.detailsRow}>
          <View style={s.detailsBox}>
            <Text style={s.detailsBoxTitle}>Invoice Details</Text>
            <View style={s.detailLine}>
              <Text style={s.detailLabel}>Invoice #:</Text>
              <Text style={s.detailValue}>{invoice.invoice_number}</Text>
            </View>
            <View style={s.detailLine}>
              <Text style={s.detailLabel}>Invoice Date:</Text>
              <Text style={s.detailValue}>{fmtDate(invoice.invoice_date)}</Text>
            </View>
            <View style={s.detailLine}>
              <Text style={s.detailLabel}>Due Date:</Text>
              <Text style={s.detailValue}>{fmtDate(invoice.due_date)}</Text>
            </View>
            <View style={s.detailLine}>
              <Text style={s.detailLabel}>Terms:</Text>
              <Text style={s.detailValue}>{paymentTermsLabel}</Text>
            </View>
            {invoice.period_start && (
              <View style={s.detailLine}>
                <Text style={s.detailLabel}>Period:</Text>
                <Text style={s.detailValue}>
                  {fmtDate(invoice.period_start)} - {fmtDate(invoice.period_end)}
                </Text>
              </View>
            )}
          </View>

          <View style={s.detailsBox}>
            <Text style={s.detailsBoxTitle}>Bill To</Text>
            {billToName && <Text style={s.billToName}>{billToName}</Text>}
            {billToOrg && <Text style={s.billToOrg}>{billToOrg}</Text>}
            {billToAddress && <Text style={s.billToLine}>{billToAddress}</Text>}
            {billToEmail && <Text style={s.billToLine}>{billToEmail}</Text>}
            {!billToName && !billToOrg && (
              <Text style={s.billToLine}>No billing contact specified</Text>
            )}
          </View>
        </View>

        {/* ----- Case Reference ----- */}
        {(caseName || caseNumber) && (
          <View style={s.caseRef}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Text style={s.caseRefLabel}>Case:</Text>
              <Text style={s.caseRefValue}>{caseName}</Text>
            </View>
            {caseNumber && (
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Text style={s.caseRefLabel}>Case #:</Text>
                <Text style={s.caseRefValue}>{caseNumber}</Text>
              </View>
            )}
          </View>
        )}

        {/* ----- Line Items Table ----- */}
        <View>
          {/* Header */}
          <View style={s.tableHeader}>
            <Text style={[s.tableHeaderText, s.colDesc]}>Description</Text>
            <Text style={[s.tableHeaderText, s.colQty]}>Qty (hrs)</Text>
            <Text style={[s.tableHeaderText, s.colRate]}>Rate</Text>
            <Text style={[s.tableHeaderText, s.colAmount]}>Amount</Text>
          </View>

          {/* Rows */}
          {lineItems.map((item, idx) => (
            <View
              key={item.id}
              style={[s.tableRow, idx % 2 === 1 ? s.tableRowAlt : {}]}
            >
              <Text style={[s.tableCell, s.colDesc]}>{item.description}</Text>
              <Text style={[s.tableCell, s.colQty]}>{fmtQty(item.quantity)}</Text>
              <Text style={[s.tableCell, s.colRate]}>{fmtCurrency(item.unit_price)}</Text>
              <Text style={[s.tableCellBold, s.colAmount]}>{fmtCurrency(item.amount)}</Text>
            </View>
          ))}

          {lineItems.length === 0 && (
            <View style={s.tableRow}>
              <Text style={[s.tableCell, { width: '100%', textAlign: 'center', color: GRAY_500 }]}>
                No line items
              </Text>
            </View>
          )}
        </View>

        {/* ----- Totals ----- */}
        <View style={s.totalsContainer}>
          <View style={s.totalsBox}>
            <View style={[s.totalsRow, s.totalsRowBorder]}>
              <Text style={s.totalsLabel}>Subtotal</Text>
              <Text style={s.totalsValue}>{fmtCurrency(invoice.subtotal)}</Text>
            </View>

            {(invoice.tax_rate ?? 0) > 0 && (
              <View style={[s.totalsRow, s.totalsRowBorder]}>
                <Text style={s.totalsLabel}>Tax ({invoice.tax_rate}%)</Text>
                <Text style={s.totalsValue}>{fmtCurrency(invoice.tax_amount)}</Text>
              </View>
            )}

            {(invoice.discount_amount ?? 0) > 0 && (
              <View style={[s.totalsRow, s.totalsRowBorder]}>
                <Text style={s.totalsLabel}>
                  Discount{invoice.discount_description ? ` (${invoice.discount_description})` : ''}
                </Text>
                <Text style={s.totalsValue}>-{fmtCurrency(invoice.discount_amount)}</Text>
              </View>
            )}

            {invoice.amount_paid > 0 && (
              <View style={[s.totalsRow, s.totalsRowBorder]}>
                <Text style={s.totalsLabel}>Amount Paid</Text>
                <Text style={s.totalsValue}>-{fmtCurrency(invoice.amount_paid)}</Text>
              </View>
            )}

            <View style={s.totalsFinalRow}>
              <Text style={s.totalsFinalLabel}>
                {invoice.amount_paid > 0 ? 'Balance Due' : 'Total'}
              </Text>
              <Text style={s.totalsFinalValue}>
                {fmtCurrency(invoice.amount_paid > 0 ? invoice.balance_due : invoice.total_amount)}
              </Text>
            </View>
          </View>
        </View>

        {/* ----- Payment Instructions ----- */}
        {paymentInstructions && (
          <View style={s.paymentBox}>
            <Text style={s.paymentTitle}>Payment Instructions</Text>
            <Text style={s.paymentText}>{paymentInstructions}</Text>
          </View>
        )}

        {/* ----- Notes ----- */}
        {invoice.notes && (
          <View style={s.notesBox}>
            <Text style={s.notesTitle}>Notes</Text>
            <Text style={s.notesText}>{invoice.notes}</Text>
          </View>
        )}

        {/* ----- Footer ----- */}
        <View style={s.footer} fixed>
          <Text style={s.footerThank}>Thank you for your business</Text>
          <Text style={s.footerText}>
            {footerText ?? `${invoice.invoice_number} | Mark Ettinger, M.D. - Medical Expert Consulting`}
          </Text>
        </View>
      </Page>
    </Document>
  )
}
