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
  variant?: 'gold' | 'navy' | 'ghost' | 'icon' | 'outline'
  showLabel?: boolean
  label?: string
  labelActive?: string
}

export function VoiceDictation({ 
  onTranscript, 
  className,
  size = 'sm',
  placeholderPrompt = 'Dictate with voice',
  variant = 'gold',
  showLabel,
  label = 'Dictate',
  labelActive = 'Listening...'
}: VoiceDictationProps) {
  const [isListening, setIsListening] = useState(false)
  const [interimText, setInterimText] = useState('')
  const [isSupported, setIsSupported] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  
  const recognitionRef = useRef<any>(null)
  const onTranscriptRef = useRef(onTranscript)
  onTranscriptRef.current = onTranscript

  // Should we show the label?
  const displayLabel = showLabel ?? (size !== 'icon')

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
        size={size === 'icon' && !displayLabel ? 'icon' : 'sm'}
        title={isListening ? 'Listening... Tap to stop' : placeholderPrompt}
        className={cn(
          "transition-all duration-200 cursor-pointer shadow-sm text-xs font-semibold rounded-lg select-none",
          isListening 
            ? "bg-red-600 hover:bg-red-700 text-white border-red-500 shadow-md shadow-red-500/30 ring-2 ring-red-400/50 animate-pulse" 
            : variant === 'gold'
              ? "bg-[#D0A348] hover:bg-[#b8892e] text-white border-[#D0A348] shadow-[#D0A348]/20"
              : variant === 'navy'
                ? "bg-[#022d5c] hover:bg-[#033b7a] text-white border-[#022d5c] shadow-[#022d5c]/20"
                : variant === 'outline'
                  ? "bg-white hover:bg-amber-50/50 text-[#022d5c] border-amber-300/80 hover:border-[#D0A348]"
                  : "bg-white hover:bg-slate-100 text-slate-700 border-slate-300",
          size === 'icon' && !displayLabel ? 'h-8 w-8 p-0' : 'h-8 px-3 gap-1.5'
        )}
      >
        {isListening ? (
          <>
            <MicOff className="h-3.5 w-3.5 text-white animate-bounce" />
            {displayLabel && <span>{labelActive}</span>}
            {/* Audio Wave Visualizer Bars */}
            <span className="flex items-center gap-0.5 ml-1">
              <span className="w-0.5 h-3 bg-white animate-pulse rounded-full" />
              <span className="w-0.5 h-4 bg-white animate-pulse rounded-full delay-75" />
              <span className="w-0.5 h-2.5 bg-white animate-pulse rounded-full delay-150" />
            </span>
          </>
        ) : (
          <>
            <Mic className={cn("h-3.5 w-3.5", variant === 'outline' ? "text-[#D0A348]" : "text-current")} />
            {displayLabel && <span>{label}</span>}
          </>
        )}
      </Button>

      {/* Floating Interim Transcript Tooltip */}
      {isListening && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 min-w-[220px] max-w-[340px] bg-slate-900 text-white text-xs rounded-xl p-3 shadow-2xl border border-red-500/50 backdrop-blur-md pointer-events-none animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between gap-1.5 text-[10px] text-red-400 font-bold mb-1 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
              Listening to voice...
            </span>
            <span className="text-[9px] text-slate-400 font-normal">Tap to finish</span>
          </div>
          {interimText ? (
            <p className="italic text-slate-100 font-medium leading-relaxed">"{interimText}"</p>
          ) : (
            <p className="text-slate-400 text-[11px] italic">Speak clearly into your microphone...</p>
          )}
        </div>
      )}

      {/* Error Tooltip */}
      {errorMessage && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 min-w-[220px] max-w-[280px] bg-red-950 text-red-200 text-xs rounded-lg p-2.5 shadow-xl border border-red-600/40">
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
