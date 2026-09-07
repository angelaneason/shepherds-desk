'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { UploadCloud, Palette, User, Mail, Lock, LogOut, Bell, Image as ImageIcon, Loader2 } from 'lucide-react'
import { CalendarSyncCard } from '@/components/calendar/CalendarSyncCard'

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

  // Notification Preferences
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [notificationPollMinutes, setNotificationPollMinutes] = useState(5)

  // Trial State
  const [trialDaysRemaining, setTrialDaysRemaining] = useState<number | null>(null)

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
            .select('id, full_name, church_id, trial_ends_at, notification_poll_minutes, notifications_enabled')
            .eq('id', user.id)
            .single() as any

          if (profile) {
            setFullName(profile.full_name || user.user_metadata?.full_name || '')
            setTitle(user.user_metadata?.title || 'Pastor')
            setChurchId(profile.church_id)
            if (profile.trial_ends_at) {
              const endsAt = new Date(profile.trial_ends_at)
              const now = new Date()
              const diffTime = endsAt.getTime() - now.getTime()
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
              setTrialDaysRemaining(diffDays > 0 ? diffDays : 0)
            }
            if (profile.notifications_enabled !== undefined && profile.notifications_enabled !== null) {
              setNotificationsEnabled(profile.notifications_enabled)
            }
            if (profile.notification_poll_minutes !== undefined && profile.notification_poll_minutes !== null) {
              setNotificationPollMinutes(profile.notification_poll_minutes)
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

      {/* Notification Preferences */}
      <Card className="shadow-sm rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#022d5c]" /> Notification Preferences
          </CardTitle>
          <CardDescription>Control how and when you receive in-app notifications.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label className="text-base font-medium text-gray-900">Enable Notifications</Label>
              <p className="text-sm text-gray-500">Receive study reminders, sermon deadlines, and care follow-up nudges.</p>
            </div>
            <input
              type="checkbox"
              className="h-5 w-5 rounded border-gray-300 text-[#022d5c] focus:ring-[#022d5c]"
              checked={notificationsEnabled}
              onChange={async (e) => {
                const val = e.target.checked
                setNotificationsEnabled(val)
                if (profileId) {
                  await supabase.from('profiles').update({ notifications_enabled: val } as any).eq('id', profileId)
                }
              }}
            />
          </div>

          {notificationsEnabled && (
            <div className="space-y-2">
              <Label>Check for New Notifications Every</Label>
              <div className="flex items-center gap-3">
                <select
                  value={notificationPollMinutes}
                  onChange={async (e) => {
                    const val = parseInt(e.target.value)
                    setNotificationPollMinutes(val)
                    if (profileId) {
                      await supabase.from('profiles').update({ notification_poll_minutes: val } as any).eq('id', profileId)
                    }
                  }}
                  className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value={1}>1 minute</option>
                  <option value={5}>5 minutes</option>
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                </select>
                <span className="text-sm text-gray-500">polling interval</span>
              </div>
              <p className="text-xs text-gray-400">Lower intervals check more frequently but use more resources.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Powered by Tiny Tech Footer */}
      <div className="pt-8 pb-4 flex flex-col items-center justify-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity">
        <span className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">POWERED BY</span>
        <img src="/tiny-tech-logo.png" alt="Tiny Tech" className="h-6 w-auto object-contain" />
      </div>
    </div>
  )
}
