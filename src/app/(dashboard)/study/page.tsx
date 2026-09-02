'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { BookOpen, Trash2, Plus, Clock, Calendar, Target, TrendingUp, CalendarPlus, RefreshCw, Play, Pause, RotateCcw, Flame, Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

// ─── Pastor Encouragement Data ───────────────────────────────────────────────
const ENCOURAGEMENTS = [
  { scripture: "He who calls you is faithful, and He will do it.", reference: "1 Thessalonians 5:24", reflection: "You weren't called to carry this alone. He who started this good work in you will finish it." },
  { scripture: "The Lord is my shepherd; I shall not want.", reference: "Psalm 23:1", reflection: "Even shepherds need a Shepherd. Let Him lead you today." },
  { scripture: "Come to me, all who labor and are heavy laden, and I will give you rest.", reference: "Matthew 11:28", reflection: "Before you feed the flock, let the Father feed you." },
  { scripture: "I can do all things through Him who strengthens me.", reference: "Philippians 4:13", reflection: "Your strength for ministry doesn't come from you — it flows through you." },
  { scripture: "But he said to me, 'My grace is sufficient for you, for my power is made perfect in weakness.'", reference: "2 Corinthians 12:9", reflection: "Your weakness is not a liability. It's where His power shows up most." },
  { scripture: "The Lord your God is in your midst, a mighty one who will save; he will rejoice over you with gladness.", reference: "Zephaniah 3:17", reflection: "He doesn't just tolerate you — He delights in you. Sit with that today." },
  { scripture: "Have I not commanded you? Be strong and courageous. Do not be frightened, and do not be dismayed.", reference: "Joshua 1:9", reflection: "Courage isn't the absence of fear. It's knowing He goes before you into every hard conversation, every hospital room, every sermon." },
  { scripture: "He gives power to the faint, and to him who has no might he increases strength.", reference: "Isaiah 40:29", reflection: "Running on empty? He specializes in filling empty vessels." },
  { scripture: "And let us not grow weary of doing good, for in due season we will reap, if we do not give up.", reference: "Galatians 6:9", reflection: "The seeds you're planting today — you may not see them bloom for years. Keep planting." },
  { scripture: "For God gave us a spirit not of fear but of power and love and self-control.", reference: "2 Timothy 1:7", reflection: "You were not given a spirit of timidity. Step into this week with holy boldness." },
  { scripture: "The steadfast love of the Lord never ceases; his mercies never come to an end; they are new every morning.", reference: "Lamentations 3:22-23", reflection: "New morning, new mercies. Yesterday's failures don't define today's ministry." },
  { scripture: "Cast your burden on the Lord, and he will sustain you.", reference: "Psalm 55:22", reflection: "That weight you're carrying for your people? He can hold it and you at the same time." },
  { scripture: "But those who wait for the Lord shall renew their strength; they shall mount up with wings like eagles.", reference: "Isaiah 40:31", reflection: "Waiting isn't wasted time. It's where eagles get their wings." },
  { scripture: "I planted, Apollos watered, but God gave the growth.", reference: "1 Corinthians 3:6", reflection: "You're not responsible for the harvest — just faithful with the seed." },
  { scripture: "Be still, and know that I am God.", reference: "Psalm 46:10", reflection: "Before you do anything for God today, just be with God today." },
  { scripture: "The Lord is near to the brokenhearted and saves the crushed in spirit.", reference: "Psalm 34:18", reflection: "You minister to the hurting — but who ministers to you? He does. Right now." },
  { scripture: "For I know the plans I have for you, declares the Lord, plans for welfare and not for evil.", reference: "Jeremiah 29:11", reflection: "Even when the road is unclear, His plans for you are good." },
  { scripture: "Therefore, my beloved brothers, be steadfast, immovable, always abounding in the work of the Lord.", reference: "1 Corinthians 15:58", reflection: "Your labor is not in vain. Not one sermon, not one prayer, not one visit." },
  { scripture: "He who began a good work in you will bring it to completion at the day of Jesus Christ.", reference: "Philippians 1:6", reflection: "God isn't done with you yet. He's still writing your story." },
  { scripture: "The Lord is my light and my salvation; whom shall I fear?", reference: "Psalm 27:1", reflection: "When the weight of leadership feels heavy, remember whose light you carry." },
  { scripture: "Trust in the Lord with all your heart, and do not lean on your own understanding.", reference: "Proverbs 3:5", reflection: "You don't need all the answers. You just need the One who has them." },
  { scripture: "Blessed is the man who remains steadfast under trial.", reference: "James 1:12", reflection: "The trial you're walking through is producing something eternal in you." },
  { scripture: "Peace I leave with you; my peace I give to you. Not as the world gives do I give to you.", reference: "John 14:27", reflection: "The peace He offers isn't circumstantial. It's foundational. Breathe it in." },
  { scripture: "So we do not lose heart. Though our outer self is wasting away, our inner self is being renewed day by day.", reference: "2 Corinthians 4:16", reflection: "Tired body, renewed spirit. That's the trade He offers every single day." },
  { scripture: "The Lord will fight for you, and you have only to be silent.", reference: "Exodus 14:14", reflection: "Some battles aren't yours to fight. Let Him handle this one." },
  // Pastor Quotes
  { scripture: "God does not need your good works, but your neighbor does.", reference: "— Martin Luther", reflection: "Ministry isn't about impressing God. It's about loving the person in front of you." },
  { scripture: "A Bible that is falling apart usually belongs to someone who isn't.", reference: "— Charles Spurgeon", reflection: "The time you're investing in the Word right now is holding you together." },
  { scripture: "The world has yet to see what God will do with a man fully consecrated to Him.", reference: "— D.L. Moody", reflection: "You don't need to be perfect. Just fully surrendered." },
  { scripture: "We are too busy to pray, and so we are too busy to have power.", reference: "— R.A. Torrey", reflection: "Before you prepare the sermon, let the Sermon prepare you." },
  { scripture: "God is most glorified in us when we are most satisfied in Him.", reference: "— John Piper", reflection: "Your joy in God is part of your witness. Don't neglect your own soul." },
]

