import { NextRequest, NextResponse } from 'next/server'
import mammoth from 'mammoth'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ]
    if (!validTypes.includes(file.type) && !file.name.endsWith('.docx')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a .docx file.' },
        { status: 400 }
      )
    }

    // Read file into buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Convert DOCX to HTML using mammoth
    const result = await mammoth.convertToHtml(
      { buffer },
      {
        styleMap: [
          "p[style-name='Title'] => h1.doc-title",
          "p[style-name='Heading 1'] => h1",
          "p[style-name='Heading 2'] => h2",
          "p[style-name='Heading 3'] => h3",
          "p[style-name='Subtitle'] => h2.doc-subtitle",
          "b => strong",
          "i => em",
          "u => u",
          "strike => s",
        ],
      }
    )

    // Post-process the HTML
    let html = result.value

    // Clean up empty paragraphs
    html = html.replace(/<p>\s*<\/p>/g, '')

    // Ensure tables have proper structure
    html = html.replace(/<table>/g, '<table>')

    // Collect any conversion warnings
    const warnings = result.messages
      .filter((m) => m.type === 'warning')
      .map((m) => m.message)

    return NextResponse.json({
      html,
      warnings,
      filename: file.name,
    })
  } catch (error) {
    console.error('DOCX import error:', error)
    return NextResponse.json(
      { error: 'Failed to import DOCX file' },
      { status: 500 }
    )
  }
}
