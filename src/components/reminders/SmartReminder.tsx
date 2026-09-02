'use client'

import { useState, useRef } from 'react'
import { Mic, MicOff, Loader2, Check, Calendar, User, X, Sparkles, Keyboard, Camera, Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ParsedReminder {
  task: string
  person: string | null
  date: string
  time: string | null
  category: string
  priority: string
  createCalendarEvent: boolean
  createCareTask: boolean
}

type InputMode = 'choose' | 'voice' | 'type' | 'photo'

export function SmartReminder() {
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<InputMode>('choose')
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [typedText, setTypedText] = useState('')
  const [parsed, setParsed] = useState<ParsedReminder | null>(null)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const startListening = () => {
    setError('')
    setTranscript('')
    setParsed(null)

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setError('Voice not supported. Try Chrome or Safari.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: any) => {
      let finalTranscript = ''
      for (let i = 0; i < event.results.length; i++) {
        finalTranscript += event.results[i][0].transcript
      }
      setTranscript(finalTranscript)
    }

    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)
    recognition.start()
    setIsListening(true)

    setTimeout(() => { try { recognition.stop() } catch {} }, 15000)
    ;(window as any).__reminderRecognition = recognition
  }

  const stopListening = () => {
    try { (window as any).__reminderRecognition?.stop() } catch {}
    setIsListening(false)
  }

  const parseReminder = async (text: string) => {
    if (!text.trim()) return
    setIsProcessing(true)
    setError('')

    try {
      const res = await fetch('/api/reminders/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) throw new Error('Failed to parse')
      const data = await res.json()
      setParsed(data)
    } catch {
      setError('Could not understand. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsProcessing(true)
    setError('')

    try {
      const reader = new FileReader()
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1]
        
        // Send to OCR endpoint
        const ocrRes = await fetch('/api/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64 }),
        })

        if (!ocrRes.ok) throw new Error('OCR failed')
        const ocrData = await ocrRes.json()
        const ocrText = ocrData.text || ''

        if (ocrText) {
          setTranscript(ocrText)
          await parseReminder(ocrText)
        } else {
          setError('Could not read text from the image. Try again.')
          setIsProcessing(false)
        }
      }
      reader.readAsDataURL(file)
    } catch {
      setError('Failed to process image.')
      setIsProcessing(false)
    }
  }

  const saveReminder = async () => {
    if (!parsed) return
    setIsProcessing(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      if (parsed.createCalendarEvent) {
        const startTime = parsed.time
          ? `${parsed.date}T${parsed.time}:00`
          : `${parsed.date}T09:00:00`

        // Calculate end time (1 hour after start)
        const startDate = new Date(startTime)
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000)
        const endTime = endDate.toISOString()

        await (supabase.from('calendar_events').insert({
          profile_id: user.id,
          title: parsed.task,
          event_type: parsed.category === 'visit' ? 'visit' : parsed.category === 'personal' ? 'personal' : 'meeting',
          start_time: startTime,
          end_time: endTime,
          all_day: !parsed.time,
          description: parsed.person ? `Related to: ${parsed.person}` : null,
        }) as any)
      }

      if (parsed.createCareTask) {
        const taskType = parsed.category === 'visit' ? 'visit' : parsed.category === 'call' ? 'call' : parsed.category === 'hospital' ? 'hospital' : 'other'
        await (supabase.from('care_tasks').insert({
          profile_id: user.id,
          task_type: taskType,
          description: parsed.task,
          due_date: parsed.date,
          priority: parsed.priority,
          status: 'pending',
          notes: parsed.person ? `Person: ${parsed.person}` : null,
        }) as any)
      }

      setSaved(true)
      setTimeout(() => {
        setIsOpen(false)
        setTimeout(() => { reset() }, 300)
      }, 2000)
    } catch {
      setError('Failed to save. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const reset = () => {
    setParsed(null)
    setSaved(false)
    setTranscript('')
    setTypedText('')
    setError('')
    setMode('choose')
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00')
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  }

  // Collapsed state
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-[#022d5c] to-[#0a4a8a] text-white shadow-lg hover:shadow-xl transition-all group"
      >
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
          <Mic className="w-5 h-5" />
        </div>
        <div className="text-left">
          <p className="font-semibold text-sm">Smart Reminder</p>
          <p className="text-xs text-white/70">Speak, type, or snap a photo to set a reminder</p>
        </div>
        <Sparkles className="w-5 h-5 text-[#D0A348] ml-auto" />
      </button>
    )
  }

  return (
    <div className="w-full rounded-2xl bg-white border-2 border-[#022d5c] shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-[#022d5c] text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#D0A348]" />
          <span className="font-semibold text-sm">Smart Reminder</span>
        </div>
        <button onClick={() => { setIsOpen(false); stopListening(); reset() }} className="p-1 hover:bg-white/10 rounded-full">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4">
        {/* Success */}
        {saved && (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
              <Check className="w-7 h-7 text-green-600" />
            </div>
            <p className="font-semibold text-gray-800">Reminder Set! ✅</p>
            <p className="text-sm text-gray-500 mt-1">Added to your calendar and tasks.</p>
          </div>
        )}

        {/* Choose Mode */}
        {!saved && !parsed && mode === 'choose' && (
          <>
            <p className="text-sm text-gray-500 mb-4 text-center">How would you like to set your reminder?</p>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => { setMode('voice'); startListening() }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-200 hover:border-[#022d5c] hover:bg-[#022d5c]/5 transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-[#022d5c]/10 flex items-center justify-center">
                  <Mic className="w-6 h-6 text-[#022d5c]" />
                </div>
                <span className="text-xs font-medium text-gray-700">Speak</span>
              </button>
              <button
                onClick={() => setMode('type')}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-200 hover:border-[#D0A348] hover:bg-[#D0A348]/5 transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-[#D0A348]/10 flex items-center justify-center">
                  <Keyboard className="w-6 h-6 text-[#D0A348]" />
                </div>
                <span className="text-xs font-medium text-gray-700">Type</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <Camera className="w-6 h-6 text-green-600" />
                </div>
                <span className="text-xs font-medium text-gray-700">Photo</span>
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoCapture}
            />
            <p className="text-[11px] text-gray-400 text-center mt-4">
              Example: &ldquo;Remind me to call Sister Mary about her prayer request on Thursday&rdquo;
            </p>
          </>
        )}

        {/* Voice Mode */}
        {!saved && !parsed && mode === 'voice' && (
          <>
            <p className="text-sm text-gray-500 mb-4 text-center">
              {isListening ? 'Listening... speak your reminder' : 'Tap the mic to try again'}
            </p>
            <div className="flex justify-center mb-4">
              <button
                onClick={isListening ? stopListening : startListening}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30'
                    : 'bg-[#022d5c] text-white hover:bg-[#022d5c]/90 shadow-lg'
                }`}
              >
                {isListening ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
              </button>
            </div>
            {transcript && (
              <div className="bg-gray-50 rounded-xl p-3 mb-4">
                <p className="text-sm text-gray-700 italic">&ldquo;{transcript}&rdquo;</p>
              </div>
            )}
            {transcript && !isListening && (
              <button
                onClick={() => parseReminder(transcript)}
                disabled={isProcessing}
                className="w-full flex items-center justify-center gap-2 bg-[#D0A348] text-white py-3 rounded-xl font-medium text-sm hover:bg-[#D0A348]/90 disabled:opacity-50 transition-colors"
              >
                {isProcessing ? <><Loader2 className="w-4 h-4 animate-spin" /> Understanding...</> : <><Sparkles className="w-4 h-4" /> Set Reminder</>}
              </button>
            )}
            <button onClick={() => setMode('choose')} className="w-full text-xs text-gray-400 mt-3 hover:text-gray-600">← Back</button>
          </>
        )}

        {/* Type Mode */}
        {!saved && !parsed && mode === 'type' && (
          <>
            <p className="text-sm text-gray-500 mb-3">Type your reminder naturally:</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && parseReminder(typedText)}
                placeholder="e.g., Call Sister Mary on Thursday..."
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#D0A348] focus:ring-1 focus:ring-[#D0A348]"
                autoFocus
              />
              <button
                onClick={() => parseReminder(typedText)}
                disabled={!typedText.trim() || isProcessing}
                className="px-4 py-3 bg-[#022d5c] text-white rounded-xl hover:bg-[#022d5c]/90 disabled:opacity-50 transition-colors"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
            <button onClick={() => setMode('choose')} className="w-full text-xs text-gray-400 mt-3 hover:text-gray-600">← Back</button>
          </>
        )}

        {/* Photo Processing */}
        {!saved && !parsed && isProcessing && mode === 'choose' && (
          <div className="text-center py-6">
            <Loader2 className="w-8 h-8 animate-spin text-[#022d5c] mx-auto mb-3" />
            <p className="text-sm text-gray-600">Reading image and setting reminder...</p>
          </div>
        )}

        {/* Parsed Confirmation */}
        {!saved && parsed && (
          <>
            <p className="text-sm font-semibold text-gray-800 mb-3">Here&apos;s what I understood:</p>
            <div className="space-y-3 mb-4">
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                <Check className="w-5 h-5 text-[#022d5c] mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{parsed.task}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <Calendar className="w-5 h-5 text-[#D0A348] shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{formatDate(parsed.date)}</p>
                </div>
              </div>
              {/* Time Picker */}
              <div className="p-3 bg-gray-50 rounded-xl">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Time</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setParsed({ ...parsed, time: null })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      !parsed.time
                        ? 'bg-[#022d5c] text-white'
                        : 'bg-white border border-gray-200 text-gray-600 hover:border-[#022d5c]'
                    }`}
                  >
                    All Day
                  </button>
                  <button
                    onClick={() => setParsed({ ...parsed, time: parsed.time || '09:00' })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      parsed.time
                        ? 'bg-[#022d5c] text-white'
                        : 'bg-white border border-gray-200 text-gray-600 hover:border-[#022d5c]'
                    }`}
                  >
                    Set Time
                  </button>
                  {parsed.time && (
                    <input
                      type="time"
                      value={parsed.time}
                      onChange={(e) => setParsed({ ...parsed, time: e.target.value })}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#D0A348]"
                    />
                  )}
                </div>
              </div>
              {parsed.person && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <User className="w-5 h-5 text-[#022d5c] shrink-0" />
                  <p className="text-sm font-medium text-gray-800">{parsed.person}</p>
                </div>
              )}
              {/* Type Picker */}
              <div className="p-3 bg-gray-50 rounded-xl">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Type</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'call', label: '📞 Call', },
                    { value: 'visit', label: '🏠 Visit' },
                    { value: 'hospital', label: '🏥 Hospital' },
                    { value: 'other', label: '📋 Other' },
                  ].map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setParsed({ ...parsed, category: type.value })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        parsed.category === type.value
                          ? 'bg-[#022d5c] text-white'
                          : 'bg-white border border-gray-200 text-gray-600 hover:border-[#022d5c]'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={reset}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Try Again
              </button>
              <button
                onClick={saveReminder}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#022d5c] text-white text-sm font-medium hover:bg-[#022d5c]/90 disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Confirm
              </button>
            </div>
          </>
        )}

        {error && <p className="text-sm text-red-500 text-center mt-3">{error}</p>}
      </div>
    </div>
  )
}
