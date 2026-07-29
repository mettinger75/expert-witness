import React from 'react'
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Svg,
  Path,
} from '@react-pdf/renderer'
import type { InvoiceRow, InvoiceLineItemRow, ContactRow, InvoiceTemplateRow } from '@/types/database.types'

// ---------------------------------------------------------------------------
// Color palette (Meridian Design System)
// ---------------------------------------------------------------------------
const NAVY = '#0E1F35'
const NAVY_DARK = '#091525'
const GOLD = '#DFC06A'
const GRAY_50 = '#F9FAFB'
const GRAY_200 = '#E5E7EB'
const GRAY_500 = '#6B7280'
const GRAY_700 = '#374151'
const WHITE = '#FFFFFF'

// ---------------------------------------------------------------------------
// Compass Star Logo (inline SVG for react-pdf)
// ---------------------------------------------------------------------------
function CompassStar({ size = 36 }: { size?: number }) {
  return (
    <Svg viewBox="0 0 310 310" width={size} height={size}>
      <Path
        fill={WHITE}
        d="M306.8,157.5l-114.9-28.1,52.4-66.5-68.3,50.8L152.8,0l-28.5,113.7L58.6,60.3l49.9,67.6L0,151.8l107.6,27.5-52,66.1,66.6-49.7,24.6,114.4,27.6-113.2,69.1,55.1-52.9-70.6,116.3-24ZM285.3,157l-114.4-1.9,17.3-22.1,97.1,24ZM230.1,76.5l-80.8,77.7v-18.2l80.8-59.5ZM152.2,21l-2.2,112.1-22-16.9,24.2-95.1ZM16.5,152l111,2.2-16.6,22-94.4-24.2ZM70.1,231.2l79.1-76.2h-18.2l-58.5-79.7,76.7,79.7-.9,19.3-78.2,56.8ZM147.5,289.3l1.8-113.2,21.9,17-23.7,96.1ZM228,235.3l-77.7-80.2h17.6l60.1,80.2Z"
      />
    </Svg>
  )
}

