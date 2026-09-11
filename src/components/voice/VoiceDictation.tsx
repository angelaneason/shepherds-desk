'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Mic, MicOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface VoiceDictationProps {
  onTranscript: (text: string) => void
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'icon'
  placeholderPrompt?: string
  variant?: 'gold' | 'navy' | 'ghost' | 'icon'
}

export function VoiceDictation({ 
  onTranscript, 
  className,
  size = 'icon',
  placeholderPrompt = 'Dictate with voice',
  variant = 'gold'
}: VoiceDictationProps) {
  const [isListening, setIsListening] = useState(false)
  const [interimText, setInterimText] = useState('')
  const [isSupported, setIsSupported] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  
  const recognitionRef = useRef<any>(null)
  const onTranscriptRef = useRef(onTranscript)
  onTranscriptRef.current = onTranscript

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (!SpeechRecognition) {
        setIsSupported(false)
      }
    }
  }, [])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (e) {
        // ignore
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
      setErrorMessage('Voice dictation not supported in this browser. Please use Chrome, Safari, or Edge.')
      return
    }

    try {
      const recognition = new SpeechRecognitionClass()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onstart = () => {
        setIsListening(true)
        setErrorMessage(null)
      }

      recognition.onresult = (event: any) => {
        let finalTrans = ''
        let interimTrans = ''

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i]
          const chunk = result[0].transcript
          if (result.isFinal) {
            finalTrans += chunk
          } else {
            interimTrans += chunk
          }
        }

        if (finalTrans) {
          onTranscriptRef.current(finalTrans)
        }
        setInterimText(interimTrans)
      }

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error)
        if (event.error === 'not-allowed') {
          setErrorMessage('Microphone access denied. Please allow microphone permissions in browser settings.')
        } else if (event.error !== 'no-speech') {
          setErrorMessage(`Mic error: ${event.error}`)
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
      console.error('Error starting speech recognition', err)
      setErrorMessage('Could not access microphone.')
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
    return (
      <div className={cn("relative group inline-block", className)}>
        <Button disabled variant="outline" size="sm" className="h-8 px-2 text-xs text-gray-400">
          <Mic className="h-3.5 w-3.5 mr-1" /> Dictate
        </Button>
      </div>
    )
  }

  return (
    <div className={cn("relative inline-flex items-center", className)}>
      <Button
        type="button"
        onClick={toggleListening}
        variant="outline"
        size={size === 'icon' ? 'icon' : 'sm'}
        title={isListening ? 'Listening... Tap to stop' : placeholderPrompt}
        className={cn(
          "transition-all duration-200 cursor-pointer shadow-sm text-xs font-medium",
          isListening 
            ? "bg-red-500 hover:bg-red-600 text-white animate-pulse border-red-500 ring-2 ring-red-400/40" 
            : variant === 'gold'
              ? "bg-[#D0A348] hover:bg-[#b8892e] text-white border-[#D0A348]"
              : variant === 'navy'
                ? "bg-[#022d5c] hover:bg-[#033b7a] text-white border-[#022d5c]"
                : "bg-white hover:bg-slate-100 text-slate-700 border-slate-300",
          size === 'icon' ? 'h-9 w-9 p-0' : 'h-8 px-2.5 gap-1.5'
        )}
      >
        {isListening ? (
          <>
            <MicOff className="h-3.5 w-3.5" />
            {size !== 'icon' && <span>Listening...</span>}
          </>
        ) : (
          <>
            <Mic className="h-3.5 w-3.5" />
            {size !== 'icon' && <span>Dictate</span>}
          </>
        )}
      </Button>

      {/* Floating Interim Transcript Tooltip */}
      {isListening && interimText && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 min-w-[200px] max-w-[300px] bg-slate-900/95 text-white text-xs rounded-lg p-2 shadow-2xl border border-red-500/40 backdrop-blur-md pointer-events-none">
          <div className="flex items-center gap-1.5 text-[10px] text-red-400 font-semibold mb-0.5 uppercase tracking-wider">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
            Speaking...
          </div>
          <p className="italic text-slate-200 line-clamp-2">"{interimText}"</p>
        </div>
      )}

      {/* Error Tooltip */}
      {errorMessage && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 min-w-[220px] max-w-[280px] bg-red-950 text-red-200 text-xs rounded-lg p-2 shadow-xl border border-red-600/40">
          <div className="flex items-start justify-between gap-1">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-red-300 hover:text-white text-xs ml-1">✕</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default VoiceDictation
