'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { createClient } from '@/lib/supabase/client'
import { CalendarEvent } from '@/types/database'
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
  parseISO
} from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, Loader2, Calendar as CalendarIcon, Clock, Trash2 } from 'lucide-react'

const EVENT_TYPES = {
  sermon_study: { label: 'Sermon Study', color: 'bg-[#082C50] text-white', defaultHex: '#082C50' },
  meeting: { label: 'Meeting', color: 'bg-blue-500 text-white', defaultHex: '#3b82f6' },
  visit: { label: 'Visit', color: 'bg-green-500 text-white', defaultHex: '#22c55e' },
  personal: { label: 'Personal', color: 'bg-[#D0A348] text-white', defaultHex: '#D0A348' },
  service: { label: 'Service', color: 'bg-purple-500 text-white', defaultHex: '#a855f7' },
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
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

  const supabase = createClient()

  const fetchEvents = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch events for a wide range (e.g. current year) or just no bounds for simplicity
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('profile_id', user.id)
        .order('start_time', { ascending: true })

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

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))
  const goToToday = () => setCurrentDate(new Date())

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const startDateTime = new Date(`${eventDate}T${startTime}:00`).toISOString()
      const endDateTime = new Date(`${eventDate}T${endTime}:00`).toISOString()

      const { data, error } = await supabase
        .from('calendar_events')
        .insert({
          profile_id: user.id,
          title: title.trim(),
          event_type: eventType,
          description: description.trim(),
          start_time: startDateTime,
          end_time: endDateTime,
          all_day: allDay,
          color: EVENT_TYPES[eventType].defaultHex
        })
        .select()
        .single()

      if (error) throw error

      if (data) {
        setEvents([...events, data])
        setIsAddModalOpen(false)
        resetForm()
        if (selectedDay && isSameDay(selectedDay, new Date(eventDate))) {
          // Keep it open if we added to the currently selected day
        }
      }
    } catch (error) {
      console.error('Error saving event:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return

    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      setEvents(events.filter(e => e.id !== id))
    } catch (error) {
      console.error('Error deleting event:', error)
    }
  }

  const resetForm = () => {
    setTitle('')
    setEventType('meeting')
    setEventDate(format(selectedDay || new Date(), 'yyyy-MM-dd'))
    setStartTime('09:00')
    setEndTime('10:00')
    setAllDay(false)
    setDescription('')
  }

  const openAddModal = (date?: Date) => {
    if (date) {
      setEventDate(format(date, 'yyyy-MM-dd'))
      setSelectedDay(date)
    } else {
      setEventDate(format(new Date(), 'yyyy-MM-dd'))
    }
    setIsAddModalOpen(true)
  }

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart)
  const endDate = endOfWeek(monthEnd)
  
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate })
  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start_time)
      return isSameDay(eventDate, day)
    })
  }

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : []

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ministry Calendar</h1>
        <Button onClick={() => openAddModal()} className="bg-[#082C50] hover:bg-[#D0A348] text-white">
          <Plus className="w-4 h-4 mr-2" />
          Add Event
        </Button>
      </div>

      <div className="flex flex-1 gap-6 min-h-0">
        {/* Calendar Main View */}
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
                <Loader2 className="h-8 w-8 animate-spin text-[#082C50]" />
              </div>
            ) : (
              calendarDays.map((day, dayIdx) => {
                const dayEvents = getEventsForDay(day)
                const isSelected = selectedDay && isSameDay(day, selectedDay)
                
                return (
                  <div
                    key={day.toString()}
                    onClick={() => setSelectedDay(day)}
                    className={`min-h-[100px] bg-white p-2 transition-colors cursor-pointer hover:bg-gray-50 flex flex-col
                      ${!isSameMonth(day, monthStart) ? 'text-gray-400 bg-gray-50/50' : 'text-gray-900'}
                      ${isSelected ? 'ring-2 ring-inset ring-[#082C50] bg-blue-50/30' : ''}
                    `}
                  >
                    <div className="flex justify-between items-start">
                      <span className={`text-sm font-medium h-7 w-7 flex items-center justify-center rounded-full
                        ${isToday(day) ? 'bg-[#082C50] text-white' : ''}
                      `}>
                        {format(day, 'd')}
                      </span>
                    </div>
                    
                    <div className="mt-1 flex flex-col gap-1 overflow-y-auto flex-1 no-scrollbar">
                      {dayEvents.slice(0, 3).map(event => (
                        <div 
                          key={event.id}
                          className={`text-xs px-1.5 py-1 rounded truncate ${EVENT_TYPES[event.event_type as keyof typeof EVENT_TYPES]?.color || 'bg-gray-200 text-gray-800'}`}
                          title={event.title}
                        >
                          {event.all_day ? '' : `${format(parseISO(event.start_time), 'h:mm a')} `}{event.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-gray-500 font-medium px-1">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </Card>

        {/* Selected Day Panel */}
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
                    <div key={event.id} className="p-3 rounded-lg border bg-white shadow-sm flex flex-col gap-2">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-medium text-sm leading-tight">{event.title}</h4>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-gray-400 hover:text-red-500 -mt-1 -mr-1 shrink-0"
                          onClick={() => handleDeleteEvent(event.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center text-xs text-gray-500 gap-1.5">
                        <Clock className="h-3 w-3" />
                        <span>
                          {event.all_day 
                            ? 'All Day' 
                            : `${format(parseISO(event.start_time), 'h:mm a')} - ${format(parseISO(event.end_time), 'h:mm a')}`
                          }
                        </span>
                      </div>
                      
                      <Badge className={`w-fit text-[10px] ${EVENT_TYPES[event.event_type as keyof typeof EVENT_TYPES]?.color}`} variant="secondary">
                        {EVENT_TYPES[event.event_type as keyof typeof EVENT_TYPES]?.label || event.event_type}
                      </Badge>

                      {event.description && (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-3">
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

      {/* Add Event Dialog */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Event</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEvent} className="space-y-4 mt-4">
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
            
            <div className="space-y-2">
              <Label htmlFor="type">Event Type</Label>
              <select 
                id="type"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={eventType}
                onChange={e => setEventType(e.target.value as keyof typeof EVENT_TYPES)}
              >
                {Object.entries(EVENT_TYPES).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
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

            <div className="flex items-center gap-2 mb-2">
              <input 
                type="checkbox" 
                id="allday" 
                checked={allDay} 
                onChange={e => setAllDay(e.target.checked)}
                className="rounded border-gray-300 text-[#082C50] focus:ring-[#082C50]"
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

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!title.trim() || saving} className="bg-[#082C50] hover:bg-[#D0A348] text-white">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Save Event'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