const TIMER_COMPLETION_MESSAGES = [
  "Well done, faithful shepherd. 🙌",
  "Every minute in the Word matters. Keep going!",
  "Your people will be blessed by this preparation.",
  "The Lord sees your diligence. Rest in that.",
  "Time well spent. Your flock is in good hands.",
  "That's what faithfulness looks like. 📖",
  "Another seed planted. Trust the harvest.",
  "You showed up. That's half the battle. 💪",
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getNextDayDate(dayName: string): Date {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const today = new Date()
  const targetDay = days.indexOf(dayName)
  const currentDay = today.getDay()
  let daysUntil = targetDay - currentDay
  if (daysUntil <= 0) daysUntil += 7
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() + daysUntil, 12, 0, 0)
}

function getDailyEncouragement(offset = 0) {
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24))
  const index = (dayOfYear + offset) % ENCOURAGEMENTS.length
  return ENCOURAGEMENTS[index]
}

// ─── Component ───────────────────────────────────────────────────────────────

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

  // Focus session history
  const [focusHistory, setFocusHistory] = useState<any[]>([])

  // Encouragement
  const [encourageOffset, setEncourageOffset] = useState(0)

  // Focus Timer
  const [timerMode, setTimerMode] = useState<'pomodoro' | 'custom'>('pomodoro')
  const [customMinutes, setCustomMinutes] = useState(45)
  const [timerSecondsLeft, setTimerSecondsLeft] = useState(25 * 60)
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerStartedAt, setTimerStartedAt] = useState<Date | null>(null)
  const [timerCompleteMsg, setTimerCompleteMsg] = useState<string | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const totalTimerSeconds = timerMode === 'pomodoro' ? 25 * 60 : customMinutes * 60

  // Streak
  const [streak, setStreak] = useState(0)

  // ─── Data Loading ────────────────────────────────────────────────────────

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

      // Fetch one-time study sessions
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

      // Fetch focus session history (last 30 days)
      try {
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        const { data: focusSessions } = await supabase
          .from('calendar_events')
          .select('*')
          .eq('profile_id', user.id)
          .eq('event_type', 'sermon_study')
          .eq('description', 'focus_session')
          .gte('start_time', thirtyDaysAgo.toISOString())
          .order('start_time', { ascending: false }) as any
        
        if (focusSessions) {
          setFocusHistory(focusSessions)
        }
      } catch (err) {
        console.error('Error fetching focus history:', err)
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

      // Calculate streak (consecutive weeks meeting goal)
      try {
        const now = new Date()
        let consecutiveWeeks = 0
        // Check up to 52 weeks back
        for (let w = 1; w <= 52; w++) {
          const weekEnd = new Date(now)
          weekEnd.setDate(now.getDate() - now.getDay() - (w - 1) * 7 - 1)
          weekEnd.setHours(23, 59, 59, 999)
          const weekStart = new Date(weekEnd)
          weekStart.setDate(weekEnd.getDate() - 6)
          weekStart.setHours(0, 0, 0, 0)

          const { data: wEvents } = await supabase
            .from('calendar_events')
            .select('start_time, end_time')
            .eq('profile_id', user.id)
            .gte('start_time', weekStart.toISOString())
            .lte('start_time', weekEnd.toISOString())
            .in('event_type', ['sermon_study', 'personal']) as any

          if (wEvents) {
            let weekTotal = 0
            wEvents.forEach((e: any) => {
              if (e.start_time && e.end_time) {
                weekTotal += (new Date(e.end_time).getTime() - new Date(e.start_time).getTime()) / (1000 * 60 * 60)
              }
            })
            if (weekTotal >= (studyGoalHours || 10)) {
              consecutiveWeeks++
            } else {
              break
            }
          } else {
            break
          }
        }
        setStreak(consecutiveWeeks)
      } catch (err) {
        console.error('Error calculating streak:', err)
      }

      setIsLoading(false)
    }
    loadData()
  }, [supabase])

  // ─── Timer Logic ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (timerRunning && timerSecondsLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimerSecondsLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!)
            setTimerRunning(false)
            handleTimerComplete()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [timerRunning])

  const handleTimerComplete = useCallback(async () => {
    const msg = TIMER_COMPLETION_MESSAGES[Math.floor(Math.random() * TIMER_COMPLETION_MESSAGES.length)]
    setTimerCompleteMsg(msg)

    // Try browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Study Session Complete! 📖', { body: msg })
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission()
    }

    // Save the completed session to calendar_events
    let uid = profileId
    if (!uid) {
      const { data: { user } } = await supabase.auth.getUser()
      uid = user?.id || null
    }
    if (!uid) return

    const endTime = new Date()
    const durationMs = totalTimerSeconds * 1000
    const startTime = new Date(endTime.getTime() - durationMs)

    try {
      const { data: saved } = await supabase.from('calendar_events').insert({
        profile_id: uid,
        title: 'Focus Session',
        event_type: 'sermon_study',
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        all_day: false,
        description: 'focus_session',
      }).select() as any
      // Update weekly hours display
      const addedHours = totalTimerSeconds / 3600
      setStudyHoursThisWeek(prev => Math.round((prev + addedHours) * 10) / 10)
      // Add to focus history
      if (saved && saved.length > 0) {
        setFocusHistory(prev => [saved[0], ...prev])
      }
    } catch (err) {
      console.error('Error saving focus session:', err)
    }
  }, [profileId, supabase, totalTimerSeconds])

  const startTimer = () => {
    if (timerCompleteMsg) {
      setTimerCompleteMsg(null)
      setTimerSecondsLeft(totalTimerSeconds)
    }
    setTimerRunning(true)
    setTimerStartedAt(new Date())
    // Request notification permission on first start
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }

  const pauseTimer = () => {
    setTimerRunning(false)
  }

  const resetTimer = () => {
    setTimerRunning(false)
    setTimerSecondsLeft(totalTimerSeconds)
    setTimerCompleteMsg(null)
  }

  const switchTimerMode = (mode: 'pomodoro' | 'custom') => {
    setTimerMode(mode)
    setTimerRunning(false)
    setTimerCompleteMsg(null)
    setTimerSecondsLeft(mode === 'pomodoro' ? 25 * 60 : customMinutes * 60)
  }

  const timerMinutes = Math.floor(timerSecondsLeft / 60)
  const timerSecs = timerSecondsLeft % 60
  const timerProgress = ((totalTimerSeconds - timerSecondsLeft) / totalTimerSeconds) * 100

  // ─── Handlers ─────────────────────────────────────────────────────────────

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

  // ─── Computed ──────────────────────────────────────────────────────────────

  const studyProgress = Math.min((studyHoursThisWeek / (studyGoalHours || 10)) * 100, 100)
  const encouragement = getDailyEncouragement(encourageOffset)

  const scheduledWeeklyHours = studyBlocks.reduce((sum, block) => {
    if (block.start_time && block.end_time) {
      const start = new Date(block.start_time).getTime()
      const end = new Date(block.end_time).getTime()
      return sum + (end - start) / (1000 * 60 * 60)
    }
    return sum
  }, 0)

  const streakMessage = streak === 0 ? 'Start your streak!'
    : streak >= 12 ? `🏆 ${streak}-week streak! Incredible!`
    : streak >= 8 ? `🔥 ${streak}-week streak! On fire!`
    : streak >= 4 ? `💪 ${streak}-week streak! Strong!`
    : streak >= 2 ? `👏 ${streak}-week streak! Nice!`
    : `${streak}-week streak`

  // ─── Render ────────────────────────────────────────────────────────────────

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

      {/* ─── Daily Encouragement ─────────────────────────────────────────── */}
      <Card className="shadow-sm rounded-xl border-0 bg-gradient-to-br from-[#022d5c] to-[#0a4a8a] text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <CardContent className="p-8 relative">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-2 text-[#D0A348]">
                <Heart className="w-4 h-4" />
                <span className="text-xs font-bold tracking-wider uppercase">Today's Encouragement</span>
              </div>
              <blockquote className="text-xl md:text-2xl font-playfair leading-relaxed text-white/95 italic">
                "{encouragement.scripture}"
              </blockquote>
              <p className="text-sm font-semibold text-[#D0A348]">{encouragement.reference}</p>
              <p className="text-sm text-white/70 leading-relaxed max-w-xl">{encouragement.reflection}</p>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setEncourageOffset(prev => prev + 1)}
              className="text-white/50 hover:text-white hover:bg-white/10 shrink-0 mt-2"
              title="Show another"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ─── Progress Overview ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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

        <Card className={cn("shadow-sm rounded-xl", streak >= 4 ? "border-orange-200 bg-orange-50/30" : "border-gray-100")}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className={cn("p-2.5 rounded-lg", streak >= 4 ? "bg-orange-100 text-orange-500" : "bg-gray-100 text-gray-500")}>
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold tracking-wider text-gray-500 uppercase">Streak</p>
                <p className="text-2xl font-bold text-[#022d5c]">{streak > 0 ? `${streak}w` : '—'}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">{streakMessage}</p>
          </CardContent>
        </Card>
      </div>

      {/* ─── Focus Timer ─────────────────────────────────────────────────── */}
      <Card className="shadow-sm rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#022d5c]">
            <Clock className="w-5 h-5" /> Focus Timer
          </CardTitle>
          <CardDescription>Start a timed study session. When the timer finishes, the time is automatically logged to your weekly hours.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center py-4">
            {/* Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1 mb-8">
              <button
                onClick={() => switchTimerMode('pomodoro')}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-all",
                  timerMode === 'pomodoro' ? "bg-[#022d5c] text-white shadow-sm" : "text-gray-600 hover:text-gray-900"
                )}
              >
                25 min Focus
              </button>
              <button
                onClick={() => switchTimerMode('custom')}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-all",
                  timerMode === 'custom' ? "bg-[#022d5c] text-white shadow-sm" : "text-gray-600 hover:text-gray-900"
                )}
              >
                Custom
              </button>
            </div>

            {/* Custom Duration Input */}
            {timerMode === 'custom' && !timerRunning && !timerCompleteMsg && (
              <div className="flex items-center gap-3 mb-6">
                <Input
                  type="number"
                  min="5"
                  max="120"
                  value={customMinutes}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 5
                    setCustomMinutes(val)
                    setTimerSecondsLeft(val * 60)
                  }}
                  className="w-20 text-center"
                />
                <span className="text-sm text-gray-500">minutes</span>
              </div>
            )}

            {/* Timer Display */}
            <div className="relative w-48 h-48 mb-6">
              {/* Background Ring */}
              <svg className="w-48 h-48 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="44" fill="none" stroke="#e5e7eb" strokeWidth="6" />
                <circle 
                  cx="50" cy="50" r="44" fill="none" 
                  stroke={timerCompleteMsg ? '#22c55e' : '#022d5c'}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 44}`}
                  strokeDashoffset={`${2 * Math.PI * 44 * (1 - timerProgress / 100)}`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {timerCompleteMsg ? (
                  <span className="text-2xl">✅</span>
                ) : (
                  <>
                    <span className="text-4xl font-bold text-[#022d5c] tabular-nums">
                      {String(timerMinutes).padStart(2, '0')}:{String(timerSecs).padStart(2, '0')}
                    </span>
                    <span className="text-xs text-gray-400 mt-1">
                      {timerRunning ? 'focusing...' : timerSecondsLeft < totalTimerSeconds ? 'paused' : 'ready'}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Completion Message */}
            {timerCompleteMsg && (
              <div className="text-center mb-6 animate-in fade-in duration-500">
                <p className="text-lg font-semibold text-[#022d5c] font-playfair">{timerCompleteMsg}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {Math.round(totalTimerSeconds / 60)} minutes logged to your study time
                </p>
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center gap-3">
              {!timerRunning && !timerCompleteMsg && (
                <Button onClick={startTimer} className="bg-[#022d5c] hover:bg-[#061e38] text-white gap-2 px-6">
                  <Play className="w-4 h-4" /> {timerSecondsLeft < totalTimerSeconds ? 'Resume' : 'Start'}
                </Button>
              )}
              {timerRunning && (
                <Button onClick={pauseTimer} variant="outline" className="gap-2 px-6 border-[#022d5c] text-[#022d5c]">
                  <Pause className="w-4 h-4" /> Pause
                </Button>
              )}
              {timerCompleteMsg && (
                <Button onClick={resetTimer} className="bg-[#D0A348] hover:bg-[#D0A348]/90 text-white gap-2 px-6">
                  <Play className="w-4 h-4" /> Start Another
                </Button>
              )}
              {(timerSecondsLeft < totalTimerSeconds || timerCompleteMsg) && (
                <Button onClick={resetTimer} variant="ghost" className="gap-2 text-gray-500">
                  <RotateCcw className="w-4 h-4" /> Reset
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Focus Session Log ───────────────────────────────────────────── */}
      <Card className="shadow-sm rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#022d5c]">
            <TrendingUp className="w-5 h-5" /> Focus Session Log
          </CardTitle>
          <CardDescription>
            Your completed focus sessions from the last 30 days. Every timer session is logged here and on your calendar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {focusHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No focus sessions yet</p>
              <p className="text-sm">Complete a focus timer session above and it will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Summary */}
              <div className="flex items-center justify-between bg-[#022d5c]/5 p-4 rounded-lg mb-2">
                <div>
                  <p className="text-sm font-medium text-[#022d5c]">Last 30 Days</p>
                  <p className="text-xs text-gray-500">{focusHistory.length} session{focusHistory.length !== 1 ? 's' : ''} completed</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-[#022d5c]">
                    {Math.round(focusHistory.reduce((sum, s) => {
                      if (s.start_time && s.end_time) {
                        return sum + (new Date(s.end_time).getTime() - new Date(s.start_time).getTime()) / (1000 * 60 * 60)
                      }
                      return sum
                    }, 0) * 10) / 10}h
                  </p>
                  <p className="text-xs text-gray-500">total focus time</p>
                </div>
              </div>

              {/* Session List */}
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {focusHistory.map(session => {
                  const startDate = new Date(session.start_time)
                  const endDate = new Date(session.end_time)
                  const dateStr = startDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                  const timeStr = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  const durationMin = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60))
                  const isToday = startDate.toDateString() === new Date().toDateString()

                  return (
                    <div key={session.id} className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          isToday ? "bg-[#D0A348]" : "bg-[#022d5c]/30"
                        )} />
                        <div>
                          <p className="text-sm font-medium text-[#022d5c]">
                            {dateStr}{isToday && <span className="ml-1 text-xs text-[#D0A348]">(today)</span>}
                          </p>
                          <p className="text-xs text-gray-400">{timeStr} · {durationMin} min</p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={async () => {
                          await supabase.from('calendar_events').delete().eq('id', session.id)
                          setFocusHistory(prev => prev.filter(s => s.id !== session.id))
                          const removedHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)
                          setStudyHoursThisWeek(prev => Math.max(0, Math.round((prev - removedHours) * 10) / 10))
                        }} 
                        className="text-gray-400 hover:text-red-500 hover:bg-red-50 h-7 w-7"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Weekly Study Schedule ───────────────────────────────────────── */}
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

      {/* ─── One-Time Study Session ──────────────────────────────────────── */}
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

      {/* ─── Study Preferences ───────────────────────────────────────────── */}
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
