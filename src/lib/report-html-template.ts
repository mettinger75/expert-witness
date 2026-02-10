/**
 * Wraps report sections into a full styled HTML document for export/preview.
 * Reuses the Meridian design system (navy/gold) with EB Garamond serif font.
 */

interface ReportSection {
  title: string
  content: string
}

interface WrapReportOptions {
  header: string
  sections: ReportSection[]
  footer: string
  reportName?: string
}

export function wrapReportHtml({ header, sections, footer, reportName }: WrapReportOptions): string {
  const sectionsHtml = sections
    .map(
      (s) => `
      <div class="report-section">
        <h2>${s.title}</h2>
        ${s.content}
      </div>`
    )
    .join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${reportName || 'Expert Report'}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'EB Garamond', Georgia, 'Times New Roman', serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #1a1a1a;
      background: white;
    }

    .report-container {
      max-width: 8.5in;
      margin: 0 auto;
      padding: 1in;
    }

    /* Header */
    .report-header {
      text-align: center;
      border-bottom: 2px solid #0E1F35;
      padding-bottom: 1rem;
      margin-bottom: 2rem;
    }

    .report-header h1 {
      font-size: 16pt;
      font-weight: 700;
      color: #0E1F35;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.5rem;
    }

    .report-header .meta {
      font-size: 11pt;
      color: #4a5568;
      white-space: pre-line;
    }

    /* Sections */
    .report-section {
      margin-bottom: 1.5rem;
    }

    .report-section h2 {
      font-size: 13pt;
      font-weight: 700;
      color: #0E1F35;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      margin-bottom: 0.75rem;
      border-bottom: 1px solid #C9A84C;
      padding-bottom: 0.25rem;
    }

    .report-section h3 {
      font-size: 12pt;
      font-weight: 600;
      color: #0E1F35;
      margin-top: 1rem;
      margin-bottom: 0.5rem;
    }

    p { margin-bottom: 0.75rem; text-align: justify; }
    strong { font-weight: 700; }
    em { font-style: italic; }
    u { text-decoration: underline; }

    ul, ol { padding-left: 1.5rem; margin-bottom: 0.75rem; }
    li { margin-bottom: 0.25rem; }

    blockquote {
      border-left: 3px solid #C9A84C;
      padding-left: 1rem;
      margin: 0.75rem 0;
      font-style: italic;
      color: #4a5568;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;
      font-size: 10pt;
    }

    th {
      background-color: #0E1F35;
      color: white;
      font-weight: 600;
      text-align: left;
      padding: 0.4rem 0.6rem;
      border: 1px solid #1C3555;
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    td {
      padding: 0.4rem 0.6rem;
      border: 1px solid #d1d5db;
      vertical-align: top;
    }

    tr:nth-child(even) td { background-color: #f9fafb; }

    hr {
      border: none;
      border-top: 1px solid #d1d5db;
      margin: 1.5rem 0;
    }

    /* Footer */
    .report-footer {
      border-top: 2px solid #0E1F35;
      padding-top: 1rem;
      margin-top: 2rem;
      font-size: 11pt;
      white-space: pre-line;
    }

    .signature-line {
      margin-top: 2rem;
      font-style: italic;
    }

    /* Print */
    @media print {
      body { background: white; }
      .report-container { padding: 0.5in; max-width: none; }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <div class="report-header">
      <h1>Medical Expert Report</h1>
      <div class="meta">${header}</div>
    </div>

    ${sectionsHtml}

    <div class="report-footer">
      ${footer}
    </div>
  </div>
</body>
</html>`
}
