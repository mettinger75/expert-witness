// Notion API utilities for reading/writing page content

const NOTION_API_VERSION = '2022-06-28'
const NOTION_BASE_URL = 'https://api.notion.com/v1'

function getNotionHeaders() {
  const apiKey = process.env.NOTION_API_KEY
  if (!apiKey) throw new Error('NOTION_API_KEY environment variable is not configured')
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Notion-Version': NOTION_API_VERSION,
    'Content-Type': 'application/json',
  }
}

/**
 * Extract a Notion page ID from various URL formats:
 * - https://www.notion.so/Page-Title-abc123def456...
 * - https://www.notion.so/workspace/abc123def456...
 * - https://notion.site/Page-Title-abc123def456...
 * - abc123def456... (raw ID, with or without dashes)
 */
export function extractPageId(urlOrId: string): string {
  const trimmed = urlOrId.trim()

  // If it's already a UUID (with or without dashes), return it
  const uuidPattern = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i
  if (uuidPattern.test(trimmed)) {
    return formatAsUuid(trimmed.replace(/-/g, ''))
  }

  // Try to extract from URL - the page ID is the last 32 hex chars before any query string
  try {
    const url = new URL(trimmed)
    const path = url.pathname

    // Notion URLs have the page ID as the last 32 hex characters of the path segment
    // e.g., /Page-Title-abc123def456789012345678901234 or /workspace/abc123...
    const hexMatch = path.match(/([0-9a-f]{32})(?:[?#]|$)/i)
    if (hexMatch) {
      return formatAsUuid(hexMatch[1])
    }

    // Also try matching the last path segment if it ends with a 32-char hex string
    const segments = path.split('/').filter(Boolean)
    for (const segment of segments.reverse()) {
      const endMatch = segment.match(/([0-9a-f]{32})$/i)
      if (endMatch) {
        return formatAsUuid(endMatch[1])
      }
    }
  } catch {
    // Not a URL, try as raw hex
  }

  // Try as raw 32-char hex string
  const rawHex = trimmed.replace(/-/g, '')
  if (/^[0-9a-f]{32}$/i.test(rawHex)) {
    return formatAsUuid(rawHex)
  }

  throw new Error('Could not extract a valid Notion page ID from the provided URL')
}

function formatAsUuid(hex: string): string {
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

// ---- Block type → text conversion ----

interface NotionRichText {
  plain_text: string
}

interface NotionBlock {
  id: string
  type: string
  has_children: boolean
  [key: string]: unknown
}

function richTextToString(richTexts: NotionRichText[]): string {
  return richTexts.map(rt => rt.plain_text).join('')
}

function blockToText(block: NotionBlock): string {
  const type = block.type
  const data = block[type] as Record<string, unknown> | undefined
  if (!data) return ''

  const richText = data.rich_text as NotionRichText[] | undefined
  const text = richText ? richTextToString(richText) : ''

  switch (type) {
    case 'paragraph':
      return text
    case 'heading_1':
      return `# ${text}`
    case 'heading_2':
      return `## ${text}`
    case 'heading_3':
      return `### ${text}`
    case 'bulleted_list_item':
      return `• ${text}`
    case 'numbered_list_item':
      return `- ${text}`
    case 'to_do': {
      const checked = (data.checked as boolean) ? '[x]' : '[ ]'
      return `${checked} ${text}`
    }
    case 'toggle':
      return `▸ ${text}`
    case 'quote':
      return `> ${text}`
    case 'callout':
      return `📌 ${text}`
    case 'code':
      return `\`\`\`\n${text}\n\`\`\``
    case 'divider':
      return '---'
    case 'table_row': {
      const cells = data.cells as NotionRichText[][] | undefined
      if (cells) {
        return cells.map(cell => richTextToString(cell)).join(' | ')
      }
      return ''
    }
    case 'child_page':
      return `[Subpage: ${data.title as string}]`
    case 'child_database':
      return `[Database: ${data.title as string}]`
    case 'image':
    case 'video':
    case 'file':
    case 'pdf':
      return `[${type}: embedded content]`
    case 'bookmark':
      return `[Bookmark: ${(data.url as string) || ''}]`
    case 'embed':
      return `[Embed: ${(data.url as string) || ''}]`
    default:
      return text || ''
  }
}

/**
 * Fetch all content blocks from a Notion page, recursively handling children
 * and pagination. Returns plain text suitable for AI consumption.
 */
export async function fetchPageContent(pageId: string): Promise<string> {
  const headers = getNotionHeaders()
  const lines: string[] = []

  // First, get the page title
  const pageRes = await fetch(`${NOTION_BASE_URL}/pages/${pageId}`, { headers })
  if (!pageRes.ok) {
    const err = await pageRes.text()
    throw new Error(`Failed to fetch Notion page: ${pageRes.status} ${err}`)
  }
  const pageData = await pageRes.json()
  const titleProp = Object.values(pageData.properties || {}).find(
    (p: any) => p.type === 'title'
  ) as any
  if (titleProp?.title) {
    lines.push(`# ${richTextToString(titleProp.title)}`)
    lines.push('')
  }

  // Recursively fetch all blocks
  await fetchBlocks(pageId, headers, lines, 0)

  return lines.join('\n')
}

async function fetchBlocks(
  blockId: string,
  headers: Record<string, string>,
  lines: string[],
  depth: number
): Promise<void> {
  if (depth > 5) return // Prevent excessive nesting

  let cursor: string | undefined
  do {
    const url = new URL(`${NOTION_BASE_URL}/blocks/${blockId}/children`)
    url.searchParams.set('page_size', '100')
    if (cursor) url.searchParams.set('start_cursor', cursor)

    const res = await fetch(url.toString(), { headers })
    if (!res.ok) {
      // If we can't read children, just skip
      break
    }
    const data = await res.json()

    for (const block of (data.results || []) as NotionBlock[]) {
      const text = blockToText(block)
      if (text) {
        const indent = '  '.repeat(depth)
        lines.push(`${indent}${text}`)
      }

      // Recursively fetch children if present
      if (block.has_children) {
        await fetchBlocks(block.id, headers, lines, depth + 1)
      }
    }

    cursor = data.has_more ? data.next_cursor : undefined
  } while (cursor)
}

/**
 * Append AI analysis as formatted blocks to a Notion page.
 * Creates a divider, heading, and structured content sections.
 */
export async function appendAnalysisToPage(
  pageId: string,
  analysis: {
    brief_summary?: string | null
    key_issues?: string[] | null
    standard_of_care_issues?: string[] | string | null
    causation_notes?: string | null
    damages_summary?: string | null
    preliminary_opinion?: string | null
    opinion_summary?: string | null
  }
): Promise<void> {
  const headers = getNotionHeaders()
  const blocks: object[] = []

  // Divider
  blocks.push({ object: 'block', type: 'divider', divider: {} })

  // Heading
  blocks.push({
    object: 'block',
    type: 'heading_1',
    heading_1: {
      rich_text: [{ type: 'text', text: { content: 'AI Case Analysis' } }],
    },
  })

  // Timestamp
  blocks.push({
    object: 'block',
    type: 'callout',
    callout: {
      icon: { type: 'emoji', emoji: '🤖' },
      rich_text: [{ type: 'text', text: { content: `Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` } }],
    },
  })

  // Brief Summary
  if (analysis.brief_summary) {
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ type: 'text', text: { content: 'Case Summary' } }],
      },
    })
    blocks.push(...textToBlocks(analysis.brief_summary))
  }

  // Key Issues
  if (analysis.key_issues?.length) {
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ type: 'text', text: { content: 'Key Issues' } }],
      },
    })
    for (const issue of analysis.key_issues) {
      blocks.push({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [{ type: 'text', text: { content: issue } }],
        },
      })
    }
  }

  // Standard of Care Issues
  if (analysis.standard_of_care_issues) {
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ type: 'text', text: { content: 'Standard of Care Issues' } }],
      },
    })
    const issues = Array.isArray(analysis.standard_of_care_issues)
      ? analysis.standard_of_care_issues
      : [analysis.standard_of_care_issues]
    for (const issue of issues) {
      blocks.push({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [{ type: 'text', text: { content: issue } }],
        },
      })
    }
  }

  // Causation Notes
  if (analysis.causation_notes) {
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ type: 'text', text: { content: 'Causation Notes' } }],
      },
    })
    blocks.push(...textToBlocks(analysis.causation_notes))
  }

  // Damages Summary
  if (analysis.damages_summary) {
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ type: 'text', text: { content: 'Damages Summary' } }],
      },
    })
    blocks.push(...textToBlocks(analysis.damages_summary))
  }

  // Preliminary Opinion
  if (analysis.preliminary_opinion) {
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ type: 'text', text: { content: 'Preliminary Opinion' } }],
      },
    })
    blocks.push({
      object: 'block',
      type: 'callout',
      callout: {
        icon: { type: 'emoji', emoji: '⚖️' },
        rich_text: [{ type: 'text', text: { content: analysis.preliminary_opinion.replace(/_/g, ' ') } }],
      },
    })
  }

  // Opinion Summary
  if (analysis.opinion_summary) {
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ type: 'text', text: { content: 'Opinion Summary' } }],
      },
    })
    blocks.push(...textToBlocks(analysis.opinion_summary))
  }

  // Notion API limits to 100 blocks per request
  for (let i = 0; i < blocks.length; i += 100) {
    const chunk = blocks.slice(i, i + 100)
    const res = await fetch(`${NOTION_BASE_URL}/blocks/${pageId}/children`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ children: chunk }),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Failed to append blocks to Notion: ${res.status} ${err}`)
    }
  }
}

/**
 * Convert a long text string into paragraph blocks.
 * Notion limits rich_text content to 2000 characters per block.
 */
function textToBlocks(text: string): object[] {
  const paragraphs = text.split(/\n\n+/)
  const blocks: object[] = []

  for (const para of paragraphs) {
    const trimmed = para.trim()
    if (!trimmed) continue

    // Notion limits each rich_text item to 2000 chars
    if (trimmed.length <= 2000) {
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: trimmed } }],
        },
      })
    } else {
      // Split long text into 2000-char chunks
      for (let i = 0; i < trimmed.length; i += 2000) {
        blocks.push({
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: trimmed.slice(i, i + 2000) } }],
          },
        })
      }
    }
  }

  return blocks
}
