import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { meetingId } = body

    if (!meetingId) {
      return NextResponse.json(
        { error: 'Missing required field: meetingId' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Fetch the meeting record
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', meetingId)
      .single()

    if (meetingError || !meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    if (!meeting.transcript_text) {
      return NextResponse.json(
        { error: 'No transcript available for this meeting. Transcribe the recording first.' },
        { status: 400 }
      )
    }

    // Call Claude API to summarize
    const systemPrompt = `You are an AI assistant for Dr. Mark Ettinger, a board-certified anesthesiologist who serves as an expert witness in medical malpractice cases. You are summarizing meeting transcripts related to his expert witness practice.

Produce a JSON response with exactly three fields:
- "summary": A concise 2-4 paragraph summary of the meeting, highlighting the most important points discussed. Focus on case-relevant information, decisions made, and next steps.
- "key_points": An array of 3-8 strings, each a key point or takeaway from the meeting.
- "action_items": An array of 0-10 strings, each an action item or follow-up task identified during the meeting. If no action items were discussed, use an empty array.

Respond ONLY with valid JSON. No markdown, no code fences, no explanation.`

    const userPrompt = `Summarize the following meeting transcript.

Meeting: ${meeting.meeting_name}
Type: ${meeting.meeting_type}
Date: ${meeting.meeting_date}

Transcript:
${meeting.transcript_text}`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2024-10-22',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        temperature: 0.3,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Claude API error:', errorText)
      return NextResponse.json(
        { error: `AI summarization failed (${response.status})` },
        { status: 500 }
      )
    }

    const result = await response.json()
    const responseText = result.content?.[0]?.text || ''

    // Parse the JSON response
    let parsed: { summary: string; key_points: string[]; action_items: string[] }
    try {
      // Strip potential markdown fences
      const cleaned = responseText
        .replace(/^```json\s*\n?/i, '')
        .replace(/\n?```\s*$/i, '')
        .trim()
      parsed = JSON.parse(cleaned)
    } catch {
      console.error('Failed to parse AI response as JSON:', responseText.substring(0, 500))
      // Fallback: use the raw text as summary
      parsed = {
        summary: responseText,
        key_points: [],
        action_items: [],
      }
    }

    // Update meeting record
    const { error: updateError } = await supabase
      .from('meetings')
      .update({
        ai_summary: parsed.summary,
        ai_key_points: parsed.key_points,
        ai_action_items: parsed.action_items,
        updated_at: new Date().toISOString(),
      })
      .eq('id', meetingId)

    if (updateError) {
      console.error('Failed to save summary:', updateError)
      return NextResponse.json(
        { error: 'Summarization succeeded but failed to save' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      meetingId,
      summary: parsed.summary,
      key_points: parsed.key_points,
      action_items: parsed.action_items,
    })
  } catch (error) {
    console.error('Summarization error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
