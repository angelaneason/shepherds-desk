'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  UploadCloud, Palette, User, Mail, Lock, LogOut, Bell, Image as ImageIcon, Loader2,
  Calendar, BookOpen, Clock, Moon, Volume2, Sparkles, Send, CheckCircle2, ShieldCheck, Sun, HeartHandshake, Megaphone, Smartphone, Check
} from 'lucide-react'
import { CalendarSyncCard } from '@/components/calendar/CalendarSyncCard'

const DEFAULT_NOTIFICATION_PREFS = {
  calendar_reminders: true,
  calendar_lead_minutes: 15,
  care_followups: true,
  study_alerts: true,
  sermon_deadlines: true,
  morning_brief: true,
  morning_brief_time: '07:00',
  announcements: true,
  quiet_hours_enabled: false,
  quiet_hours_start: '21:00',
  quiet_hours_end: '07:00',
  sabbath_mute_day: 'none',
  sound_enabled: true,
  vibrate_enabled: true
}

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()

  // Profile State
  const [title, setTitle] = useState('Pastor')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [churchName, setChurchName] = useState('')
  const [churchId, setChurchId] = useState<string | null>(null)
  const [profileId, setProfileId] = useState<string | null>(null)

  const TITLE_OPTIONS = ['Pastor', 'Minister', 'Teacher', 'Preacher', 'Reverend', 'Bishop', 'Elder', 'Evangelist', 'Deacon', 'Chaplain', 'Other']

  // Branding State
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [primaryColor, setPrimaryColor] = useState("#022d5c")
  const [secondaryColor, setSecondaryColor] = useState("#D0A348")
  const [accentColor, setAccentColor] = useState("#F8F5EE")

  // Password State
  const [newPassword, setNewPassword] = useState('')

  // Notification Preferences State
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [notificationPollMinutes, setNotificationPollMinutes] = useState(5)
  const [notifPrefs, setNotifPrefs] = useState(DEFAULT_NOTIFICATION_PREFS)
  const [browserPermission, setBrowserPermission] = useState<string>('default')
  const [testSent, setTestSent] = useState(false)
  const [savingNotifs, setSavingNotifs] = useState(false)
  const [notifsSavedMessage, setNotifsSavedMessage] = useState(false)

  // Trial & Subscription State
  const [trialDaysRemaining, setTrialDaysRemaining] = useState<number | null>(null)
  const [stripeCustomerId, setStripeCustomerId] = useState<string | null>(null)
  const [billingPlan, setBillingPlan] = useState<'monthly' | 'annual'>('annual')
  const [isCheckingOut, setIsCheckingOut] = useState(false)

  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setEmail(user.email || '')
        setProfileId(user.id)
        
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, church_id, trial_ends_at, stripe_customer_id, created_at, notification_poll_minutes, notifications_enabled')
            .eq('id', user.id)
            .single() as any

          if (profile) {
            setFullName(profile.full_name || user.user_metadata?.full_name || '')
            setTitle(user.user_metadata?.title || 'Pastor')
            setChurchId(profile.church_id)
            setStripeCustomerId(profile.stripe_customer_id || null)

            if (profile.trial_ends_at) {
              const endsAt = new Date(profile.trial_ends_at)
              const now = new Date()
              const diffTime = endsAt.getTime() - now.getTime()
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
              setTrialDaysRemaining(diffDays > 0 ? diffDays : 0)
            } else if (profile.created_at) {
              const createdAt = new Date(profile.created_at)
              const trialEnd = new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000)
              const diffTime = trialEnd.getTime() - Date.now()
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
              setTrialDaysRemaining(diffDays > 0 ? diffDays : 0)
            } else {
              setTrialDaysRemaining(30)
            }
            if (profile.notifications_enabled !== undefined && profile.notifications_enabled !== null) {
              setNotificationsEnabled(profile.notifications_enabled)
            }
            if (profile.notification_poll_minutes !== undefined && profile.notification_poll_minutes !== null) {
              setNotificationPollMinutes(profile.notification_poll_minutes)
            }

            if (typeof window !== 'undefined') {
              if ('Notification' in window) {
                setBrowserPermission(Notification.permission)
              }
              const saved = localStorage.getItem('shepherds_desk_notification_prefs')
              if (saved) {
                try {
                  setNotifPrefs({ ...DEFAULT_NOTIFICATION_PREFS, ...JSON.parse(saved) })
                } catch {}
              }
            }

            if (profile.church_id) {
              const { data: church } = await supabase
                .from('churches')
                .select('name, logo_url, primary_color, secondary_color, accent_color')
                .eq('id', profile.church_id)
                .single() as any

              if (church) {
                setChurchName(church.name || '')
                setLogoUrl(church.logo_url || null)
                setPrimaryColor(church.primary_color || '#022d5c')
                setSecondaryColor(church.secondary_color || '#D0A348')
                setAccentColor(church.accent_color || '#F8F5EE')
              }
            }
          }
        } catch (err) {
          console.error('Error fetching profile details:', err)
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
    if (!profileId) return

    try {
      // 1. Save title, name, and church name to user metadata for instant cloud access
      await supabase.auth.updateUser({
        data: { full_name: fullName, title: title, church_name: churchName }
      })

      // 2. Update profiles table
      await supabase
        .from('profiles')
        .update({ full_name: fullName } as any)
        .eq('id', profileId)

      // 3. Update or create church record
      if (churchId) {
        await supabase
          .from('churches')
          .update({ name: churchName })
          .eq('id', churchId)
      } else if (churchName.trim()) {
        const { data: newChurch } = await supabase
          .from('churches')
          .insert({ name: churchName.trim() })
          .select()
          .single() as any
        if (newChurch) {
          await supabase.from('profiles').update({ church_id: newChurch.id } as any).eq('id', profileId)
          setChurchId(newChurch.id)
        }
      }

      alert('Profile updated successfully!')
    } catch (error) {
      console.error(error)
      alert('Error updating profile.')
    }
  }

  const handleRequestBrowserPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission()
        setBrowserPermission(perm)
      } catch (err) {
        console.error('Permission error:', err)
      }
    }
  }

  const handleSaveNotificationPrefs = async (newPrefs: typeof notifPrefs, enabled: boolean) => {
    setSavingNotifs(true)
    setNotifPrefs(newPrefs)
    if (typeof window !== 'undefined') {
      localStorage.setItem('shepherds_desk_notification_prefs', JSON.stringify(newPrefs))
    }
    if (profileId) {
      try {
        await supabase.from('profiles').update({
          notifications_enabled: enabled,
          notification_poll_minutes: notificationPollMinutes,
          study_reminders_enabled: newPrefs.study_alerts
        } as any).eq('id', profileId)
      } catch (err) {
        console.error('Error saving notifs to profile:', err)
      }
    }
    setSavingNotifs(false)
    setNotifsSavedMessage(true)
    setTimeout(() => setNotifsSavedMessage(false), 3000)
  }

  const handleSendTestNotification = () => {
    setTestSent(true)
    setTimeout(() => setTestSent(false), 3000)

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification("The Shepherd's Desk 🔔", {
          body: "Pastoral Reminder: Hospital visit with Brother John at 2:00 PM. (Your notification settings are active!)",
          icon: "/shepherds-desk-banner-logo.png"
        })
      } catch {
        alert("🔔 Test Notification: Hospital visit with Brother John at 2:00 PM. (Your notification settings are active!)")
      }
    } else {
      alert("🔔 Test Notification: Hospital visit with Brother John at 2:00 PM. (Tip: Click 'Enable Desktop Banners' above for pop-up alerts!)")
    }
  }

  const handleLogoUpload = async (file: File) => {
    if (!file) return
    setUploadingLogo(true)
    try {
      const formData = new FormData()
      formData.append('logo', file)

      const res = await fetch('/api/church/logo', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload logo')
      }

      setLogoUrl(data.logoUrl)
      window.dispatchEvent(
        new CustomEvent('church_branding_updated', {
          detail: { logoUrl: data.logoUrl, primaryColor, secondaryColor, accentColor, name: churchName },
        })
      )
      alert('Church logo uploaded and applied!')
    } catch (err: any) {
      console.error('Logo upload error:', err)
      alert(err.message || 'Error uploading logo')
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleRemoveLogo = async () => {
    if (!confirm('Are you sure you want to remove your church logo?')) return
    setUploadingLogo(true)
    try {
      const res = await fetch('/api/church/logo', { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to remove logo')
      }
      setLogoUrl(null)
      window.dispatchEvent(
        new CustomEvent('church_branding_updated', {
          detail: { logoUrl: null, primaryColor, secondaryColor, accentColor, name: churchName },
        })
      )
      alert('Logo removed.')
    } catch (err: any) {
      console.error('Logo delete error:', err)
      alert(err.message || 'Error removing logo')
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      let activeChurchId = churchId

      if (!activeChurchId) {
        const { data: newChurch, error: createError } = await supabase
          .from('churches')
          .insert({
            name: churchName.trim() || 'My Church',
            primary_color: primaryColor,
            secondary_color: secondaryColor,
            accent_color: accentColor,
          })
          .select()
          .single() as any

        if (createError) throw createError
        if (newChurch) {
          activeChurchId = newChurch.id
          setChurchId(newChurch.id)
          if (profileId) {
            await supabase.from('profiles').update({ church_id: newChurch.id } as any).eq('id', profileId)
          }
        }
      } else {
        const { error: updateError } = await supabase
          .from('churches')
          .update({
            primary_color: primaryColor,
            secondary_color: secondaryColor,
            accent_color: accentColor
          })
          .eq('id', activeChurchId)

        if (updateError) throw updateError
      }

      // Live update dashboard layout
      window.dispatchEvent(
        new CustomEvent('church_branding_updated', {
          detail: {
            primaryColor,
            secondaryColor,
            accentColor,
            logoUrl,
            name: churchName
          }
        })
      )

      alert('Branding saved successfully! Your theme colors are now active.')
    } catch (error: any) {
      console.error(error)
      alert(`Error saving branding: ${error.message || 'Please try again'}`)
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
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <select
                  id="title"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-white text-sm text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#022d5c]"
                >
                  {TITLE_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input 
                  id="fullName" 
                  value={fullName} 
                  onChange={e => setFullName(e.target.value)}
                  placeholder="e.g. Angie Neason"
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
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-900">Church Logo</Label>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleLogoUpload(file)
                }}
              />

              {logoUrl ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <div className="bg-white p-2.5 rounded-lg border border-gray-200 shadow-sm flex items-center justify-center min-w-[120px] h-20">
                    <img
                      src={logoUrl}
                      alt="Church Logo"
                      className="max-h-16 max-w-[180px] object-contain"
                    />
                  </div>
                  <div className="space-y-2 flex-1">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Your Church Logo is Active</p>
                      <p className="text-xs text-gray-500">Displayed in your desktop sidebar and mobile navigation drawer.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploadingLogo}
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs"
                      >
                        {uploadingLogo ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          'Replace Logo'
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={uploadingLogo}
                        onClick={handleRemoveLogo}
                        className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Remove Logo
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    const file = e.dataTransfer.files?.[0]
                    if (file) handleLogoUpload(file)
                  }}
                  className="border-2 border-dashed border-gray-300 hover:border-teal-500 rounded-xl p-8 flex flex-col items-center justify-center text-gray-500 hover:bg-teal-50/20 transition-all cursor-pointer group"
                >
                  {uploadingLogo ? (
                    <div className="flex flex-col items-center">
                      <Loader2 className="w-8 h-8 mb-2 text-teal-600 animate-spin" />
                      <p className="text-sm font-medium text-gray-700">Uploading your logo to cloud storage...</p>
                    </div>
                  ) : (
                    <>
                      <UploadCloud className="w-9 h-9 mb-2 text-gray-400 group-hover:text-teal-600 transition-colors" />
                      <p className="text-sm font-medium text-gray-700">
                        Click to browse or drag &amp; drop your church logo
                      </p>
                      <p className="text-xs text-gray-400 mt-1">PNG, JPG, SVG, or WebP up to 5MB</p>
                    </>
                  )}
                </div>
              )}
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

      {/* Integrations / Calendar Sync */}
      <CalendarSyncCard className="shadow-sm rounded-xl" />

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
          
          {stripeCustomerId ? (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <p className="font-semibold text-emerald-950">The Shepherd's Desk Pro Active</p>
                </div>
                <p className="text-xs text-emerald-700 mt-1">Full access to sermon studio, pastoral care, smart reminders, and study tools.</p>
              </div>
              <Button 
                variant="outline" 
                className="border-emerald-300 text-emerald-900 hover:bg-emerald-100/50 text-xs font-semibold"
                onClick={async () => {
                  try {
                    const res = await fetch('/api/billing/portal', { method: 'POST' });
                    if (res.ok) {
                      const data = await res.json();
                      if (data.url) window.location.href = data.url;
                    } else {
                      alert('Unable to open billing portal. Please contact support.');
                    }
                  } catch {
                    alert('Error reaching billing portal');
                  }
                }}
              >
                Manage Subscription &amp; Invoices
              </Button>
            </div>
          ) : (
            <div className="border border-amber-200 bg-amber-50/40 rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                      30-Day Free Trial
                    </span>
                    <span className="text-xs font-medium text-amber-800">
                      {trialDaysRemaining !== null ? `${trialDaysRemaining} days remaining` : '30 days remaining'}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-[#022d5c] mt-1.5">Experience Full Pastoral Access</h4>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Try every feature completely free for 30 days. No charge today. Cancel anytime with 1-click.
                  </p>
                </div>
              </div>

              {/* Plan Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div 
                  onClick={() => setBillingPlan('annual')}
                  className={`p-3.5 rounded-lg border-2 cursor-pointer transition-all ${
                    billingPlan === 'annual' 
                      ? 'border-[#022d5c] bg-white shadow-sm ring-1 ring-[#022d5c]' 
                      : 'border-gray-200 bg-white/60 hover:bg-white'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-[#022d5c] uppercase tracking-wider">Annual Plan</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      Save $24 / year
                    </span>
                  </div>
                  <div className="mt-2">
                    <span className="text-2xl font-bold text-[#022d5c]">$12.99</span>
                    <span className="text-xs text-gray-500"> / month</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">$155.88 billed annually in advance after your 30-day free trial</p>
                </div>

                <div 
                  onClick={() => setBillingPlan('monthly')}
                  className={`p-3.5 rounded-lg border-2 cursor-pointer transition-all ${
                    billingPlan === 'monthly' 
                      ? 'border-[#022d5c] bg-white shadow-sm ring-1 ring-[#022d5c]' 
                      : 'border-gray-200 bg-white/60 hover:bg-white'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-[#022d5c] uppercase tracking-wider">Monthly Plan</span>
                    <span className="text-[11px] text-gray-500">Flexible</span>
                  </div>
                  <div className="mt-2">
                    <span className="text-2xl font-bold text-[#022d5c]">$14.99</span>
                    <span className="text-xs text-gray-500"> / month</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">Billed monthly after your 30-day free trial</p>
                </div>
              </div>

              <Button 
                disabled={isCheckingOut}
                onClick={async () => {
                  setIsCheckingOut(true);
                  try {
                    const res = await fetch('/api/billing/checkout', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ plan: billingPlan })
                    });
                    if (res.ok) {
                      const data = await res.json();
                      if (data.url) window.location.href = data.url;
                    } else {
                      const err = await res.json();
                      alert(err.error || 'Failed to start checkout');
                    }
                  } catch (e) {
                    alert('Network error initiating checkout');
                  } finally {
                    setIsCheckingOut(false);
                  }
                }}
                className="w-full sm:w-auto bg-[#022d5c] hover:bg-[#022d5c]/90 text-white font-semibold px-6"
              >
                {isCheckingOut ? 'Opening Secure Checkout...' : `Start 30-Day Free Trial (${billingPlan === 'annual' ? '$12.99/mo' : '$14.99/mo'})`}
              </Button>
            </div>
          )}
          
          <hr className="my-6" />

          <div className="flex justify-end">
            <Button variant="destructive" onClick={handleSignOut} className="gap-2">
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences & Phone Alerts Control Panel */}
      <Card className="shadow-sm rounded-xl border border-[#022d5c]/10 bg-white overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-[#022d5c]/5 via-[#D0A348]/5 to-transparent pb-4 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl font-playfair font-bold text-[#022d5c]">
                <Bell className="w-5 h-5 text-[#D0A348]" /> Notification Preferences &amp; Phone Alerts
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-gray-600 mt-1">
                Customize exactly which alerts reach you, set quiet hours, and control sounds and reminders.
              </CardDescription>
            </div>
            {notifsSavedMessage && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 animate-fade-in self-start sm:self-auto">
                <Check className="w-3.5 h-3.5" /> Preferences Saved
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-5 sm:p-6 space-y-6">
          {/* Master Switch & Browser Permission */}
          <div className="p-4 rounded-xl bg-[#F8F5EE] border border-[#022d5c]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900 text-base">Allow Notifications</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${notificationsEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'}`}>
                  {notificationsEnabled ? 'Active' : 'Muted'}
                </span>
              </div>
              <p className="text-xs text-gray-600">
                Master switch for lock-screen alerts, visit reminders, and care nudges.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {browserPermission !== 'granted' && typeof window !== 'undefined' && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleRequestBrowserPermission}
                  className="text-xs border-[#022d5c] text-[#022d5c] hover:bg-[#022d5c]/5"
                >
                  <Bell className="w-3.5 h-3.5 mr-1 text-[#D0A348]" />
                  Enable Desktop Banners
                </Button>
              )}
              <input
                type="checkbox"
                id="masterNotifToggle"
                className="h-6 w-6 rounded border-gray-300 text-[#022d5c] focus:ring-[#022d5c] cursor-pointer"
                checked={notificationsEnabled}
                onChange={async (e) => {
                  const val = e.target.checked
                  setNotificationsEnabled(val)
                  await handleSaveNotificationPrefs(notifPrefs, val)
                }}
              />
            </div>
          </div>

          {notificationsEnabled && (
            <div className="space-y-6">
              {/* Category Toggles */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#022d5c] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#D0A348]" />
                  Ministry Alert Categories (Turn on what you want):
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Calendar & Visits */}
                  <div className="p-3.5 rounded-lg border border-gray-200 bg-white hover:border-[#D0A348]/40 transition-colors flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#022d5c]" />
                        <span className="font-semibold text-sm text-gray-900">Calendar &amp; Visits</span>
                      </div>
                      <p className="text-xs text-gray-500">Reminders for hospital visits, meetings, and Sunday services.</p>
                      {notifPrefs.calendar_reminders && (
                        <div className="pt-1.5 flex items-center gap-2">
                          <span className="text-[11px] text-gray-500 font-medium">Alert me:</span>
                          <select
                            value={notifPrefs.calendar_lead_minutes}
                            onChange={(e) => handleSaveNotificationPrefs({ ...notifPrefs, calendar_lead_minutes: parseInt(e.target.value) }, notificationsEnabled)}
                            className="text-xs h-7 px-2 border rounded bg-white text-gray-700"
                          >
                            <option value={15}>15 min before</option>
                            <option value={30}>30 min before</option>
                            <option value={60}>1 hour before</option>
                            <option value={120}>2 hours before</option>
                          </select>
                        </div>
                      )}
                    </div>
                    <input
                      type="checkbox"
                      checked={notifPrefs.calendar_reminders}
                      onChange={(e) => handleSaveNotificationPrefs({ ...notifPrefs, calendar_reminders: e.target.checked }, notificationsEnabled)}
                      className="h-4 w-4 rounded border-gray-300 text-[#022d5c] mt-1 cursor-pointer"
                    />
                  </div>

                  {/* Care Follow-ups */}
                  <div className="p-3.5 rounded-lg border border-gray-200 bg-white hover:border-[#D0A348]/40 transition-colors flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <HeartHandshake className="w-4 h-4 text-purple-600" />
                        <span className="font-semibold text-sm text-gray-900">Care Follow-Ups</span>
                      </div>
                      <p className="text-xs text-gray-500">Alerts on the day a member check-in call or visit is due.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifPrefs.care_followups}
                      onChange={(e) => handleSaveNotificationPrefs({ ...notifPrefs, care_followups: e.target.checked }, notificationsEnabled)}
                      className="h-4 w-4 rounded border-gray-300 text-[#022d5c] mt-1 cursor-pointer"
                    />
                  </div>

                  {/* Sacred Study Alerts */}
                  <div className="p-3.5 rounded-lg border border-gray-200 bg-white hover:border-[#D0A348]/40 transition-colors flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-emerald-600" />
                        <span className="font-semibold text-sm text-gray-900">Sacred Study Time</span>
                      </div>
                      <p className="text-xs text-gray-500">Gentle prep reminder 15 minutes before scheduled study block.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifPrefs.study_alerts}
                      onChange={(e) => handleSaveNotificationPrefs({ ...notifPrefs, study_alerts: e.target.checked }, notificationsEnabled)}
                      className="h-4 w-4 rounded border-gray-300 text-[#022d5c] mt-1 cursor-pointer"
                    />
                  </div>

                  {/* Sermon Deadlines */}
                  <div className="p-3.5 rounded-lg border border-gray-200 bg-white hover:border-[#D0A348]/40 transition-colors flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-600" />
                        <span className="font-semibold text-sm text-gray-900">Sermon Prep Milestones</span>
                      </div>
                      <p className="text-xs text-gray-500">Thursday/Friday reminder if Sunday message outline is in draft.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifPrefs.sermon_deadlines}
                      onChange={(e) => handleSaveNotificationPrefs({ ...notifPrefs, sermon_deadlines: e.target.checked }, notificationsEnabled)}
                      className="h-4 w-4 rounded border-gray-300 text-[#022d5c] mt-1 cursor-pointer"
                    />
                  </div>

                  {/* Morning Briefing */}
                  <div className="p-3.5 rounded-lg border border-gray-200 bg-white hover:border-[#D0A348]/40 transition-colors flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Sun className="w-4 h-4 text-amber-500" />
                        <span className="font-semibold text-sm text-gray-900">Daily Morning Brief</span>
                      </div>
                      <p className="text-xs text-gray-500">Morning overview of today's calendar, visits, and follow-ups.</p>
                      {notifPrefs.morning_brief && (
                        <div className="pt-1.5 flex items-center gap-2">
                          <span className="text-[11px] text-gray-500 font-medium">Send at:</span>
                          <select
                            value={notifPrefs.morning_brief_time}
                            onChange={(e) => handleSaveNotificationPrefs({ ...notifPrefs, morning_brief_time: e.target.value }, notificationsEnabled)}
                            className="text-xs h-7 px-2 border rounded bg-white text-gray-700"
                          >
                            <option value="06:00">6:00 AM</option>
                            <option value="07:00">7:00 AM</option>
                            <option value="08:00">8:00 AM</option>
                            <option value="09:00">9:00 AM</option>
                          </select>
                        </div>
                      )}
                    </div>
                    <input
                      type="checkbox"
                      checked={notifPrefs.morning_brief}
                      onChange={(e) => handleSaveNotificationPrefs({ ...notifPrefs, morning_brief: e.target.checked }, notificationsEnabled)}
                      className="h-4 w-4 rounded border-gray-300 text-[#022d5c] mt-1 cursor-pointer"
                    />
                  </div>

                  {/* Announcements */}
                  <div className="p-3.5 rounded-lg border border-gray-200 bg-white hover:border-[#D0A348]/40 transition-colors flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Megaphone className="w-4 h-4 text-blue-600" />
                        <span className="font-semibold text-sm text-gray-900">Church Announcements</span>
                      </div>
                      <p className="text-xs text-gray-500">Urgent notices, event reminders, and volunteer calls.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifPrefs.announcements}
                      onChange={(e) => handleSaveNotificationPrefs({ ...notifPrefs, announcements: e.target.checked }, notificationsEnabled)}
                      className="h-4 w-4 rounded border-gray-300 text-[#022d5c] mt-1 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Quiet Hours & Sabbath Rest Mode */}
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#022d5c] flex items-center gap-1.5">
                  <Moon className="w-3.5 h-3.5 text-indigo-600" />
                  Quiet Hours &amp; Sabbath Rest (Do Not Disturb):
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="quietHours" className="text-xs font-semibold text-gray-800">
                        Sleep Quiet Hours
                      </Label>
                      <input
                        type="checkbox"
                        id="quietHours"
                        checked={notifPrefs.quiet_hours_enabled}
                        onChange={(e) => handleSaveNotificationPrefs({ ...notifPrefs, quiet_hours_enabled: e.target.checked }, notificationsEnabled)}
                        className="h-4 w-4 rounded border-gray-300 text-[#022d5c]"
                      />
                    </div>
                    <p className="text-[11px] text-gray-500">Mutes non-urgent reminders during the night.</p>
                    {notifPrefs.quiet_hours_enabled && (
                      <div className="flex items-center gap-2 text-xs">
                        <span>From</span>
                        <input
                          type="time"
                          value={notifPrefs.quiet_hours_start}
                          onChange={(e) => handleSaveNotificationPrefs({ ...notifPrefs, quiet_hours_start: e.target.value }, notificationsEnabled)}
                          className="px-2 py-1 border rounded bg-white"
                        />
                        <span>to</span>
                        <input
                          type="time"
                          value={notifPrefs.quiet_hours_end}
                          onChange={(e) => handleSaveNotificationPrefs({ ...notifPrefs, quiet_hours_end: e.target.value }, notificationsEnabled)}
                          className="px-2 py-1 border rounded bg-white"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-gray-800">
                      Sabbath Day Off (Mute on Day of Rest)
                    </Label>
                    <p className="text-[11px] text-gray-500">Protects your family day of rest by muting ministry notifications.</p>
                    <select
                      value={notifPrefs.sabbath_mute_day}
                      onChange={(e) => handleSaveNotificationPrefs({ ...notifPrefs, sabbath_mute_day: e.target.value }, notificationsEnabled)}
                      className="text-xs h-8 px-2 border rounded bg-white text-gray-700 w-full sm:w-auto"
                    >
                      <option value="none">None (Receive all days)</option>
                      <option value="Monday">Monday (Pastor's Sabbath)</option>
                      <option value="Tuesday">Tuesday</option>
                      <option value="Friday">Friday</option>
                      <option value="Saturday">Saturday</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Sounds & Test Notification */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-gray-100">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifPrefs.sound_enabled}
                      onChange={(e) => handleSaveNotificationPrefs({ ...notifPrefs, sound_enabled: e.target.checked }, notificationsEnabled)}
                      className="h-3.5 w-3.5 rounded text-[#022d5c]"
                    />
                    <Volume2 className="w-3.5 h-3.5 text-gray-500" />
                    Play Alert Sound
                  </label>
                  <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifPrefs.vibrate_enabled}
                      onChange={(e) => handleSaveNotificationPrefs({ ...notifPrefs, vibrate_enabled: e.target.checked }, notificationsEnabled)}
                      className="h-3.5 w-3.5 rounded text-[#022d5c]"
                    />
                    <Smartphone className="w-3.5 h-3.5 text-gray-500" />
                    Vibrate
                  </label>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSendTestNotification}
                  className="text-xs border-gray-300 text-[#022d5c] hover:bg-[#F8F5EE]"
                >
                  <Bell className="w-3.5 h-3.5 mr-1.5 text-[#D0A348]" />
                  {testSent ? "Test Sent! 🔔" : "Send Test Phone Alert"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Powered by Tiny Tech Footer */}
      <a 
        href="https://tinytechcompany.com" 
        target="_blank" 
        rel="noopener noreferrer" 
        className="pt-8 pb-4 flex flex-col items-center justify-center gap-2 group opacity-85 hover:opacity-100 transition-opacity"
      >
        <span className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold group-hover:text-[#022d5c] transition-colors">POWERED BY</span>
        <img 
          src="/tiny-tech-logo.png" 
          alt="Tiny Tech" 
          className="h-9 w-auto max-w-[180px] object-contain transition-transform group-hover:scale-105" 
        />
      </a>
    </div>
  )
}
