'use client'

import React, { useState, useEffect } from 'react'
import { RefreshCw, CheckCircle2, AlertCircle, Calendar as CalendarIcon, ExternalLink, Info, Smartphone, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

interface CalendarSyncCardProps {
  onSyncComplete?: (count: number) => void
  className?: string
}

export function CalendarSyncCard({ onSyncComplete, className = '' }: CalendarSyncCardProps) {
  const [feedUrl, setFeedUrl] = useState('')
  const [autoSync, setAutoSync] = useState(true)
  const [lastSyncedText, setLastSyncedText] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [copiedSubLink, setCopiedSubLink] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [activeTab, setActiveTab] = useState<'google' | 'apple'>('google')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.id) setUserId(data.user.id)
    })

    const saved = localStorage.getItem('shepherds_calendar_ical_url')
    if (saved) {
      setFeedUrl(saved)
    }

    const savedAutoSync = localStorage.getItem('shepherds_calendar_auto_sync')
    if (savedAutoSync !== null) {
      setAutoSync(savedAutoSync !== 'false')
    }

    const savedLastSyncTime = localStorage.getItem('shepherds_calendar_last_sync_time')
    if (savedLastSyncTime) {
      try {
        const date = new Date(parseInt(savedLastSyncTime, 10))
        setLastSyncedText(date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))
      } catch {}
    }
  }, [])

  const getSubscriptionUrl = (protocol: 'https' | 'webcal' = 'https') => {
    const host = typeof window !== 'undefined' ? window.location.host : 'theshepherdsdesk.app'
    const scheme = protocol === 'webcal' ? 'webcal' : (typeof window !== 'undefined' && window.location.protocol === 'http:' ? 'http' : 'https')
    return `${scheme}://${host}/api/calendar/sync${userId ? `?user_id=${userId}` : ''}`
  }

  const handleCopySubLink = () => {
    navigator.clipboard.writeText(getSubscriptionUrl('https'))
    setCopiedSubLink(true)
    setTimeout(() => setCopiedSubLink(false), 2500)
  }

  const handleToggleAutoSync = (enabled: boolean) => {
    setAutoSync(enabled)
    localStorage.setItem('shepherds_calendar_auto_sync', enabled ? 'true' : 'false')
  }

  const handleSync = async () => {
    const trimmed = feedUrl.trim()
    if (!trimmed) {
      setResult({ success: false, message: 'Please enter a valid iCal or webcal:// URL.' })
      return
    }

    setSyncing(true)
    setResult(null)

    try {
      localStorage.setItem('shepherds_calendar_ical_url', trimmed)
      const now = Date.now()
      localStorage.setItem('shepherds_calendar_last_sync_time', now.toString())
      setLastSyncedText(new Date(now).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))

      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ feedUrl: trimmed, icalUrl: trimmed }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync calendar feed')
      }

      setResult({
        success: true,
        message: data.message || `Successfully synced ${data.synced} events!`
      })

      if (onSyncComplete) {
        onSyncComplete(data.synced || 0)
      }
    } catch (err: any) {
      setResult({
        success: false,
        message: err.message || 'An error occurred while syncing calendar.'
      })
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className={`bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-5 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="text-[11px] font-bold tracking-wider text-teal-700 uppercase">OPTIONAL PHONE &amp; CALENDAR SYNC</span>
          <h3 className="text-lg font-bold text-gray-900 mt-0.5">Connect Your Phone Calendar</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Your Shepherd&apos;s Desk calendar works right out of the box. Connect your phone calendar below anytime if you want two-way visibility.
          </p>
        </div>
      </div>

      {/* 1-Tap Phone Calendar Subscription */}
      {userId && (
        <div className="p-4 rounded-xl bg-[#F8F5EE] border border-[#D0A348]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-[#022d5c] text-[#D0A348] shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#022d5c]">1-Tap: Show Shepherd&apos;s Desk on Your Phone Calendar</h4>
              <p className="text-xs text-gray-600 mt-0.5">
                Automatically displays your Shepherd&apos;s Desk schedule and study blocks inside Apple Calendar or your phone&apos;s calendar app.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <a
              href={getSubscriptionUrl('webcal')}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#022d5c] hover:bg-[#061e38] text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <CalendarIcon className="w-3.5 h-3.5 text-[#D0A348]" />
              Add to Phone Calendar
            </a>
            <button
              type="button"
              onClick={handleCopySubLink}
              className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-medium transition-colors"
              title="Copy subscription URL for Google Calendar"
            >
              {copiedSubLink ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedSubLink ? 'Copied' : 'Copy Link'}
            </button>
          </div>
        </div>
      )}

      {/* Import External Google / Apple iCal Feed */}
      <div className="space-y-3 pt-2 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-gray-800">
            Import External Google or Apple Calendar Feed (iCal / webcal://)
          </label>
          <button
            type="button"
            onClick={() => setShowInstructions(!showInstructions)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-900"
          >
            <Info className="w-3.5 h-3.5" />
            {showInstructions ? 'Hide instructions' : 'How to find my link'}
            {showInstructions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            type="url"
            value={feedUrl}
            onChange={(e) => setFeedUrl(e.target.value)}
            placeholder="Paste your iCal or webcal:// link here..."
            className="flex-1 text-sm font-mono border-gray-200 focus:border-teal-600 focus:ring-teal-600"
          />
          <Button
            onClick={handleSync}
            disabled={syncing || !feedUrl.trim()}
            className="bg-[#0d9488] hover:bg-[#0f766e] text-white font-medium px-5 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Feed'}
          </Button>
        </div>

        {/* Collapsible Visual Step-by-Step Instructions */}
        {showInstructions && (
          <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-4 text-xs text-gray-700 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
              <div className="flex items-center gap-1.5 font-bold text-gray-900">
                <Info className="w-4 h-4 text-teal-600 shrink-0" />
                <span>How to get your secret iCal link:</span>
              </div>
              <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-[11px] font-medium self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('google')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    activeTab === 'google'
                      ? 'bg-white text-gray-900 shadow-sm font-semibold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Google Calendar
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('apple')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    activeTab === 'apple'
                      ? 'bg-white text-gray-900 shadow-sm font-semibold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Apple iCloud
                </button>
              </div>
            </div>

            {activeTab === 'google' && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white border border-teal-200/80 rounded-lg px-3.5 py-2">
                  <span className="text-gray-700 font-medium">Quick link to Google Calendar settings:</span>
                  <a
                    href="https://calendar.google.com/calendar/u/0/r/settings"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-teal-700 font-semibold hover:text-teal-800 hover:underline text-xs"
                  >
                    Open Google Calendar Settings <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <ol className="space-y-2 pl-0 list-none">
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-800 font-bold text-[11px] mt-0.5">1</span>
                    <span>In Google Calendar on a computer or web browser, open <strong>Settings ⚙️</strong>.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-800 font-bold text-[11px] mt-0.5">2</span>
                    <span>Under <strong>&quot;Settings for my calendars&quot;</strong> on the left, click your calendar name.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-800 font-bold text-[11px] mt-0.5">3</span>
                    <span>Scroll down to <strong>&quot;Secret address in iCal format&quot;</strong> and click Copy 📋.</span>
                  </li>
                </ol>
              </div>
            )}

            {activeTab === 'apple' && (
              <div className="space-y-3">
                <ol className="space-y-2 pl-0 list-none">
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-800 font-bold text-[11px] mt-0.5">1</span>
                    <span>Open the Apple <strong>Calendar</strong> app on your iPhone, iPad, or Mac.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-800 font-bold text-[11px] mt-0.5">2</span>
                    <span>Tap <strong>Calendars</strong>, then tap the <strong>ⓘ</strong> icon next to your iCloud calendar.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-800 font-bold text-[11px] mt-0.5">3</span>
                    <span>Turn on <strong>Public Calendar</strong>, tap <strong>Share Link... &gt; Copy</strong>, and paste it above.</span>
                  </li>
                </ol>
              </div>
            )}
          </div>
        )}
      </div>

      {result && (
        <div className={`flex items-start gap-2 p-3 rounded-lg text-xs ${
          result.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {result.success ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          )}
          <span>{result.message}</span>
        </div>
      )}

      {/* Auto-Sync Setting & Status */}
      {feedUrl && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-gray-100">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoSync}
              onChange={(e) => handleToggleAutoSync(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-xs font-medium text-gray-700">
              Automatically sync when opening calendar
            </span>
          </label>
          {lastSyncedText && (
            <span className="text-[11px] text-gray-400 font-medium">
              Last synced today at {lastSyncedText}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
