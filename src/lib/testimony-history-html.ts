import type { TestimonyHistoryRow } from '@/services/testimonyHistory.service'

function formatDate(d: string): string {
  const dt = new Date(d + 'T00:00:00')
  return dt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function escapeHtml(s: string | null | undefined): string {
  if (!s) return ''
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function typeLabel(t: string): string {
  switch (t) {
    case 'deposition': return 'Deposition'
    case 'trial': return 'Trial'
    case 'hearing': return 'Hearing'
    case 'arbitration': return 'Arbitration'
    default: return t
  }
}

function sideLabel(s: string): string {
  switch (s) {
    case 'plaintiff': return 'Plaintiff'
    case 'defense': return 'Defense'
    default: return '—'
  }
}

export interface TestimonyListOptions {
  yearsBack?: number
  generatedFor?: string
}

export function generateTestimonyHistoryHtml(
  entries: TestimonyHistoryRow[],
  options: TestimonyListOptions = {}
): string {
  const yearsBack = options.yearsBack ?? 4
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const cutoffYear = new Date().getFullYear() - yearsBack

  const rows = entries
    .map(
      (e) => `
        <tr>
          <td>${formatDate(e.testimony_date)}</td>
          <td>
            <div class="caption">${escapeHtml(e.case_caption)}</div>
            ${e.case_number ? `<div class="case-no">No. ${escapeHtml(e.case_number)}</div>` : ''}
          </td>
          <td>${escapeHtml(e.court_venue) || '—'}</td>
          <td><span class="type type-${e.testimony_type}">${typeLabel(e.testimony_type)}</span></td>
          <td>${sideLabel(e.side_retained_by)}</td>
          <td>
            ${e.retaining_attorney ? `<div>${escapeHtml(e.retaining_attorney)}</div>` : ''}
            ${e.retaining_firm ? `<div class="firm">${escapeHtml(e.retaining_firm)}</div>` : '—'}
          </td>
        </tr>`
    )
    .join('')

  const emptyState = entries.length === 0
    ? `<tr><td colspan="6" class="empty">No prior testimony recorded for the ${yearsBack}-year period.</td></tr>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Testimony History — Mark Ettinger, M.D.</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'EB Garamond', Georgia, serif;
    color: #0E1F35;
    line-height: 1.55;
    font-size: 10.5pt;
    background: white;
  }
  .page { max-width: 8.5in; margin: 0 auto; padding: 0.5in 0.75in; }

  .header {
    display: flex;
    align-items: center;
    gap: 18px;
    padding-bottom: 16px;
    border-bottom: 3px solid #DFC06A;
    margin-bottom: 20px;
  }
  .header-text h1 {
    font-size: 18pt;
    font-weight: 700;
    color: #0E1F35;
    letter-spacing: 1px;
  }
  .header-text .subtitle {
    font-size: 11pt;
    color: #0E1F35;
    letter-spacing: 2.5px;
    text-transform: uppercase;
  }
  .header-text .specialty {
    font-size: 8.5pt;
    color: #8892A2;
    font-family: Arial, sans-serif;
    letter-spacing: 1px;
  }

  .doc-title {
    text-align: center;
    margin: 18px 0 14px;
    padding: 12px 0;
    border-top: 1px solid #e5e7eb;
    border-bottom: 1px solid #e5e7eb;
  }
  .doc-title h2 {
    font-size: 14pt;
    font-weight: 700;
    color: #0E1F35;
    letter-spacing: 1.5px;
    text-transform: uppercase;
  }
  .doc-title .meta {
    font-size: 9pt;
    color: #8892A2;
    margin-top: 4px;
    font-family: Arial, sans-serif;
  }

  .preamble {
    font-size: 10pt;
    margin: 14px 0 18px;
    color: #2c3e50;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 8px 0;
    font-size: 9.5pt;
  }
  thead th {
    background: #0E1F35;
    color: white;
    padding: 8px 10px;
    text-align: left;
    font-size: 8.5pt;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    font-family: Arial, sans-serif;
    font-weight: 700;
  }
  tbody td {
    padding: 8px 10px;
    border-bottom: 1px solid #e5e7eb;
    vertical-align: top;
  }
  tbody tr:nth-child(even) td { background: #f8f9fa; }

  .caption { font-weight: 600; }
  .case-no { font-size: 8.5pt; color: #8892A2; font-family: Arial, sans-serif; margin-top: 2px; }
  .firm { font-size: 8.5pt; color: #8892A2; }

  .type {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 8pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-family: Arial, sans-serif;
  }
  .type-deposition { background: #e8edf3; color: #0E1F35; }
  .type-trial { background: #DFC06A; color: #0E1F35; }
  .type-hearing { background: #f3e8d4; color: #0E1F35; }
  .type-arbitration { background: #e8f0f3; color: #0E1F35; }

  .empty {
    text-align: center;
    padding: 40px;
    color: #8892A2;
    font-style: italic;
  }

  .footer {
    margin-top: 28px;
    padding-top: 14px;
    border-top: 2px solid #DFC06A;
    font-size: 8pt;
    color: #8892A2;
    font-family: Arial, sans-serif;
    letter-spacing: 0.4px;
  }
  .footer p { margin-bottom: 4px; }
  .footer .center { text-align: center; }

  .actions {
    text-align: center;
    margin-bottom: 16px;
  }
  .actions button {
    background: #0E1F35;
    color: white;
    border: 0;
    padding: 10px 24px;
    font-family: Arial, sans-serif;
    font-size: 11pt;
    border-radius: 6px;
    cursor: pointer;
    letter-spacing: 0.5px;
  }
  .actions button:hover { background: #DFC06A; color: #0E1F35; }

  @media print {
    .page { padding: 0.4in 0.6in; }
    .actions { display: none; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="actions">
    <button onclick="window.print()">Print / Save as PDF</button>
  </div>

  <div class="header">
    <div class="header-text">
      <h1>MARK ETTINGER, M.D.</h1>
      <div class="subtitle">Expert Witness</div>
      <div class="specialty">Anesthesiology</div>
    </div>
  </div>

  <div class="doc-title">
    <h2>Testimony History</h2>
    <div class="meta">Prior deposition and trial testimony &middot; ${yearsBack}-year period (${cutoffYear}–${new Date().getFullYear()}) &middot; Generated ${today}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 11%;">Date</th>
        <th style="width: 28%;">Case Caption</th>
        <th style="width: 20%;">Court / Venue</th>
        <th style="width: 11%;">Type</th>
        <th style="width: 10%;">Side</th>
        <th style="width: 20%;">Retained By</th>
      </tr>
    </thead>
    <tbody>
      ${rows}${emptyState}
    </tbody>
  </table>

  <div class="footer">
    <p class="center"><strong>MARK ETTINGER, M.D.</strong> &nbsp;&middot;&nbsp; Expert Witness &nbsp;&middot;&nbsp; Anesthesiology</p>
    <p class="center">${entries.length} testimony ${entries.length === 1 ? 'entry' : 'entries'} listed &middot; Generated ${today}</p>
  </div>
</div>
</body>
</html>`
}

export function generateTestimonyHistoryCsv(entries: TestimonyHistoryRow[]): string {
  const headers = [
    'Date',
    'Case Caption',
    'Case Number',
    'Court/Venue',
    'Jurisdiction',
    'Type',
    'Side Retained By',
    'Retaining Attorney',
    'Retaining Firm',
  ]

  function csvField(s: string | null | undefined): string {
    if (s === null || s === undefined) return ''
    const str = String(s)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const rows = entries.map((e) =>
    [
      e.testimony_date,
      e.case_caption,
      e.case_number,
      e.court_venue,
      e.jurisdiction,
      typeLabel(e.testimony_type),
      sideLabel(e.side_retained_by),
      e.retaining_attorney,
      e.retaining_firm,
    ]
      .map(csvField)
      .join(',')
  )

  return [headers.join(','), ...rows].join('\n')
}
