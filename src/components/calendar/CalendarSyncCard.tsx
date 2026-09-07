'use client'

import React, { useState, useEffect } from 'react'
import { RefreshCw, CheckCircle2, AlertCircle, Calendar as CalendarIcon, ExternalLink, Info } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

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

  useEffect(() => {
    // Load saved feed URL if available
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

  const [activeTab, setActiveTab] = useState<'google' | 'apple'>('google')

  return (
    <div className={`bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4 ${className}`}>
      <div>
        <span className="text-[11px] font-bold tracking-wider text-teal-700 uppercase">INTEGRATIONS</span>
        <h3 className="text-lg font-bold text-gray-900 mt-0.5">Live Calendar Auto-Sync (Google &amp; Apple)</h3>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-800 mb-1.5">
          Secret iCal / webcal:// Feed URL
        </label>
        <Input
          type="url"
          value={feedUrl}
          onChange={(e) => setFeedUrl(e.target.value)}
          placeholder="https://calendar.google.com/calendar/ical/yourname%40gmail.com/private-.../basic.ics"
          className="w-full text-sm font-mono border-gray-200 focus:border-teal-600 focus:ring-teal-600"
        />
      </div>

      {/* Visual Step-by-Step Instructions */}
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

            <ol className="space-y-2.5 pl-0 list-none">
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-800 font-bold text-[11px] mt-0.5">
                  1
                </span>
                <span>
                  In Google Calendar, click the <strong>Gear icon ⚙️ &gt; Settings</strong> (or click the quick link above).
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-800 font-bold text-[11px] mt-0.5">
                  2
                </span>
                <span>
                  In the left sidebar, look down under <strong className="text-teal-800">&quot;Settings for my calendars&quot;</strong> and <strong>click your calendar name</strong> (e.g. 🟢 your name).
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-800 font-bold text-[11px] mt-0.5">
                  3
                </span>
                <span>
                  Click <strong className="text-teal-800">&quot;Integrate calendar&quot;</strong> in the left submenu (or scroll down the page to that section).
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-800 font-bold text-[11px] mt-0.5">
                  4
                </span>
                <span>
                  Find <strong className="text-gray-900">&quot;Secret address in iCal format&quot;</strong> and click the <strong>Copy button</strong> (the two overlapping squares 📋 next to the eye icon).
                </span>
              </li>
            </ol>

            <div className="bg-amber-50 border border-amber-200/80 text-amber-900 rounded-lg p-2.5 text-[11px] leading-relaxed">
              ⚠️ <strong>Note:</strong> Do <em>not</em> copy the &quot;Public address in iCal format&quot;. Make sure to copy the <strong>&quot;Secret address in iCal format&quot;</strong> so your private schedule and appointments sync properly.
            </div>
          </div>
        )}

        {activeTab === 'apple' && (
          <div className="space-y-3">
            <ol className="space-y-2.5 pl-0 list-none">
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-800 font-bold text-[11px] mt-0.5">
                  1
                </span>
                <span>
                  Open the <strong>Calendar</strong> app on your Mac, iPad, or iPhone.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-800 font-bold text-[11px] mt-0.5">
                  2
                </span>
                <span>
                  In the calendar list sidebar, click the <strong>broadcast/share icon</strong> (or right-click your calendar).
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-800 font-bold text-[11px] mt-0.5">
                  3
                </span>
                <span>
                  Turn on <strong>&quot;Public Calendar&quot;</strong> to generate your link.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-800 font-bold text-[11px] mt-0.5">
                  4
                </span>
                <span>
                  Click <strong>&quot;Copy Link&quot;</strong> (starts with <code className="bg-white px-1.5 py-0.5 rounded border border-gray-200 font-mono text-[11px]">webcal://</code>) and paste it into the field above.
                </span>
              </li>
            </ol>
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

      <Button
        onClick={handleSync}
        disabled={syncing || !feedUrl.trim()}
        className="w-full bg-[#0d9488] hover:bg-[#0f766e] text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
      >
        <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
        {syncing ? 'Syncing Live Feed...' : 'Sync Live Google & Apple Feed'}
      </Button>

      {/* Auto-Sync Setting & Status */}
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
    </div>
  )
}
