'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { 
  Mic, MicOff, Upload, FileAudio, Sparkles, X, Check, Copy, 
  Download, ArrowRight, Play, Pause, RotateCcw, BookOpen, 
  Quote, ListOrdered, CheckCircle2, AlertCircle, Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface TranscribedData {
  title: string
  scriptures: string[]
  summary: string
  outline: Array<{ point: string; explanation: string; scripture?: string }>
  keyQuotes: string[]
  transcript: string
}

interface SermonAudioTranscriberModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SermonAudioTranscriberModal({
  isOpen,
  onClose,
}: SermonAudioTranscriberModalProps) {
  const router = useRouter()
  const supabase = createClient()

  const [mode, setMode] = useState<'upload' | 'record'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)

  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<TranscribedData | null>(null)
  const [activeResultTab, setActiveResultTab] = useState<'outline' | 'transcript'>('outline')
  const [isCreatingSermon, setIsCreatingSermon] = useState(false)
  const [copied, setCopied] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null)

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  if (!isOpen) return null

  // Recording Handlers
  const startRecording = async () => {
    setError(null)
    setAudioUrl(null)
    setFile(null)
    audioChunksRef.current = []

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const url = URL.createObjectURL(audioBlob)
        setAudioUrl(url)
        const recordedFile = new File([audioBlob], `sermon-recording-${Date.now()}.webm`, {
          type: 'audio/webm',
        })
        setFile(recordedFile)
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start(200)
      setIsRecording(true)
      setRecordingTime(0)

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch (err: any) {
      console.error('Error accessing microphone:', err)
      setError('Microphone access was denied. Please allow microphone permissions in your browser.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }

  const resetRecording = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioUrl(null)
    setFile(null)
    setRecordingTime(0)
    setIsRecording(false)
  }

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Upload Handlers
  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0])
    }
  }

  const validateAndSetFile = (selectedFile: File) => {
    setError(null)
    if (selectedFile.size > 50 * 1024 * 1024) {
      setError('Audio file is larger than 50MB. Please select a smaller file or trim it.')
      return
    }
    setFile(selectedFile)
    const url = URL.createObjectURL(selectedFile)
    setAudioUrl(url)
  }

  // Process Transcription with Gemini
  const handleStartTranscription = async () => {
    if (!file) return

    setIsProcessing(true)
    setError(null)
    setProcessingStep(1)

    // Progress animation steps
    const step2Timer = setTimeout(() => setProcessingStep(2), 2500)
    const step3Timer = setTimeout(() => setProcessingStep(3), 6000)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/ai/transcribe-sermon', {
        method: 'POST',
        body: formData,
      })

      const json = await response.json()

      if (!response.ok || !json.success) {
        throw new Error(json.error || 'Failed to process sermon audio.')
      }

      setResult(json.data)
      setProcessingStep(4)
    } catch (err: any) {
      console.error('Transcription error:', err)
      setError(err.message || 'An error occurred while transcribing your audio.')
    } finally {
      clearTimeout(step2Timer)
      clearTimeout(step3Timer)
      setIsProcessing(false)
    }
  }

  // Convert Transcribed Sermon into an Active Sermon Draft
  const handleCreateSermonDraft = async () => {
    if (!result) return
    setIsCreatingSermon(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('You must be signed in to create a sermon.')
      }

      // Format content into TipTap rich text doc
      const contentDoc = {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Executive Summary' }],
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: result.summary || '' }],
          },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Sermon Outline' }],
          },
          ...result.outline.map((item, idx) => ({
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: `${idx + 1}. ${item.point}${item.scripture ? ` (${item.scripture})` : ''}: `,
                marks: [{ type: 'bold' }],
              },
              { type: 'text', text: item.explanation || '' },
            ],
          })),
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Key Illustrations & Quotes' }],
          },
          ...result.keyQuotes.map((q) => ({
            type: 'paragraph',
            content: [
              { type: 'text', text: `• "${q}"` },
            ],
          })),
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Full Audio Transcript' }],
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: result.transcript || '' }],
          },
        ],
      }

      const { data: sermon, error: insertError } = (await supabase
        .from('sermons')
        .insert({
          author_id: user.id,
          title: result.title || 'Transcribed Sermon',
          scripture: result.scriptures.join(', ') || null,
          content: contentDoc,
          status: 'draft',
        })
        .select()
        .single()) as any

      if (insertError) throw insertError

      onClose()
      router.push(`/sermons/${sermon.id}`)
    } catch (err: any) {
      console.error('Error creating sermon:', err)
      setError(err.message || 'Failed to create sermon draft.')
    } finally {
      setIsCreatingSermon(false)
    }
  }

  // Copy Full Transcript
  const handleCopyTranscript = () => {
    if (!result) return
    const fullText = `SERMON: ${result.title}
SCRIPTURES: ${result.scriptures.join(', ')}

SUMMARY:
${result.summary}

OUTLINE:
${result.outline.map((o, i) => `${i + 1}. ${o.point} ${o.scripture ? `(${o.scripture})` : ''}\n   ${o.explanation}`).join('\n\n')}

QUOTES:
${result.keyQuotes.map((q) => `• "${q}"`).join('\n')}

FULL TRANSCRIPT:
${result.transcript}
`
    navigator.clipboard.writeText(fullText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  // Download Transcript (.txt)
  const handleDownloadTxt = () => {
    if (!result) return
    const text = `Title: ${result.title}
Scriptures: ${result.scriptures.join(', ')}

SUMMARY:
${result.summary}

OUTLINE:
${result.outline.map((o, i) => `${i + 1}. ${o.point} ${o.scripture ? `(${o.scripture})` : ''}\n${o.explanation}`).join('\n\n')}

FULL TRANSCRIPT:
${result.transcript}
`
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${result.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_Transcript.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white border border-[#022d5c]/15 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#022d5c] text-white p-5 sm:p-6 flex items-start justify-between relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-[#D0A348] text-xs font-semibold uppercase tracking-wider mb-1">
              <Sparkles size={14} />
              <span>AI Audio Intelligence</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-playfair font-bold text-white">
              Sermon Audio Transcriber
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              Upload a sermon audio file or record live preaching. AI will transcribe the audio, detect biblical scriptures, and extract a structured outline.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer relative z-10"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl p-3 flex items-start gap-2">
              <AlertCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* SCREEN 1: INPUT & RECORDING (When no result yet) */}
          {!result && !isProcessing && (
            <div className="space-y-6">
              {/* Mode Toggle */}
              <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setMode('upload')}
                  className={cn(
                    'flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer',
                    mode === 'upload'
                      ? 'bg-white text-[#022d5c] shadow-xs'
                      : 'text-slate-600 hover:text-[#022d5c]'
                  )}
                >
                  <Upload size={14} />
                  <span>Upload Audio File</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('record')}
                  className={cn(
                    'flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer',
                    mode === 'record'
                      ? 'bg-white text-[#022d5c] shadow-xs'
                      : 'text-slate-600 hover:text-[#022d5c]'
                  )}
                >
                  <Mic size={14} />
                  <span>Record Live Audio</span>
                </button>
              </div>

              {/* TAB 1: UPLOAD AUDIO FILE */}
              {mode === 'upload' && (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileDrop}
                  className={cn(
                    'border-2 border-dashed rounded-2xl p-8 text-center transition-all flex flex-col items-center justify-center gap-3',
                    file
                      ? 'border-emerald-500 bg-emerald-50/30'
                      : 'border-slate-300 hover:border-[#022d5c]/50 bg-slate-50/50'
                  )}
                >
                  <div className="w-14 h-14 rounded-2xl bg-[#022d5c]/10 text-[#022d5c] flex items-center justify-center shadow-inner">
                    <FileAudio size={28} className="text-[#022d5c]" />
                  </div>

                  <div>
                    {file ? (
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-800">{file.name}</p>
                        <p className="text-xs text-slate-500">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB • Audio Ready for Transcription
                        </p>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-slate-700">
                          Drag and drop your sermon audio recording here
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Supports MP3, M4A, WAV, WebM, AAC up to 50MB
                        </p>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <label className="bg-[#022d5c] hover:bg-[#033b7a] text-white text-xs font-medium px-4 py-2 rounded-xl transition cursor-pointer shadow-xs">
                      <span>{file ? 'Choose Different File' : 'Browse Files'}</span>
                      <input
                        type="file"
                        accept="audio/*,.mp3,.m4a,.wav,.webm,.ogg,.aac"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>

                    {file && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFile(null)
                          if (audioUrl) URL.revokeObjectURL(audioUrl)
                          setAudioUrl(null)
                        }}
                        className="text-xs text-slate-600"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: LIVE MICROPHONE RECORDING */}
              {mode === 'record' && (
                <div className="border border-slate-200 rounded-2xl p-8 text-center bg-slate-50/50 flex flex-col items-center justify-center gap-4">
                  <div className="relative">
                    {isRecording && (
                      <span className="animate-ping absolute inset-0 rounded-full bg-rose-400 opacity-60"></span>
                    )}
                    <button
                      type="button"
                      onClick={isRecording ? stopRecording : startRecording}
                      className={cn(
                        'relative z-10 w-20 h-20 rounded-full flex items-center justify-center text-white shadow-xl transition-all cursor-pointer transform hover:scale-105 active:scale-95',
                        isRecording
                          ? 'bg-rose-500 shadow-rose-500/30'
                          : 'bg-[#022d5c] shadow-[#022d5c]/20 hover:bg-[#033b7a]'
                      )}
                    >
                      {isRecording ? <MicOff size={32} /> : <Mic size={32} />}
                    </button>
                  </div>

                  <div className="space-y-1">
                    <div className="text-2xl font-mono font-bold text-slate-800">
                      {formatTimer(recordingTime)}
                    </div>
                    <p className="text-xs font-medium text-slate-500">
                      {isRecording
                        ? 'Recording live audio... Speak into your microphone'
                        : audioUrl
                        ? 'Recording paused. Ready to transcribe.'
                        : 'Tap the microphone to begin recording sermon'}
                    </p>
                  </div>

                  {/* Audio playback preview if recorded */}
                  {audioUrl && !isRecording && (
                    <div className="w-full max-w-md bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
                      <audio ref={audioPlayerRef} src={audioUrl} className="w-full h-8" controls />
                      <button
                        onClick={resetRecording}
                        title="Discard & record again"
                        className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                      >
                        <RotateCcw size={16} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Action Button to Start Transcription */}
              <div className="pt-2 flex justify-end">
                <Button
                  onClick={handleStartTranscription}
                  disabled={!file || isRecording}
                  className="bg-[#D0A348] hover:bg-[#b8892e] text-white font-semibold px-6 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer shadow-md shadow-[#D0A348]/20"
                >
                  <Sparkles size={16} />
                  <span>Transcribe & Analyze with AI</span>
                </Button>
              </div>
            </div>
          )}

          {/* SCREEN 2: PROCESSING ANIMATION */}
          {isProcessing && (
            <div className="py-14 flex flex-col items-center justify-center text-center space-y-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-[#022d5c]/20 border-t-[#D0A348] animate-spin flex items-center justify-center"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Mic size={24} className="text-[#022d5c] animate-pulse" />
                </div>
              </div>

              <div className="space-y-2 max-w-sm">
                <h3 className="text-lg font-playfair font-bold text-[#022d5c]">
                  Analyzing Sermon Audio
                </h3>
                <p className="text-xs text-slate-500">
                  {processingStep === 1 && 'Ingesting audio stream and parsing speech patterns...'}
                  {processingStep === 2 && 'Transcribing spoken words and punctuation with Gemini AI...'}
                  {processingStep === 3 && 'Detecting biblical Scripture references and building outline...'}
                  {processingStep >= 4 && 'Finalizing pastoral notes and summary...'}
                </p>
              </div>

              {/* Multi-step progress badges */}
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <span className={cn('px-2 py-1 rounded-md border', processingStep >= 1 ? 'bg-slate-100 border-[#022d5c] text-[#022d5c] font-bold' : 'border-slate-200')}>1. Audio</span>
                <span>→</span>
                <span className={cn('px-2 py-1 rounded-md border', processingStep >= 2 ? 'bg-slate-100 border-[#022d5c] text-[#022d5c] font-bold' : 'border-slate-200')}>2. Speech-to-Text</span>
                <span>→</span>
                <span className={cn('px-2 py-1 rounded-md border', processingStep >= 3 ? 'bg-slate-100 border-[#022d5c] text-[#022d5c] font-bold' : 'border-slate-200')}>3. Scripture & Outline</span>
              </div>
            </div>
          )}

          {/* SCREEN 3: RESULTS PANEL */}
          {result && !isProcessing && (
            <div className="space-y-6">
              {/* Title & Scripture Badges */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    Transcribed Title
                  </span>
                  <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={13} /> Complete
                  </span>
                </div>
                <h3 className="text-xl font-playfair font-bold text-[#022d5c]">
                  {result.title}
                </h3>

                {result.scriptures.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                      <BookOpen size={13} className="text-[#D0A348]" /> Scriptures:
                    </span>
                    {result.scriptures.map((ref, idx) => (
                      <span
                        key={idx}
                        className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#D0A348]/15 text-[#8B6A27] border border-[#D0A348]/30 font-mono"
                      >
                        {ref}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Results Tabs */}
              <div className="flex border-b border-slate-200">
                <button
                  onClick={() => setActiveResultTab('outline')}
                  className={cn(
                    'py-2 px-4 text-xs font-semibold border-b-2 transition cursor-pointer flex items-center gap-1.5',
                    activeResultTab === 'outline'
                      ? 'border-[#022d5c] text-[#022d5c]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  )}
                >
                  <ListOrdered size={14} />
                  <span>Sermon Outline & Summary</span>
                </button>
                <button
                  onClick={() => setActiveResultTab('transcript')}
                  className={cn(
                    'py-2 px-4 text-xs font-semibold border-b-2 transition cursor-pointer flex items-center gap-1.5',
                    activeResultTab === 'transcript'
                      ? 'border-[#022d5c] text-[#022d5c]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  )}
                >
                  <Quote size={14} />
                  <span>Full Transcript</span>
                </button>
              </div>

              {/* TAB CONTENT: OUTLINE & SUMMARY */}
              {activeResultTab === 'outline' && (
                <div className="space-y-4 text-sm">
                  {/* Executive Summary */}
                  {result.summary && (
                    <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-200/60">
                      <h4 className="text-xs font-bold text-[#8B6A27] uppercase tracking-wider mb-1.5">
                        Pastoral Message Summary
                      </h4>
                      <p className="text-slate-700 leading-relaxed text-xs sm:text-sm">
                        {result.summary}
                      </p>
                    </div>
                  )}

                  {/* Outline Points */}
                  {result.outline.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-[#022d5c] uppercase tracking-wider">
                        Sermon Outline
                      </h4>
                      <div className="space-y-2">
                        {result.outline.map((item, idx) => (
                          <div
                            key={idx}
                            className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-bold text-[#022d5c] text-sm">
                                {idx + 1}. {item.point}
                              </span>
                              {item.scripture && (
                                <span className="text-[11px] font-mono text-[#D0A348] font-semibold shrink-0">
                                  {item.scripture}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              {item.explanation}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Key Quotes */}
                  {result.keyQuotes.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <h4 className="text-xs font-bold text-[#022d5c] uppercase tracking-wider">
                        Memorable Quotes & Illustrations
                      </h4>
                      <ul className="space-y-1.5">
                        {result.keyQuotes.map((q, idx) => (
                          <li
                            key={idx}
                            className="text-xs text-slate-700 italic bg-slate-50 p-2.5 rounded-lg border-l-3 border-[#D0A348]"
                          >
                            "{q}"
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* TAB CONTENT: FULL TRANSCRIPT */}
              {activeResultTab === 'transcript' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span>Word-for-word audio transcript</span>
                    <button
                      onClick={handleCopyTranscript}
                      className="text-[#022d5c] hover:text-[#D0A348] font-medium flex items-center gap-1 cursor-pointer"
                    >
                      {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                      <span>{copied ? 'Copied!' : 'Copy Text'}</span>
                    </button>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 max-h-72 overflow-y-auto text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-serif">
                    {result.transcript}
                  </div>
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setResult(null)
                      setFile(null)
                      setAudioUrl(null)
                    }}
                    className="text-xs"
                  >
                    Transcribe Another
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadTxt}
                    className="text-xs flex items-center gap-1"
                  >
                    <Download size={13} />
                    <span>Download .txt</span>
                  </Button>
                </div>

                <Button
                  onClick={handleCreateSermonDraft}
                  disabled={isCreatingSermon}
                  className="w-full sm:w-auto bg-[#022d5c] hover:bg-[#033b7a] text-white text-xs font-semibold px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#022d5c]/10"
                >
                  {isCreatingSermon ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <ArrowRight size={14} className="text-[#D0A348]" />
                  )}
                  <span>Create New Sermon Draft</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
