import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireAdminUser } from '@/lib/api-admin-auth'

function generateRetentionAgreementHTML(contract: {
  firm_name: string | null
  firm_contact_name: string | null
  firm_address: string | null
  firm_email: string | null
  firm_phone: string | null
  hourly_rate: number
  deposition_rate: number
  trial_rate: number
  retainer_amount: number
  cancellation_fee_hours: number
  payment_terms_days: number
  scope_description: string | null
  additional_terms: string | null
  title: string
  created_at: string
}) {
  const today = new Date(contract.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const firmName = contract.firm_name || '[Firm Name]'
  const firmContact = contract.firm_contact_name || '[Attorney Name]'
  const firmAddress = contract.firm_address || '[Firm Address]'
  const hourlyRate = contract.hourly_rate.toFixed(2)
  const depositionRate = contract.deposition_rate.toFixed(2)
  const trialRate = contract.trial_rate.toFixed(2)
  const retainer = contract.retainer_amount.toFixed(2)
  // A $0 retainer is a real engagement shape (bill-as-incurred), not a missing
  // value — asserting "a retainer of $0.00 is required" reads as an error to
  // opposing counsel, so state the actual arrangement instead.
  const retainerClause =
    contract.retainer_amount > 0
      ? `<p><strong>Prepayment:</strong> A retainer of <strong>$${retainer}</strong> is required prior to commencement of work. This retainer will be applied against future billings. The Expert reserves the right to request additional retainer replenishment.</p>`
      : `<p><strong>Prepayment:</strong> No advance retainer is required. Fees will be invoiced as incurred in accordance with the billing and payment terms set forth below.</p>`
  const cancelHours = contract.cancellation_fee_hours
  const paymentDays = contract.payment_terms_days

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,600;0,700;1,400&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'EB Garamond', Georgia, serif;
    color: #0E1F35;
    line-height: 1.7;
    font-size: 11pt;
    background: white;
  }
  .page { max-width: 8.5in; margin: 0 auto; padding: 0.75in 1in; }

  /* Header */
  .header {
    display: flex;
    align-items: center;
    gap: 24px;
    padding-bottom: 20px;
    border-bottom: 3px solid #DFC06A;
    margin-bottom: 30px;
  }
  .header-logo { width: 80px; height: 80px; }
  .header-text h1 {
    font-size: 20pt;
    font-weight: 700;
    color: #0E1F35;
    letter-spacing: 1px;
    margin: 0;
  }
  .header-text .subtitle {
    font-size: 12pt;
    color: #0E1F35;
    letter-spacing: 3px;
    text-transform: uppercase;
  }
  .header-text .specialty {
    font-size: 9pt;
    color: #8892A2;
    font-family: Arial, Helvetica, sans-serif;
    letter-spacing: 1px;
  }

  /* Document Title */
  .doc-title {
    text-align: center;
    margin: 30px 0 20px;
    padding: 16px 0;
    border-top: 1px solid #e5e7eb;
    border-bottom: 1px solid #e5e7eb;
  }
  .doc-title h2 {
    font-size: 16pt;
    font-weight: 700;
    color: #0E1F35;
    letter-spacing: 2px;
    text-transform: uppercase;
  }
  .doc-title .date {
    font-size: 10pt;
    color: #8892A2;
    margin-top: 4px;
    font-family: Arial, Helvetica, sans-serif;
  }

  /* Parties Box */
  .parties-box {
    background: #f8f9fa;
    border: 1px solid #e5e7eb;
    border-left: 4px solid #DFC06A;
    padding: 16px 20px;
    margin: 24px 0;
    display: flex;
    gap: 40px;
  }
  .party { flex: 1; }
  .party-label {
    font-size: 8pt;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: #DFC06A;
    font-weight: 700;
    font-family: Arial, Helvetica, sans-serif;
    margin-bottom: 4px;
  }
  .party-name { font-weight: 700; font-size: 12pt; }
  .party-detail { font-size: 10pt; color: #555; }

  /* Section */
  .section { margin: 20px 0; }
  .section-number {
    font-size: 9pt;
    font-weight: 700;
    color: #DFC06A;
    text-transform: uppercase;
    letter-spacing: 2px;
    font-family: Arial, Helvetica, sans-serif;
    margin-bottom: 4px;
  }
  .section h3 {
    font-size: 13pt;
    font-weight: 700;
    color: #0E1F35;
    margin-bottom: 8px;
  }
  .section p { margin-bottom: 8px; font-size: 11pt; }
  .section ul { margin-left: 20px; margin-bottom: 8px; }
  .section li { margin-bottom: 4px; font-size: 11pt; }

  /* Financial Terms Table */
  .terms-table {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0;
  }
  .terms-table th {
    background: #0E1F35;
    color: white;
    padding: 8px 12px;
    text-align: left;
    font-size: 9pt;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-family: Arial, Helvetica, sans-serif;
  }
  .terms-table td {
    padding: 8px 12px;
    border-bottom: 1px solid #e5e7eb;
    font-size: 11pt;
  }
  .terms-table tr:nth-child(even) td { background: #f8f9fa; }
  .terms-table .amount { font-weight: 700; color: #0E1F35; text-align: right; }

  /* Signature Block */
  .signatures {
    margin-top: 40px;
    display: flex;
    gap: 60px;
  }
  .sig-block { flex: 1; }
  .sig-line {
    border-top: 1px solid #0E1F35;
    margin-top: 50px;
    padding-top: 4px;
  }
  .sig-label { font-size: 10pt; color: #555; }
  .sig-name { font-weight: 700; font-size: 11pt; }
  .sig-date { margin-top: 30px; }

  /* Footer */
  .footer {
    margin-top: 40px;
    padding-top: 16px;
    border-top: 2px solid #DFC06A;
    text-align: center;
    font-size: 8pt;
    color: #8892A2;
    font-family: Arial, Helvetica, sans-serif;
    letter-spacing: 0.5px;
  }

  @media print {
    .page { padding: 0.5in 0.75in; }
    .page-break { page-break-before: always; }
  }
</style>
</head>
<body>
<div class="page">
  <!-- Header -->
  <div class="header">
    <img src="/logo-expert-witness-dark.svg" alt="Logo" class="header-logo" />
    <div class="header-text">
      <h1>MARK ETTINGER, MD</h1>
      <div class="subtitle">Expert Witness</div>
      <div class="specialty">Anesthesiology</div>
    </div>
  </div>

  <!-- Document Title -->
  <div class="doc-title">
    <h2>Expert Witness Retention Agreement</h2>
    <div class="date">${today}</div>
  </div>

  <!-- Parties -->
  <div class="parties-box">
    <div class="party">
      <div class="party-label">The Firm</div>
      <div class="party-name">${firmName}</div>
      <div class="party-detail">${firmContact}</div>
      <div class="party-detail">${firmAddress}</div>
    </div>
    <div class="party">
      <div class="party-label">The Expert</div>
      <div class="party-name">Mark Ettinger, M.D.</div>
      <div class="party-detail">Board-Certified Anesthesiologist</div>
      <div class="party-detail">Expert Witness Services</div>
    </div>
  </div>

  <p>This Expert Witness Retention Agreement ("Agreement") is entered into by and between <strong>${firmName}</strong> ("Firm") and <strong>Mark Ettinger, M.D.</strong> ("Expert") as of the date signed below.</p>

  <!-- Section 1 -->
  <div class="section">
    <div class="section-number">Section 1</div>
    <h3>Scope of Engagement</h3>
    <p>The Firm retains the Expert to provide professional services in connection with litigation matters, including but not limited to:</p>
    <ul>
      <li>Review and analysis of medical records and relevant case materials</li>
      <li>Preparation of written expert reports and opinions</li>
      <li>Deposition testimony</li>
      <li>Trial testimony</li>
      <li>Consultation and case strategy support</li>
    </ul>
    ${contract.scope_description ? `<p>${contract.scope_description}</p>` : ''}
    <p>The Expert serves as an independent contractor and not as an employee, agent, or partner of the Firm. The Expert will provide honest, objective opinions based on the applicable standard of care, regardless of the retaining party's position.</p>
  </div>

  <!-- Section 2 -->
  <div class="section">
    <div class="section-number">Section 2</div>
    <h3>Fees and Billing</h3>
    <table class="terms-table">
      <thead>
        <tr>
          <th>Service</th>
          <th>Rate</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Record Review &amp; Consultation</td>
          <td class="amount">$${hourlyRate}/hr</td>
          <td>Billed in 0.5-hour increments</td>
        </tr>
        <tr>
          <td>Report Preparation</td>
          <td class="amount">$${hourlyRate}/hr</td>
          <td>Billed in 0.5-hour increments</td>
        </tr>
        <tr>
          <td>Deposition Testimony</td>
          <td class="amount">$${depositionRate}/day</td>
          <td>Full day rate, minimum 6 hours</td>
        </tr>
        <tr>
          <td>Trial Testimony</td>
          <td class="amount">$${trialRate}/day</td>
          <td>Full day rate, includes preparation</td>
        </tr>
      </tbody>
    </table>
    ${retainerClause}
    <p><strong>Cancellation:</strong> Depositions or trial appearances cancelled with less than ${cancelHours} hours' notice will be billed at the full daily rate. Travel time, if applicable, is billed at the hourly rate.</p>
  </div>

  <!-- Section 3 -->
  <div class="section">
    <div class="section-number">Section 3</div>
    <h3>Billing and Payment Terms</h3>
    <p>Invoices will be issued on a monthly basis, with payment due within <strong>${paymentDays} days</strong> of receipt. Invoices will include detailed descriptions of services rendered, time spent, and applicable charges.</p>
    <p>Payment may be made by check, wire transfer, or electronic payment. The Firm is solely responsible for all fees incurred, regardless of case outcome or client reimbursement.</p>
  </div>

  <!-- Section 4 -->
  <div class="section">
    <div class="section-number">Section 4</div>
    <h3>Withdrawal from Engagement</h3>
    <p>The Expert reserves the right to withdraw from the engagement under the following circumstances:</p>
    <ul>
      <li>Non-payment of invoices beyond 60 days past due</li>
      <li>Inadequate time for preparation of testimony or reports</li>
      <li>Discovery of conflicts of interest</li>
      <li>Requests to provide testimony inconsistent with the Expert's professional opinions</li>
      <li>Legal or regulatory constraints preventing continued participation</li>
    </ul>
  </div>

  <!-- Section 5 -->
  <div class="section">
    <div class="section-number">Section 5</div>
    <h3>Confidentiality</h3>
    <p>The Expert agrees to maintain the confidentiality of all privileged and confidential information provided in connection with this engagement. Disclosure shall only be made as required by law, court order, or with the prior written consent of the Firm.</p>
  </div>

  <!-- Section 6 -->
  <div class="section">
    <div class="section-number">Section 6</div>
    <h3>No Guarantee of Outcome</h3>
    <p>The Expert's opinions are based on professional expertise and review of available materials. The Expert makes no guarantee regarding case outcome and will provide honest, objective opinions regardless of their impact on the Firm's case strategy.</p>
  </div>

  <!-- Section 7 -->
  <div class="section">
    <div class="section-number">Section 7</div>
    <h3>Term and Termination</h3>
    <p>This Agreement shall remain in effect until the conclusion of the matter for which the Expert is retained, or until terminated by either party upon ten (10) days' written notice. Termination shall not relieve the Firm of obligation to pay for services already rendered.</p>
  </div>

  <!-- Section 8 -->
  <div class="section">
    <div class="section-number">Section 8</div>
    <h3>Governing Law and Dispute Resolution</h3>
    <p>This Agreement shall be governed by the laws of the State of Texas. Any disputes arising under this Agreement shall be resolved in the courts of Denton County, Texas.</p>
  </div>

  <!-- Section 9 -->
  <div class="section">
    <div class="section-number">Section 9</div>
    <h3>Entire Agreement</h3>
    <p>This Agreement constitutes the entire understanding between the parties and supersedes all prior negotiations, representations, or agreements, whether written or oral.</p>
  </div>

  <!-- Section 10 -->
  <div class="section">
    <div class="section-number">Section 10</div>
    <h3>Counterparts and Electronic Signatures</h3>
    <p>This Agreement may be executed in counterparts, each of which shall constitute an original. Electronic signatures shall have the same legal effect as original signatures.</p>
  </div>

  <!-- Section 11 -->
  <div class="section">
    <div class="section-number">Section 11</div>
    <h3>Severability</h3>
    <p>If any provision of this Agreement is found to be unenforceable, the remaining provisions shall continue in full force and effect.</p>
  </div>

  ${contract.additional_terms ? `
  <div class="section">
    <div class="section-number">Additional Terms</div>
    <h3>Special Provisions</h3>
    <p>${contract.additional_terms}</p>
  </div>
  ` : ''}

  <!-- Signatures -->
  <div class="signatures">
    <div class="sig-block">
      <div class="sig-line">
        <div class="sig-name">${firmContact}</div>
        <div class="sig-label">Authorized Representative, ${firmName}</div>
      </div>
      <div class="sig-line sig-date">
        <div class="sig-label">Date</div>
      </div>
    </div>
    <div class="sig-block">
      <div class="sig-line">
        <div class="sig-name">Mark Ettinger, M.D.</div>
        <div class="sig-label">Expert Witness</div>
      </div>
      <div class="sig-line sig-date">
        <div class="sig-label">Date</div>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <p>MARK ETTINGER, MD &bull; Expert Witness &bull; Anesthesiology</p>
    <p>This document is confidential and intended solely for the named parties.</p>
  </div>
</div>
</body>
</html>`
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminUser(request)
    if (auth.error) return auth.error

    const { contractId } = await request.json()

    if (!contractId) {
      return NextResponse.json({ error: 'Missing contractId' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const { data: contract, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', contractId)
      .single()

    if (error || !contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    const html = generateRetentionAgreementHTML(contract)

    // Save rendered HTML to the contract
    await supabase
      .from('contracts')
      .update({ rendered_html: html })
      .eq('id', contractId)

    return NextResponse.json({ html })
  } catch (error) {
    console.error('Contract generation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
