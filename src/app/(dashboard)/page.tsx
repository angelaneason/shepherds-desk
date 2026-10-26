'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, Users, BookOpen, Clock, ArrowRight, Mic, PenTool, Heart, Plus } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { expandEvent, localDayKey } from '@/lib/recurrence'
import { SmartReminder } from '@/components/reminders/SmartReminder'
import { WelcomeGuide } from '@/components/onboarding/WelcomeGuide'

// Helper for date formatting
const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  })
}

export default function DashboardPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [showWelcome, setShowWelcome] = useState(false)

  const [studyHours, setStudyHours] = useState(0)
  const [studyGoal, setStudyGoal] = useState(10)

  const [todayEvents, setTodayEvents] = useState<any[]>([])
  const [nextSermon, setNextSermon] = useState<any>(null)
  const [careTasks, setCareTasks] = useState<any[]>([])
  const [pastorDisplay, setPastorDisplay] = useState('Pastor')

  const currentHour = new Date().getHours()
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening'

  useEffect(() => {
    const dismissed = localStorage.getItem('onboarding_dismissed')
    if (!dismissed) {
      setShowWelcome(true)
    }
  }, [])

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      try {
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

        const currentDay = now.getDay()
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - currentDay) // Sunday
        startOfWeek.setHours(0, 0, 0, 0)

        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6) // Saturday
        endOfWeek.setHours(23, 59, 59, 999)

        const [
          eventsRes,
          profileRes,
          weekEventsRes,
          sermonsRes,
          tasksRes,
        ] = await Promise.all([
          supabase
            .from('calendar_events')
            .select('id, title, start_time, end_time, event_type, location, all_day, recurrence_rule')
            .or(`and(start_time.gte."${startOfMonth}",start_time.lte."${endOfMonth}"),and(recurrence_rule.not.is.null,start_time.lte."${endOfMonth}")`),
          supabase
            .from('profiles')
            .select('full_name, weekly_study_goal_hours')
            .eq('id', user.id)
            .single(),
          supabase
            .from('calendar_events')
            .select('start_time, end_time')
            .gte('start_time', startOfWeek.toISOString())
            .lte('start_time', endOfWeek.toISOString())
            .in('event_type', ['sermon_study', 'personal']),
          supabase
            .from('sermons')
            .select('id, title, status, preach_date, scripture_primary')
            .gte('preach_date', new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString())
            .order('preach_date', { ascending: true })
            .limit(1),
          supabase
            .from('care_tasks')
            .select('*, members(id, full_name, first_name, last_name, phone, email)')
            .eq('status', 'pending')
            .order('due_date', { ascending: true })
            .limit(10),
        ])

        const rawEvents = (eventsRes.data as any[]) || []
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
        const events = rawEvents.flatMap((e: any) => expandEvent(e, monthStart, monthEnd))

        const todayKey = localDayKey(now)
        const todays = events
          .filter((e: any) => e.start_time && localDayKey(e.start_time) === todayKey)
          .sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
        setTodayEvents(todays)

        const profile = profileRes.data as any
        const title = user.user_metadata?.title || 'Pastor'
        const rawName = profile?.full_name || user.user_metadata?.full_name || ''
        const cleanName = rawName.replace(new RegExp(`^${title}\\s*`, 'i'), '').trim()
        setPastorDisplay(cleanName ? `${title} ${cleanName}` : (rawName || 'Pastor'))
        if (profile?.weekly_study_goal_hours) {
          setStudyGoal(profile.weekly_study_goal_hours)
        }

        const weekEvents = weekEventsRes.data as any
        if (weekEvents) {
          let totalHours = 0
          weekEvents.forEach((e: any) => {
            if (e.start_time && e.end_time) {
              const start = new Date(e.start_time).getTime()
              const end = new Date(e.end_time).getTime()
              totalHours += (end - start) / (1000 * 60 * 60)
            }
          })
          setStudyHours(Math.round(totalHours * 10) / 10)
        }

        const sermons = sermonsRes.data as any
        if (sermons && sermons.length > 0) {
          setNextSermon(sermons[0])
        } else {
          setNextSermon(null)
        }

        const tasks = tasksRes.data as any
        if (tasks) {
          setCareTasks(tasks)
        }
      } catch (e) {
        console.error('Error fetching dashboard data', e)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [supabase])

  const handleDismissWelcome = () => {
    localStorage.setItem('onboarding_dismissed', 'true')
    setShowWelcome(false)
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

  const studyProgress = Math.min((studyHours / (studyGoal || 10)) * 100, 100)
  let studyMessage = ''
  let studyColor = ''
  let studyBarColor = ''

  if (studyProgress >= 80) {
    studyMessage = "You're investing in yourself, keep it up!"
    studyColor = "text-green-600"
    studyBarColor = "bg-green-500"
  } else if (studyProgress >= 40) {
    studyMessage = "Your message deserves more preparation time."
    studyColor = "text-yellow-600"
    studyBarColor = "bg-yellow-500"
  } else {
    studyMessage = "Remember: you can't pour from an empty cup."
    studyColor = "text-red-600"
    studyBarColor = "bg-red-500"
  }

  const currentDayOfWeek = new Date().getDay()
  const showMidweekNudge = studyHours === 0 && currentDayOfWeek >= 3 && currentDayOfWeek <= 6

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]">Loading dashboard...</div>
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Welcome Guide */}
      {showWelcome && (
        <WelcomeGuide onDismiss={handleDismissWelcome} />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#022d5c] font-playfair">{greeting}, {pastorDisplay}</h1>
          <p className="text-gray-500 mt-1">{formatDate(new Date())}</p>
        </div>
      </div>

      {/* Smart Assistant Banner */}
      <SmartReminder />

      {/* Quick Actions Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link href="/sermons?record=1">
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-gray-200 hover:border-[#D0A348] hover:shadow-md transition-all cursor-pointer group">
            <div className="p-2.5 rounded-lg bg-[#fbf3db] text-[#022d5c] group-hover:bg-[#D0A348] group-hover:text-white transition-colors shrink-0">
              <Mic className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#022d5c] truncate">Record Sermon</p>
              <p className="text-xs text-gray-500 truncate">Mine or guest speaker</p>
            </div>
          </div>
        </Link>

        <Link href="/sermons/new">
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-gray-200 hover:border-[#022d5c] hover:shadow-md transition-all cursor-pointer group">
            <div className="p-2.5 rounded-lg bg-blue-50 text-[#022d5c] group-hover:bg-[#022d5c] group-hover:text-white transition-colors shrink-0">
              <PenTool className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#022d5c] truncate">Write Sermon</p>
              <p className="text-xs text-gray-500 truncate">New message outline</p>
            </div>
          </div>
        </Link>

        <Link href="/care">
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-gray-200 hover:border-red-300 hover:shadow-md transition-all cursor-pointer group">
            <div className="p-2.5 rounded-lg bg-red-50 text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors shrink-0">
              <Heart className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#022d5c] truncate">People &amp; Care</p>
              <p className="text-xs text-gray-500 truncate">{careTasks.length} follow-ups due</p>
            </div>
          </div>
        </Link>

        <Link href="/calendar">
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-gray-200 hover:border-teal-300 hover:shadow-md transition-all cursor-pointer group">
            <div className="p-2.5 rounded-lg bg-teal-50 text-teal-700 group-hover:bg-teal-600 group-hover:text-white transition-colors shrink-0">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#022d5c] truncate">Calendar</p>
              <p className="text-xs text-gray-500 truncate">{todayEvents.length} today</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Main 3-Column Overview (Non-Redundant) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Today's Schedule */}
        <Card className="shadow-sm rounded-xl border-gray-100 flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-[#D0A348]" />
                <CardTitle className="text-lg font-bold text-[#022d5c]">Today&apos;s Schedule</CardTitle>
              </div>
              <Badge variant="secondary" className="bg-blue-50 text-[#022d5c] font-semibold">
                {todayEvents.length} {todayEvents.length === 1 ? 'event' : 'events'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4 flex-1 flex flex-col justify-between">
            <div className="space-y-3 max-h-48 overflow-y-auto pr-1 mb-4">
              {todayEvents.length === 0 ? (
                <div className="text-center py-6 bg-gray-50/70 rounded-lg border border-dashed border-gray-200">
                  <p className="text-sm text-gray-500 font-medium">No appointments scheduled for today.</p>
                  <p className="text-xs text-gray-400 mt-1">Use the Assistant above or open your Calendar to add one.</p>
                </div>
              ) : (
                todayEvents.map((e, i) => {
                  let dotColor = "bg-gray-400"
                  if (e.event_type === 'church') dotColor = "bg-blue-500"
                  if (e.event_type === 'care') dotColor = "bg-green-500"
                  if (e.event_type === 'personal' || e.event_type === 'sermon_study') dotColor = "bg-[#D0A348]"

                  const time = e.all_day
                    ? 'All Day'
                    : e.start_time
                      ? new Date(e.start_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                      : ''
                  return (
                    <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50">
                      <div className={cn("w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0", dotColor)} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#022d5c] truncate">{e.title}</p>
                        <p className="text-xs text-gray-500">{time}{e.location ? ` • ${e.location}` : ''}</p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            <Link
              href="/calendar"
              className="w-full bg-gray-100 hover:bg-gray-200 text-[#022d5c] text-xs h-9 rounded-md flex items-center justify-center gap-1.5 font-semibold transition-colors"
            >
              <CalendarDays className="w-3.5 h-3.5" /> Open Full Calendar
            </Link>
          </CardContent>
        </Card>

        {/* 2. Next Sermon */}
        <Card className="shadow-sm rounded-xl border-[#fbf3db] bg-[#faf8f5] flex flex-col justify-between">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#D0A348]" />
                <CardTitle className="text-lg font-bold text-[#022d5c]">Next Sermon</CardTitle>
              </div>
              <Link href="/sermons" className="text-xs font-semibold text-[#022d5c] hover:underline">
                All Sermons &rarr;
              </Link>
            </div>
            {nextSermon ? (
              <div className="pt-1">
                <h3 className="text-xl font-bold text-[#022d5c] font-playfair line-clamp-2">{nextSermon.title}</h3>
                <p className="text-sm font-medium text-[#D0A348] mt-0.5">
                  {nextSermon.scripture_primary || nextSermon.scripture || 'Scripture not set yet'}
                </p>
              </div>
            ) : (
              <div className="py-6 text-center">
                <p className="text-sm text-gray-600 font-medium">No upcoming sermon scheduled yet.</p>
                <p className="text-xs text-gray-400 mt-1">Start an outline or record a message anytime.</p>
              </div>
            )}
          </CardHeader>
          <CardContent className="pt-2">
            {nextSermon ? (
              <>
                <div className="mt-1 mb-5">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-gray-500 font-medium">Preparation Progress</span>
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
                  <Link href={`/sermons/${nextSermon.id}`} className="flex-1 bg-[#022d5c] hover:bg-[#061e38] text-white text-xs h-9 rounded-md flex items-center justify-center font-semibold">
                    Open Sermon
                  </Link>
                  <Link href={`/sermons/${nextSermon.id}/pulpit`} className="flex-1 border border-[#D0A348] text-[#022d5c] hover:bg-[#fbf3db] text-xs h-9 rounded-md flex items-center justify-center font-semibold">
                    Pulpit Mode
                  </Link>
                </div>
              </>
            ) : (
              <div className="flex gap-2">
                <Link href="/sermons/new" className="flex-1 bg-[#022d5c] hover:bg-[#061e38] text-white text-xs h-9 rounded-md flex items-center justify-center gap-1 font-semibold">
                  <Plus className="w-3.5 h-3.5" /> Write Sermon
                </Link>
                <Link href="/sermons?record=1" className="flex-1 border border-[#D0A348] text-[#022d5c] hover:bg-[#fbf3db] text-xs h-9 rounded-md flex items-center justify-center gap-1 font-semibold">
                  <Mic className="w-3.5 h-3.5" /> Record Audio
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3. Study Time Widget */}
        <Card className="shadow-sm rounded-xl border-gray-100 flex flex-col justify-between">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#022d5c]" />
                <CardTitle className="text-lg font-bold text-[#022d5c]">Study Time This Week</CardTitle>
              </div>
              <Link href="/study" className="text-xs font-semibold text-[#022d5c] hover:underline">
                Study Tools &rarr;
              </Link>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between pt-2">
            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-3xl font-bold text-[#022d5c]">{studyHours}h</span>
                <span className="text-sm text-gray-500">of {studyGoal}h weekly goal</span>
              </div>
              <div className="h-2.5 w-full bg-gray-200 rounded-full overflow-hidden mb-3">
                <div
                  className={cn("h-full transition-all rounded-full", studyBarColor)}
                  style={{ width: `${studyProgress}%` }}
                />
              </div>
              <p className={cn("text-sm font-medium", studyColor)}>
                {studyMessage}
              </p>

              {showMidweekNudge && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100 text-xs">
                  <p className="text-blue-800 font-medium">Want to block off sacred study time on your calendar?</p>
                </div>
              )}
            </div>

            <Link
              href="/study"
              className="mt-4 w-full bg-gray-100 hover:bg-gray-200 text-[#022d5c] text-xs h-9 rounded-md flex items-center justify-center font-semibold transition-colors"
            >
              Open Study &amp; Reference Library
            </Link>
          </CardContent>
        </Card>
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
              const personFromNotes = task.notes?.startsWith('Person:') ? task.notes.replace('Person: ', '') : null
              const memberName = member
                ? (member.full_name || `${member.first_name || ''} ${member.last_name || ''}`.trim())
                : (personFromNotes || task.title || task.description || 'Task')
              const initial = (memberName || 'P').charAt(0).toUpperCase()

              return (
                <Link key={task.id} href="/care">
                  <Card className="min-w-[280px] w-[280px] shrink-0 snap-start shadow-sm border-gray-100 hover:shadow-md hover:border-[#D0A348]/30 transition-all cursor-pointer">
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
                        {task.description || task.title}
                      </p>
                      <div className="text-xs font-medium text-gray-400 flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5" />
                        Due: {(task.due_date || task.follow_up_date) ? new Date(task.due_date || task.follow_up_date).toLocaleDateString() : 'Today'}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
