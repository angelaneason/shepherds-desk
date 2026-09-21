'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Camera, Upload, Image as ImageIcon, Loader2, Check, RefreshCw, Mic, MicOff, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PhotoCaptureProps {
  isOpen: boolean
  onClose: () => void
  onTextCaptured: (text: string) => void
  initialTab?: 'voice' | 'photo'
}

export function PhotoCapture({ isOpen, onClose, onTextCaptured, initialTab = 'voice' }: PhotoCaptureProps) {
  const [activeTab, setActiveTab] = useState<'voice' | 'photo'>(initialTab)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [extractedText, setExtractedText] = useState('')
  const [confidence, setConfidence] = useState<'high' | 'medium' | 'low' | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Voice Dictation state
  const [isListening, setIsListening] = useState(false)
  const [voiceText, setVoiceText] = useState('')
  const [interimVoice, setInterimVoice] = useState('')
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const recognitionRef = useRef<any>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab)
    }
  }, [isOpen, initialTab])

  const stopVoiceListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (e) {
        // ignore
      }
      recognitionRef.current = null
    }
    setIsListening(false)
    setInterimVoice('')
  }, [])

  const startVoiceListening = useCallback(() => {
    setVoiceError(null)
    setInterimVoice('')

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognitionClass) {
      setVoiceError('Voice dictation not supported in this browser. Please use Chrome, Safari, or Edge.')
      return
    }

    try {
      const recognition = new SpeechRecognitionClass()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onstart = () => {
        setIsListening(true)
        setVoiceError(null)
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
          setVoiceText(prev => prev ? `${prev} ${finalTrans}` : finalTrans)
        }
        setInterimVoice(interimTrans)
      }

      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed') {
          setVoiceError('Microphone permission denied. Please allow microphone access.')
        } else if (event.error !== 'no-speech') {
          setVoiceError(`Microphone error: ${event.error}`)
        }
        stopVoiceListening()
      }

      recognition.onend = () => {
        setIsListening(false)
        setInterimVoice('')
        recognitionRef.current = null
      }

      recognitionRef.current = recognition
      recognition.start()
    } catch (err: any) {
      console.error('Error starting speech recognition', err)
      setVoiceError('Could not start microphone.')
      stopVoiceListening()
    }
  }, [stopVoiceListening])

  const toggleVoice = () => {
    if (isListening) {
      stopVoiceListening()
    } else {
      startVoiceListening()
    }
  }

  // Cleanup on unmount or close
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('File size exceeds 10MB limit.')
        return
      }
      setSelectedImage(file)
      setPreviewUrl(URL.createObjectURL(file))
      setError(null)
      setExtractedText('')
      setConfidence(null)
    }
  }

  const handleProcessImage = async () => {
    if (!selectedImage) return

    setIsLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', selectedImage)

    try {
      const response = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to process image')
      }

      const data = await response.json()
      setExtractedText(data.text)
      setConfidence(data.confidence)
    } catch (err) {
      console.error(err)
      setError('We had trouble reading that. Try a clearer photo with good lighting.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSavePhoto = () => {
    onTextCaptured(extractedText)
    resetState()
    onClose()
  }

  const handleSaveVoice = () => {
    if (voiceText.trim()) {
      onTextCaptured(voiceText.trim())
    }
    resetState()
    onClose()
  }

  const resetState = () => {
    stopVoiceListening()
    setSelectedImage(null)
    setPreviewUrl(null)
    setExtractedText('')
    setConfidence(null)
    setError(null)
    setVoiceText('')
    setInterimVoice('')
    setVoiceError(null)
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 text-[#D0A348]" />
            <DialogTitle className="text-xl font-bold text-[#022d5c]">Quick Capture</DialogTitle>
          </div>
          <DialogDescription>
            Instantly capture sermon insights, ministry notes, and ideas
          </DialogDescription>
        </DialogHeader>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl mt-1">
          <button
            type="button"
            onClick={() => {
              stopVoiceListening()
              setActiveTab('voice')
            }}
            className={cn(
              "flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              activeTab === 'voice' 
                ? "bg-white text-[#022d5c] shadow-sm font-bold" 
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Mic className={cn("h-4 w-4", activeTab === 'voice' ? "text-[#D0A348]" : "text-slate-400")} />
            <span>Voice Note</span>
          </button>
          <button
            type="button"
            onClick={() => {
              stopVoiceListening()
              setActiveTab('photo')
            }}
            className={cn(
              "flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              activeTab === 'photo' 
                ? "bg-white text-[#022d5c] shadow-sm font-bold" 
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Camera className={cn("h-4 w-4", activeTab === 'photo' ? "text-[#022d5c]" : "text-slate-400")} />
            <span>Snap Photo</span>
          </button>
        </div>

        {/* VOICE TAB CONTENT */}
        {activeTab === 'voice' && (
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col items-center justify-center p-6 bg-slate-50/80 rounded-2xl border border-slate-200/80 text-center">
              <button
                type="button"
                onClick={toggleVoice}
                className={cn(
                  "relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-md cursor-pointer",
                  isListening 
                    ? "bg-red-600 hover:bg-red-700 text-white ring-8 ring-red-400/30 scale-105 animate-pulse" 
                    : "bg-[#022d5c] hover:bg-[#033b7a] text-white hover:scale-105"
                )}
              >
                {isListening ? (
                  <MicOff className="h-8 w-8 text-white" />
                ) : (
                  <Mic className="h-8 w-8 text-[#D0A348]" />
                )}
                {isListening && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-white"></span>
                  </span>
                )}
              </button>

              <div className="mt-3">
                <p className="text-sm font-bold text-[#022d5c]">
                  {isListening ? "Listening... Speak clearly" : "Tap to Speak Voice Note"}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isListening ? "Tap microphone when finished" : "Voice dictation automatically transcribes as you talk"}
                </p>
              </div>

              {isListening && (
                <div className="flex items-center gap-1 mt-3">
                  <span className="w-1 h-3 bg-red-500 animate-pulse rounded-full" />
                  <span className="w-1 h-5 bg-red-500 animate-pulse rounded-full delay-75" />
                  <span className="w-1 h-6 bg-red-500 animate-pulse rounded-full delay-150" />
                  <span className="w-1 h-4 bg-red-500 animate-pulse rounded-full delay-100" />
                  <span className="w-1 h-2 bg-red-500 animate-pulse rounded-full" />
                </div>
              )}
            </div>

            {voiceError && (
              <div className="p-3 text-xs text-red-700 bg-red-50 rounded-xl border border-red-200">
                {voiceError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Captured Note</label>
              <Textarea
                value={voiceText + (interimVoice ? ` (${interimVoice})` : '')}
                onChange={(e) => setVoiceText(e.target.value)}
                placeholder="What's on your heart? Speak or type your thoughts..."
                className="min-h-[110px] text-sm resize-none rounded-xl"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                onClick={handleSaveVoice}
                disabled={!voiceText.trim()}
                className="flex-1 bg-[#D0A348] hover:bg-[#b8892e] text-white font-semibold gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" /> Save to Ideas
              </Button>
              {voiceText && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setVoiceText(''); setInterimVoice('') }}
                  className="text-xs"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        )}

        {/* PHOTO TAB CONTENT */}
        {activeTab === 'photo' && (
          <div className="flex flex-col gap-4 py-2">
            {!previewUrl ? (
              <div className="flex flex-col gap-3">
                <Button
                  size="lg"
                  className="w-full bg-[#D0A348] hover:bg-[#D0A348]/90 text-white gap-2 cursor-pointer"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera className="w-5 h-5" />
                  Take Photo
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={cameraInputRef}
                  className="hidden"
                  onChange={handleFileChange}
                />

                <Button
                  variant="outline"
                  size="lg"
                  className="w-full gap-2 border-[#022d5c] text-[#022d5c] hover:bg-[#022d5c]/10 cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-5 h-5" />
                  Upload Image
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileChange}
                />

                {error && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                    {error}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {!extractedText && !isLoading && (
                  <>
                    <div className="relative aspect-video rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="max-w-full max-h-[30vh] object-contain"
                      />
                    </div>
                    
                    {error && (
                      <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                        {error}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-[#D0A348] hover:bg-[#D0A348]/90 text-white cursor-pointer"
                        onClick={handleProcessImage}
                      >
                        Convert to Text
                      </Button>
                      <Button
                        variant="outline"
                        onClick={resetState}
                        className="cursor-pointer"
                      >
                        Retake
                      </Button>
                    </div>
                  </>
                )}

                {isLoading && (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-[#D0A348]" />
                    <p className="text-sm font-medium text-[#022d5c] flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" /> Reading your notes...
                    </p>
                  </div>
                )}

                {extractedText && (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        Here's what we found! Feel free to edit before saving.
                      </span>
                      {confidence && (
                        <Badge
                          className={
                            confidence === 'high' ? 'bg-green-500' :
                            confidence === 'medium' ? 'bg-yellow-500' : 'bg-orange-500'
                          }
                        >
                          {confidence} confidence
                        </Badge>
                      )}
                    </div>

                    <Textarea
                      value={extractedText}
                      onChange={(e) => setExtractedText(e.target.value)}
                      className="min-h-[160px] text-base resize-y"
                    />

                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-[#022d5c] hover:bg-[#022d5c]/90 text-white gap-2 cursor-pointer"
                        onClick={handleSavePhoto}
                      >
                        <Check className="w-4 h-4" /> Save to Ideas
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleProcessImage}
                        className="gap-2 cursor-pointer"
                      >
                        <RefreshCw className="w-4 h-4" /> Try Again
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
