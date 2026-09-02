'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { LayoutDashboard, BookOpen, Lightbulb, CalendarDays, Heart, Settings, LogOut, Camera, Shield, Gift } from 'lucide-react'
import { PhotoCapture } from '@/components/capture/PhotoCapture'
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
  const supabase = createClient()
  
  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Set user initial from email
        const email = user.email || ''
        setUserInitial(email.charAt(0).toUpperCase())
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, full_name')
          .eq('id', user.id)
          .single() as any
        
        if (profile?.full_name) {
          setUserInitial(profile.full_name.charAt(0).toUpperCase())
        }
        
        if (profile && profile.role === 'admin') {
          setIsAdmin(true)
        }
      }
    }
    checkAdmin()
  }, [supabase])

  const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Sermons', href: '/sermons', icon: BookOpen },
    { name: 'Ideas', href: '/ideas', icon: Lightbulb },
    { name: 'Calendar', href: '/calendar', icon: CalendarDays },
    { name: 'Ministry Care', href: '/care', icon: Heart },
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

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6">
          <h2 className="text-xl font-semibold text-gray-800">Dashboard</h2>
          
          <div className="flex items-center gap-4">
            <Button
              onClick={() => setIsCaptureOpen(true)}
              className="bg-[#D0A348] hover:bg-[#D0A348]/90 text-white gap-2"
            >
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">Quick Capture</span>
            </Button>
            <div className="w-8 h-8 rounded-full bg-[#022d5c] text-white flex items-center justify-center font-bold">
              {userInitial}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6 pb-24 md:pb-6">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe">
        <div className="flex justify-around items-center h-16 px-2">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className="flex flex-col items-center justify-center w-full h-full text-gray-500 hover:text-[#022d5c] transition-colors"
              >
                <Icon className="w-5 h-5 mb-1" />
                <span className="text-[10px]">{item.name}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
