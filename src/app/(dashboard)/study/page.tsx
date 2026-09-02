'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { BookOpen, Trash2, Plus, Clock, Calendar, Target, TrendingUp, CalendarPlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

function getNextDayDate(dayName: string): Date {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const today = new Date()
  const targetDay = days.indexOf(dayName)
  const currentDay = today.getDay()
  let daysUntil = targetDay - currentDay
  if (daysUntil <= 0) daysUntil += 7
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() + daysUntil, 12, 0, 0)
}

export default function StudyPage() {
  const supabase = createClient()

  const [profileId, setProfileId] = useState<string | null>(null)
  const [studyGoalHours, setStudyGoalHours] = useState(10)
  const [studyReminders, setStudyReminders] = useState(true)
  const [studyBlocks, setStudyBlocks] = useState<any[]>([])
  const [newBlockDay, setNewBlockDay] = useState('Monday')
  const [newBlockStart, setNewBlockStart] = useState('09:00')
  const [newBlockEnd, setNewBlockEnd] = useState('11:00')
  const [studyHoursThisWeek, setStudyHoursThisWeek] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  // One-time study sessions
  const [singleSessions, setSingleSessions] = useState<any[]>([])
  const todayStr = new Date().toISOString().split('T')[0]
  const [singleDate, setSingleDate] = useState(todayStr)
  const [singleStart, setSingleStart] = useState('09:00')
  const [singleEnd, setSingleEnd] = useState('11:00')

  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setProfileId(user.id)

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('weekly_study_goal_hours, study_reminders_enabled')
          .eq('id', user.id)
          .single() as any

        if (profile) {
          if (profile.weekly_study_goal_hours !== undefined && profile.weekly_study_goal_hours !== null) {
            setStudyGoalHours(profile.weekly_study_goal_hours)
          }
          if (profile.study_reminders_enabled !== undefined && profile.study_reminders_enabled !== null) {
            setStudyReminders(profile.study_reminders_enabled)
          }
        }
      } catch (err) {
        console.error('Error fetching profile:', err)
      }

      // Fetch study blocks (recurring)
      try {
        const { data: blocks } = await supabase
          .from('calendar_events')
          .select('*')
          .eq('profile_id', user.id)
          .eq('description', 'recurring_study') as any
        
        if (blocks) {
          setStudyBlocks(blocks)
        }
      } catch (err) {
        console.error('Error fetching study blocks:', err)
      }

      // Fetch one-time study sessions (non-recurring, from today onwards)
      try {
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)
        const { data: singles } = await supabase
          .from('calendar_events')
          .select('*')
          .eq('profile_id', user.id)
          .eq('event_type', 'sermon_study')
          .eq('description', 'single_study')
          .gte('start_time', todayStart.toISOString())
          .order('start_time', { ascending: true }) as any
        
        if (singles) {
          setSingleSessions(singles)
        }
      } catch (err) {
        console.error('Error fetching single sessions:', err)
      }

      // Calculate this week's study hours
      try {
        const now = new Date()
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - now.getDay())
        startOfWeek.setHours(0, 0, 0, 0)
        
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6)
        endOfWeek.setHours(23, 59, 59, 999)

        const { data: weekEvents } = await supabase
          .from('calendar_events')
          .select('*')
          .gte('start_time', startOfWeek.toISOString())
          .lte('start_time', endOfWeek.toISOString())
          .in('event_type', ['sermon_study', 'personal']) as any

        if (weekEvents) {
          let totalHours = 0
          weekEvents.forEach((e: any) => {
            if (e.start_time && e.end_time) {
              const start = new Date(e.start_time).getTime()
              const end = new Date(e.end_time).getTime()
              totalHours += (end - start) / (1000 * 60 * 60)
            }
          })
          setStudyHoursThisWeek(Math.round(totalHours * 10) / 10)
        }
      } catch (err) {
        console.error('Error calculating study hours:', err)
      }

      setIsLoading(false)
    }
    loadData()
  }, [supabase])

  const handleSaveStudyGoals = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profileId) return

    try {
      await supabase
        .from('profiles')
        .update({ 
          weekly_study_goal_hours: studyGoalHours,
          study_reminders_enabled: studyReminders
        } as any)
        .eq('id', profileId)

      alert('Study goals saved!')
    } catch (error) {
      console.error(error)
      alert('Error saving study goals.')
    }
  }

  const handleAddStudyBlock = async () => {
    let uid = profileId
    if (!uid) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        uid = user.id
        setProfileId(user.id)
      }
    }
    if (!uid) {
      alert('Please wait for your session to load, or refresh the page.')
      return
    }

    const nextDate = getNextDayDate(newBlockDay)
    const year = nextDate.getFullYear()
    const month = String(nextDate.getMonth() + 1).padStart(2, '0')
    const day = String(nextDate.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    const startDate = new Date(`${dateStr}T${newBlockStart}:00`)
    const endDate = new Date(`${dateStr}T${newBlockEnd}:00`)

    try {
      const { data, error } = await supabase.from('calendar_events').insert({
        profile_id: uid,
        title: 'Study Time',
        event_type: 'sermon_study',
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        all_day: false,
        recurrence_rule: 'FREQ=WEEKLY',
        description: 'recurring_study',
      }).select() as any

      if (error) throw error
      if (data && data.length > 0) {
        setStudyBlocks(prev => [...prev, data[0]])
      }
    } catch (error: any) {
      console.error('Error adding study block:', error)
      alert(`Error adding study block: ${error?.message || 'Please try again'}`)
    }
  }

  const handleDeleteStudyBlock = async (id: string) => {
    try {
      await supabase.from('calendar_events').delete().eq('id', id)
      setStudyBlocks(studyBlocks.filter(b => b.id !== id))
    } catch (error) {
      console.error(error)
      alert('Error deleting study block')
    }
  }

  const handleAddSingleSession = async () => {
    let uid = profileId
    if (!uid) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        uid = user.id
        setProfileId(user.id)
      }
    }
    if (!uid) {
      alert('Please wait for your session to load, or refresh the page.')
      return
    }

    const startDate = new Date(`${singleDate}T${singleStart}:00`)
    const endDate = new Date(`${singleDate}T${singleEnd}:00`)

    if (endDate <= startDate) {
      alert('End time must be after start time.')
      return
    }

    try {
      const { data, error } = await supabase.from('calendar_events').insert({
        profile_id: uid,
        title: 'Study Time',
        event_type: 'sermon_study',
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        all_day: false,
        description: 'single_study',
      }).select() as any

      if (error) throw error
      if (data && data.length > 0) {
        setSingleSessions(prev => [...prev, data[0]].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()))
      }
    } catch (error: any) {
      console.error('Error adding single session:', error)
      alert(`Error adding session: ${error?.message || 'Please try again'}`)
    }
  }

  const handleDeleteSingleSession = async (id: string) => {
    try {
      await supabase.from('calendar_events').delete().eq('id', id)
      setSingleSessions(singleSessions.filter(s => s.id !== id))
    } catch (error) {
      console.error(error)
      alert('Error deleting session')
    }
  }

  const studyProgress = Math.min((studyHoursThisWeek / (studyGoalHours || 10)) * 100, 100)

  // Compute scheduled weekly hours from blocks
  const scheduledWeeklyHours = studyBlocks.reduce((sum, block) => {
    if (block.start_time && block.end_time) {
      const start = new Date(block.start_time).getTime()
      const end = new Date(block.end_time).getTime()
      return sum + (end - start) / (1000 * 60 * 60)
    }
    return sum
  }, 0)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-[#022d5c] border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-[#022d5c] font-playfair">Study & Preparation</h1>
        <p className="text-gray-500 mt-1">Guard your study time. Your message deserves your best preparation.</p>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-sm rounded-xl border-gray-100">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-green-100 text-green-600 rounded-lg">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold tracking-wider text-gray-500 uppercase">This Week</p>
                <p className="text-2xl font-bold text-[#022d5c]">{studyHoursThisWeek}h</p>
              </div>
            </div>
            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all",
                  studyProgress >= 100 ? 'bg-green-500' : studyProgress >= 50 ? 'bg-[#D0A348]' : 'bg-red-400'
                )}
                style={{ width: `${studyProgress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">{Math.round(studyProgress)}% of {studyGoalHours}h goal</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-xl border-gray-100">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-blue-100 text-blue-600 rounded-lg">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold tracking-wider text-gray-500 uppercase">Scheduled</p>
                <p className="text-2xl font-bold text-[#022d5c]">{Math.round(scheduledWeeklyHours * 10) / 10}h</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">blocked each week across {studyBlocks.length} session{studyBlocks.length !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-xl border-gray-100">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-[#fbf3db] text-[#D0A348] rounded-lg">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold tracking-wider text-gray-500 uppercase">Weekly Goal</p>
                <p className="text-2xl font-bold text-[#022d5c]">{studyGoalHours}h</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              {scheduledWeeklyHours >= studyGoalHours 
                ? '✅ Your schedule meets your goal' 
                : `⚠️ ${Math.round((studyGoalHours - scheduledWeeklyHours) * 10) / 10}h more needed to meet goal`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Study Schedule */}
      <Card className="shadow-sm rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#022d5c]">
            <BookOpen className="w-5 h-5" /> Weekly Study Schedule
          </CardTitle>
          <CardDescription>
            These blocks repeat every week and show on your <Link href="/calendar" className="text-[#D0A348] hover:underline font-medium">calendar</Link>. 
            Your study time is protected — if someone tries to schedule over it, they'll get a conflict warning.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {studyBlocks.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No study blocks scheduled yet</p>
                <p className="text-sm">Add your first study block below to protect your preparation time.</p>
              </div>
            )}

            {studyBlocks.map(block => {
              const startDate = new Date(block.start_time)
              const endDate = new Date(block.end_time)
              const dayName = startDate.toLocaleDateString('en-US', { weekday: 'long' })
              const startTimeStr = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              const endTimeStr = endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              const durationHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)
              
              return (
                <div key={block.id} className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200 hover:border-[#022d5c]/20 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[#022d5c]/10 text-[#022d5c] flex items-center justify-center font-bold text-sm">
                      {dayName.slice(0, 3).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-[#022d5c]">{dayName}</p>
                      <p className="text-sm text-gray-500">{startTimeStr} – {endTimeStr} <span className="text-gray-400">({durationHours}h)</span></p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteStudyBlock(block.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )
            })}

            <div className="bg-gray-50 p-5 rounded-lg border border-dashed border-gray-300 space-y-4">
              <p className="font-semibold text-[#022d5c] text-sm flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add Study Block
              </p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-2">
                  <Label>Day</Label>
                  <select 
                    value={newBlockDay}
                    onChange={(e) => setNewBlockDay(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input 
                    type="time" 
                    value={newBlockStart}
                    onChange={(e) => setNewBlockStart(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input 
                    type="time" 
                    value={newBlockEnd}
                    onChange={(e) => setNewBlockEnd(e.target.value)}
                  />
                </div>
                <Button type="button" onClick={handleAddStudyBlock} className="bg-[#D0A348] text-white hover:bg-[#D0A348]/90">
                  <Plus className="w-4 h-4 mr-2" /> Add
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* One-Time Study Session */}
      <Card className="shadow-sm rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#022d5c]">
            <CalendarPlus className="w-5 h-5" /> One-Time Study Session
          </CardTitle>
          <CardDescription>
            Schedule a single study block for a specific date. These don't repeat — perfect for extra prep before a big sermon.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {singleSessions.length === 0 && (
              <div className="text-center py-6 text-gray-500">
                <CalendarPlus className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No upcoming one-time sessions</p>
                <p className="text-sm">Add a single study session below.</p>
              </div>
            )}

            {singleSessions.map(session => {
              const startDate = new Date(session.start_time)
              const endDate = new Date(session.end_time)
              const dateStr = startDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
              const startTimeStr = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              const endTimeStr = endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              const durationHours = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60) * 10) / 10
              const isToday = startDate.toDateString() === new Date().toDateString()
              
              return (
                <div key={session.id} className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200 hover:border-[#D0A348]/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs",
                      isToday ? "bg-[#D0A348]/15 text-[#D0A348]" : "bg-gray-100 text-gray-600"
                    )}>
                      {startDate.getDate()}
                    </div>
                    <div>
                      <p className="font-semibold text-[#022d5c]">
                        {dateStr}
                        {isToday && <span className="ml-2 text-xs font-medium text-[#D0A348]">Today</span>}
                      </p>
                      <p className="text-sm text-gray-500">{startTimeStr} – {endTimeStr} <span className="text-gray-400">({durationHours}h)</span></p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteSingleSession(session.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )
            })}

            <div className="bg-gray-50 p-5 rounded-lg border border-dashed border-gray-300 space-y-4">
              <p className="font-semibold text-[#022d5c] text-sm flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add Single Session
              </p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input 
                    type="date" 
                    value={singleDate}
                    min={todayStr}
                    onChange={(e) => setSingleDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input 
                    type="time" 
                    value={singleStart}
                    onChange={(e) => setSingleStart(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input 
                    type="time" 
                    value={singleEnd}
                    onChange={(e) => setSingleEnd(e.target.value)}
                  />
                </div>
                <Button type="button" onClick={handleAddSingleSession} className="bg-[#D0A348] text-white hover:bg-[#D0A348]/90">
                  <Plus className="w-4 h-4 mr-2" /> Add
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Study Preferences */}
      <Card className="shadow-sm rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#022d5c]">
            <TrendingUp className="w-5 h-5" /> Study Preferences
          </CardTitle>
          <CardDescription>Set your weekly goal and notification preferences.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveStudyGoals} className="space-y-6">
            <div className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="studyGoalHours">Weekly Study Goal (Hours)</Label>
                <div className="flex items-center gap-4">
                  <Input 
                    id="studyGoalHours" 
                    type="range"
                    min="1"
                    max="20"
                    step="1"
                    value={studyGoalHours}
                    onChange={e => setStudyGoalHours(parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <span className="font-bold text-[#022d5c] w-12 text-right">{studyGoalHours} h</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label htmlFor="studyReminders" className="text-base font-medium text-gray-900">Study Reminders</Label>
                  <p className="text-sm text-gray-500">Get gentle nudges when you're falling behind your weekly goal.</p>
                </div>
                <div className="flex items-center h-5">
                  <input
                    id="studyReminders"
                    type="checkbox"
                    className="h-5 w-5 rounded border-gray-300 text-[#022d5c] focus:ring-[#022d5c]"
                    checked={studyReminders}
                    onChange={e => setStudyReminders(e.target.checked)}
                  />
                </div>
              </div>
            </div>
            
            <Button type="submit" className="bg-[#022d5c] text-white hover:bg-[#022d5c]/90">
              Save Preferences
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
