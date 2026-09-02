'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { UploadCloud, Palette, User, Mail, Lock, LogOut, BookOpen, Trash2, Plus } from 'lucide-react'

function getNextDayDate(dayName: string): Date {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const today = new Date()
  const targetDay = days.indexOf(dayName)
  const currentDay = today.getDay()
  let daysUntil = targetDay - currentDay
  if (daysUntil <= 0) daysUntil += 7
  const next = new Date(today)
  next.setDate(today.getDate() + daysUntil)
  return next
}

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()

  // Profile State
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [churchName, setChurchName] = useState('')
  const [churchId, setChurchId] = useState<string | null>(null)
  const [profileId, setProfileId] = useState<string | null>(null)

  // Branding State
  const [primaryColor, setPrimaryColor] = useState("#022d5c")
  const [secondaryColor, setSecondaryColor] = useState("#D0A348")
  const [accentColor, setAccentColor] = useState("#F8F5EE")

  // Password State
  const [newPassword, setNewPassword] = useState('')

  // Study & Self-Care State
  const [studyGoalHours, setStudyGoalHours] = useState(10)
  const [studyReminders, setStudyReminders] = useState(true)
  
  // Study Blocks State
  const [studyBlocks, setStudyBlocks] = useState<any[]>([])
  const [newBlockDay, setNewBlockDay] = useState('Monday')
  const [newBlockStart, setNewBlockStart] = useState('09:00')
  const [newBlockEnd, setNewBlockEnd] = useState('11:00')

  // Trial State
  const [trialDaysRemaining, setTrialDaysRemaining] = useState<number | null>(null)

  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setEmail(user.email || '')
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, church_id, weekly_study_goal_hours, study_reminders_enabled, trial_ends_at')
          .eq('id', user.id)
          .single() as any

        if (profile) {
          setProfileId(profile.id)
          setFullName(profile.full_name || '')
          setChurchId(profile.church_id)
          if (profile.trial_ends_at) {
            const endsAt = new Date(profile.trial_ends_at)
            const now = new Date()
            const diffTime = endsAt.getTime() - now.getTime()
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            setTrialDaysRemaining(diffDays > 0 ? diffDays : 0)
          }
          if (profile.weekly_study_goal_hours !== undefined && profile.weekly_study_goal_hours !== null) {
            setStudyGoalHours(profile.weekly_study_goal_hours)
          }
          if (profile.study_reminders_enabled !== undefined && profile.study_reminders_enabled !== null) {
            setStudyReminders(profile.study_reminders_enabled)
          }

          if (profile.church_id) {
            const { data: church } = await supabase
              .from('churches')
              .select('name, primary_color, secondary_color, accent_color')
              .eq('id', profile.church_id)
              .single() as any

            if (church) {
              setChurchName(church.name || '')
              setPrimaryColor(church.primary_color || '#022d5c')
              setSecondaryColor(church.secondary_color || '#D0A348')
              setAccentColor(church.accent_color || '#F8F5EE')
            }
          }

          const { data: blocks } = await supabase
            .from('calendar_events')
            .select('*')
            .eq('profile_id', user.id)
            .eq('description', 'recurring_study') as any
          
          if (blocks) {
            setStudyBlocks(blocks)
          }
        }
      }
      setIsLoading(false)
    }
    loadData()

    const params = new URLSearchParams(window.location.search);
    const billing = params.get('billing');
    if (billing === 'success') {
      alert('Subscription successful!');
    } else if (billing === 'cancelled') {
      alert('Subscription cancelled.');
    }
  }, [supabase])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profileId || !churchId) return

    try {
      await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', profileId)

      await supabase
        .from('churches')
        .update({ name: churchName })
        .eq('id', churchId)

      alert('Profile saved successfully!')
    } catch (error) {
      console.error(error)
      alert('Error saving profile.')
    }
  }

  const handleSaveStudyPreferences = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profileId) return

    try {
      await supabase
        .from('profiles')
        .update({
          weekly_study_goal_hours: studyGoalHours,
          study_reminders_enabled: studyReminders
        })
        .eq('id', profileId)

      alert('Study preferences saved successfully!')
    } catch (error) {
      console.error(error)
      alert('Error saving study preferences.')
    }
  }

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!churchId) return

    try {
      await supabase
        .from('churches')
        .update({
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          accent_color: accentColor
        })
        .eq('id', churchId)

      alert('Branding saved successfully!')
    } catch (error) {
      console.error(error)
      alert('Error saving branding.')
    }
  }

  const handleAddStudyBlock = async () => {
    if (!profileId) return
    const nextDate = getNextDayDate(newBlockDay)
    const dateStr = nextDate.toISOString().split('T')[0]

    try {
      const { data, error } = await supabase.from('calendar_events').insert({
        profile_id: profileId,
        title: 'Study Time',
        event_type: 'sermon_study',
        start_time: `${dateStr}T${newBlockStart}:00`,
        end_time: `${dateStr}T${newBlockEnd}:00`,
        all_day: false,
        description: 'recurring_study',
      }).select() as any

      if (error) throw error
      if (data) {
        setStudyBlocks([...studyBlocks, data[0]])
      }
    } catch (error) {
      console.error(error)
      alert('Error adding study block')
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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword) return
    
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      alert('Password updated successfully!')
      setNewPassword('')
    } catch (error: any) {
      alert(`Error updating password: ${error.message}`)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading settings...</div>
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#022d5c]">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and church preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><User className="w-5 h-5" /> Profile Information</CardTitle>
          <CardDescription>Update your personal and church details.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input 
                  id="fullName" 
                  value={fullName} 
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Your Name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="flex relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input 
                    id="email" 
                    value={email} 
                    readOnly
                    className="pl-9 bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="churchName">Church Name</Label>
              <Input 
                id="churchName" 
                value={churchName} 
                onChange={e => setChurchName(e.target.value)}
              />
            </div>
            <Button type="submit" className="bg-[#022d5c] text-white hover:bg-[#022d5c]/90">
              Save Profile
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Palette className="w-5 h-5" /> Church Branding</CardTitle>
          <CardDescription>Customize the look and feel of your church's app experience.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveBranding} className="space-y-6">
            <div className="space-y-2">
              <Label>Logo Upload</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 hover:border-gray-400 transition-colors cursor-pointer">
                <UploadCloud className="w-8 h-8 mb-2" />
                <p className="text-sm">Drag & drop your logo here or click to browse</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex gap-2">
                  <Input 
                    type="color" 
                    id="primaryColor" 
                    value={primaryColor} 
                    onChange={e => setPrimaryColor(e.target.value)}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input 
                    value={primaryColor} 
                    onChange={e => setPrimaryColor(e.target.value)}
                    className="flex-1 uppercase"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondaryColor">Secondary Color</Label>
                <div className="flex gap-2">
                  <Input 
                    type="color" 
                    id="secondaryColor" 
                    value={secondaryColor} 
                    onChange={e => setSecondaryColor(e.target.value)}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input 
                    value={secondaryColor} 
                    onChange={e => setSecondaryColor(e.target.value)}
                    className="flex-1 uppercase"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="accentColor">Accent Color</Label>
                <div className="flex gap-2">
                  <Input 
                    type="color" 
                    id="accentColor" 
                    value={accentColor} 
                    onChange={e => setAccentColor(e.target.value)}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input 
                    value={accentColor} 
                    onChange={e => setAccentColor(e.target.value)}
                    className="flex-1 uppercase"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 p-4 rounded-md border" style={{ backgroundColor: accentColor }}>
              <p className="font-semibold text-sm mb-2" style={{ color: primaryColor }}>Live Preview</p>
              <div className="flex gap-4">
                <Button type="button" style={{ backgroundColor: primaryColor, color: '#fff' }}>Primary Action</Button>
                <Button type="button" style={{ backgroundColor: secondaryColor, color: '#fff' }}>Secondary Action</Button>
              </div>
            </div>

            <Button type="submit" className="bg-[#022d5c] text-white hover:bg-[#022d5c]/90">
              Save Branding
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5" /> Study & Self-Care</CardTitle>
          <CardDescription>Manage your weekly study goals and reminders.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            <form onSubmit={handleSaveStudyPreferences} className="space-y-6">
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

            <div className="border-t pt-8">
              <h3 className="text-lg font-semibold text-[#022d5c] mb-4">Weekly Study Schedule</h3>
              <div className="space-y-4">
                {studyBlocks.map(block => {
                  const startDate = new Date(block.start_time)
                  const endDate = new Date(block.end_time)
                  const dayName = startDate.toLocaleDateString('en-US', { weekday: 'long' })
                  const startTimeStr = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  const endTimeStr = endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  
                  return (
                    <div key={block.id} className="flex items-center justify-between bg-gray-50 p-4 rounded-md border">
                      <div>
                        <p className="font-medium">{dayName}</p>
                        <p className="text-sm text-gray-500">{startTimeStr} - {endTimeStr}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteStudyBlock(block.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )
                })}

                <div className="bg-gray-50 p-4 rounded-md border space-y-4">
                  <p className="font-medium text-sm">Add Study Block</p>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="space-y-2">
                      <Label>Day</Label>
                      <select 
                        value={newBlockDay}
                        onChange={(e) => setNewBlockDay(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Lock className="w-5 h-5" /> Account & Security</CardTitle>
          <CardDescription>Manage security and billing details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input 
                id="newPassword" 
                type="password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <Button type="submit" variant="outline">Change Password</Button>
          </form>
          
          <hr className="my-6" />
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Subscription Plan</p>
              <p className="text-sm text-muted-foreground">
                {profileId 
                  ? 'Pro - $15/month' 
                  : `Free Trial${trialDaysRemaining !== null ? ` - ${trialDaysRemaining} days remaining` : ''}`
                }
              </p>
            </div>
            {profileId ? (
              <Button variant="outline" onClick={async () => {
                const res = await fetch('/api/billing/portal', { method: 'POST' });
                if (res.ok) {
                  const data = await res.json();
                  window.location.href = data.url;
                } else {
                  alert('You must subscribe first.');
                }
              }}>Manage Subscription</Button>
            ) : (
              <Button variant="outline" onClick={async () => {
                const res = await fetch('/api/billing/checkout', { method: 'POST' });
                if (res.ok) {
                  const data = await res.json();
                  window.location.href = data.url;
                }
              }}>Upgrade Plan</Button>
            )}
          </div>
          
          <hr className="my-6" />

          <div className="flex justify-end">
            <Button variant="destructive" onClick={handleSignOut} className="gap-2">
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
