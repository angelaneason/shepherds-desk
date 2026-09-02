'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, Users, BookOpen, Clock, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

// Helper for date formatting
const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  })
}

// Generate calendar days
const getDaysInMonth = (year: number, month: number) => {
  const date = new Date(year, month, 1)
  const days = []
  
  // Fill in blanks before the 1st of the month
  const firstDay = date.getDay()
  for (let i = 0; i < firstDay; i++) {
    days.push(null)
  }
  
  while (date.getMonth() === month) {
    days.push(new Date(date))
    date.setDate(date.getDate() + 1)
  }
  return days
}

export default function DashboardPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  
  const [currentDate, setCurrentDate] = useState(new Date(2026, 8, 1)) // Sep 1, 2026 based on requirements
  const [selectedDay, setSelectedDay] = useState(new Date(2026, 8, 1))
  
  const [todayEventsCount, setTodayEventsCount] = useState(0)
  const [pendingCareCount, setPendingCareCount] = useState(0)
  const [studyHours, setStudyHours] = useState(0)
  
  const [calendarEvents, setCalendarEvents] = useState<any[]>([])
  const [nextSermon, setNextSermon] = useState<any>(null)
  const [careTasks, setCareTasks] = useState<any[]>([])

  const currentHour = new Date().getHours()
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening'

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // We wrap calls in try-catch in case tables are missing
      try {
        // Fetch Calendar Events for current month
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString()
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59).toISOString()
        
        const { data: events } = await supabase
          .from('calendar_events')
          .select('*')
          .gte('start_time', startOfMonth)
          .lte('start_time', endOfMonth)

        if (events) setCalendarEvents(events)

        // Count today's events
        const todayStr = selectedDay.toISOString().split('T')[0]
        const todays = events?.filter(e => e.start_time?.startsWith(todayStr)) || []
        setTodayEventsCount(todays.length)
        
        // Mock study hours (could be calculated from events where type = 'study')
        setStudyHours(8) // placeholder

        // Fetch Next Sermon
        const { data: sermons } = await supabase
          .from('sermons')
          .select('*')
          .gte('preach_date', new Date().toISOString())
          .order('preach_date', { ascending: true })
          .limit(1)
        
        if (sermons && sermons.length > 0) {
          setNextSermon(sermons[0])
        }

        // Fetch pending care tasks
        const { data: tasks } = await supabase
          .from('care_tasks')
          .select('*, members(*)')
          .eq('status', 'pending')
        
        if (tasks) {
          setCareTasks(tasks)
          setPendingCareCount(tasks.length)
        }
        
      } catch (e) {
        console.error('Error fetching dashboard data', e)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [supabase, currentDate, selectedDay])

  const days = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth())
  const todayStr = selectedDay.toISOString().split('T')[0]

  const selectedDayEvents = calendarEvents.filter(e => e.start_time?.startsWith(todayStr))
  
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }
  
  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const getSermonProgress = (status: string) => {
    switch (status) {
      case 'draft': return 25
      case 'review': return 50
      case 'ready': return 75
      case 'preached': return 100
      default: return 0
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]">Loading dashboard...</div>
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-[#022d5c] font-playfair">{greeting}, Pastor</h1>
        <p className="text-gray-500 mt-2">{formatDate(new Date())}</p>
      </div>

      {/* Top Section: Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-sm rounded-xl border-gray-100">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                <CalendarDays className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold tracking-wider text-gray-500 uppercase">Today</p>
                <p className="text-2xl font-bold text-[#022d5c]">{todayEventsCount}</p>
                <p className="text-sm text-gray-500">scheduled commitments</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-xl border-gray-100">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#fbf3db] text-[#D0A348] rounded-lg">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold tracking-wider text-gray-500 uppercase">People</p>
                <p className="text-2xl font-bold text-[#022d5c]">{pendingCareCount}</p>
                <p className="text-sm text-gray-500">follow-ups due</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-xl border-gray-100">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#fbf3db] text-[#D0A348] rounded-lg">
                <BookOpen className="w-6 h-6" />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold tracking-wider text-gray-500 uppercase">Next Message</p>
                <p className="text-lg font-bold text-[#022d5c] truncate">{nextSermon?.title || 'None planned'}</p>
                <p className="text-sm text-gray-500 capitalize">{nextSermon?.status || 'No status'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-xl border-gray-100">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold tracking-wider text-gray-500 uppercase">Study Time</p>
                <p className="text-2xl font-bold text-[#022d5c]">{studyHours}h</p>
                <p className="text-sm text-gray-500">protected this week</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Middle Section: Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Ministry Calendar */}
        <Card className="lg:col-span-2 shadow-sm rounded-xl border-gray-100">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-xl font-bold text-[#022d5c]">Ministry Calendar</CardTitle>
            <div className="flex items-center gap-4">
              <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-100 rounded">
                <ChevronLeft className="w-5 h-5 text-gray-500" />
              </button>
              <span className="font-medium text-[#022d5c]">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <button onClick={handleNextMonth} className="p-1 hover:bg-gray-100 rounded">
                <ChevronRight className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-xs font-semibold text-gray-400 uppercase py-2">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, idx) => {
                if (!day) return <div key={`empty-${idx}`} className="h-16 rounded-md bg-gray-50/50" />
                
                const isSelected = day.getTime() === selectedDay.getTime()
                const dayStr = day.toISOString().split('T')[0]
                const dayEvents = calendarEvents.filter(e => e.start_time?.startsWith(dayStr))
                
                return (
                  <div 
                    key={idx}
                    onClick={() => setSelectedDay(day)}
                    className={cn(
                      "h-16 p-1 border border-gray-100 rounded-md cursor-pointer hover:bg-gray-50 transition-colors relative flex flex-col items-center",
                      isSelected && "ring-2 ring-[#022d5c] ring-offset-1 border-transparent bg-blue-50/30"
                    )}
                  >
                    <span className={cn(
                      "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full mt-1",
                      isSelected ? "bg-[#022d5c] text-white" : "text-gray-700"
                    )}>
                      {day.getDate()}
                    </span>
                    <div className="flex gap-1 mt-auto pb-1">
                      {dayEvents.map((e, i) => {
                        let dotColor = "bg-gray-400"
                        if (e.event_type === 'church') dotColor = "bg-blue-500"
                        if (e.event_type === 'care') dotColor = "bg-green-500"
                        if (e.event_type === 'personal') dotColor = "bg-[#D0A348]"
                        return (
                          <div key={i} className={cn("w-1.5 h-1.5 rounded-full", dotColor)} />
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
            
            <div className="flex items-center gap-6 mt-6 pt-4 border-t border-gray-100 text-sm">
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Church</div>
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-green-500" /> Care</div>
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#D0A348]" /> Personal</div>
            </div>
          </CardContent>
        </Card>

        {/* Right: Stacked Panels */}
        <div className="space-y-6">
          {/* Selected Day */}
          <Card className="shadow-sm rounded-xl border-gray-100 h-1/2">
            <CardHeader className="pb-3 border-b border-gray-50">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-[#D0A348]" />
                <CardTitle className="text-lg font-bold text-[#022d5c]">Selected Day</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="font-medium text-gray-700 mb-4">{formatDate(selectedDay)}</p>
              <div className="space-y-3 max-h-40 overflow-y-auto pr-2">
                {selectedDayEvents.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No events scheduled.</p>
                ) : (
                  selectedDayEvents.map((e, i) => {
                    let dotColor = "bg-gray-400"
                    if (e.event_type === 'church') dotColor = "bg-blue-500"
                    if (e.event_type === 'care') dotColor = "bg-green-500"
                    if (e.event_type === 'personal') dotColor = "bg-[#D0A348]"
                    
                    const time = e.start_time ? new Date(e.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''
                    return (
                      <div key={i} className="flex items-start gap-3">
                        <div className={cn("w-2 h-2 rounded-full mt-1.5 flex-shrink-0", dotColor)} />
                        <div>
                          <p className="text-sm font-medium text-[#022d5c]">{e.title}</p>
                          <p className="text-xs text-gray-500">{time}</p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Next Sermon */}
          <Card className="shadow-sm rounded-xl border-[#fbf3db] bg-[#faf8f5]">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="w-5 h-5 text-[#D0A348]" />
                <CardTitle className="text-lg font-bold text-[#022d5c]">Next Sermon</CardTitle>
              </div>
              {nextSermon ? (
                <>
                  <h3 className="text-xl font-bold text-[#022d5c] font-playfair">{nextSermon.title}</h3>
                  <p className="text-sm font-medium text-[#D0A348]">{nextSermon.scripture || 'No scripture set'}</p>
                </>
              ) : (
                <p className="text-sm text-gray-500 italic">No upcoming sermons</p>
              )}
            </CardHeader>
            {nextSermon && (
              <CardContent>
                <div className="mt-2 mb-5">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-gray-500 font-medium">Draft Progress</span>
                    <span className="text-[#022d5c] font-bold capitalize">{nextSermon.status}</span>
                  </div>
                  <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#D0A348] rounded-full transition-all"
                      style={{ width: `${getSermonProgress(nextSermon.status)}%` }}
                    />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Link href={`/sermons/${nextSermon.id}`} className="flex-1 bg-[#022d5c] hover:bg-[#061e38] text-white text-xs h-9 rounded-md flex items-center justify-center font-medium">Open Study</Link>
                  <Link href={`/sermons/${nextSermon.id}/pulpit`} className="flex-1 border border-[#D0A348] text-[#D0A348] hover:bg-[#fbf3db] text-xs h-9 rounded-md flex items-center justify-center font-medium">Pulpit Mode</Link>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>

      {/* Bottom Section: People to Follow Up With */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[#022d5c]">People to follow up with</h2>
          <Link href="/care" className="text-sm font-medium text-[#D0A348] hover:underline flex items-center gap-1">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        
        {careTasks.length === 0 ? (
          <Card className="bg-gray-50 border-dashed border-gray-200">
            <CardContent className="flex flex-col items-center justify-center p-8">
              <p className="text-gray-500 font-medium">All caught up! No pending follow-ups right now.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
            {careTasks.map((task) => {
              const member = task.members
              const memberName = member ? `${member.first_name} ${member.last_name}` : 'Unknown'
              const initial = memberName.charAt(0)
              
              return (
                <Card key={task.id} className="min-w-[280px] w-[280px] shrink-0 snap-start shadow-sm border-gray-100">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-[#022d5c] text-white flex items-center justify-center font-bold text-lg shrink-0">
                        {initial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-[#022d5c] truncate">{memberName}</h4>
                        <Badge variant="outline" className="mt-1 text-xs border-[#D0A348] text-[#D0A348] bg-[#fbf3db]">
                          {task.task_type || 'Care'}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 min-h-[40px] mb-3">
                      {task.description}
                    </p>
                    <div className="text-xs font-medium text-gray-400 flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5" />
                      Due: {task.follow_up_date ? new Date(task.follow_up_date).toLocaleDateString() : 'N/A'}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
