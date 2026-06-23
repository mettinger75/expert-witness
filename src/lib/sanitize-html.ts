import DOMPurify from 'isomorphic-dompurify'

/**
 * Sanitize rich-text HTML before persisting it. Portal report edits accept
 * arbitrary HTML from a Tiptap editor and are later rendered with
 * dangerouslySetInnerHTML in both the portal and the dashboard — so unsanitized
 * input is a stored-XSS vector. This strips scripts, event-handler attributes,
 * javascript: URLs, and unsafe embeds while preserving the formatting Tiptap
 * produces (headings, lists, tables, marks, links, alignment).
 */

// Tiptap/StarterKit + tables + alignment output.
const ALLOWED_TAGS = [
  'p', 'br', 'hr', 'blockquote', 'pre', 'code', 'div', 'span',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'mark', 'sub', 'sup',
  'a',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'colgroup', 'col',
]

// `style` is allowed but DOMPurify sanitizes its CSS (drops expression(),
// url(javascript:), etc.), which keeps Tiptap's text-align without the risk.
const ALLOWED_ATTR = ['href', 'target', 'rel', 'colspan', 'rowspan', 'class', 'style']

export function sanitizeReportHtml(dirty: string | null | undefined): string {
  if (!dirty) return ''
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Never allow these even if they slip past the tag allowlist.
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'link'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'srcset'],
    ALLOW_DATA_ATTR: false,
  })
}
