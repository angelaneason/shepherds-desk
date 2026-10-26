'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Mic, MicOff, Loader2, Check, Calendar, User, X, Sparkles, Keyboard, Camera, Upload, Send, BookOpen, Lightbulb, Heart, Bell, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { compressImageForOcr, fileToBase64 } from '@/lib/imageCompression'

type AssistantAction = 'reminder' | 'sermon' | 'idea' | 'prayer'

interface ParsedReminder {
  action?: AssistantAction
  sermonTitle?: string | null
  scripture?: string | null
  preachDate?: string | null
  seriesName?: string | null
  ideaText?: string | null
  prayerPerson?: string | null
  prayerRequest?: string | null
  prayerCategory?: string | null
  task: string
  person: string | null
  date: string
  time: string | null
  endTime: string | null
  category: string
  priority: string
  isStudyTime: boolean
  createCalendarEvent: boolean
  createCareTask: boolean
}

type InputMode = 'choose' | 'voice' | 'type' | 'photo'

const ACTIONS: { value: AssistantAction; label: string; icon: typeof Bell }[] = [
  { value: 'reminder', label: 'Reminder', icon: Bell },
  { value: 'sermon', label: 'New Sermon', icon: BookOpen },
  { value: 'idea', label: 'Idea', icon: Lightbulb },
  { value: 'prayer', label: 'Prayer', icon: Heart },
]

const PRAYER_CATEGORIES = ['Health', 'Family', 'Financial', 'Spiritual', 'Other']

const localToday = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface SmartReminderProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  variant?: 'banner' | 'modal'
}

