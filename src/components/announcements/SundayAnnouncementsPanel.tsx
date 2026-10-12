'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Calendar, Sparkles, Printer, Copy, Check, Trash2, Edit3, Plus, X, 
  ChevronRight, ArrowLeft, Send, Clock, MapPin, CheckSquare, Square, 
  AlertCircle, RefreshCw, BookOpen, Layers
} from 'lucide-react'
import { 
  format, addDays, nextSunday, isSunday, parseISO, startOfDay, 
  endOfDay, addWeeks, addMonths 
} from 'date-fns'
import { expandEvent } from '@/lib/recurrence'
import { PulpitPrintModal } from './PulpitPrintModal'

export interface SundayAnnouncementRecord {
  id: string
  profile_id: string
  sunday_date: string
  title: string
  script_spoken: string
  script_bulletin: string
  script_sms: string
  included_event_ids?: string[]
  custom_items?: string[]
  created_at?: string
  updated_at?: string
}

interface SundayAnnouncementsPanelProps {
  pastorProfile: { full_name?: string; church_name?: string }
  onSendBroadcast?: (message: string) => void
}

type LookaheadScope = '7days' | '14days' | '30days' | 'custom'

export function SundayAnnouncementsPanel({
  pastorProfile,
  onSendBroadcast
}: SundayAnnouncementsPanelProps) {
  const supabase = createClient()

  // Archive state
  const [announcements, setAnnouncements] = useState<SundayAnnouncementRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Builder view mode: 'list' | 'builder' | 'view'
  const [viewMode, setViewMode] = useState<'list' | 'builder' | 'view'>('list')
  const [selectedRecord, setSelectedRecord] = useState<SundayAnnouncementRecord | null>(null)

  // Builder Setup state
  const getInitialSunday = () => {
    const today = new Date()
    return isSunday(today) ? format(today, 'yyyy-MM-dd') : format(nextSunday(today), 'yyyy-MM-dd')
  }

  const [targetSunday, setTargetSunday] = useState(getInitialSunday())
  const [scope, setScope] = useState<LookaheadScope>('7days')
  const [customEndDate, setCustomEndDate] = useState(format(addDays(new Date(), 14), 'yyyy-MM-dd'))

  // Calendar Events fetched for builder
  const [calendarEvents, setCalendarEvents] = useState<any[]>([])
  const [fetchingEvents, setFetchingEvents] = useState(false)
  const [selectedEventIds, setSelectedEventIds] = useState<Record<string, boolean>>({})

  // Custom Pastoral Announcements
  const [customItemInput, setCustomItemInput] = useState('')
  const [customItems, setCustomItems] = useState<string[]>([])

  // AI Generation State
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedTitle, setGeneratedTitle] = useState('')
  const [generatedSpoken, setGeneratedSpoken] = useState('')
  const [generatedBulletin, setGeneratedBulletin] = useState('')
  const [generatedSms, setGeneratedSms] = useState('')
  const [activeOutputTab, setActiveOutputTab] = useState<'spoken' | 'bulletin' | 'sms'>('spoken')
  const [isSaving, setIsSaving] = useState(false)

  // Print Modal State
  const [printModalOpen, setPrintModalOpen] = useState(false)
  const [printData, setPrintData] = useState<{
    title: string
    sundayDate: string
    scriptSpoken: string
    scriptBulletin: string
  }>({
    title: '',
    sundayDate: '',
    scriptSpoken: '',
    scriptBulletin: ''
  })

  // Feedback states
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // Load saved Sunday announcements on mount
  useEffect(() => {
    loadSavedAnnouncements()
  }, [])

  const loadSavedAnnouncements = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await fetch('/api/sunday-announcements')
      const json = await res.json()
      if (res.ok && json.announcements) {
        setAnnouncements(json.announcements)
      } else {
        throw new Error(json.error || 'Failed to load Sunday announcements')
      }
    } catch (err: any) {
      console.error('Error loading Sunday announcements:', err)
      setErrorMsg(err.message || 'Could not load saved announcements')
    } finally {
      setLoading(false)
    }
  }

  // Calculate the end date based on lookahead scope
  const calculateEndDate = (): Date => {
    const start = parseISO(targetSunday)
    if (scope === '7days') return addDays(start, 7)
    if (scope === '14days') return addDays(start, 14)
    if (scope === '30days') return addDays(start, 30)
    return parseISO(customEndDate)
  }

  // Load calendar events whenever targetSunday or scope changes in builder
  const loadCalendarEvents = async () => {
    setFetchingEvents(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const startDate = parseISO(targetSunday)
      const endDate = calculateEndDate()

      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('profile_id', user.id)

      if (error) throw error

      let allOccurrences: any[] = []
      ;(data || []).forEach((e: any) => {
        const expanded = expandEvent(e, startDate, endDate)
        allOccurrences = allOccurrences.concat(expanded)
      })

      // Filter occurrences strictly inside [startDate, endDate]
      const startTime = startDate.getTime()
      const endTime = endDate.getTime() + (24 * 60 * 60 * 1000 - 1)

      const inRange = allOccurrences.filter((occ: any) => {
        const occTime = new Date(occ.start_time).getTime()
        return occTime >= startTime && occTime <= endTime
      })

      // Sort chronologically
      inRange.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

      setCalendarEvents(inRange)

      // Intelligent pre-selection:
      // Include church services, public meetings, ministry gatherings.
      // Exclude personal appointments, doctor visits, private pastoral counseling.
      const initialSelection: Record<string, boolean> = {}
      inRange.forEach((ev: any, idx: number) => {
        const key = `${ev.id || idx}_${ev.start_time}`
        const titleLower = (ev.title || '').toLowerCase()
        const isPersonalType = ev.event_type === 'personal' || ev.event_type === 'visit' || ev.event_type === 'sermon_study'
        const isPrivateKeyword = titleLower.includes('doctor') || 
                                 titleLower.includes('dentist') || 
                                 titleLower.includes('counsel') || 
                                 titleLower.includes('private') || 
                                 titleLower.includes('personal') ||
                                 titleLower.includes('lunch with') ||
                                 titleLower.includes('dinner with')

        if (isPersonalType || isPrivateKeyword) {
          initialSelection[key] = false
        } else {
          initialSelection[key] = true
        }
      })

      setSelectedEventIds(initialSelection)
    } catch (err: any) {
      console.error('Error fetching calendar events:', err)
    } finally {
      setFetchingEvents(false)
    }
  }

  // Open the builder
  const startNewBuilder = () => {
    setSelectedRecord(null)
    setGeneratedTitle(`Sunday Announcements: ${targetSunday}`)
    setGeneratedSpoken('')
    setGeneratedBulletin('')
    setGeneratedSms('')
    setCustomItems([])
    setViewMode('builder')
    loadCalendarEvents()
  }

  // Add custom announcement item
  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customItemInput.trim()) return
    setCustomItems(prev => [...prev, customItemInput.trim()])
    setCustomItemInput('')
  }

  const handleRemoveCustomItem = (index: number) => {
    setCustomItems(prev => prev.filter((_, i) => i !== index))
  }

  // Toggle event selection
  const toggleEventSelection = (key: string) => {
    setSelectedEventIds(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  // Generate with AI
  const handleGenerate = async () => {
    setIsGenerating(true)
    setErrorMsg(null)
    try {
      // Gather selected events
      const selectedEvents = calendarEvents.filter((ev, idx) => {
        const key = `${ev.id || idx}_${ev.start_time}`
        return selectedEventIds[key]
      }).map(ev => ({
        title: ev.title,
        start_time: ev.start_time ? format(new Date(ev.start_time), 'EEE, MMM d @ h:mm a') : '',
        end_time: ev.end_time ? format(new Date(ev.end_time), 'h:mm a') : '',
        location: ev.location || '',
        description: ev.description || '',
        event_type: ev.event_type
      }))

      const payload = {
        sundayDate: targetSunday,
        pastorName: pastorProfile.full_name || '',
        churchName: pastorProfile.church_name || '',
        events: selectedEvents,
        customItems,
        tone: 'traditional'
      }

      const res = await fetch('/api/ai/sunday-announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate Sunday announcements')
      }

      setGeneratedTitle(data.title || `Sunday Announcements: ${targetSunday}`)
      setGeneratedSpoken(data.script_spoken || '')
      setGeneratedBulletin(data.script_bulletin || '')
      setGeneratedSms(data.script_sms || '')
    } catch (err: any) {
      console.error('Error generating announcements:', err)
      setErrorMsg(err.message || 'Failed to generate announcements')
    } finally {
      setIsGenerating(false)
    }
  }

  // Save announcements to database
  const handleSave = async () => {
    if (!generatedSpoken && !generatedBulletin) {
      setErrorMsg('Please generate announcements before saving.')
      return
    }

    setIsSaving(true)
    setErrorMsg(null)
    try {
      const selectedEventUuids = calendarEvents
        .filter((ev, idx) => selectedEventIds[`${ev.id || idx}_${ev.start_time}`] && ev.id)
        .map(ev => ev.id)

      const payload = {
        sunday_date: targetSunday,
        title: generatedTitle || `Sunday Announcements: ${targetSunday}`,
        script_spoken: generatedSpoken,
        script_bulletin: generatedBulletin,
        script_sms: generatedSms,
        included_event_ids: selectedEventUuids,
        custom_items: customItems
      }

      const res = await fetch('/api/sunday-announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const result = await res.json()
      if (!res.ok) {
        throw new Error(result.error || 'Failed to save Sunday announcements')
      }

      await loadSavedAnnouncements()
      setViewMode('list')
    } catch (err: any) {
      console.error('Error saving announcements:', err)
      setErrorMsg(err.message || 'Failed to save announcement')
    } finally {
      setIsSaving(false)
    }
  }

  // Delete announcement
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this saved Sunday announcement?')) return

    try {
      const res = await fetch(`/api/sunday-announcements?id=${id}`, {
        method: 'DELETE'
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete')
      }
      setAnnouncements(prev => prev.filter(a => a.id !== id))
      if (selectedRecord?.id === id) {
        setViewMode('list')
        setSelectedRecord(null)
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete announcement')
    }
  }

  // Open print modal
  const openPrintModal = (title: string, date: string, spoken: string, bulletin: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setPrintData({
      title,
      sundayDate: date,
      scriptSpoken: spoken,
      scriptBulletin: bulletin
    })
    setPrintModalOpen(true)
  }

  // Copy helper
  const handleCopyText = (text: string, key: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  // View a saved record
  const viewSavedRecord = (rec: SundayAnnouncementRecord) => {
    setSelectedRecord(rec)
    setGeneratedTitle(rec.title)
    setGeneratedSpoken(rec.script_spoken)
    setGeneratedBulletin(rec.script_bulletin)
    setGeneratedSms(rec.script_sms)
    setTargetSunday(rec.sunday_date)
    setCustomItems(rec.custom_items || [])
    setViewMode('view')
  }

  return (
    <div className="space-y-6">
      {/* Print Modal */}
      <PulpitPrintModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        title={printData.title}
        sundayDate={printData.sundayDate}
        churchName={pastorProfile.church_name}
        pastorName={pastorProfile.full_name}
        scriptSpoken={printData.scriptSpoken}
        scriptBulletin={printData.scriptBulletin}
      />

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* VIEW MODE 1: ARCHIVE LIST */}
      {viewMode === 'list' && (
        <div className="space-y-6">
          {/* Header Action Card */}
          <div className="bg-linear-to-r from-[#022d5c] to-[#0a4585] text-white p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-[#D0A348]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Pulpit Ready Workflow</span>
              </div>
              <h2 className="text-2xl font-bold">Sunday Announcements Hub</h2>
              <p className="text-white/80 text-sm max-w-xl">
                Scan your church calendar, filter out private items, and generate traditional, reverent Sunday announcements for the pulpit, bulletin, and congregation text.
              </p>
            </div>

            <Button
              onClick={startNewBuilder}
              className="bg-[#D0A348] hover:bg-[#b88c35] text-white font-bold px-5 py-3 rounded-xl shadow-md cursor-pointer flex items-center gap-2 shrink-0 self-start md:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Create Sunday Announcements</span>
            </Button>
          </div>

          {/* Archive List Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#022d5c]/70 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#D0A348]" />
                <span>Saved Sunday Announcements Archive</span>
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadSavedAnnouncements}
                disabled={loading}
                className="text-xs text-slate-500 hover:text-[#022d5c]"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#022d5c]/40" />
                Loading your saved Sunday announcements...
              </div>
            ) : announcements.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#022d5c]/5 text-[#022d5c] flex items-center justify-center mx-auto">
                  <Calendar className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-700">No Sunday Announcements Saved Yet</h4>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  Get ready for this upcoming Sunday by scanning your calendar and generating pulpit-ready announcement scripts.
                </p>
                <Button
                  onClick={startNewBuilder}
                  variant="outline"
                  className="border-[#022d5c] text-[#022d5c] hover:bg-[#022d5c]/10"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Create Your First Sunday Announcement
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {announcements.map((rec) => (
                  <Card
                    key={rec.id}
                    onClick={() => viewSavedRecord(rec)}
                    className="hover:shadow-md hover:border-[#D0A348]/60 transition-all cursor-pointer border-slate-200 bg-white"
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold text-[#D0A348] uppercase tracking-wider block">
                            {rec.sunday_date}
                          </span>
                          <CardTitle className="text-base font-bold text-[#022d5c] mt-0.5">
                            {rec.title}
                          </CardTitle>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => openPrintModal(rec.title, rec.sunday_date, rec.script_spoken, rec.script_bulletin, e)}
                            title="Pulpit Print"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#022d5c] hover:bg-slate-100 transition-colors"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDelete(rec.id, e)}
                            title="Delete"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-xs text-slate-600 line-clamp-3 font-serif bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        {rec.script_spoken || rec.script_bulletin}
                      </p>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 text-slate-400">
                        <span>Saved {rec.created_at ? format(new Date(rec.created_at), 'MMM d, yyyy') : ''}</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => handleCopyText(rec.script_spoken, `copy_${rec.id}`, e)}
                            className="text-[#022d5c] hover:underline flex items-center gap-1 font-medium"
                          >
                            {copiedKey === `copy_${rec.id}` ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-green-600" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy Script</span>
                              </>
                            )}
                          </button>

                          {onSendBroadcast && rec.script_sms && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                onSendBroadcast(rec.script_sms)
                              }}
                              className="text-[#D0A348] hover:underline flex items-center gap-1 font-semibold"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Broadcast</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW MODE 2: BUILDER (Creating New or Regenerating) */}
      {viewMode === 'builder' && (
        <div className="space-y-6">
          {/* Top Back Navigation Bar */}
          <div className="flex items-center justify-between border-b pb-4">
            <Button
              variant="ghost"
              onClick={() => setViewMode('list')}
              className="gap-2 text-[#022d5c] hover:bg-[#022d5c]/10"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Saved Announcements</span>
            </Button>

            <div className="text-right">
              <span className="text-xs text-slate-400 uppercase font-semibold">Creating For</span>
              <div className="text-sm font-bold text-[#022d5c]">
                Sunday, {targetSunday}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT COLUMN: Setup, Calendar Selection & Custom Items (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Step 1: Sunday Date and Range Card */}
              <Card className="border-slate-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold text-[#022d5c] flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#022d5c] text-white flex items-center justify-center text-xs">1</span>
                    Target Sunday & Calendar Scope
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs font-semibold text-slate-600">Upcoming Sunday Date</Label>
                    <Input
                      type="date"
                      value={targetSunday}
                      onChange={(e) => setTargetSunday(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                      Calendar Look-Ahead Scope
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setScope('7days')}
                        className={`px-2 py-1.5 text-xs font-semibold rounded-lg border text-center transition-all ${
                          scope === '7days'
                            ? 'bg-[#022d5c] text-white border-[#022d5c]'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        This Week (7d)
                      </button>
                      <button
                        type="button"
                        onClick={() => setScope('14days')}
                        className={`px-2 py-1.5 text-xs font-semibold rounded-lg border text-center transition-all ${
                          scope === '14days'
                            ? 'bg-[#022d5c] text-white border-[#022d5c]'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        2 Weeks (14d)
                      </button>
                      <button
                        type="button"
                        onClick={() => setScope('30days')}
                        className={`px-2 py-1.5 text-xs font-semibold rounded-lg border text-center transition-all ${
                          scope === '30days'
                            ? 'bg-[#022d5c] text-white border-[#022d5c]'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        1 Month (30d)
                      </button>
                    </div>
                  </div>

                  <Button
                    onClick={loadCalendarEvents}
                    variant="outline"
                    size="sm"
                    disabled={fetchingEvents}
                    className="w-full text-xs text-[#022d5c] border-[#022d5c]/30 hover:bg-[#022d5c]/5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${fetchingEvents ? 'animate-spin' : ''}`} />
                    Refresh Calendar Scan
                  </Button>
                </CardContent>
              </Card>

              {/* Step 2: Calendar Events Checklist Card */}
              <Card className="border-slate-200">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-bold text-[#022d5c] flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#022d5c] text-white flex items-center justify-center text-xs">2</span>
                    Select Events to Announce
                  </CardTitle>
                  <span className="text-xs text-slate-400 font-semibold">
                    {Object.values(selectedEventIds).filter(Boolean).length} of {calendarEvents.length} selected
                  </span>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-slate-500">
                    Church gatherings are pre-checked. Private meetings, visits, and study blocks are unchecked to protect privacy.
                  </p>

                  {fetchingEvents ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-[#022d5c]" />
                      Scanning calendar events...
                    </div>
                  ) : calendarEvents.length === 0 ? (
                    <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-500 border border-slate-200">
                      No calendar events found in this date window. You can add custom announcements below.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {calendarEvents.map((ev, idx) => {
                        const key = `${ev.id || idx}_${ev.start_time}`
                        const isChecked = !!selectedEventIds[key]
                        const isPersonal = ev.event_type === 'personal' || ev.event_type === 'visit' || ev.event_type === 'sermon_study'
                        
                        return (
                          <div
                            key={key}
                            onClick={() => toggleEventSelection(key)}
                            className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                              isChecked
                                ? 'bg-blue-50/60 border-blue-200 text-slate-900'
                                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                            }`}
                          >
                            <button
                              type="button"
                              className="mt-0.5 text-[#022d5c] shrink-0"
                            >
                              {isChecked ? (
                                <CheckSquare className="w-4 h-4 text-[#022d5c]" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-300" />
                              )}
                            </button>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className={`font-bold truncate ${isChecked ? 'text-[#022d5c]' : 'text-slate-600'}`}>
                                  {ev.title}
                                </span>
                                {isPersonal && (
                                  <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded shrink-0">
                                    Private
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  {format(new Date(ev.start_time), 'EEE, MMM d @ h:mm a')}
                                </span>
                                {ev.location && (
                                  <span className="flex items-center gap-1 truncate">
                                    <MapPin className="w-3 h-3 text-slate-400" />
                                    {ev.location}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Step 3: Custom Pastoral Announcements Card */}
              <Card className="border-slate-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold text-[#022d5c] flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#022d5c] text-white flex items-center justify-center text-xs">3</span>
                    Custom Pastoral Announcements
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <form onSubmit={handleAddCustomItem} className="flex gap-2">
                    <Input
                      placeholder="e.g. Benevolence collection, welcoming visitors, baby dedication..."
                      value={customItemInput}
                      onChange={(e) => setCustomItemInput(e.target.value)}
                      className="text-xs"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      className="bg-[#022d5c] text-white hover:bg-[#022d5c]/90 text-xs shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Add
                    </Button>
                  </form>

                  {customItems.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {customItems.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-2 p-2 bg-[#D0A348]/10 text-slate-800 rounded-lg text-xs border border-[#D0A348]/20"
                        >
                          <span className="truncate">{item}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomItem(idx)}
                            className="text-slate-400 hover:text-red-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Big Action Button: Generate */}
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full bg-[#D0A348] hover:bg-[#b88c35] text-white font-bold py-3.5 rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Composing Traditional Announcements...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Sunday Announcements</span>
                  </>
                )}
              </Button>
            </div>

            {/* RIGHT COLUMN: Generated Output, Review & Actions (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <Card className="border-slate-200 h-full flex flex-col">
                <CardHeader className="pb-3 border-b">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <Input
                        value={generatedTitle}
                        onChange={(e) => setGeneratedTitle(e.target.value)}
                        placeholder="Sunday Announcements Title"
                        className="font-bold text-[#022d5c] border-none shadow-none text-base px-0 h-auto focus-visible:ring-0"
                      />
                      <span className="text-xs text-slate-400">
                        Traditional tone &bull; Zero dash compliant
                      </span>
                    </div>

                    {/* Output Tab Switcher */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setActiveOutputTab('spoken')}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                          activeOutputTab === 'spoken'
                            ? 'bg-white text-[#022d5c] shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        🎙️ Pulpit Script
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveOutputTab('bulletin')}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                          activeOutputTab === 'bulletin'
                            ? 'bg-white text-[#022d5c] shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        📄 Bulletin / Slides
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveOutputTab('sms')}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                          activeOutputTab === 'sms'
                            ? 'bg-white text-[#022d5c] shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        💬 SMS Text
                      </button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 p-4 space-y-4 flex flex-col">
                  {/* Editor for Spoken Script */}
                  {activeOutputTab === 'spoken' && (
                    <div className="space-y-2 flex-1 flex flex-col">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Spoken Pulpit Script (Conversational & Reverent)</span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(generatedSpoken, 'spoken_builder')}
                          className="text-[#022d5c] hover:underline flex items-center gap-1 font-medium"
                        >
                          {copiedKey === 'spoken_builder' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedKey === 'spoken_builder' ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <Textarea
                        value={generatedSpoken}
                        onChange={(e) => setGeneratedSpoken(e.target.value)}
                        placeholder="Click 'Generate Sunday Announcements' on the left to create your spoken pulpit script..."
                        rows={16}
                        className="font-serif text-base leading-relaxed p-4 rounded-xl border-slate-200 bg-slate-50/50 flex-1 resize-y"
                      />
                    </div>
                  )}

                  {/* Editor for Bulletin / Slides */}
                  {activeOutputTab === 'bulletin' && (
                    <div className="space-y-2 flex-1 flex flex-col">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Church Bulletin & Projection Slides Text</span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(generatedBulletin, 'bulletin_builder')}
                          className="text-[#022d5c] hover:underline flex items-center gap-1 font-medium"
                        >
                          {copiedKey === 'bulletin_builder' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedKey === 'bulletin_builder' ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <Textarea
                        value={generatedBulletin}
                        onChange={(e) => setGeneratedBulletin(e.target.value)}
                        placeholder="Click 'Generate Sunday Announcements' on the left to create your bulletin and slide notes..."
                        rows={16}
                        className="font-mono text-sm leading-relaxed p-4 rounded-xl border-slate-200 bg-slate-50/50 flex-1 resize-y"
                      />
                    </div>
                  )}

                  {/* Editor for SMS Text */}
                  {activeOutputTab === 'sms' && (
                    <div className="space-y-2 flex-1 flex flex-col">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Congregation SMS Broadcast</span>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-[11px] text-slate-400">
                            {generatedSms.length} characters
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyText(generatedSms, 'sms_builder')}
                            className="text-[#022d5c] hover:underline flex items-center gap-1 font-medium"
                          >
                            {copiedKey === 'sms_builder' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedKey === 'sms_builder' ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      </div>
                      <Textarea
                        value={generatedSms}
                        onChange={(e) => setGeneratedSms(e.target.value)}
                        placeholder="Click 'Generate Sunday Announcements' on the left to create your SMS reminder..."
                        rows={8}
                        className="font-sans text-sm leading-relaxed p-4 rounded-xl border-slate-200 bg-slate-50/50 resize-y"
                      />

                      {onSendBroadcast && generatedSms && (
                        <div className="pt-2">
                          <Button
                            type="button"
                            onClick={() => onSendBroadcast(generatedSms)}
                            variant="outline"
                            className="w-full border-[#D0A348] text-[#D0A348] hover:bg-[#D0A348]/10 font-bold gap-2 text-xs"
                          >
                            <Send className="w-3.5 h-3.5" />
                            Load into Text Broadcast Tab
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions Footer Bar */}
                  <div className="pt-4 border-t flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        onClick={() => openPrintModal(generatedTitle, targetSunday, generatedSpoken, generatedBulletin)}
                        disabled={!generatedSpoken && !generatedBulletin}
                        variant="outline"
                        className="border-[#022d5c] text-[#022d5c] hover:bg-[#022d5c]/10 gap-1.5 text-xs font-semibold"
                      >
                        <Printer className="w-4 h-4" />
                        Pulpit Print
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setViewMode('list')}
                        className="text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving || (!generatedSpoken && !generatedBulletin)}
                        className="bg-[#022d5c] text-white hover:bg-[#022d5c]/90 text-xs font-bold px-5"
                      >
                        {isSaving ? 'Saving...' : 'Save to Archive'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 3: VIEW & EDIT SAVED RECORD */}
      {viewMode === 'view' && selectedRecord && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <Button
              variant="ghost"
              onClick={() => setViewMode('list')}
              className="gap-2 text-[#022d5c] hover:bg-[#022d5c]/10"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Saved Announcements</span>
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openPrintModal(generatedTitle, targetSunday, generatedSpoken, generatedBulletin)}
                className="border-[#022d5c] text-[#022d5c] hover:bg-[#022d5c]/10 gap-1.5 text-xs font-semibold"
              >
                <Printer className="w-4 h-4" />
                Pulpit Print
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="bg-[#022d5c] text-white hover:bg-[#022d5c]/90 text-xs font-bold"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>

          <Card className="border-slate-200">
            <CardHeader className="pb-3 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <Input
                    value={generatedTitle}
                    onChange={(e) => setGeneratedTitle(e.target.value)}
                    className="font-bold text-xl text-[#022d5c] border-none shadow-none px-0 h-auto focus-visible:ring-0"
                  />
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                    <span>Service Date: <strong>{targetSunday}</strong></span>
                    <span>&bull;</span>
                    <span>Saved: {selectedRecord.created_at ? format(new Date(selectedRecord.created_at), 'MMM d, yyyy') : ''}</span>
                  </div>
                </div>

                {/* Output Tab Switcher */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setActiveOutputTab('spoken')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                      activeOutputTab === 'spoken'
                        ? 'bg-white text-[#022d5c] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🎙️ Pulpit Script
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveOutputTab('bulletin')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                      activeOutputTab === 'bulletin'
                        ? 'bg-white text-[#022d5c] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    📄 Bulletin / Slides
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveOutputTab('sms')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                      activeOutputTab === 'sms'
                        ? 'bg-white text-[#022d5c] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    💬 SMS Text
                  </button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              {activeOutputTab === 'spoken' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Spoken Pulpit Script (Conversational & Reverent)</span>
                    <button
                      type="button"
                      onClick={() => handleCopyText(generatedSpoken, 'view_spoken')}
                      className="text-[#022d5c] hover:underline flex items-center gap-1 font-medium"
                    >
                      {copiedKey === 'view_spoken' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedKey === 'view_spoken' ? 'Copied' : 'Copy Script'}
                    </button>
                  </div>
                  <Textarea
                    value={generatedSpoken}
                    onChange={(e) => setGeneratedSpoken(e.target.value)}
                    rows={18}
                    className="font-serif text-base leading-relaxed p-4 rounded-xl border-slate-200 bg-slate-50/50 resize-y"
                  />
                </div>
              )}

              {activeOutputTab === 'bulletin' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Church Bulletin & Projection Slides Text</span>
                    <button
                      type="button"
                      onClick={() => handleCopyText(generatedBulletin, 'view_bulletin')}
                      className="text-[#022d5c] hover:underline flex items-center gap-1 font-medium"
                    >
                      {copiedKey === 'view_bulletin' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedKey === 'view_bulletin' ? 'Copied' : 'Copy Bulletin'}
                    </button>
                  </div>
                  <Textarea
                    value={generatedBulletin}
                    onChange={(e) => setGeneratedBulletin(e.target.value)}
                    rows={18}
                    className="font-mono text-sm leading-relaxed p-4 rounded-xl border-slate-200 bg-slate-50/50 resize-y"
                  />
                </div>
              )}

              {activeOutputTab === 'sms' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Congregation SMS Broadcast</span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[11px] text-slate-400">
                        {generatedSms.length} characters
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyText(generatedSms, 'view_sms')}
                        className="text-[#022d5c] hover:underline flex items-center gap-1 font-medium"
                      >
                        {copiedKey === 'view_sms' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedKey === 'view_sms' ? 'Copied' : 'Copy SMS'}
                      </button>
                    </div>
                  </div>
                  <Textarea
                    value={generatedSms}
                    onChange={(e) => setGeneratedSms(e.target.value)}
                    rows={8}
                    className="font-sans text-sm leading-relaxed p-4 rounded-xl border-slate-200 bg-slate-50/50 resize-y"
                  />

                  {onSendBroadcast && generatedSms && (
                    <Button
                      type="button"
                      onClick={() => onSendBroadcast(generatedSms)}
                      variant="outline"
                      className="border-[#D0A348] text-[#D0A348] hover:bg-[#D0A348]/10 font-bold gap-2 text-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Load into Text Broadcast Tab
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
