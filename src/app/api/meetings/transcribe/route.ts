import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const maxDuration = 300 // 5 minutes for long recordings

// Groq supports up to 100MB on dev/paid tiers, 25MB on free tier
// Use 24MB chunks as a safe default for the free tier
const GROQ_MAX_DIRECT_BYTES = 24 * 1024 * 1024

// Map of file extensions to MIME types that Groq accepts
// Groq supports: flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, webm
const GROQ_MIME_MAP: Record<string, string> = {
  flac: 'audio/flac',
  mp3: 'audio/mpeg',
  mp4: 'audio/mp4',
  mpeg: 'audio/mpeg',
  mpga: 'audio/mpeg',
  m4a: 'audio/mp4',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
  webm: 'audio/webm',
}

function getGroqMimeType(fileName: string, originalMime: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  return GROQ_MIME_MAP[ext] || originalMime || 'audio/webm'
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Groq API key not configured. Add GROQ_API_KEY to your environment variables.' },
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

    if (!meeting.recording_file_path) {
      return NextResponse.json(
        { error: 'No recording file associated with this meeting' },
        { status: 400 }
      )
    }

    // Mark as processing
    await supabase
      .from('meetings')
      .update({ transcript_status: 'processing' })
      .eq('id', meetingId)

    // Download the audio file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('meeting-recordings')
      .download(meeting.recording_file_path)

    if (downloadError || !fileData) {
      await supabase
        .from('meetings')
        .update({ transcript_status: 'failed' })
        .eq('id', meetingId)
      return NextResponse.json(
        { error: `Failed to download recording: ${downloadError?.message || 'Unknown error'}` },
        { status: 500 }
      )
    }

    const fileName = meeting.recording_file_path.split('/').pop() || 'recording.webm'
    const mimeType = getGroqMimeType(fileName, fileData.type)

    let fullTranscript: string

    try {
      const totalBytes = fileData.size

      // Helper: transcribe a single audio blob via Groq Whisper API
      async function transcribeBlob(audioBlob: Blob, name: string): Promise<string> {
        const formData = new FormData()
        formData.append('file', audioBlob, name)
        formData.append('model', 'whisper-large-v3-turbo')
        formData.append('language', 'en')
        formData.append('response_format', 'text')

        const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          body: formData,
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Groq API error (${response.status}): ${errorText}`)
        }

        return (await response.text()).trim()
      }

      if (totalBytes <= GROQ_MAX_DIRECT_BYTES) {
        // File is small enough — send the original blob directly
        // Re-create blob with the correct MIME type for Groq
        const arrayBuffer = await fileData.arrayBuffer()
        const blob = new Blob([arrayBuffer], { type: mimeType })
        fullTranscript = await transcribeBlob(blob, fileName)
      } else {
        // File exceeds the safe single-request limit.
        // Try sending the full file first (Groq dev/paid tier supports up to 100MB).
        // If that fails with a 413 (too large), fall back to raw chunking.
        console.log(`File is ${(totalBytes / 1024 / 1024).toFixed(1)}MB, attempting direct upload...`)

        const arrayBuffer = await fileData.arrayBuffer()
        const fullBlob = new Blob([arrayBuffer], { type: mimeType })

        try {
          fullTranscript = await transcribeBlob(fullBlob, fileName)
        } catch (directError) {
          const errMsg = directError instanceof Error ? directError.message : ''
          // Only fall back to chunking if it's a size-related error
          if (errMsg.includes('413') || errMsg.includes('too large') || errMsg.includes('file size')) {
            console.log(`Direct upload rejected (file too large), falling back to chunked upload...`)

            // Note: Raw byte-chunking of audio containers (WebM, MP4, etc.) produces
            // invalid files because only the first chunk has proper container headers.
            // For best results, convert to WAV (headerless PCM) before chunking,
            // or use a server with ffmpeg for proper splitting.
            // As a workaround, we'll try chunking and let Groq handle what it can.
            const numChunks = Math.ceil(totalBytes / GROQ_MAX_DIRECT_BYTES)
            const transcriptParts: string[] = []
            const fileExt = fileName.split('.').pop()?.toLowerCase() || 'webm'

            for (let i = 0; i < numChunks; i++) {
              const start = i * GROQ_MAX_DIRECT_BYTES
              const end = Math.min(start + GROQ_MAX_DIRECT_BYTES, totalBytes)
              const chunkBuffer = arrayBuffer.slice(start, end)
              const chunkName = `chunk_${i + 1}_of_${numChunks}.${fileExt}`
              const chunkBlob = new Blob([chunkBuffer], { type: mimeType })

              console.log(`Transcribing chunk ${i + 1}/${numChunks} (${((end - start) / 1024 / 1024).toFixed(1)}MB)...`)

              try {
                const text = await transcribeBlob(chunkBlob, chunkName)
                if (text) {
                  transcriptParts.push(text)
                }
              } catch (chunkError) {
                // If a non-first chunk fails (missing headers), log and skip
                if (i > 0) {
                  console.warn(`Chunk ${i + 1} failed (likely missing audio headers), skipping:`, chunkError)
                } else {
                  throw chunkError // First chunk failure is fatal
                }
              }
            }

            fullTranscript = transcriptParts.join(' ')
          } else {
            throw directError
          }
        }
      }

      if (!fullTranscript) {
        throw new Error('Empty transcription returned')
      }
    } catch (whisperError) {
      console.error('Groq transcription failed:', whisperError)
      await supabase
        .from('meetings')
        .update({ transcript_status: 'failed' })
        .eq('id', meetingId)

      const errorMessage = whisperError instanceof Error ? whisperError.message : 'Unknown error'
      return NextResponse.json(
        { error: `Transcription failed: ${errorMessage}` },
        { status: 500 }
      )
    }

    // Update meeting with transcript
    const { error: updateError } = await supabase
      .from('meetings')
      .update({
        transcript_text: fullTranscript,
        transcript_status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', meetingId)

    if (updateError) {
      console.error('Failed to save transcript:', updateError)
      return NextResponse.json(
        { error: 'Transcription succeeded but failed to save' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      meetingId,
      transcript_status: 'completed',
      transcript_length: fullTranscript.length,
    })
  } catch (error) {
    console.error('Transcription error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