function LogoMark({ size = 48 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, backgroundColor: GOLD, borderRadius: 8, justifyContent: 'center', alignItems: 'center', padding: 4 }}>
      <CompassStar size={size - 12} />
    </View>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    paddingTop: 0,
    paddingBottom: 60,
    paddingHorizontal: 0,
    color: GRAY_700,
  },

  // Navy top banner with logo
  topBanner: {
    backgroundColor: NAVY,
    paddingVertical: 24,
    paddingHorizontal: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  companyName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 20,
    color: WHITE,
    letterSpacing: 0.5,
  },
  companySubtitle: {
    fontSize: 11,
    color: GOLD,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 2,
    marginTop: 2,
  },
  companyDetail: {
    fontSize: 8.5,
    color: GRAY_500,
    lineHeight: 1.5,
    marginTop: 3,
  },
  invoiceTitleBox: {
    alignItems: 'flex-end',
  },
  invoiceTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 32,
    color: WHITE,
    letterSpacing: 3,
  },
  invoiceNumber: {
    fontSize: 10,
    color: GOLD,
    fontFamily: 'Helvetica-Bold',
    marginTop: 4,
  },

  // Gold accent bar
  goldBar: {
    height: 3,
    backgroundColor: GOLD,
  },

  // Body content
  body: {
    paddingHorizontal: 50,
    paddingTop: 24,
  },

  // Invoice details boxes
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  detailsBox: {
    backgroundColor: GRAY_50,
    borderWidth: 1,
    borderColor: GRAY_200,
    borderRadius: 6,
    padding: 16,
    width: '48%',
  },
  detailsBoxTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: NAVY,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: GOLD,
    paddingBottom: 4,
  },
  detailLine: {
    flexDirection: 'row',
    marginBottom: 4,
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
    fontSize: 11,
    color: NAVY_DARK,
    marginBottom: 3,
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

  // Case reference bar
  caseRef: {
    backgroundColor: NAVY,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  caseRefLabel: {
    fontSize: 9,
    color: GOLD,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.5,
  },
  caseRefValue: {
    fontSize: 9,
    color: WHITE,
  },

  // Table
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: NAVY,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  tableHeaderText: {
    color: WHITE,
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 9,
    paddingHorizontal: 12,
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
  colQty: { width: '15%', textAlign: 'right' as const },
  colRate: { width: '17%', textAlign: 'right' as const },
  colAmount: { width: '18%', textAlign: 'right' as const },

  // Totals
  totalsContainer: {
    marginTop: 4,
    alignItems: 'flex-end',
  },
  totalsBox: {
    width: 260,
    borderWidth: 1,
    borderColor: GRAY_200,
    borderRadius: 6,
    overflow: 'hidden',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    paddingHorizontal: 16,
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: NAVY,
  },
  totalsFinalLabel: {
    fontSize: 12,
    color: GOLD,
    fontFamily: 'Helvetica-Bold',
  },
  totalsFinalValue: {
    fontSize: 12,
    color: WHITE,
    fontFamily: 'Helvetica-Bold',
  },

  // Payment instructions
  paymentBox: {
    marginTop: 24,
    backgroundColor: GRAY_50,
    borderWidth: 1,
    borderColor: GRAY_200,
    borderRadius: 6,
    padding: 16,
  },
  paymentTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: NAVY,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: GOLD,
    paddingBottom: 4,
  },
  paymentText: {
    fontSize: 9,
    color: GRAY_700,
    lineHeight: 1.6,
  },

  // Notes
  notesBox: {
    marginTop: 14,
    padding: 16,
  },
  notesTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: NAVY,
    textTransform: 'uppercase',
    letterSpacing: 1,
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
    bottom: 20,
    left: 0,
    right: 0,
    paddingHorizontal: 50,
  },
  footerBar: {
    height: 2,
    backgroundColor: GOLD,
    marginBottom: 10,
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 8,
    color: GRAY_500,
  },
  footerThank: {
    fontSize: 8,
    color: GOLD,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.5,
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
    (a, b) => (a.line_number ?? 0) - (b.line_number ?? 0)
  )

  const paymentInstructions =
    invoice.payment_instructions ??
    template?.payment_instructions ??
    'Please make checks payable and mail to:\nMark Ettinger, MD, PA\n125 Country View Dr., Suite 120A\nRoanoke, TX 76262\n\nPayment is due upon receipt unless otherwise specified.'

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
        {/* ----- Navy Header Banner with Logo ----- */}
        <View style={s.topBanner}>
          <View style={s.logoSection}>
            <LogoMark size={52} />
            <View>
              <Text style={s.companyName}>Mark Ettinger, M.D.</Text>
              <Text style={s.companySubtitle}>EXPERT WITNESS</Text>
              {headerText ? (
                <Text style={s.companyDetail}>{headerText}</Text>
              ) : (
                <Text style={s.companyDetail}>Board Certified Anesthesiologist</Text>
              )}
            </View>
          </View>
          <View style={s.invoiceTitleBox}>
            <Text style={s.invoiceTitle}>INVOICE</Text>
            <Text style={s.invoiceNumber}>{invoice.invoice_number}</Text>
          </View>
        </View>

        {/* ----- Gold Accent Bar ----- */}
        <View style={s.goldBar} />

        {/* ----- Body Content ----- */}
        <View style={s.body}>
          {/* ----- Invoice Details + Bill To ----- */}
          <View style={s.detailsRow}>
            <View style={s.detailsBox}>
              <Text style={s.detailsBoxTitle}>Invoice Details</Text>
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
                  {invoice.amount_paid > 0 ? 'BALANCE DUE' : 'TOTAL'}
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
        </View>

        {/* ----- Footer ----- */}
        <View style={s.footer} fixed>
          <View style={s.footerBar} />
          <View style={s.footerContent}>
            <Text style={s.footerThank}>Thank you for your business</Text>
            <Text style={s.footerText}>
              {footerText ?? `${invoice.invoice_number} | Mark Ettinger, M.D. - Medical Expert Consulting`}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
