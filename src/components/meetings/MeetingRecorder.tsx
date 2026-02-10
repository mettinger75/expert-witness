'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, Square, Pause, Play } from 'lucide-react'

interface MeetingRecorderProps {
  caseId: string
  onRecordingComplete: (file: File, duration: number) => void
}

type RecorderState = 'idle' | 'recording' | 'paused' | 'stopped'

export function MeetingRecorder({ caseId, onRecordingComplete }: MeetingRecorderProps) {
  const [state, setState] = useState<RecorderState>('idle')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [audioLevels, setAudioLevels] = useState<number[]>([0, 0, 0, 0, 0])

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const animationRef = useRef<number | null>(null)

  // Format seconds as MM:SS
  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // Visualize audio levels
  const updateLevels = useCallback(() => {
    if (!analyserRef.current) return
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(dataArray)

    // Sample 5 evenly-spaced frequency bands
    const bandSize = Math.floor(dataArray.length / 5)
    const levels = Array.from({ length: 5 }, (_, i) => {
      const start = i * bandSize
      let sum = 0
      for (let j = start; j < start + bandSize; j++) {
        sum += dataArray[j]
      }
      return (sum / bandSize) / 255 // normalize 0-1
    })
    setAudioLevels(levels)
    animationRef.current = requestAnimationFrame(updateLevels)
  }, [])

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Set up audio analysis
      const audioContext = new AudioContext()
      audioContextRef.current = audioContext
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      // Set up MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'
      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const file = new File(
          [blob],
          `recording_${caseId}_${Date.now()}.webm`,
          { type: mimeType }
        )
        onRecordingComplete(file, elapsedSeconds)
      }

      recorder.start(1000) // collect data every second
      setState('recording')
      setElapsedSeconds(0)

      // Start timer
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1)
      }, 1000)

      // Start level visualization
      animationRef.current = requestAnimationFrame(updateLevels)
    } catch (err) {
      console.error('Failed to start recording:', err)
    }
  }, [caseId, onRecordingComplete, updateLevels, elapsedSeconds])

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause()
      setState('paused')
      if (timerRef.current) clearInterval(timerRef.current)
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      setAudioLevels([0, 0, 0, 0, 0])
    }
  }, [])

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume()
      setState('recording')
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1)
      }, 1000)
      animationRef.current = requestAnimationFrame(updateLevels)
    }
  }, [updateLevels])

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (timerRef.current) clearInterval(timerRef.current)
    if (animationRef.current) cancelAnimationFrame(animationRef.current)
    if (audioContextRef.current) audioContextRef.current.close()
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
    }
    setState('stopped')
    setAudioLevels([0, 0, 0, 0, 0])
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {})
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  return (
    <div className="space-y-4">
      {/* Timer display */}
      <div className="text-center">
        <p
          className="text-4xl font-mono font-semibold tabular-nums"
          style={{ color: state === 'recording' ? '#991b1b' : '#0E1F35' }}
        >
          {formatTime(elapsedSeconds)}
        </p>
        <p className="text-sm text-muted-foreground mt-1 capitalize">
          {state === 'idle' ? 'Ready to record' : state}
        </p>
      </div>

      {/* Audio level indicator */}
      <div className="flex items-end justify-center gap-1 h-10">
        {audioLevels.map((level, i) => (
          <div
            key={i}
            className="w-3 rounded-sm transition-all duration-75"
            style={{
              height: `${Math.max(4, level * 40)}px`,
              backgroundColor: state === 'recording' ? '#C9A84C' : '#D8DCE3',
            }}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        {state === 'idle' && (
          <Button
            onClick={startRecording}
            className="gap-2"
            style={{ backgroundColor: '#15803d' }}
          >
            <Mic className="h-4 w-4" />
            Start Recording
          </Button>
        )}

        {state === 'recording' && (
          <>
            <Button
              variant="outline"
              onClick={pauseRecording}
              className="gap-2"
            >
              <Pause className="h-4 w-4" />
              Pause
            </Button>
            <Button
              variant="destructive"
              onClick={stopRecording}
              className="gap-2"
            >
              <Square className="h-4 w-4" />
              Stop
            </Button>
          </>
        )}

        {state === 'paused' && (
          <>
            <Button
              onClick={resumeRecording}
              className="gap-2"
              style={{ backgroundColor: '#15803d' }}
            >
              <Play className="h-4 w-4" />
              Resume
            </Button>
            <Button
              variant="destructive"
              onClick={stopRecording}
              className="gap-2"
            >
              <Square className="h-4 w-4" />
              Stop
            </Button>
          </>
        )}

        {state === 'stopped' && (
          <p className="text-sm text-muted-foreground">
            Recording complete ({formatTime(elapsedSeconds)})
          </p>
        )}
      </div>
    </div>
  )
}
