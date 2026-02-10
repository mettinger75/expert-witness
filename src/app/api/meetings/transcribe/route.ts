import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import OpenAI from 'openai'

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
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

    // Convert Blob to File for the OpenAI API
    const fileName = meeting.recording_file_path.split('/').pop() || 'recording.webm'
    const audioFile = new File([fileData], fileName, {
      type: fileData.type || 'audio/webm',
    })

    // Send to OpenAI Whisper
    const openai = new OpenAI({ apiKey })
    let transcription
    try {
      transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
      })
    } catch (whisperError) {
      console.error('Whisper transcription failed:', whisperError)
      await supabase
        .from('meetings')
        .update({ transcript_status: 'failed' })
        .eq('id', meetingId)
      return NextResponse.json(
        { error: 'Transcription failed. The audio file may be corrupt or in an unsupported format.' },
        { status: 500 }
      )
    }

    // Update meeting with transcript
    const { error: updateError } = await supabase
      .from('meetings')
      .update({
        transcript_text: transcription.text,
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
      transcript_length: transcription.text.length,
    })
  } catch (error) {
    console.error('Transcription error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
