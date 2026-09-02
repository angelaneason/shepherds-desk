'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday,
  parseISO,
  addDays,
  areIntervalsOverlapping
} from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, Loader2, Calendar as CalendarIcon, Clock, Trash2, Pencil, MapPin, BookOpen, Heart } from 'lucide-react'

const EVENT_TYPES = {
  sermon_study: { label: 'Sermon Study', color: 'bg-[#022d5c] text-white', defaultHex: '#022d5c' },
  meeting: { label: 'Meeting', color: 'bg-blue-500 text-white', defaultHex: '#3b82f6' },
  visit: { label: 'Visit', color: 'bg-green-500 text-white', defaultHex: '#22c55e' },
  personal: { label: 'Personal', color: 'bg-[#D0A348] text-white', defaultHex: '#D0A348' },
  service: { label: 'Service', color: 'bg-purple-500 text-white', defaultHex: '#a855f7' },
}

const DAY_MAP = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']

function expandEvent(event: any, startRange: Date, endRange: Date): any[] {
  if (!event.recurrence_rule) return [event]
  
  const rule: any = {}
  event.recurrence_rule.split(';').forEach((part: string) => {
    const [k, v] = part.split('=')
    if (k && v) rule[k] = v
  })
  
  const exdates = rule.EXDATE ? rule.EXDATE.split(',') : []

  const results: any[] = []
  const eventStart = parseISO(event.start_time)
  const eventEnd = parseISO(event.end_time)
  const duration = eventEnd.getTime() - eventStart.getTime()

  let current = new Date(eventStart)
  let iterations = 0
  
  // Just to avoid infinite loops, we bound by endRange + some buffer
  const absoluteEnd = new Date(endRange)
  absoluteEnd.setFullYear(absoluteEnd.getFullYear() + 1)
  const limitDate = new Date(Math.min(absoluteEnd.getTime(), endRange.getTime() + 30 * 24 * 60 * 60 * 1000))

  while (current <= limitDate && iterations < 2000) {
    const currentIsoDate = format(current, 'yyyyMMdd')
    let matches = false

    if (!exdates.includes(currentIsoDate)) {
      if (rule.FREQ === 'DAILY') {
        matches = true
      } else if (rule.FREQ === 'WEEKLY') {
        const interval = rule.INTERVAL ? parseInt(rule.INTERVAL) : 1
        
        const currentStartOfWeek = startOfWeek(current)
        const eventStartOfWeek = startOfWeek(eventStart)
        
        const weeksDiff = Math.floor((currentStartOfWeek.getTime() - eventStartOfWeek.getTime()) / (7 * 24 * 60 * 60 * 1000))
        
        if (weeksDiff >= 0 && weeksDiff % interval === 0) {
          if (rule.BYDAY) {
             const days = rule.BYDAY.split(',')
             if (days.includes(DAY_MAP[current.getDay()])) {
               matches = true
             }
          } else {
             if (current.getDay() === eventStart.getDay()) matches = true
          }
        }
      } else if (rule.FREQ === 'MONTHLY') {
        if (current.getDate() === eventStart.getDate()) matches = true
      }
    }
    
    if (matches && current >= startRange && current <= endRange) {
      const newStart = new Date(current)
      newStart.setHours(eventStart.getHours(), eventStart.getMinutes(), eventStart.getSeconds(), eventStart.getMilliseconds())
      const newEnd = new Date(newStart.getTime() + duration)
      results.push({ ...event, start_time: newStart.toISOString(), end_time: newEnd.toISOString(), id: `${event.id}_${newStart.getTime()}` })
    }
    
    current = addDays(current, 1)
    iterations++
  }
  return results
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<any[]>([])
  const [expandedEvents, setExpandedEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [eventType, setEventType] = useState<keyof typeof EVENT_TYPES>('meeting')
  const [eventDate, setEventDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [allDay, setAllDay] = useState(false)
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  
  const [repeat, setRepeat] = useState<'none'|'daily'|'weekly'|'bi-weekly'|'monthly'>('none')
  const [repeatDays, setRepeatDays] = useState<string[]>([])

  const [overlapWarning, setOverlapWarning] = useState<any>(null) // { event: ..., payload: ... }

  const supabase = createClient()

  const fetchEvents = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('profile_id', user.id)

      if (error) throw error
      setEvents(data || [])
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  useEffect(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart)
    const endDate = endOfWeek(monthEnd)
    
    let allExpanded: any[] = []
    events.forEach(e => {
      allExpanded = allExpanded.concat(expandEvent(e, subMonths(startDate, 1), addMonths(endDate, 1)))
    })
    
    allExpanded.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    setExpandedEvents(allExpanded)
  }, [events, currentDate])

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))
  const goToToday = () => setCurrentDate(new Date())

  const checkOverlapsAndSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    const startDateTime = new Date(`${eventDate}T${startTime}:00`)
    const endDateTime = new Date(`${eventDate}T${endTime}:00`)
    
    // Check overlaps on the selected date for sermon_study or personal
    const dayEvents = expandedEvents.filter(ev => isSameDay(parseISO(ev.start_time), startDateTime))
    
    const overlaps = dayEvents.some(ev => {
      if (ev.event_type !== 'sermon_study' && ev.event_type !== 'personal') return false
      
      const evStart = parseISO(ev.start_time)
      const evEnd = parseISO(ev.end_time)
      
      if (allDay || ev.all_day) return true // Any all day overlaps
      
      return areIntervalsOverlapping(
        { start: startDateTime, end: endDateTime },
        { start: evStart, end: evEnd }
      )
    })

    const payload = buildPayload(startDateTime, endDateTime)

    if (overlaps) {
      setOverlapWarning(payload)
    } else if (editingEvent && (editingEvent.recurrence_rule || editingEvent.id.includes('_'))) {
      setRecurringPrompt({ actionType: 'edit', event: editingEvent, payload })
    } else {
      executeSave(payload)
    }
  }

  const buildPayload = (startDateTime: Date, endDateTime: Date) => {
    let recurrence_rule = null
    if (repeat === 'daily') recurrence_rule = 'FREQ=DAILY'
    if (repeat === 'weekly') {
      recurrence_rule = 'FREQ=WEEKLY'
      if (repeatDays.length > 0) recurrence_rule += `;BYDAY=${repeatDays.join(',')}`
    }
    if (repeat === 'bi-weekly') {
      recurrence_rule = 'FREQ=WEEKLY;INTERVAL=2'
      if (repeatDays.length > 0) recurrence_rule += `;BYDAY=${repeatDays.join(',')}`
    }
    if (repeat === 'monthly') recurrence_rule = 'FREQ=MONTHLY'

    return {
      title: title.trim(),
      event_type: eventType,
      description: description.trim(),
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
      all_day: allDay,
      color: EVENT_TYPES[eventType].defaultHex,
      location: location.trim() || null,
      recurrence_rule
    }
  }

  const [editingEvent, setEditingEvent] = useState<any | null>(null)
  const [recurringPrompt, setRecurringPrompt] = useState<{
    actionType: 'edit' | 'delete'
    event: any
    payload?: any
  } | null>(null)

  const handleConfirmRecurringAction = async (scope: 'single' | 'series') => {
    if (!recurringPrompt) return
    const { actionType, event, payload } = recurringPrompt
    const realId = event.id.split('_')[0]
    const masterEvent = events.find(e => e.id === realId) || event
    const eventOccurrenceDate = format(parseISO(event.start_time), 'yyyyMMdd')

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      if (actionType === 'delete') {
        if (scope === 'series') {
          const { error } = await supabase
            .from('calendar_events')
            .delete()
            .eq('id', realId)
          if (error) throw error
          setEvents(events.filter(e => e.id !== realId))
        } else {
          // Exclude this single date from recurrence
          const currentRule = masterEvent.recurrence_rule || ''
          const updatedRule = currentRule.includes('EXDATE=')
            ? currentRule.replace('EXDATE=', `EXDATE=${eventOccurrenceDate},`)
            : `${currentRule};EXDATE=${eventOccurrenceDate}`

          const { data, error } = await supabase
            .from('calendar_events')
            .update({ recurrence_rule: updatedRule })
            .eq('id', realId)
            .select()
            .single()

          if (error) throw error
          if (data) {
            setEvents(events.map(e => e.id === realId ? data : e))
          }
        }
      } else if (actionType === 'edit' && payload) {
        if (scope === 'series') {
          const { data, error } = await supabase
            .from('calendar_events')
            .update(payload)
            .eq('id', realId)
            .select()
            .single()

          if (error) throw error
          if (data) {
            setEvents(events.map(e => e.id === realId ? data : e))
          }
        } else {
          // Exclude date from master event and add standalone event for this occurrence
          const currentRule = masterEvent.recurrence_rule || ''
          const updatedRule = currentRule.includes('EXDATE=')
            ? currentRule.replace('EXDATE=', `EXDATE=${eventOccurrenceDate},`)
            : `${currentRule};EXDATE=${eventOccurrenceDate}`

          await supabase
            .from('calendar_events')
            .update({ recurrence_rule: updatedRule })
            .eq('id', realId)

          const singlePayload = {
            ...payload,
            recurrence_rule: null,
            profile_id: user.id,
          }
          const { data: newEv, error: insertErr } = await supabase
            .from('calendar_events')
            .insert(singlePayload)
            .select()
            .single()

          if (insertErr) throw insertErr
          if (newEv) {
            const updatedMaster = { ...masterEvent, recurrence_rule: updatedRule }
            setEvents([...events.map(e => e.id === realId ? updatedMaster : e), newEv])
          }
        }

        setIsAddModalOpen(false)
        setEditingEvent(null)
        resetForm()
      }
    } catch (err: any) {
      console.error('Error handling recurring action:', err)
      alert(`Error: ${err?.message || 'Something went wrong'}`)
    } finally {
      setSaving(false)
      setRecurringPrompt(null)
      setOverlapWarning(null)
    }
  }

  const executeSave = async (payload: any) => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      if (editingEvent) {
        const { data, error } = await supabase
          .from('calendar_events')
          .update(payload)
          .eq('id', editingEvent.id)
          .select()
          .single()

        if (error) throw error

        if (data) {
          setEvents(events.map(e => e.id === editingEvent.id ? data : e))

          // 1. Sync linked Sermon if present
          if (editingEvent.sermon_id) {
            await (supabase
              .from('sermons')
              .update({
                title: payload.title,
                preach_date: eventDate,
                location: payload.location,
              } as any)
              .eq('id', editingEvent.sermon_id) as any)
          }

          // 2. Sync linked Care Task if present
          if (editingEvent.care_task_id) {
            await (supabase
              .from('care_tasks')
              .update({
                description: payload.title,
                due_date: eventDate,
                notes: payload.description || null,
              } as any)
              .eq('id', editingEvent.care_task_id) as any)
          }

          setIsAddModalOpen(false)
          setOverlapWarning(null)
          setEditingEvent(null)
          resetForm()
        }
      } else {
        const { data, error } = await supabase
          .from('calendar_events')
          .insert({ ...payload, profile_id: user.id })
          .select()
          .single()

        if (error) throw error

        if (data) {
          setEvents([...events, data])
          setIsAddModalOpen(false)
          setOverlapWarning(null)
          resetForm()
        }
      }
    } catch (error) {
      console.error('Error saving event:', error)
      alert('Error saving event. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteEvent = async (eventOrId: any) => {
    const realEvent = typeof eventOrId === 'string'
      ? expandedEvents.find(e => e.id === eventOrId) || events.find(e => e.id === eventOrId)
      : eventOrId

    if (!realEvent) return

    const isRecurring = !!realEvent.recurrence_rule || realEvent.id.includes('_')
    
    if (isRecurring) {
      setRecurringPrompt({
        actionType: 'delete',
        event: realEvent,
      })
      return
    }

    if (!confirm('Are you sure you want to delete this event?')) return

    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', realEvent.id)
      
      if (error) throw error
      setEvents(events.filter(e => e.id !== realEvent.id))
    } catch (error) {
      console.error('Error deleting event:', error)
    }
  }

  const resetForm = () => {
    setEditingEvent(null)
    setTitle('')
    setEventType('meeting')
    setEventDate(format(selectedDay || new Date(), 'yyyy-MM-dd'))
    setStartTime('09:00')
    setEndTime('10:00')
    setAllDay(false)
    setDescription('')
    setLocation('')
    setRepeat('none')
    setRepeatDays([])
  }

  const openAddModal = (date?: Date) => {
    resetForm()
    if (date) {
      setEventDate(format(date, 'yyyy-MM-dd'))
      setSelectedDay(date)
    } else {
      setEventDate(format(new Date(), 'yyyy-MM-dd'))
    }
    setIsAddModalOpen(true)
  }

  const openEditModal = (event: any) => {
    const realId = event.id.split('_')[0]
    const originalEvent = events.find(e => e.id === realId) || event

    setEditingEvent(originalEvent)
    setTitle(originalEvent.title || '')
    setEventType(originalEvent.event_type || 'meeting')
    
    const startDate = parseISO(originalEvent.start_time)
    const endDate = originalEvent.end_time ? parseISO(originalEvent.end_time) : new Date(startDate.getTime() + 60 * 60 * 1000)
    
    setEventDate(format(startDate, 'yyyy-MM-dd'))
    setStartTime(format(startDate, 'HH:mm'))
    setEndTime(format(endDate, 'HH:mm'))
    setAllDay(originalEvent.all_day || false)
    setDescription(originalEvent.description || '')
    setLocation(originalEvent.location || '')
    
    if (originalEvent.recurrence_rule) {
      if (originalEvent.recurrence_rule.includes('FREQ=DAILY')) setRepeat('daily')
      else if (originalEvent.recurrence_rule.includes('FREQ=MONTHLY')) setRepeat('monthly')
      else if (originalEvent.recurrence_rule.includes('INTERVAL=2')) setRepeat('bi-weekly')
      else if (originalEvent.recurrence_rule.includes('FREQ=WEEKLY')) setRepeat('weekly')
      
      const byDayMatch = originalEvent.recurrence_rule.match(/BYDAY=([A-Z,]+)/)
      if (byDayMatch) {
        setRepeatDays(byDayMatch[1].split(','))
      } else {
        setRepeatDays([])
      }
    } else {
      setRepeat('none')
      setRepeatDays([])
    }

    setIsAddModalOpen(true)
  }

  const applyTemplate = (template: string) => {
    resetForm()
    if (template === 'weekly-bible-study') {
      setTitle('Weekly Bible Study')
      setEventType('meeting')
      setRepeat('weekly')
      setRepeatDays(['WE'])
      setStartTime('19:00')
      setEndTime('20:00')
    } else if (template === 'weekly-service') {
      setTitle('Sunday Service')
      setEventType('service')
      setRepeat('weekly')
      setRepeatDays(['SU'])
      setStartTime('10:00')
      setEndTime('12:00')
    } else if (template === 'weekly-brotherhood') {
      setTitle('Brotherhood Meeting')
      setEventType('meeting')
      setRepeat('weekly')
      setRepeatDays(['SA'])
      setStartTime('08:00')
      setEndTime('09:30')
    } else if (template === 'monthly-prayer') {
      setTitle('Monthly Prayer Meeting')
      setEventType('meeting')
      setRepeat('monthly')
      setStartTime('19:00')
      setEndTime('21:00')
    }
  }

  const toggleDay = (d: string) => {
    setRepeatDays(prev => 
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
    )
  }

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart)
  const endDate = endOfWeek(monthEnd)
  
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate })
  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const getEventsForDay = (day: Date) => {
    return expandedEvents.filter(event => {
      const eventDate = new Date(event.start_time)
      return isSameDay(eventDate, day)
    })
  }

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : []

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ministry Calendar</h1>
        <Button onClick={() => openAddModal()} className="bg-[#022d5c] hover:bg-[#D0A348] text-white">
          <Plus className="w-4 h-4 mr-2" />
          Add Event
        </Button>
      </div>

      <div className="flex flex-1 gap-6 min-h-0">
        <Card className="flex-1 flex flex-col p-4 shadow-sm min-h-0">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold text-gray-800">
                {format(currentDate, 'MMMM yyyy')}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToToday}>Today</Button>
              <Button variant="outline" size="icon" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-t-lg overflow-hidden">
            {WEEKDAYS.map(day => (
              <div key={day} className="bg-gray-50 py-2 text-center text-sm font-medium text-gray-500">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-px bg-gray-200 border-x border-b border-gray-200 flex-1 rounded-b-lg overflow-hidden">
            {loading ? (
              <div className="col-span-7 flex justify-center items-center bg-white h-full min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-[#022d5c]" />
              </div>
            ) : (
              calendarDays.map((day) => {
                const dayEvents = getEventsForDay(day)
                const isSelected = selectedDay && isSameDay(day, selectedDay)
                
                return (
                  <div
                    key={day.toString()}
                    onClick={() => setSelectedDay(day)}
                    className={`min-h-[100px] bg-white p-2 transition-colors cursor-pointer hover:bg-gray-50 flex flex-col
                      ${!isSameMonth(day, monthStart) ? 'text-gray-400 bg-gray-50/50' : 'text-gray-900'}
                      ${isSelected ? 'ring-2 ring-inset ring-[#022d5c] bg-blue-50/30' : ''}
                    `}
                  >
                    <div className="flex justify-between items-start">
                      <span className={`text-sm font-medium h-7 w-7 flex items-center justify-center rounded-full
                        ${isToday(day) ? 'bg-[#022d5c] text-white' : ''}
                      `}>
                        {format(day, 'd')}
                      </span>
                    </div>
                    
                    <div className="mt-1 flex flex-col gap-1 overflow-y-auto flex-1 no-scrollbar">
                      {dayEvents.slice(0, 4).map(event => (
                        <div 
                          key={event.id}
                          className={`flex items-center text-xs px-1.5 py-1 rounded truncate ${EVENT_TYPES[event.event_type as keyof typeof EVENT_TYPES]?.color || 'bg-gray-200 text-gray-800'}`}
                          title={event.title}
                        >
                          <span className="truncate flex-1">
                            {event.all_day ? '' : `${format(parseISO(event.start_time), 'h:mm a')} `}{event.title}
                          </span>
                          {event.recurrence_rule && (
                            <span className="ml-1 opacity-70 flex-shrink-0" title="Recurring">↻</span>
                          )}
                        </div>
                      ))}
                      {dayEvents.length > 4 && (
                        <div className="text-xs text-gray-500 font-medium px-1">
                          +{dayEvents.length - 4} more
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </Card>

        {selectedDay && (
          <Card className="w-80 p-4 shadow-sm flex flex-col min-h-0">
            <div className="flex justify-between items-center mb-4 pb-4 border-b">
              <div>
                <h3 className="font-semibold text-lg">{format(selectedDay, 'EEEE')}</h3>
                <p className="text-sm text-gray-500">{format(selectedDay, 'MMMM d, yyyy')}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedDay(null)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <ScrollArea className="flex-1 pr-4">
              {selectedDayEvents.length === 0 ? (
                <div className="text-center py-10 text-gray-500 flex flex-col items-center">
                  <CalendarIcon className="h-10 w-10 mb-2 opacity-20" />
                  <p>No events scheduled</p>
                  <Button 
                    variant="link" 
                    className="text-[#D0A348] mt-2" 
                    onClick={() => openAddModal(selectedDay)}
                  >
                    Add an event
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedDayEvents.map(event => (
                    <div key={event.id} className="p-3 rounded-lg border bg-white shadow-sm flex flex-col gap-2 relative group">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-medium text-sm leading-tight pr-12">{event.title}</h4>
                        <div className="flex items-center gap-1 absolute top-2 right-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-gray-400 hover:text-[#022d5c]"
                            onClick={() => openEditModal(event)}
                            title="Edit event"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-gray-400 hover:text-red-500"
                            onClick={() => handleDeleteEvent(event.id)}
                            title="Delete event"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-1.5 mt-1">
                        <div className="flex items-center text-xs text-gray-500 gap-1.5">
                          <Clock className="h-3 w-3" />
                          <span>
                            {event.all_day 
                              ? 'All Day' 
                              : `${format(parseISO(event.start_time), 'h:mm a')} - ${format(parseISO(event.end_time), 'h:mm a')}`
                            }
                          </span>
                        </div>
                        {event.location && (
                          <div className="flex items-center text-xs text-gray-500 gap-1.5">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{event.location}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2 items-center flex-wrap mt-1">
                        <Badge className={`w-fit text-[10px] ${EVENT_TYPES[event.event_type as keyof typeof EVENT_TYPES]?.color}`} variant="secondary">
                          {EVENT_TYPES[event.event_type as keyof typeof EVENT_TYPES]?.label || event.event_type}
                        </Badge>
                        {event.recurrence_rule && (
                          <Badge variant="outline" className="text-[10px] bg-slate-50">Recurring</Badge>
                        )}
                      </div>

                      {event.sermon_id && (
                        <Link href={`/sermons/${event.sermon_id}`} className="mt-1 flex items-center text-xs text-[#022d5c] hover:underline font-medium">
                          <BookOpen className="h-3 w-3 mr-1" /> Open Sermon
                        </Link>
                      )}
                      
                      {event.care_task_id && (
                        <Link href={`/care`} className="mt-1 flex items-center text-xs text-green-600 hover:underline font-medium">
                          <Heart className="h-3 w-3 mr-1" /> Ministry Care
                        </Link>
                      )}

                      {event.description && (
                        <p className="text-xs text-gray-600 mt-2 line-clamp-3 p-2 bg-slate-50 rounded">
                          {event.description}
                        </p>
                      )}
                    </div>
                  ))}
                  
                  <Button 
                    variant="outline" 
                    className="w-full mt-4 border-dashed"
                    onClick={() => openAddModal(selectedDay)}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add Event
                  </Button>
                </div>
              )}
            </ScrollArea>
          </Card>
        )}
      </div>

      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Edit Event' : 'Add New Event'}</DialogTitle>
          </DialogHeader>
          
          {!editingEvent && (
            <div className="flex flex-wrap gap-2 pt-2 border-b pb-4">
              <span className="text-xs font-medium text-slate-500 w-full mb-1">Quick Templates:</span>
              <Badge variant="secondary" className="cursor-pointer hover:bg-slate-200" onClick={() => applyTemplate('weekly-bible-study')}>Bible Study</Badge>
              <Badge variant="secondary" className="cursor-pointer hover:bg-slate-200" onClick={() => applyTemplate('weekly-service')}>Sunday Service</Badge>
              <Badge variant="secondary" className="cursor-pointer hover:bg-slate-200" onClick={() => applyTemplate('weekly-brotherhood')}>Brotherhood</Badge>
              <Badge variant="secondary" className="cursor-pointer hover:bg-slate-200" onClick={() => applyTemplate('monthly-prayer')}>Prayer Meeting</Badge>
            </div>
          )}

          <ScrollArea className="max-h-[60vh] pr-4">
            <form id="event-form" onSubmit={checkOverlapsAndSave} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Event Title *</Label>
                <Input 
                  id="title" 
                  placeholder="Staff Meeting" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  required 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Event Type</Label>
                  <select 
                    id="type"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={eventType}
                    onChange={e => setEventType(e.target.value as keyof typeof EVENT_TYPES)}
                  >
                    {Object.entries(EVENT_TYPES).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input 
                    id="location" 
                    placeholder="e.g. Main Hall" 
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input 
                  id="date" 
                  type="date" 
                  value={eventDate} 
                  onChange={e => setEventDate(e.target.value)} 
                  required 
                />
              </div>

              <div className="flex items-center gap-2 mb-2 pt-2">
                <input 
                  type="checkbox" 
                  id="allday" 
                  checked={allDay} 
                  onChange={e => setAllDay(e.target.checked)}
                  className="rounded border-gray-300 text-[#022d5c] focus:ring-[#022d5c]"
                />
                <Label htmlFor="allday" className="cursor-pointer">All Day Event</Label>
              </div>

              {!allDay && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start">Start Time</Label>
                    <Input 
                      id="start" 
                      type="time" 
                      value={startTime} 
                      onChange={e => setStartTime(e.target.value)} 
                      required={!allDay}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end">End Time</Label>
                    <Input 
                      id="end" 
                      type="time" 
                      value={endTime} 
                      onChange={e => setEndTime(e.target.value)} 
                      required={!allDay}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-3 pt-2 pb-2">
                <Label htmlFor="repeat">Repeat</Label>
                <select 
                  id="repeat"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={repeat}
                  onChange={e => setRepeat(e.target.value as any)}
                >
                  <option value="none">None</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="bi-weekly">Bi-Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>

                {(repeat === 'weekly' || repeat === 'bi-weekly') && (
                  <div className="flex gap-1 justify-between pt-2">
                    {DAY_MAP.map((d) => (
                      <div 
                        key={d} 
                        onClick={() => toggleDay(d)}
                        className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium cursor-pointer transition-colors
                          ${repeatDays.includes(d) ? 'bg-[#022d5c] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}
                        `}
                      >
                        {d.charAt(0)}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="desc">Description (Optional)</Label>
                <Textarea 
                  id="desc" 
                  placeholder="Any notes for this event..." 
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="resize-none"
                />
              </div>
            </form>
          </ScrollArea>
          
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="event-form" disabled={!title.trim() || saving} className="bg-[#022d5c] hover:bg-[#D0A348] text-white">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : (editingEvent ? 'Update Event' : 'Save Event')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Overlap Warning Dialog */}
      <Dialog open={!!overlapWarning} onOpenChange={(open) => !open && setOverlapWarning(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              ⚠️ Scheduling Conflict
            </DialogTitle>
            <DialogDescription className="pt-3 text-slate-700 text-base font-medium">
              This overlaps with your study time or personal time. Your preparation is sacred — are you sure you want to schedule this?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 sm:justify-between flex-row">
            <Button variant="outline" onClick={() => setOverlapWarning(null)}>
              Reschedule
            </Button>
            <Button 
              className="bg-red-600 hover:bg-red-700 text-white" 
              onClick={() => {
                if (overlapWarning) executeSave(overlapWarning)
              }}
              disabled={saving}
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Schedule Anyway'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recurring Series Confirmation Dialog */}
      <Dialog open={!!recurringPrompt} onOpenChange={(open) => !open && setRecurringPrompt(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-[#022d5c] flex items-center gap-2">
              ↻ Recurring Event
            </DialogTitle>
            <DialogDescription className="pt-2 text-slate-700 text-sm">
              {recurringPrompt?.actionType === 'delete'
                ? 'This event is part of a recurring series. Would you like to delete only this occurrence or all future occurrences in the series?'
                : 'This event is part of a recurring series. Would you like to apply your changes to only this occurrence or the entire recurring series?'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-4">
            <Button 
              variant="outline"
              className="w-full justify-start text-left border-gray-200 hover:border-[#022d5c]"
              onClick={() => handleConfirmRecurringAction('single')}
              disabled={saving}
            >
              <div className="flex flex-col items-start">
                <span className="font-semibold text-[#022d5c]">
                  {recurringPrompt?.actionType === 'delete' ? 'Delete this event only' : 'Update this event only'}
                </span>
                <span className="text-xs text-gray-500">Other occurrences in the series will remain unchanged</span>
              </div>
            </Button>
            
            <Button 
              className={recurringPrompt?.actionType === 'delete' ? 'bg-red-600 hover:bg-red-700 text-white w-full justify-start text-left' : 'bg-[#022d5c] hover:bg-[#D0A348] text-white w-full justify-start text-left'}
              onClick={() => handleConfirmRecurringAction('series')}
              disabled={saving}
            >
              <div className="flex flex-col items-start">
                <span className="font-semibold">
                  {recurringPrompt?.actionType === 'delete' ? 'Delete all occurrences in series' : 'Update all occurrences in series'}
                </span>
                <span className="text-xs text-white/80">Applies across your weekly and monthly calendar</span>
              </div>
            </Button>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="ghost" size="sm" onClick={() => setRecurringPrompt(null)} disabled={saving}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
