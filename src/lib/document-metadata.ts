/**
 * Metadata hygiene for generated client-facing documents.
 *
 * Report PDFs transmitted to attorneys (portal downloads, admin exports)
 * must carry NO metadata at all; invoice PDFs carry Title + Author only;
 * DOCX exports get blank identity properties. Nothing the app generates may
 * leak a generator fingerprint — headless Chromium, react-pdf, html-to-docx,
 * ReportLab, office suites, or any AI-tooling annotation. Every new export
 * path must route its output through one of these scrubbers.
 */

import JSZip from 'jszip'
import { PDFDocument, PDFName, PDFHexString } from 'pdf-lib'

/** Author stamped on generated documents that carry an Author field (invoices). */
export const DOCUMENT_AUTHOR = 'Mark Ettinger, M.D.'

interface PdfMetadataOptions {
  title?: string
  author?: string
}

/**
 * Rewrite a generated PDF's metadata to at most Title + Author.
 * With no options, the document-info dictionary is removed outright and the
 * PDF carries no metadata at all (the requirement for report PDFs).
 * Any XMP metadata stream is always removed.
 */
export async function scrubPdfMetadata(
  pdf: Buffer | Uint8Array,
  options: PdfMetadataOptions = {}
): Promise<Buffer> {
  const doc = await PDFDocument.load(pdf, { updateMetadata: false })

  // Drop any XMP metadata stream attached by the generator
  doc.catalog.delete(PDFName.of('Metadata'))

  if (options.title || options.author) {
    const info = doc.context.obj({})
    if (options.title) {
      info.set(PDFName.of('Title'), PDFHexString.fromText(options.title))
    }
    if (options.author) {
      info.set(PDFName.of('Author'), PDFHexString.fromText(options.author))
    }
    doc.context.trailerInfo.Info = doc.context.register(info)
  } else {
    delete doc.context.trailerInfo.Info
  }

  return Buffer.from(await doc.save())
}

/** docProps/core.xml with every identity field blank — no creator, editor, title, or dates. */
const NEUTRAL_DOCX_CORE_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<cp:coreProperties' +
  ' xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"' +
  ' xmlns:dc="http://purl.org/dc/elements/1.1/"' +
  ' xmlns:dcterms="http://purl.org/dc/terms/"' +
  ' xmlns:dcmitype="http://purl.org/dc/dcmitype/"' +
  ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
  '<dc:title/><dc:subject/><dc:creator/><cp:keywords/><dc:description/>' +
  '<cp:lastModifiedBy/><cp:revision>1</cp:revision>' +
  '</cp:coreProperties>'

/**
 * Blank out a generated DOCX's document properties. html-to-docx falls back
 * to stamping its own name when creator/lastModifiedBy are empty strings, so
 * the docProps/core.xml part is replaced wholesale after generation.
 */
export async function scrubDocxMetadata(docx: Buffer | Uint8Array): Promise<Buffer> {
  const zip = await JSZip.loadAsync(docx)
  zip.file('docProps/core.xml', NEUTRAL_DOCX_CORE_XML)
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
}
