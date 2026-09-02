'use client'

import { useState } from 'react'
import { Mic, MicOff, Loader2, Check, Calendar, User, Clock, X, Sparkles } from 'lucide-react'
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

export function SmartReminder() {
  const [isOpen, setIsOpen] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [parsed, setParsed] = useState<ParsedReminder | null>(null)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const startListening = () => {
    setError('')
    setTranscript('')
    setParsed(null)
    setSaved(false)

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setError('Voice not supported in this browser. Try Chrome or Safari.')
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

    recognition.onerror = (event: any) => {
      setIsListening(false)
      if (event.error !== 'aborted') {
        setError('Couldn\'t hear you. Please try again.')
      }
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.start()
    setIsListening(true)

    // Auto-stop after 15 seconds
    setTimeout(() => {
      try { recognition.stop() } catch {}
    }, 15000)

    // Store reference to stop manually
    ;(window as any).__reminderRecognition = recognition
  }

  const stopListening = () => {
    try {
      (window as any).__reminderRecognition?.stop()
    } catch {}
    setIsListening(false)
  }

  const parseReminder = async () => {
    if (!transcript.trim()) return

    setIsProcessing(true)
    setError('')

    try {
      const res = await fetch('/api/reminders/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: transcript }),
      })

      if (!res.ok) throw new Error('Failed to parse')

      const data = await res.json()
      setParsed(data)
    } catch {
      setError('Could not understand the reminder. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const saveReminder = async () => {
    if (!parsed) return

    setIsProcessing(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Create calendar event
      if (parsed.createCalendarEvent) {
        const startTime = parsed.time
          ? `${parsed.date}T${parsed.time}:00`
          : `${parsed.date}T09:00:00`

        await (supabase.from('calendar_events').insert({
          profile_id: user.id,
          title: parsed.task,
          event_type: parsed.category === 'visit' ? 'visit' : parsed.category === 'personal' ? 'personal' : 'meeting',
          start_time: startTime,
          all_day: !parsed.time,
          description: parsed.person ? `Related to: ${parsed.person}` : null,
        }) as any)
      }

      // Create care task
      if (parsed.createCareTask) {
        await (supabase.from('care_tasks').insert({
          profile_id: user.id,
          task_type: parsed.category === 'visit' ? 'visit' : parsed.category === 'call' ? 'phone_call' : 'follow_up',
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
        setTimeout(() => {
          setParsed(null)
          setSaved(false)
          setTranscript('')
        }, 300)
      }, 2000)
    } catch {
      setError('Failed to save. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00')
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  }

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
          <p className="text-xs text-white/70">Tap and speak to set a reminder</p>
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
        <button onClick={() => { setIsOpen(false); stopListening() }} className="p-1 hover:bg-white/10 rounded-full">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4">
        {/* Success State */}
        {saved && (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
              <Check className="w-7 h-7 text-green-600" />
            </div>
            <p className="font-semibold text-gray-800">Reminder Set! ✅</p>
            <p className="text-sm text-gray-500 mt-1">Added to your calendar and tasks.</p>
          </div>
        )}

        {/* Listening / Input State */}
        {!saved && !parsed && (
          <>
            <p className="text-sm text-gray-500 mb-4 text-center">
              {isListening ? 'Listening... speak your reminder' : 'Tap the mic and say your reminder'}
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
                onClick={parseReminder}
                disabled={isProcessing}
                className="w-full flex items-center justify-center gap-2 bg-[#D0A348] text-white py-3 rounded-xl font-medium text-sm hover:bg-[#D0A348]/90 disabled:opacity-50 transition-colors"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Understanding...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Set Reminder
                  </>
                )}
              </button>
            )}

            {error && (
              <p className="text-sm text-red-500 text-center mt-3">{error}</p>
            )}

            <p className="text-[11px] text-gray-400 text-center mt-4">
              Try: &ldquo;Remind me to call Sister Mary about her prayer request on Thursday&rdquo;
            </p>
          </>
        )}

        {/* Parsed Confirmation */}
        {!saved && parsed && (
          <>
            <p className="text-sm font-semibold text-gray-800 mb-3">Here&apos;s what I heard:</p>

            <div className="space-y-3 mb-4">
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                <Check className="w-5 h-5 text-[#022d5c] mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-800">{parsed.task}</p>
                  <span className="text-xs text-gray-500 capitalize">{parsed.category}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <Calendar className="w-5 h-5 text-[#D0A348] shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-800">{formatDate(parsed.date)}</p>
                  {parsed.time && <span className="text-xs text-gray-500">{parsed.time}</span>}
                </div>
              </div>

              {parsed.person && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <User className="w-5 h-5 text-[#022d5c] shrink-0" />
                  <p className="text-sm font-medium text-gray-800">{parsed.person}</p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setParsed(null); setTranscript('') }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={saveReminder}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#022d5c] text-white text-sm font-medium hover:bg-[#022d5c]/90 disabled:opacity-50 transition-colors"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Confirm
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
