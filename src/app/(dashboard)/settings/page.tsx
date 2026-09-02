'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { UploadCloud, Palette, User, Mail, Lock, LogOut } from 'lucide-react'

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
            .select('id, full_name, church_id, trial_ends_at')
            .eq('id', user.id)
            .single() as any

          if (profile) {
            setFullName(profile.full_name || '')
            setChurchId(profile.church_id)
            if (profile.trial_ends_at) {
              const endsAt = new Date(profile.trial_ends_at)
              const now = new Date()
              const diffTime = endsAt.getTime() - now.getTime()
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
              setTrialDaysRemaining(diffDays > 0 ? diffDays : 0)
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

      alert('Profile updated successfully!')
    } catch (error) {
      console.error(error)
      alert('Error updating profile.')
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
