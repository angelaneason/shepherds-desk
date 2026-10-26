'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  BookOpen,
  BookMarked,
  Lightbulb,
  CalendarDays,
  Heart,
  Settings,
  Camera,
  Shield,
  Gift,
  X,
  Menu,
  Clock,
  Library,
  MessageSquare,
  Mic,
  Globe,
  Users,
  HelpCircle,
  ArrowLeft,
  Sparkles,
  LogOut,
} from 'lucide-react'
import { SmartReminder } from '@/components/reminders/SmartReminder'
import { SupportChat } from '@/components/support/SupportChat'
import { CompleteProfilePrompt } from '@/components/onboarding/CompleteProfilePrompt'
import NotificationCenter from '@/components/notifications/NotificationCenter'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isPulpit = pathname?.endsWith('/pulpit')

  const [isAssistantOpen, setIsAssistantOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [userInitial, setUserInitial] = useState('?')
  const [churchBrand, setChurchBrand] = useState<{
    name?: string
    logoUrl?: string | null
    primaryColor?: string
    secondaryColor?: string
    accentColor?: string
  } | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  // Pulsing dot on the phone "Menu" button until the user opens it once
  const [menuSeen, setMenuSeen] = useState(true)

  useEffect(() => {
    try { setMenuSeen(localStorage.getItem('sd_menu_seen') === '1') } catch {}
    // Gift recipients who just confirmed their email: continue to gift redemption
    try {
      const pendingGift = localStorage.getItem('sd_pending_gift')
      if (pendingGift) {
        localStorage.removeItem('sd_pending_gift')
        window.location.href = `/gift/redeem?code=${encodeURIComponent(pendingGift)}`
      }
    } catch {}
  }, [])

  const openDrawer = () => {
    setDrawerOpen(true)
    if (!menuSeen) {
      setMenuSeen(true)
      try { localStorage.setItem('sd_menu_seen', '1') } catch {}
    }
  }

  const supabase = createClient()

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch {}
    window.location.href = '/login'
  }
  
  useEffect(() => {
    const handleBrandingUpdated = (e: any) => {
      const detail = e.detail || {}
      setChurchBrand((prev) => ({
        ...prev,
        ...detail,
      }))
    }
    window.addEventListener('church_branding_updated', handleBrandingUpdated)
    return () => window.removeEventListener('church_branding_updated', handleBrandingUpdated)
  }, [])

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
            .select('role, full_name, church_id')
            .eq('id', user.id)
            .single()
          
          const profile = result?.data
          
          if (profile?.full_name && profile.full_name !== 'Pastor') {
            setUserInitial(profile.full_name.charAt(0).toUpperCase())
          }
          
          if (profile?.role === 'admin') {
            setIsAdmin(true)
          }

          if (profile?.church_id) {
            const { data: church } = await supabase
              .from('churches')
              .select('name, logo_url, primary_color, secondary_color, accent_color')
              .eq('id', profile.church_id)
              .single() as any

            if (church) {
              setChurchBrand({
                name: church.name,
                logoUrl: church.logo_url,
                primaryColor: church.primary_color || '#022d5c',
                secondaryColor: church.secondary_color || '#D0A348',
                accentColor: church.accent_color || '#F8F5EE',
              })
            }
          }
        } catch {
          // Profile query failed - fall back to email check
          console.log('Profile query failed, using email fallback')
        }
        
        // Email-based admin fallback
        if (email === 'angelaneason@gmail.com' || email === 'tinyneason@gmail.com') {
          setIsAdmin(true)
        }
      } catch (err) {
        console.error('Auth error:', err)
      }
    }
    checkAdmin()
  }, [])

  const navSections = [
    {
      label: 'Daily Ministry',
      items: [
        { name: 'Home', href: '/', icon: LayoutDashboard },
        { name: 'Sermons', href: '/sermons', icon: BookOpen },
        { name: 'Calendar', href: '/calendar', icon: CalendarDays },
        { name: 'Ministry Care', href: '/care', icon: Heart },
        { name: 'People', href: '/care?tab=people', icon: Users },
      ],
    },
    {
      label: 'Study & Prep',
      items: [
        { name: 'Study', href: '/study', icon: Clock },
        { name: 'Ideas', href: '/ideas', icon: Lightbulb },
        { name: 'Reference Library', href: '/library', icon: BookMarked },
        { name: 'Resources', href: '/resources', icon: Library },
      ],
    },
    {
      label: 'Church & Account',
      items: [
        { name: 'Communication', href: '/announcements', icon: MessageSquare },
        { name: 'User Manual', href: '/manual', icon: HelpCircle },
        { name: 'Refer a Pastor', href: '/referrals', icon: Gift },
        { name: 'Settings', href: '/settings', icon: Settings },
      ],
    },
  ]

  // Determine clear page title and back destination for the top header
  const getHeaderContext = (path: string | null) => {
    if (!path || path === '/') {
      return { title: 'Home', backHref: null, backLabel: null }
    }
    if (path === '/sermons/new') {
      return { title: 'New Sermon', backHref: '/sermons', backLabel: 'Sermons' }
    }
    if (path.startsWith('/sermons/')) {
      return { title: 'Edit Sermon', backHref: '/sermons', backLabel: 'Sermons' }
    }
    const map: Record<string, string> = {
      '/sermons': 'Sermons',
      '/calendar': 'Calendar',
      '/care': 'Ministry Care & People',
      '/study': 'Study & Preparation',
      '/ideas': 'Ideas Inbox',
      '/library': 'Reference Library',
      '/resources': 'Counseling Resources',
      '/announcements': 'Communication',
      '/communication': 'Communication',
      '/manual': 'User Manual',
      '/referrals': 'Refer a Pastor',
      '/settings': 'Settings',
      '/admin': 'Admin Center',
    }
    return {
      title: map[path] || 'Dashboard',
      backHref: '/',
      backLabel: 'Home',
    }
  }

  const { title: pageTitle, backHref, backLabel } = getHeaderContext(pathname)

  if (isPulpit) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <CompleteProfilePrompt />
      <SmartReminder
        variant="modal"
        open={isAssistantOpen}
        onOpenChange={setIsAssistantOpen}
      />

      {/* Desktop Sidebar */}
      <aside 
        className="hidden md:flex flex-col w-64 text-white transition-colors duration-300 print:hidden"
        style={{ backgroundColor: churchBrand?.primaryColor || '#022d5c' }}
      >
        <div className="p-4 border-b border-white/10">
          <Link href="/" className="block">
            {churchBrand?.logoUrl ? (
              <div className="flex flex-col items-start gap-1">
                <img 
                  src={churchBrand.logoUrl} 
                  alt={churchBrand.name || "Church Logo"} 
                  className="h-14 w-auto max-w-[200px] object-contain rounded bg-white/10 p-1"
                />
                {churchBrand.name && (
                  <span className="text-xs font-semibold text-white/90 tracking-wide mt-1.5 truncate max-w-full">
                    {churchBrand.name}
                  </span>
                )}
              </div>
            ) : (
              <div>
                <img 
                  src="/the_shepherds_desk_logo_transparent.png" 
                  alt="The Shepherd's Desk" 
                  className="h-20 w-auto object-contain"
                />
                {churchBrand?.name && (
                  <span className="text-xs font-medium text-white/80 block mt-1 truncate">
                    {churchBrand.name}
                  </span>
                )}
              </div>
            )}
          </Link>
        </div>
        
        <nav className="flex-1 px-4 space-y-5 mt-4 overflow-y-auto pb-4">
          {navSections.map((section) => (
            <div key={section.label} className="space-y-1">
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-white/50 mb-1.5">
                {section.label}
              </p>
              {section.items.map((item) => {
                const Icon = item.icon
                const isActive = item.href === '/' ? pathname === '/' : pathname?.startsWith(item.href.split('?')[0])
                return (
                  <Link 
                    key={item.name} 
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm ${
                      isActive
                        ? 'bg-white/15 text-[#D0A348] font-semibold'
                        : 'text-white/90 hover:bg-white/10 hover:text-[#D0A348]'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </div>
          ))}

          {isAdmin && (
            <div className="space-y-1 pt-2 border-t border-white/10">
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-[#D0A348]/80 mb-1.5">
                Administration
              </p>
              <Link 
                href="/admin"
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 hover:text-[#D0A348] transition-colors text-[#D0A348] text-sm font-medium"
              >
                <Shield className="w-4 h-4" />
                Admin
              </Link>
              <a
                href="/welcome"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 hover:text-[#D0A348] transition-colors text-[#D0A348] text-sm font-medium"
              >
                <Globe className="w-4 h-4" />
                View Website
              </a>
            </div>
          )}

          <div className="pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-white/85 hover:bg-red-500/20 hover:text-red-200 transition-colors text-sm font-medium cursor-pointer"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Sign Out</span>
            </button>
          </div>
        </nav>

        {/* Powered by Tiny Tech */}
        <a 
          href="https://tinytechcompany.com" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="p-4 border-t border-white/10 flex flex-col items-center justify-center gap-2 group opacity-90 hover:opacity-100 transition-all"
        >
          <span className="text-[10px] uppercase tracking-widest text-white/60 font-semibold group-hover:text-[#D0A348] transition-colors">Powered by</span>
          <img 
            src="/tiny-tech-logo.png" 
            alt="Tiny Tech" 
            className="h-9 w-auto max-w-[180px] object-contain drop-shadow transition-transform group-hover:scale-105" 
          />
        </a>

      </aside>

      {/* Mobile Side Drawer */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
          <div 
            className="absolute left-0 top-0 bottom-0 w-72 text-white flex flex-col shadow-2xl transition-colors duration-300"
            style={{ backgroundColor: churchBrand?.primaryColor || '#022d5c' }}
          >
            <div className="p-5 border-b border-white/10">
              <div className="flex justify-between items-center">
                {churchBrand?.logoUrl ? (
                  <img src={churchBrand.logoUrl} alt={churchBrand.name || "Church Logo"} className="h-12 w-auto max-w-[170px] object-contain rounded bg-white/10 p-1" />
                ) : (
                  <img src="/the_shepherds_desk_logo_transparent.png" alt="The Shepherd's Desk" className="h-14 w-auto object-contain" />
                )}
                <button
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close menu"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white"
                >
                  <X className="w-4 h-4" />
                  <span>Close</span>
                </button>
              </div>
              {churchBrand?.name && (
                <p className="text-xs font-semibold text-white/90 mt-2 truncate">
                  {churchBrand.name}
                </p>
              )}
            </div>
            
            <nav className="flex-1 py-4 px-3 space-y-5 overflow-y-auto">
              {navSections.map((section) => (
                <div key={section.label} className="space-y-1">
                  <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-white/50 mb-1">
                    {section.label}
                  </p>
                  {section.items.map((item) => {
                    const Icon = item.icon
                    const isActive = item.href === '/' ? pathname === '/' : pathname?.startsWith(item.href.split('?')[0])
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setDrawerOpen(false)}
                        className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl transition-all text-sm font-medium ${
                          isActive
                            ? 'bg-white/15 text-[#D0A348] font-semibold'
                            : 'text-white/90 hover:bg-white/10 hover:text-[#D0A348]'
                        }`}
                      >
                        <Icon className="w-5 h-5 shrink-0" />
                        <span>{item.name}</span>
                      </Link>
                    )
                  })}
                </div>
              ))}

              {isAdmin && (
                <div className="space-y-1 pt-2 border-t border-white/10">
                  <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-[#D0A348]/80 mb-1">
                    Administration
                  </p>
                  <Link
                    href="/admin"
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl hover:bg-white/10 transition-all text-[#D0A348] text-sm font-medium"
                  >
                    <Shield className="w-5 h-5" />
                    <span>Admin</span>
                  </Link>
                  <a
                    href="/welcome"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl hover:bg-white/10 transition-all text-[#D0A348] text-sm font-medium"
                  >
                    <Globe className="w-5 h-5" />
                    <span>View Website</span>
                  </a>
                </div>
              )}
            </nav>

            <div className="p-3 border-t border-white/10 space-y-2">
              <button
                onClick={() => { setIsAssistantOpen(true); setDrawerOpen(false) }}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#D0A348] text-white hover:bg-[#D0A348]/90 transition-all w-full font-semibold text-sm shadow-sm"
              >
                <Sparkles className="w-4 h-4" />
                <span>Smart Assistant (Speak / Photo)</span>
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-red-500/25 text-white transition-all w-full font-semibold text-sm"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>

            {/* Powered by Tiny Tech Mobile */}
            <a 
              href="https://tinytechcompany.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="p-3 border-t border-white/10 flex flex-col items-center justify-center gap-1.5 opacity-90 hover:opacity-100 transition-all"
            >
              <span className="text-[10px] uppercase tracking-widest text-white/60 font-semibold">Powered by</span>
              <img src="/tiny-tech-logo.png" alt="Tiny Tech" className="h-8 w-auto object-contain" />
            </a>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 print:w-full print:block">
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-3 sm:px-4 md:px-6 sticky top-0 z-30 print:hidden">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={openDrawer}
              aria-label="Open menu"
              className="md:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 shrink-0"
            >
              <span className="relative">
                <Menu className="w-5 h-5" style={{ color: churchBrand?.primaryColor || '#022d5c' }} />
                {!menuSeen && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D0A348] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#D0A348] border border-white" />
                  </span>
                )}
              </span>
              <span className="text-xs font-bold" style={{ color: churchBrand?.primaryColor || '#022d5c' }}>Menu</span>
            </button>

            {backHref && (
              <Link
                href={backHref}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#022d5c]/8 hover:bg-[#022d5c]/15 text-[#022d5c] text-xs font-semibold transition-colors shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{backLabel}</span>
              </Link>
            )}

            <h2 className="text-base sm:text-lg md:text-xl font-bold text-[#022d5c] truncate ml-0.5">
              {pageTitle}
            </h2>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Button
              onClick={() => setIsAssistantOpen(true)}
              size="sm"
              className="flex items-center gap-1.5 text-white transition-all hover:opacity-95 shadow-xs font-semibold cursor-pointer px-3 py-1.5 h-9 rounded-xl"
              style={{ backgroundColor: churchBrand?.secondaryColor || '#D0A348' }}
              title="Open Smart Assistant (Speak, Type, or Snap a Photo)"
            >
              <Sparkles className="w-4 h-4 text-white shrink-0" />
              <Mic className="w-3.5 h-3.5 text-white shrink-0 hidden sm:inline" />
              <span className="text-xs sm:text-sm font-bold">Assistant</span>
            </Button>

            <NotificationCenter />

            <Link
              href="/settings"
              title="Settings"
              className="w-9 h-9 rounded-full text-white flex items-center justify-center font-bold text-sm hover:opacity-90 transition-opacity shrink-0"
              style={{ backgroundColor: churchBrand?.primaryColor || '#022d5c' }}
            >
              {userInitial}
            </Link>

            <button
              type="button"
              onClick={handleSignOut}
              title="Sign Out"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 h-9 rounded-xl border border-gray-200 bg-gray-50 hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-gray-700 text-xs font-semibold transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-6 pb-16 md:pb-8 print:p-0 print:overflow-visible print:block">
          {children}
        </div>
      </main>

      <div className="print:hidden">
        <SupportChat />
      </div>
    </div>
  )
}
