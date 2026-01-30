import { NextRequest, NextResponse } from 'next/server'
import { AI_CONFIG, SYSTEM_PROMPTS, assembleContext } from '@/lib/ai'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 })
    }

    const body = await request.json()
    const {
      messages,
      conversationType = 'general_question',
      caseId,
      modelTier = 'standard',
      maxTokens = AI_CONFIG.defaultParams.max_tokens,
      temperature = AI_CONFIG.defaultParams.temperature,
    } = body

    // Select system prompt based on conversation type
    const systemPromptMap: Record<string, string> = {
      case_analysis: SYSTEM_PROMPTS.case_summary,
      document_review: SYSTEM_PROMPTS.document_analysis,
      report_drafting: SYSTEM_PROMPTS.report_generation,
      research_assistant: SYSTEM_PROMPTS.research_assistant,
      deposition_prep: SYSTEM_PROMPTS.deposition_prep,
      general_question: SYSTEM_PROMPTS.research_assistant,
      medical_research: SYSTEM_PROMPTS.research_assistant,
    }

    let systemPrompt = systemPromptMap[conversationType] || SYSTEM_PROMPTS.research_assistant

    // If case-specific, assemble context
    if (caseId) {
      const supabase = getSupabaseAdmin()
      const { data: caseData } = await supabase
        .from('cases')
        .select('*')
        .eq('id', caseId)
        .single()

      if (caseData) {
        const context = assembleContext(caseData)
        systemPrompt = `${systemPrompt}\n\n${context}`
      }
    }

    // Select model
    const modelKey = modelTier as keyof typeof AI_CONFIG.models
    const model = AI_CONFIG.models[modelKey] || AI_CONFIG.models.standard

    // Call Anthropic API with streaming
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: messages.map((m: { role: string; content: string }) => ({
          role: m.role,
          content: m.content,
        })),
        stream: true,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { error: `Anthropic API error: ${response.status} - ${errorText}` },
        { status: response.status }
      )
    }

    // Stream the response back
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader()
        if (!reader) {
          controller.close()
          return
        }

        const decoder = new TextDecoder()
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            const chunk = decoder.decode(value, { stream: true })
            controller.enqueue(new TextEncoder().encode(chunk))
          }
        } catch (error) {
          console.error('Stream error:', error)
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('AI chat error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
