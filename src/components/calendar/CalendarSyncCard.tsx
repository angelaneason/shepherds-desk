'use client'

import React, { useState, useEffect } from 'react'
import { RefreshCw, CheckCircle2, AlertCircle, Calendar as CalendarIcon } from 'lucide-react'
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
          placeholder="https://calendar.google.com/calendar/ical/sample.interpreter%40gmail.com/public/basic.ics"
          className="w-full text-sm font-mono border-gray-200 focus:border-teal-600 focus:ring-teal-600"
        />
      </div>

      <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5 text-xs text-gray-700 space-y-1.5">
        <p className="font-semibold text-gray-800">How to get your secret iCal link:</p>
        <p>• <span className="font-semibold">Google Calendar:</span> In Google Calendar Settings &gt; Click your calendar name under <span className="font-semibold text-teal-700">&quot;Settings for my calendars&quot;</span> in the left sidebar &gt; Scroll down to <span className="font-semibold">&quot;Integrate calendar&quot;</span> &gt; Copy the <span className="font-semibold">&quot;Secret address in iCal format&quot;</span>.</p>
        <p>• <span className="font-semibold">Apple iCloud:</span> Apple Calendar &gt; Share Calendar &gt; Copy Public / Private Link (<code className="bg-white px-1 py-0.5 rounded border border-gray-200 font-mono text-[11px]">webcal://</code>).</p>
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
