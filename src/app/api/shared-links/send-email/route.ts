import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { emailSendDefaults, EMAIL_COLORS } from '@/lib/email-config'
import { wrapEmail, htmlToText } from '@/lib/email-templates'
import { requireAdminUser } from '@/lib/api-admin-auth'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminUser(request)
    if (auth.error) return auth.error

    const resend = new Resend(process.env.RESEND_API_KEY)

    const {
      recipientEmail,
      recipientName,
      shareUrl,
      entityType,
      entityName,
      permission,
      senderMessage,
      invoiceAmount,
      invoiceDueDate,
      preview,
    } = await request.json()

    if (!recipientEmail || !shareUrl) {
      return NextResponse.json(
        { error: 'Missing recipientEmail or shareUrl' },
        { status: 400 }
      )
    }

    const isInvoice = entityType === 'invoice'
    const isReport = entityType === 'report'
    const entityLabel = isInvoice ? 'Invoice' : isReport ? 'Report' : 'Contract'
    const greeting = recipientName ? `Dear ${recipientName},` : 'Dear Counsel,'

    // Build subject
    let subject: string
    if (isInvoice) {
      subject = `Invoice ${entityName || ''} — Mark Ettinger, M.D.`
    } else if (permission === 'sign') {
      subject = `Signature Requested: ${entityName || entityLabel}`
    } else {
      subject = `${entityLabel} Shared: ${entityName || 'Document'}`
    }

    // Build body content based on entity type
    let bodyHtml: string
    let badge: string
    let heading: string
    let ctaLabel: string
    let footerNote: string | undefined

    if (isInvoice) {
      badge = 'Invoice'
      heading = `Invoice ${entityName || ''}`
      ctaLabel = 'View Invoice & Pay'

      // Invoice details table
      const c = EMAIL_COLORS
      const detailRows = [
        entityName ? `<tr><td style="padding: 8px 0; font-size: 13px; color: ${c.textSecondary}; width: 140px;">Invoice #</td><td style="padding: 8px 0; font-size: 13px; color: ${c.navy}; font-weight: 600;">${entityName}</td></tr>` : '',
        invoiceAmount ? `<tr><td style="padding: 8px 0; font-size: 13px; color: ${c.textSecondary}; width: 140px;">Amount Due</td><td style="padding: 8px 0; font-size: 15px; color: ${c.navy}; font-weight: 700;">${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(invoiceAmount)}</td></tr>` : '',
        invoiceDueDate ? `<tr><td style="padding: 8px 0; font-size: 13px; color: ${c.textSecondary}; width: 140px;">Due Date</td><td style="padding: 8px 0; font-size: 13px; color: ${c.navy}; font-weight: 500;">${new Date(invoiceDueDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</td></tr>` : '',
      ].filter(Boolean).join('')

      bodyHtml = `
        <p>${greeting}</p>
        <p>An invoice has been issued for expert witness services rendered. Please review the details below.</p>

        <table cellpadding="0" cellspacing="0" style="border-collapse: collapse; width: 100%; margin: 16px 0; border: 1px solid ${c.border}; border-radius: 6px; overflow: hidden;">
          <tr><td style="background: ${c.navyDark}; padding: 12px 16px;"><p style="font-family: Georgia, serif; font-size: 14px; color: ${c.gold}; letter-spacing: 1px; text-transform: uppercase; margin: 0;">Invoice Details</p></td></tr>
          <tr><td style="padding: 8px 16px;"><table cellpadding="0" cellspacing="0" style="border-collapse: collapse; width: 100%;">${detailRows}</table></td></tr>
        </table>

        ${senderMessage ? `<p>${senderMessage}</p>` : ''}

        <p>Click below to view the full invoice. You can download a PDF or view line item details.</p>

        <div style="background: #F8F9FB; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="font-size: 13px; font-weight: 700; color: ${c.navy}; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.5px;">Payment Options</p>
          <p style="font-size: 13px; color: #333; margin: 0 0 4px; line-height: 1.6;">
            <strong>Check:</strong> Make payable and mail to:<br>
            Mark Ettinger, MD, PA<br>
            125 Country View Dr., Suite 120A<br>
            Roanoke, TX 76262
          </p>
          <p style="font-size: 13px; color: #333; margin: 8px 0 0; line-height: 1.6;">
            <strong>Online Payment:</strong> Click the button above to pay securely via credit card or ACH bank transfer.
          </p>
        </div>
      `
      footerNote = 'This secure link provides access to the invoice without requiring a login. Please do not share this link.'
    } else {
      // Report or Contract
      const permissionLabel = permission === 'edit' ? 'review and edit' : permission === 'sign' ? 'review and sign' : 'review'
      badge = permission === 'sign' ? 'Signature Required' : entityLabel
      heading = entityName || entityLabel
      ctaLabel = permission === 'sign' ? 'Review & Sign' : permission === 'edit' ? 'Review & Edit' : 'View Document'

      bodyHtml = `
        <p>${greeting}</p>
        <p>You have been invited to ${permissionLabel} the following ${entityLabel.toLowerCase()}:</p>

        <div style="background: #F8F9FB; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="font-size: 15px; font-weight: 600; color: ${EMAIL_COLORS.navy}; margin: 0;">${entityName || entityLabel}</p>
        </div>

        ${senderMessage ? `<p>${senderMessage}</p>` : ''}
      `
      footerNote = 'This secure link provides access without requiring a login. Please do not share this link.'
    }

    const html = wrapEmail({
      subject,
      previewText: isInvoice
        ? `Invoice ${entityName} from Mark Ettinger, M.D.${invoiceAmount ? ` — ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(invoiceAmount)}` : ''}`
        : `${entityLabel} shared: ${entityName}`,
      badge,
      badgeColor: EMAIL_COLORS.gold,
      heading,
      bodyHtml,
      ctaLabel,
      ctaUrl: shareUrl,
      footerNote,
    })

    // Dry-run: return the exact rendered email without sending (used for approval previews)
    if (preview) {
      return NextResponse.json({ preview: true, to: recipientEmail, subject, html })
    }

    const { data, error } = await resend.emails.send({
      ...emailSendDefaults,
      to: [recipientEmail],
      subject,
      html,
      text: htmlToText(html),
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json(
        { error: 'Failed to send email', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, emailId: data?.id })
  } catch (error) {
    console.error('Email send error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
