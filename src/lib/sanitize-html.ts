import sanitizeHtml from 'sanitize-html'

/**
 * Sanitize rich-text HTML before persisting it. Portal report edits accept
 * arbitrary HTML from a Tiptap editor and are later rendered with
 * dangerouslySetInnerHTML in both the portal and the dashboard — so unsanitized
 * input is a stored-XSS vector. This strips scripts, event-handler attributes,
 * javascript: URLs, and unsafe embeds while preserving the formatting Tiptap
 * produces (headings, lists, tables, marks, links, alignment).
 *
 * Uses `sanitize-html` (allowlist-only, no DOM emulation) rather than
 * isomorphic-dompurify/jsdom: jsdom's dependency chain (html-encoding-sniffer
 * -> @exodus/bytes) ships an ESM-only module that Next's production bundler
 * can't require(), which crashed every route importing this file at module
 * load — including GET handlers that never call sanitizeReportHtml at all.
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

// Same allowlist on every allowed tag. Data attributes and event handlers
// (onerror, onclick, ...) are excluded simply by not being listed here.
const ALLOWED_ATTR = ['href', 'target', 'rel', 'colspan', 'rowspan', 'class', 'style']

export function sanitizeReportHtml(dirty: string | null | undefined): string {
  if (!dirty) return ''
  return sanitizeHtml(dirty, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: { '*': ALLOWED_ATTR },
    // The editor's TextAlign extension is the only source of inline styles
    // today (src/components/editor/TiptapEditor.tsx) — keep this in lockstep
    // with that extension set rather than allowing arbitrary CSS.
    allowedStyles: { '*': { 'text-align': [/^(left|right|center|justify)$/] } },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    disallowedTagsMode: 'discard',
  })
}