export function SmartReminder({ open, onOpenChange, variant = 'banner' }: SmartReminderProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isOpen = open !== undefined ? open : internalOpen
  const setIsOpen = (next: boolean) => {
    setInternalOpen(next)
    onOpenChange?.(next)
  }

  const [mode, setMode] = useState<InputMode>('choose')
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [typedText, setTypedText] = useState('')
  const [parsed, setParsed] = useState<ParsedReminder | null>(null)
  const [saved, setSaved] = useState(false)
  const [savedMessage, setSavedMessage] = useState({ title: '', detail: '' })
  const [newSermonId, setNewSermonId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null)
  const [photoExtractedText, setPhotoExtractedText] = useState('')
  const [photoTitle, setPhotoTitle] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const action: AssistantAction = parsed?.action || 'reminder'

  useEffect(() => {
    if (variant !== 'modal') return
    const handleOpenEvent = () => setIsOpen(true)
    window.addEventListener('open_smart_assistant', handleOpenEvent)
    return () => window.removeEventListener('open_smart_assistant', handleOpenEvent)
  }, [variant])

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
        body: JSON.stringify({ text, today: localToday() }),
      })
      if (!res.ok) throw new Error('Failed to parse')
      const data = await res.json()
      setParsed({ action: 'reminder', ...data })
    } catch {
      setError('Could not understand. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setMode('photo')
    setIsProcessing(true)
    setError('')
    setPhotoExtractedText('')
    setPhotoPreviewUrl(URL.createObjectURL(file))

    try {
      const compressed = await compressImageForOcr(file)
      const base64 = await fileToBase64(compressed)

      const ocrRes = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64,
          mimeType: compressed.type || 'image/jpeg',
          fileName: compressed.name || 'capture.jpg',
        }),
      })

      if (!ocrRes.ok) throw new Error('OCR failed')
      const ocrData = await ocrRes.json()
      const ocrText = (ocrData.text || '').trim()

      if (ocrText) {
        setPhotoExtractedText(ocrText)
      } else {
        setError('Could not read text from the image. Try a clearer photo with good lighting.')
      }
    } catch {
      setError('Failed to process image. Please try again.')
    } finally {
      setIsProcessing(false)
      if (e.target) e.target.value = ''
    }
  }

  const savePhotoDirectlyToIdeas = async () => {
    const text = photoExtractedText.trim()
    if (!text) return
    setIsProcessing(true)
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { error: ideaError } = await (supabase.from('ideas').insert({
        profile_id: user.id,
        content: `[Photo] ${text}`,
        source_type: 'photo',
        ocr_text: text,
        archived: false,
      }) as any)
      if (ideaError) throw ideaError
      finishSave('Photo Note Saved! 📷', 'Converted text was saved to your Ideas Inbox.')
    } catch {
      setError('Failed to save photo note.')
    } finally {
      setIsProcessing(false)
    }
  }

  const savePhotoDirectlyAsSermon = async () => {
    const text = photoExtractedText.trim()
    if (!text) return
    setIsProcessing(true)
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const firstLine = text.split('\n')[0]?.slice(0, 60).trim() || 'Scanned Sermon Note'
      const title = photoTitle.trim() || firstLine
      const htmlContent = text
        .split(/\n\n+/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
        .map((p) => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
        .join('')
      const { data: sermon, error: sermonError } = await (supabase.from('sermons').insert({
        author_id: user.id,
        title,
        content: htmlContent,
        status: 'draft',
      }).select('id').single() as any)
      if (sermonError) throw sermonError
      setNewSermonId(sermon.id)
      finishSave('Sermon Draft Created! 📖', `"${title}" was created from your photo.`, true)
    } catch {
      setError('Failed to create sermon from photo.')
    } finally {
      setIsProcessing(false)
    }
  }

  const finishSave = (title: string, detail: string, keepOpen = false) => {
    setSavedMessage({ title, detail })
    setSaved(true)
    try { window.dispatchEvent(new CustomEvent('smart_assistant_saved')) } catch {}
    if (!keepOpen) {
      setTimeout(() => {
        setIsOpen(false)
        setTimeout(() => { reset() }, 300)
      }, 2000)
    }
  }

  const saveSermon = async (userId: string) => {
    if (!parsed) return
    const title = (parsed.sermonTitle || parsed.task || '').trim()
    if (!title) { setError('Please enter a sermon title.'); return }

    const { data: sermon, error: sermonError } = await (supabase.from('sermons').insert({
      author_id: userId,
      title,
      status: 'draft',
      scripture_primary: parsed.scripture || null,
      preach_date: parsed.preachDate || null,
      series_name: parsed.seriesName || null,
    }).select('id').single() as any)
    if (sermonError) throw sermonError

    if (parsed.preachDate) {
      const preachEvent = {
        profile_id: userId,
        sermon_id: sermon.id,
        title: `Preach: ${title}`,
        event_type: 'sermon_preach',
        start_time: new Date(`${parsed.preachDate}T10:00:00`).toISOString(),
        end_time: new Date(`${parsed.preachDate}T11:00:00`).toISOString(),
        all_day: false,
      }
      const { error: eventError } = await (supabase.from('calendar_events').insert(preachEvent as any) as any)
      if (eventError) {
        await (supabase.from('calendar_events').insert({ ...preachEvent, event_type: 'service' } as any) as any)
      }
    }

    setNewSermonId(sermon.id)
    finishSave('Sermon Created! 📖', `"${title}" was added to your sermons as a draft.`, true)
  }

  const saveIdea = async (userId: string) => {
    if (!parsed) return
    const text = (parsed.ideaText || parsed.task || '').trim()
    if (!text) { setError('Please enter your idea.'); return }
    const content = parsed.scripture && !text.includes(parsed.scripture) ? `${text} (${parsed.scripture})` : text
    const { error: ideaError } = await (supabase.from('ideas').insert({
      profile_id: userId,
      content,
      source_type: mode === 'type' ? 'typed' : 'voice',
      archived: false,
    }) as any)
    if (ideaError) throw ideaError
    finishSave('Idea Saved! 💡', 'Added to your Ideas Inbox.')
  }

  const savePrayer = async (userId: string) => {
    if (!parsed) return
    const person = (parsed.prayerPerson || parsed.person || '').trim()
    const req = (parsed.prayerRequest || parsed.task || '').trim()
    if (!person || !req) { setError('Please enter a name and prayer request.'); return }
    const { error: prayerError } = await (supabase.from('prayer_requests').insert({
      profile_id: userId,
      person_name: person,
      request: req,
      category: (PRAYER_CATEGORIES.includes(parsed.prayerCategory || '') ? parsed.prayerCategory! : 'Other').toLowerCase(),
      priority: parsed.priority === 'urgent' ? 'urgent' : 'normal',
      status: 'active',
    }) as any)
    if (prayerError) throw prayerError
    finishSave('Added to Prayer List! 🙏', `${person} was added to your prayer list.`)
  }

  const saveReminder = async () => {
    if (!parsed) return
    setIsProcessing(true)
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      if (action === 'sermon') { await saveSermon(user.id); return }
      if (action === 'idea') { await saveIdea(user.id); return }
      if (action === 'prayer') { await savePrayer(user.id); return }

      if (parsed.createCalendarEvent !== false) {
        const startDate = parsed.time
          ? new Date(`${parsed.date}T${parsed.time}:00`)
          : new Date(`${parsed.date}T09:00:00`)
        const startTime = startDate.toISOString()

        let endTimeStr: string
        if (parsed.endTime) {
          endTimeStr = new Date(`${parsed.date}T${parsed.endTime}:00`).toISOString()
        } else {
          const endDate = new Date(startDate.getTime() + 60 * 60 * 1000)
          endTimeStr = endDate.toISOString()
        }

        // Determine event type
        const eventType = parsed.isStudyTime || parsed.category === 'study' ? 'sermon_study' :
          parsed.category === 'visit' ? 'visit' :
          parsed.category === 'personal' ? 'personal' : 'meeting'

        const isStudy = parsed.isStudyTime || parsed.category === 'study'

        await (supabase.from('calendar_events').insert({
          profile_id: user.id,
          title: isStudy ? `📚 ${parsed.task}` : parsed.task,
          event_type: eventType,
          start_time: startTime,
          end_time: endTimeStr,
          all_day: !parsed.time,
          description: isStudy ? 'study_time' : (parsed.person ? `Related to: ${parsed.person}` : null),
        }) as any)
      }

      if (parsed.createCareTask && !parsed.isStudyTime) {
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

      finishSave('Reminder Set! ✅', 'Added to your calendar and tasks.')
    } catch {
      setError('Failed to save. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const reset = () => {
    setParsed(null)
    setSaved(false)
    setNewSermonId(null)
    setTranscript('')
    setTypedText('')
    setPhotoPreviewUrl(null)
    setPhotoExtractedText('')
    setPhotoTitle('')
    setError('')
    setMode('choose')
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00')
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  }

  const inputClass = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#D0A348] focus:ring-1 focus:ring-[#D0A348]'
  const labelClass = 'text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block'

  if (!isOpen) {
    if (variant === 'modal') return null
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-[#022d5c] to-[#0a4a8a] text-white shadow-lg hover:shadow-xl transition-all group cursor-pointer"
      >
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors shrink-0">
          <Mic className="w-5 h-5" />
        </div>
        <div className="w-10 h-10 -ml-1 rounded-full bg-[#D0A348]/25 flex items-center justify-center group-hover:bg-[#D0A348]/35 transition-colors shrink-0">
          <Camera className="w-5 h-5 text-[#D0A348]" />
        </div>
        <div className="text-left">
          <p className="font-semibold text-sm">Smart Assistant (Voice, Type &amp; Photo to Text)</p>
          <p className="text-xs text-white/75">Speak, type, or snap a photo to set a reminder, add to calendar, start a sermon, save an idea, or add a prayer request</p>
        </div>
        <Sparkles className="w-5 h-5 text-[#D0A348] ml-auto shrink-0" />
      </button>
    )
  }

  const assistantCard = (
    <div className="w-full rounded-2xl bg-white border-2 border-[#022d5c] shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-[#022d5c] text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#D0A348]" />
          <span className="font-semibold text-sm">Smart Assistant</span>
        </div>
        <button onClick={() => { setIsOpen(false); stopListening(); reset() }} className="p-1 hover:bg-white/10 rounded-full cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 max-h-[80vh] overflow-y-auto">
        {/* Success */}
        {saved && (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
              <Check className="w-7 h-7 text-green-600" />
            </div>
            <p className="font-semibold text-gray-800">{savedMessage.title}</p>
            <p className="text-sm text-gray-500 mt-1">{savedMessage.detail}</p>
            {newSermonId && (
              <div className="flex gap-2 justify-center mt-4">
                <Link
                  href={`/sermons/${newSermonId}`}
                  onClick={() => { setIsOpen(false); setTimeout(() => reset(), 300) }}
                  className="px-4 py-2 rounded-xl bg-[#022d5c] text-white text-sm font-medium hover:bg-[#022d5c]/90"
                >
                  Open Sermon
                </Link>
                <button
                  onClick={() => { setIsOpen(false); setTimeout(() => reset(), 300) }}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        )}

        {/* Choose Mode */}
        {!saved && !parsed && mode === 'choose' && (
          <>
            <p className="text-sm text-gray-600 mb-3 text-center font-medium">
              Just speak, type, or snap a photo—tell the Assistant what you need:
            </p>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => { setMode('voice'); startListening() }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-200 hover:border-[#022d5c] hover:bg-[#022d5c]/5 transition-all cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-[#022d5c]/10 flex items-center justify-center">
                  <Mic className="w-6 h-6 text-[#022d5c]" />
                </div>
                <span className="text-xs font-semibold text-gray-800">Speak</span>
              </button>
              <button
                onClick={() => setMode('type')}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-200 hover:border-[#D0A348] hover:bg-[#D0A348]/5 transition-all cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-[#D0A348]/10 flex items-center justify-center">
                  <Keyboard className="w-6 h-6 text-[#D0A348]" />
                </div>
                <span className="text-xs font-semibold text-gray-800">Type</span>
              </button>
              <button
                onClick={() => setMode('photo')}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <Camera className="w-6 h-6 text-green-600" />
                </div>
                <span className="text-xs font-semibold text-gray-800">Snap Photo</span>
              </button>
            </div>

            {/* Organized What You Can Ask Guide */}
            <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
              <button
                type="button"
                onClick={() => { setMode('type'); setTypedText('Remind me to ') }}
                className="p-2.5 rounded-xl bg-gray-50 hover:bg-[#022d5c]/5 border border-gray-200/80 text-left transition-colors cursor-pointer"
              >
                <p className="text-xs font-bold text-[#022d5c]">📅 Calendar &amp; Reminders</p>
                <p className="text-[11px] text-gray-500 mt-0.5">&ldquo;Remind me to call Sister Mary Thursday at 2pm&rdquo; or &ldquo;Block study time tomorrow at 9am&rdquo;</p>
              </button>
              <button
                type="button"
                onClick={() => { setMode('type'); setTypedText('Add a new sermon titled ') }}
                className="p-2.5 rounded-xl bg-gray-50 hover:bg-[#022d5c]/5 border border-gray-200/80 text-left transition-colors cursor-pointer"
              >
                <p className="text-xs font-bold text-[#022d5c]">📖 Start a Sermon</p>
                <p className="text-[11px] text-gray-500 mt-0.5">&ldquo;Add a new sermon titled Walking by Faith from Luke 15 for next Sunday&rdquo;</p>
              </button>
              <button
                type="button"
                onClick={() => { setMode('type'); setTypedText('Add to the prayer list: ') }}
                className="p-2.5 rounded-xl bg-gray-50 hover:bg-[#022d5c]/5 border border-gray-200/80 text-left transition-colors cursor-pointer"
              >
                <p className="text-xs font-bold text-[#022d5c]">🙏 Prayer &amp; Care</p>
                <p className="text-[11px] text-gray-500 mt-0.5">&ldquo;Add Brother John to the prayer list for his surgery&rdquo;</p>
              </button>
              <button
                type="button"
                onClick={() => setMode('photo')}
                className="p-2.5 rounded-xl bg-gray-50 hover:bg-[#022d5c]/5 border border-gray-200/80 text-left transition-colors cursor-pointer"
              >
                <p className="text-xs font-bold text-[#022d5c]">📷 Notes &amp; Ideas</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Snap a photo of handwritten notes to convert to text, or say &ldquo;Save an idea about...&rdquo;</p>
              </button>
            </div>
          </>
        )}

        {/* Photo Mode (Quick Capture by Photo -> Convert to Text) */}
        {!saved && !parsed && mode === 'photo' && (
          <div className="space-y-4">
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoCapture}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoCapture}
            />

            {!photoPreviewUrl && !isProcessing && (
              <>
                <p className="text-sm text-gray-600 text-center">
                  Take a photo of handwritten sermon notes, a book page, or a bulletin to convert it directly into text:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl bg-[#D0A348] hover:bg-[#D0A348]/90 text-white font-semibold text-sm shadow-sm transition-all cursor-pointer"
                  >
                    <Camera className="w-5 h-5" />
                    Take Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl border-2 border-[#022d5c] text-[#022d5c] hover:bg-[#022d5c]/5 font-semibold text-sm transition-all cursor-pointer"
                  >
                    <Upload className="w-5 h-5" />
                    Upload Photo
                  </button>
                </div>
              </>
            )}

            {isProcessing && (
              <div className="text-center py-8 space-y-3">
                <Loader2 className="w-9 h-9 animate-spin text-[#D0A348] mx-auto" />
                <p className="text-sm font-medium text-[#022d5c]">Converting your photo to text...</p>
              </div>
            )}

            {photoPreviewUrl && !isProcessing && (
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photoPreviewUrl}
                      alt="Captured preview"
                      className="w-12 h-12 object-cover rounded-lg border border-gray-200"
                    />
                    <div>
                      <p className="text-xs font-bold text-[#022d5c]">Photo Converted to Text</p>
                      <p className="text-[11px] text-gray-500">Edit below if needed, then choose how to save</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoPreviewUrl(null)
                      setPhotoExtractedText('')
                      setError('')
                    }}
                    className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-[#022d5c] px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Retake
                  </button>
                </div>

                <div>
                  <label className={labelClass}>Extracted Text</label>
                  <textarea
                    rows={5}
                    value={photoExtractedText}
                    onChange={(e) => setPhotoExtractedText(e.target.value)}
                    placeholder="Extracted text will appear here..."
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={savePhotoDirectlyToIdeas}
                    disabled={!photoExtractedText.trim() || isProcessing}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#D0A348] hover:bg-[#D0A348]/90 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
                  >
                    <Lightbulb className="w-4 h-4" />
                    Save to Ideas
                  </button>
                  <button
                    type="button"
                    onClick={savePhotoDirectlyAsSermon}
                    disabled={!photoExtractedText.trim() || isProcessing}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#022d5c] hover:bg-[#022d5c]/90 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4" />
                    Save as Sermon
                  </button>
                  <button
                    type="button"
                    onClick={() => parseReminder(photoExtractedText)}
                    disabled={!photoExtractedText.trim() || isProcessing}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-[#022d5c] text-[#022d5c] hover:bg-[#022d5c]/5 text-xs font-semibold disabled:opacity-50 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-[#D0A348]" />
                    Smart Organize
                  </button>
                </div>
              </div>
            )}

            <button onClick={() => { setPhotoPreviewUrl(null); setPhotoExtractedText(''); setError(''); setMode('choose') }} className="w-full text-xs text-gray-400 mt-2 hover:text-gray-600">
              ← Back
            </button>
          </div>
        )}

        {/* Voice Mode */}
        {!saved && !parsed && mode === 'voice' && (
          <>
            <p className="text-sm text-gray-500 mb-4 text-center">
              {isListening ? 'Listening... tell me what you need' : 'Tap the mic to try again'}
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
                {isProcessing ? <><Loader2 className="w-4 h-4 animate-spin" /> Understanding...</> : <><Sparkles className="w-4 h-4" /> Continue</>}
              </button>
            )}
            <button onClick={() => setMode('choose')} className="w-full text-xs text-gray-400 mt-3 hover:text-gray-600">← Back</button>
          </>
        )}

        {/* Type Mode */}
        {!saved && !parsed && mode === 'type' && (
          <>
            <p className="text-sm text-gray-500 mb-3">Type what you need naturally:</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && parseReminder(typedText)}
                placeholder="e.g., Remind me to call Sister Mary on Thursday..."
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
            <p className="text-sm text-gray-600">Reading image...</p>
          </div>
        )}

        {/* Parsed Confirmation */}
        {!saved && parsed && (
          <>
            <p className="text-sm font-semibold text-gray-800 mb-2">Here&apos;s what I understood:</p>

            {/* Action switcher - lets the pastor correct what kind of item this is */}
            <div className="grid grid-cols-4 gap-1.5 mb-4">
              {ACTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setParsed({ ...parsed, action: value })}
                  className={`flex flex-col items-center gap-1 py-2 rounded-lg text-[11px] font-medium transition-all ${
                    action === value
                      ? 'bg-[#022d5c] text-white'
                      : 'bg-gray-50 border border-gray-200 text-gray-600 hover:border-[#022d5c]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            {/* Sermon */}
            {action === 'sermon' && (
              <div className="space-y-3 mb-4">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <label className={labelClass}>Sermon Title</label>
                  <input className={inputClass} value={parsed.sermonTitle ?? parsed.task ?? ''} onChange={(e) => setParsed({ ...parsed, sermonTitle: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <label className={labelClass}>Scripture</label>
                    <input className={inputClass} placeholder="Optional" value={parsed.scripture ?? ''} onChange={(e) => setParsed({ ...parsed, scripture: e.target.value || null })} />
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <label className={labelClass}>Preach Date</label>
                    <input type="date" className={inputClass} value={parsed.preachDate ?? ''} onChange={(e) => setParsed({ ...parsed, preachDate: e.target.value || null })} />
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <label className={labelClass}>Series</label>
                  <input className={inputClass} placeholder="Optional" value={parsed.seriesName ?? ''} onChange={(e) => setParsed({ ...parsed, seriesName: e.target.value || null })} />
                </div>
              </div>
            )}

            {/* Idea */}
            {action === 'idea' && (
              <div className="p-3 bg-gray-50 rounded-xl mb-4">
                <label className={labelClass}>Idea</label>
                <textarea rows={3} className={inputClass} value={parsed.ideaText ?? parsed.task ?? ''} onChange={(e) => setParsed({ ...parsed, ideaText: e.target.value })} />
                <p className="text-[11px] text-gray-400 mt-1.5">This will be saved to your Ideas Inbox.</p>
              </div>
            )}

            {/* Prayer */}
            {action === 'prayer' && (
              <div className="space-y-3 mb-4">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <label className={labelClass}>Name</label>
                  <input className={inputClass} value={parsed.prayerPerson ?? parsed.person ?? ''} onChange={(e) => setParsed({ ...parsed, prayerPerson: e.target.value })} />
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <label className={labelClass}>Prayer Request</label>
                  <textarea rows={2} className={inputClass} value={parsed.prayerRequest ?? parsed.task ?? ''} onChange={(e) => setParsed({ ...parsed, prayerRequest: e.target.value })} />
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <label className={labelClass}>Category</label>
                  <div className="flex flex-wrap gap-2">
                    {PRAYER_CATEGORIES.map((c) => (
                      <button
                        key={c}
                        onClick={() => setParsed({ ...parsed, prayerCategory: c })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          (parsed.prayerCategory || 'Other') === c
                            ? 'bg-[#022d5c] text-white'
                            : 'bg-white border border-gray-200 text-gray-600 hover:border-[#022d5c]'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Reminder */}
            {action === 'reminder' && (
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
                  <label className={labelClass}>Time</label>
                  <div className="flex items-center gap-3 flex-wrap">
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
                      <>
                        <input
                          type="time"
                          value={parsed.time}
                          onChange={(e) => setParsed({ ...parsed, time: e.target.value })}
                          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#D0A348]"
                        />
                        <span className="text-xs text-gray-400">to</span>
                        <input
                          type="time"
                          value={parsed.endTime || ''}
                          onChange={(e) => setParsed({ ...parsed, endTime: e.target.value || null })}
                          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#D0A348]"
                        />
                      </>
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
                  <label className={labelClass}>Type</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'call', label: '📞 Call' },
                      { value: 'visit', label: '🏠 Visit' },
                      { value: 'hospital', label: '🏥 Hospital' },
                      { value: 'study', label: '📚 Study' },
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
            )}

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
                {action === 'sermon' ? 'Create Sermon' : action === 'idea' ? 'Save Idea' : action === 'prayer' ? 'Add to Prayer List' : 'Confirm'}
              </button>
            </div>
          </>
        )}

        {error && <p className="text-sm text-red-500 text-center mt-3">{error}</p>}
      </div>
    </div>
  )

  if (variant === 'modal') {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          {assistantCard}
        </div>
      </div>
    )
  }

  return assistantCard
}
