'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Mic, MicOff, Loader2 } from 'lucide-react'

// Web Speech API interface declarations
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message?: string
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => any) | null
  onend: ((this: SpeechRecognitionInstance, ev: Event) => any) | null
  onerror: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEvent) => any) | null
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => any) | null
}

interface VoiceDictationButtonProps {
  onTranscript: (text: string) => void
  className?: string
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  placeholderPrompt?: string
}

export default function VoiceDictationButton({
  onTranscript,
  className = '',
  size = 'md',
  disabled = false,
  placeholderPrompt = 'Dictate with voice'
}: VoiceDictationButtonProps) {
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const [interimText, setInterimText] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const onTranscriptRef = useRef(onTranscript)
  onTranscriptRef.current = onTranscript

  // Check browser support on mount
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setIsSupported(false)
    }
  }, [])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (err) {
        // Ignore stop on inactive instance
      }
      recognitionRef.current = null
    }
    setIsListening(false)
    setInterimText('')
  }, [])

  const startListening = useCallback(() => {
    setErrorMessage(null)
    setInterimText('')

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognitionClass) {
      setErrorMessage('Speech recognition is not supported in this browser. Please use Chrome, Safari, or Edge.')
      return
    }

    try {
      const recognition = new SpeechRecognitionClass() as SpeechRecognitionInstance
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onstart = () => {
        setIsListening(true)
        setErrorMessage(null)
      }

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTrans = ''
        let interimTrans = ''

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i]
          const transcriptChunk = result[0].transcript
          if (result.isFinal) {
            finalTrans += transcriptChunk
          } else {
            interimTrans += transcriptChunk
          }
        }

        if (finalTrans) {
          onTranscriptRef.current(finalTrans)
        }
        setInterimText(interimTrans)
      }

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.warn('Speech recognition error:', event.error)
        if (event.error === 'not-allowed') {
          setErrorMessage('Microphone access denied. Please allow microphone permissions in your browser settings.')
        } else if (event.error === 'no-speech') {
          // Ignore no-speech errors quietly
        } else {
          setErrorMessage(`Speech recognition error: ${event.error}`)
        }
        stopListening()
      }

      recognition.onend = () => {
        setIsListening(false)
        setInterimText('')
        recognitionRef.current = null
      }

      recognitionRef.current = recognition
      recognition.start()
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err)
      setErrorMessage('Could not start microphone. Please check browser permissions.')
      stopListening()
    }
  }, [stopListening])

  const toggleListening = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch {
          // ignore
        }
      }
    }
  }, [])

  if (!isSupported) {
    return null // Gracefully hide button on unsupported browsers
  }

  const sizeClasses = {
    sm: 'p-1 text-xs gap-1',
    md: 'px-2 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2'
  }

  const iconSizes = {
    sm: 13,
    md: 15,
    lg: 18
  }

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={toggleListening}
        disabled={disabled}
        title={isListening ? 'Listening... Click to stop' : placeholderPrompt}
        className={`inline-flex items-center rounded-lg font-medium transition-all cursor-pointer ${sizeClasses[size]} ${
          isListening
            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm animate-pulse ring-2 ring-rose-500/20'
            : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800/80 bg-slate-800/40 border border-slate-700/50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      >
        {isListening ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            <Mic size={iconSizes[size]} className="text-rose-400" />
            <span className="text-[11px] font-semibold text-rose-300">Listening...</span>
          </>
        ) : (
          <>
            <Mic size={iconSizes[size]} />
            <span className="text-[11px]">Dictate</span>
          </>
        )}
      </button>

      {/* Floating Interim Transcript Toast / Tooltip */}
      {isListening && interimText && (
        <div className="absolute bottom-full left-0 mb-2 z-50 min-w-[200px] max-w-[320px] bg-slate-900 text-slate-200 text-xs rounded-lg p-2 shadow-xl border border-rose-500/30 backdrop-blur-md">
          <div className="flex items-center gap-1.5 text-[10px] text-rose-400 font-semibold mb-1 uppercase tracking-wider">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
            Speaking...
          </div>
          <p className="italic text-slate-300 line-clamp-3">"{interimText}"</p>
        </div>
      )}

      {/* Error Tooltip */}
      {errorMessage && (
        <div className="absolute bottom-full left-0 mb-2 z-50 min-w-[220px] max-w-[300px] bg-rose-950/95 text-rose-200 text-xs rounded-lg p-2.5 shadow-xl border border-rose-600/40">
          <div className="flex items-start justify-between gap-1">
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-300 hover:text-white text-xs ml-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
