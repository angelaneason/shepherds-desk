'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, BookOpen, Heart, MessageSquare, Megaphone, Settings, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

type Notification = {
  id: string
  title: string
  message: string
  type: 'study' | 'care' | 'sermon' | 'announcement' | 'system'
  link: string | null
  is_read: boolean
  created_at: string
}

const typeConfig: Record<string, { icon: any, color: string, bg: string }> = {
  study: { icon: BookOpen, color: 'text-green-600', bg: 'bg-green-100' },
  care: { icon: Heart, color: 'text-pink-600', bg: 'bg-pink-100' },
  sermon: { icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-100' },
  announcement: { icon: Megaphone, color: 'text-purple-600', bg: 'bg-purple-100' },
  system: { icon: Settings, color: 'text-gray-600', bg: 'bg-gray-100' },
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return `${Math.floor(days / 7)}w ago`
}

export default function NotificationCenter() {
  const supabase = createClient()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [pollMinutes, setPollMinutes] = useState(5)
  const [enabled, setEnabled] = useState(true)
  const panelRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter(n => !n.is_read).length

  // Load notifications and poll settings
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load poll preferences
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('notification_poll_minutes, notifications_enabled')
          .eq('id', user.id)
          .single() as any
        if (profile) {
          if (profile.notification_poll_minutes !== null && profile.notification_poll_minutes !== undefined) {
            setPollMinutes(profile.notification_poll_minutes)
          }
          if (profile.notifications_enabled !== null && profile.notifications_enabled !== undefined) {
            setEnabled(profile.notifications_enabled)
          }
        }
      } catch (err) {
        // Columns may not exist yet — use defaults
      }

      // Fetch recent notifications
      await fetchNotifications(user.id)

      // Generate new notifications
      if (enabled) {
        try {
          await fetch('/api/notifications/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profileId: user.id })
          })
          // Re-fetch after generation
          await fetchNotifications(user.id)
        } catch (err) {
          console.error('Error generating notifications:', err)
        }
      }
    }

    load()
  }, [supabase])

  // Polling interval
  useEffect(() => {
    if (!enabled || pollMinutes <= 0) return
    
    const interval = setInterval(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      try {
        await fetch('/api/notifications/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profileId: user.id })
        })
        await fetchNotifications(user.id)
      } catch (err) {
        console.error('Notification poll error:', err)
      }
    }, pollMinutes * 60 * 1000)

    return () => clearInterval(interval)
  }, [pollMinutes, enabled, supabase])

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  async function fetchNotifications(userId: string) {
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('profile_id', userId)
        .order('created_at', { ascending: false })
        .limit(30) as any
      
      if (data) setNotifications(data)
    } catch (err) {
      console.error('Error fetching notifications:', err)
    }
  }

  async function markAsRead(id: string) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  async function markAllRead() {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
    if (unreadIds.length === 0) return
    
    await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  async function dismissNotification(id: string) {
    await supabase.from('notifications').delete().eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        title="Notifications"
      >
        <Bell className="w-5 h-5 text-[#022d5c]" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-in fade-in">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-80 md:w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden animate-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="font-semibold text-[#022d5c] text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-[#D0A348] hover:text-[#D0A348]/80 font-medium flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="font-medium text-sm">All caught up! 🎉</p>
                <p className="text-xs mt-1">No notifications right now.</p>
              </div>
            ) : (
              notifications.map(notification => {
                const config = typeConfig[notification.type] || typeConfig.system
                const Icon = config.icon

                const content = (
                  <div
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-50 last:border-0",
                      !notification.is_read && "bg-blue-50/30"
                    )}
                    onClick={() => {
                      markAsRead(notification.id)
                      if (notification.link) setIsOpen(false)
                    }}
                  >
                    <div className={cn("p-1.5 rounded-lg shrink-0 mt-0.5", config.bg)}>
                      <Icon className={cn("w-3.5 h-3.5", config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn("text-sm", !notification.is_read ? "font-semibold text-[#022d5c]" : "text-gray-700")}>
                          {notification.title}
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            dismissNotification(notification.id)
                          }}
                          className="text-gray-300 hover:text-gray-500 shrink-0"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notification.message}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{timeAgo(notification.created_at)}</p>
                    </div>
                    {!notification.is_read && (
                      <div className="w-2 h-2 rounded-full bg-[#D0A348] shrink-0 mt-2" />
                    )}
                  </div>
                )

                return notification.link ? (
                  <Link key={notification.id} href={notification.link}>
                    {content}
                  </Link>
                ) : (
                  <div key={notification.id}>{content}</div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
