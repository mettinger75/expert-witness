/**
 * Generates a signed PDF from report HTML using puppeteer-core + @sparticuz/chromium.
 * Embeds Dr. Ettinger's signature image at the end of the report.
 */

import fs from 'fs'
import path from 'path'

interface GeneratePdfOptions {
  reportHtml: string
  reportName: string
  includeSignature?: boolean
  signatureDate?: string
}

/**
 * Wrap raw report HTML in a full styled document for PDF rendering.
 * Uses the same Meridian design system styling as report-html-template.ts
 * but adapted for PDF (no Google Fonts import — uses local fallbacks).
 */
function wrapHtmlForPdf(html: string, reportName: string, signatureBlock: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${reportName}</title>
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
      padding: 0.75in 1in;
    }

    h1 {
      font-size: 16pt;
      font-weight: 700;
      color: #0E1F35;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.5rem;
    }

    h2 {
      font-size: 13pt;
      font-weight: 700;
      color: #0E1F35;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      margin-top: 1.5rem;
      margin-bottom: 0.75rem;
      border-bottom: 1px solid #C9A84C;
      padding-bottom: 0.25rem;
    }

    h3 {
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

    .signature-block {
      margin-top: 3rem;
      page-break-inside: avoid;
      border-top: 1px solid #d1d5db;
      padding-top: 1.5rem;
    }

    .signature-block p {
      margin-bottom: 0.25rem;
      text-align: left;
    }

    .signature-block img {
      height: 80px;
      margin: 0.5rem 0;
    }
  </style>
</head>
<body>
  <div class="report-container">
    ${html}
    ${signatureBlock}
  </div>
</body>
</html>`
}

/**
 * Generate a PDF buffer from report HTML.
 */
export async function generateReportPdf(options: GeneratePdfOptions): Promise<Buffer> {
  const {
    reportHtml,
    reportName,
    includeSignature = true,
    signatureDate,
  } = options

  // Build signature block
  let signatureBlock = ''
  if (includeSignature) {
    const date = signatureDate || new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    // Read signature image and convert to base64 data URI
    let signatureDataUri = ''
    try {
      const signaturePath = path.join(process.cwd(), 'public', 'ettinger-signature.png')
      const signatureBuffer = fs.readFileSync(signaturePath)
      signatureDataUri = `data:image/png;base64,${signatureBuffer.toString('base64')}`
    } catch (err) {
      console.warn('Could not read signature image:', err)
    }

    signatureBlock = `
      <div class="signature-block">
        <p>Respectfully submitted,</p>
        ${signatureDataUri ? `<img src="${signatureDataUri}" alt="Signature" />` : '<p style="margin: 1rem 0; font-style: italic;">[Signature]</p>'}
        <p><strong>Mark Ettinger, M.D.</strong></p>
        <p>Board Certified Anesthesiologist</p>
        <p>President, Meridian Anesthesia</p>
        <p>Date: ${date}</p>
      </div>
    `
  }

  const fullHtml = wrapHtmlForPdf(reportHtml, reportName, signatureBlock)

  // Use @sparticuz/chromium for serverless environment
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const chromium = require('@sparticuz/chromium')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const puppeteer = require('puppeteer-core')

  // Configure chromium
  chromium.setHeadlessMode = true
  chromium.setGraphicsMode = false

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  })

  try {
    const page = await browser.newPage()

    // Set content and wait for fonts/images to load
    await page.setContent(fullHtml, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    })

    // Generate PDF with letter-size dimensions
    const pdfBuffer = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: {
        top: '0.5in',
        bottom: '0.5in',
        left: '0in',
        right: '0in',
      },
      displayHeaderFooter: false,
    })

    return Buffer.from(pdfBuffer)
  } finally {
    await browser.close()
  }
}
