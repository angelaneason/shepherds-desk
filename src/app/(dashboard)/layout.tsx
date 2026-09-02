'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { LayoutDashboard, BookOpen, Lightbulb, CalendarDays, Heart, Settings, LogOut, Camera, Shield, Gift, MoreHorizontal, X, Plus, Menu, Clock, Megaphone, Library } from 'lucide-react'
import { PhotoCapture } from '@/components/capture/PhotoCapture'
import { SupportChat } from '@/components/support/SupportChat'
import NotificationCenter from '@/components/notifications/NotificationCenter'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isCaptureOpen, setIsCaptureOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [userInitial, setUserInitial] = useState('?')
  const [moreOpen, setMoreOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const supabase = createClient()
  
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        
        // Set user initial from email
        const email = user.email || ''
        setUserInitial(email.charAt(0).toUpperCase())
        
        // Try profile query
        try {
          const result: any = await supabase
            .from('profiles')
            .select('role, full_name')
            .eq('id', user.id)
            .single()
          
          const profile = result?.data
          
          if (profile?.full_name && profile.full_name !== 'Pastor') {
            setUserInitial(profile.full_name.charAt(0).toUpperCase())
          }
          
          if (profile?.role === 'admin') {
            setIsAdmin(true)
          }
        } catch {
          // Profile query failed - fall back to email check
          console.log('Profile query failed, using email fallback')
        }
        
        // Email-based admin fallback
        if (email === 'angelaneason@gmail.com') {
          setIsAdmin(true)
        }
      } catch (err) {
        console.error('Auth error:', err)
      }
    }
    checkAdmin()
  }, [])

  const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Sermons', href: '/sermons', icon: BookOpen },
    { name: 'Ideas', href: '/ideas', icon: Lightbulb },
    { name: 'Calendar', href: '/calendar', icon: CalendarDays },
    { name: 'Ministry Care', href: '/care', icon: Heart },
    { name: 'Study', href: '/study', icon: Clock },
    { name: 'Announcements', href: '/announcements', icon: Megaphone },
    { name: 'Resources', href: '/resources', icon: Library },
    { name: 'Refer a Pastor', href: '/referrals', icon: Gift },
    { name: 'Settings', href: '/settings', icon: Settings },
  ]

  const handlePhotoCaptured = async (text: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('ideas')
        .insert({
          profile_id: user.id,
          content: `[Photo] ${text.trim()}`,
          source_type: 'photo',
          ocr_text: text.trim(),
          archived: false
        })

      if (error) throw error
      // Simple native toast could be used here, or shadcn if available
      alert('Idea saved successfully!')
    } catch (error) {
      console.error('Error saving idea from quick capture:', error)
      alert('Failed to save idea. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <PhotoCapture
        isOpen={isCaptureOpen}
        onClose={() => setIsCaptureOpen(false)}
        onTextCaptured={handlePhotoCaptured}
      />
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-[#022d5c] text-white">
        <div className="p-4">
          <Link href="/" className="block">
            <img 
              src="/logo-dark.png" 
              alt="The Shepherd's Desk" 
              className="h-24 w-auto object-contain"
            />
          </Link>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/10 hover:text-[#D0A348] transition-colors"
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </Link>
            )
          })}
          {isAdmin && (
            <Link 
              href="/admin"
              className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/10 hover:text-[#D0A348] transition-colors text-[#D0A348]"
            >
              <Shield className="w-5 h-5" />
              Admin
            </Link>
          )}
        </nav>

      </aside>

      {/* Mobile Side Drawer */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-[#022d5c] text-white flex flex-col shadow-2xl">
            <div className="p-5 border-b border-white/10">
              <div className="flex justify-between items-center">
                <img src="/logo-dark.png" alt="The Shepherd's Desk" className="h-14 w-auto object-contain" />
                <button onClick={() => setDrawerOpen(false)} className="p-2 rounded-full hover:bg-white/10">
                  <X className="w-5 h-5 text-white/70" />
                </button>
              </div>
            </div>
            
            <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
              {[
                { name: 'Dashboard', href: '/', icon: LayoutDashboard },
                { name: 'Sermons', href: '/sermons', icon: BookOpen },
                { name: 'Ideas', href: '/ideas', icon: Lightbulb },
                { name: 'Calendar', href: '/calendar', icon: CalendarDays },
                { name: 'Ministry Care', href: '/care', icon: Heart },
                { name: 'Refer a Pastor', href: '/referrals', icon: Gift },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/10 hover:text-[#D0A348] transition-all text-white/90"
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{item.name}</span>
                  </Link>
                )
              })}
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/10 transition-all text-[#D0A348]"
                >
                  <Shield className="w-5 h-5" />
                  <span className="text-sm font-medium">Admin</span>
                </Link>
              )}
            </nav>

            <div className="p-3 border-t border-white/10 space-y-1">
              <Link
                href="/settings"
                onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/10 transition-all text-white/70"
              >
                <Settings className="w-5 h-5" />
                <span className="text-sm font-medium">Settings</span>
              </Link>
              <button
                onClick={() => { setIsCaptureOpen(true); setDrawerOpen(false) }}
                className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/10 transition-all text-[#D0A348] w-full text-left"
              >
                <Camera className="w-5 h-5" />
                <span className="text-sm font-medium">Quick Capture</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDrawerOpen(true)}
              className="md:hidden p-2 -ml-2 rounded-lg hover:bg-gray-100"
            >
              <Menu className="w-6 h-6 text-[#022d5c]" />
            </button>
            <h2 className="text-xl font-semibold text-gray-800">Dashboard</h2>
          </div>
          
          <div className="flex items-center gap-3">
            <NotificationCenter />
            <Button
              onClick={() => setIsCaptureOpen(true)}
              className="hidden md:flex bg-[#D0A348] hover:bg-[#D0A348]/90 text-white gap-2"
            >
              <Camera className="w-4 h-4" />
              Quick Capture
            </Button>
            <div className="w-9 h-9 rounded-full bg-[#022d5c] text-white flex items-center justify-center font-bold text-sm">
              {userInitial}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-6 pb-24 md:pb-6">
          {children}
        </div>
      </main>

      {/* Mobile More Menu Overlay */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMoreOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 pb-10 animate-in slide-in-from-bottom">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-[#022d5c]">Menu</h3>
              <button onClick={() => setMoreOpen(false)} className="p-2 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { name: 'Ministry Care', href: '/care', icon: Heart, color: '#e74c3c' },
                { name: 'Refer a Pastor', href: '/referrals', icon: Gift, color: '#D0A348' },
                { name: 'Settings', href: '/settings', icon: Settings, color: '#6b7280' },
                ...(isAdmin ? [{ name: 'Admin', href: '/admin', icon: Shield, color: '#D0A348' }] : []),
              ].map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: item.color + '15' }}>
                      <Icon className="w-6 h-6" style={{ color: item.color }} />
                    </div>
                    <span className="text-xs font-medium text-gray-700 text-center">{item.name}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Floating Capture Button */}
      <button
        onClick={() => setIsCaptureOpen(true)}
        className="md:hidden fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-[#D0A348] text-white shadow-lg shadow-[#D0A348]/30 flex items-center justify-center active:scale-95 transition-transform"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-safe z-30">
        <div className="flex justify-around items-center h-16">
          {[
            { name: 'Home', href: '/', icon: LayoutDashboard, color: '#022d5c' },
            { name: 'Sermons', href: '/sermons', icon: BookOpen, color: '#022d5c' },
            { name: 'Ideas', href: '/ideas', icon: Lightbulb, color: '#D0A348' },
            { name: 'Calendar', href: '/calendar', icon: CalendarDays, color: '#022d5c' },
          ].map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                className="flex flex-col items-center justify-center flex-1 h-full text-gray-400 hover:text-[#022d5c] transition-colors group"
              >
                <Icon className="w-6 h-6 mb-0.5 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-medium">{item.name}</span>
              </Link>
            )
          })}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center justify-center flex-1 h-full text-gray-400 hover:text-[#022d5c] transition-colors group"
          >
            <MoreHorizontal className="w-6 h-6 mb-0.5 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>

      <SupportChat />
    </div>
  )
}
