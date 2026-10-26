'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { HelpCircle, Bug, Lightbulb, CheckCircle2, Mail, Trash2, RefreshCw, Clock } from 'lucide-react'
import { format } from 'date-fns'

export interface SupportTicket {
  id: string
  user_id?: string | null
  user_name: string
  user_email: string
  category: 'question' | 'bug' | 'enhancement'
  message: string
  page_url?: string | null
  status: 'open' | 'resolved'
  created_at: string
}

interface SupportTicketsPanelProps {
  onCountChange?: (openCount: number) => void
}

export default function SupportTicketsPanel({ onCountChange }: SupportTicketsPanelProps) {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'resolved'>('all')
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'question' | 'bug' | 'enhancement'>('all')

  const fetchTickets = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/support')
      if (res.ok) {
        const data = await res.json()
        const list: SupportTicket[] = data.tickets || []
        setTickets(list)
        if (onCountChange) {
          onCountChange(list.filter((t) => t.status === 'open').length)
        }
      }
    } catch (e) {
      console.error('Error loading support tickets:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTickets()
  }, [])

  const handleToggleStatus = async (ticket: SupportTicket) => {
    const nextStatus = ticket.status === 'open' ? 'resolved' : 'open'
    try {
      const res = await fetch('/api/support', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ticket.id, status: nextStatus }),
      })
      if (res.ok) {
        const updated = tickets.map((t) => (t.id === ticket.id ? { ...t, status: nextStatus as 'open' | 'resolved' } : t))
        setTickets(updated)
        if (onCountChange) {
          onCountChange(updated.filter((t) => t.status === 'open').length)
        }
      }
    } catch (e) {
      console.error('Failed to update ticket status:', e)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this support ticket?')) return
    try {
      const res = await fetch('/api/support', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'delete' }),
      })
      if (res.ok) {
        const updated = tickets.filter((t) => t.id !== id)
        setTickets(updated)
        if (onCountChange) {
          onCountChange(updated.filter((t) => t.status === 'open').length)
        }
      }
    } catch (e) {
      console.error('Failed to delete support ticket:', e)
    }
  }

  const filtered = tickets.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false
    return true
  })

  const openCount = tickets.filter((t) => t.status === 'open').length
  const questionCount = tickets.filter((t) => t.category === 'question').length
  const bugCount = tickets.filter((t) => t.category === 'bug').length
  const enhancementCount = tickets.filter((t) => t.category === 'enhancement').length

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-amber-50/60 border-amber-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-800">Open Tickets</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-900">{openCount}</div>
            <p className="text-xs text-amber-700 mt-1">Awaiting response or review</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50/60 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">Questions</CardTitle>
            <HelpCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{questionCount}</div>
            <p className="text-xs text-blue-700 mt-1">How-to &amp; support questions</p>
          </CardContent>
        </Card>

        <Card className="bg-red-50/60 border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-800">Bug Reports</CardTitle>
            <Bug className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-900">{bugCount}</div>
            <p className="text-xs text-red-700 mt-1">Issues reported by pastors</p>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50/60 border-emerald-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-800">Enhancements</CardTitle>
            <Lightbulb className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-900">{enhancementCount}</div>
            <p className="text-xs text-emerald-700 mt-1">Feature ideas &amp; requests</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl text-[#022d5c]">Help &amp; Support Inbox</CardTitle>
            <CardDescription>
              All questions, bug reports, and enhancement requests submitted via the Help &amp; Support widget (also emailed to <strong>support@theshepherdsdesk.app</strong>).
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchTickets} className="gap-1.5 self-start sm:self-auto">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-gray-100">
            <div className="flex flex-wrap items-center gap-1.5">
              {(['all', 'open', 'resolved'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors cursor-pointer ${
                    statusFilter === st
                      ? 'bg-[#022d5c] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {st === 'all' ? `All (${tickets.length})` : st === 'open' ? `Open (${openCount})` : `Resolved (${tickets.length - openCount})`}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {([
                { id: 'all', label: 'All Types' },
                { id: 'question', label: '❓ Questions' },
                { id: 'bug', label: '🐞 Bugs' },
                { id: 'enhancement', label: '💡 Enhancements' },
              ] as const).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                    categoryFilter === cat.id
                      ? 'bg-[#D0A348] text-[#022d5c]'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-gray-500 text-sm">Loading support messages...</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-gray-500 border border-dashed rounded-xl">
              No support messages match this filter yet.
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((t) => {
                const isBug = t.category === 'bug'
                const isEnhancement = t.category === 'enhancement'
                return (
                  <div
                    key={t.id}
                    className={`p-4 rounded-xl border transition-all ${
                      t.status === 'resolved'
                        ? 'bg-gray-50/70 border-gray-200 opacity-80'
                        : 'bg-white border-gray-200 shadow-sm'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          className={
                            isBug
                              ? 'bg-red-100 text-red-800 hover:bg-red-100 border-red-200'
                              : isEnhancement
                                ? 'bg-amber-100 text-amber-900 hover:bg-amber-100 border-amber-200'
                                : 'bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200'
                          }
                        >
                          {isBug ? '🐞 Bug Report' : isEnhancement ? '💡 Enhancement' : '❓ Question'}
                        </Badge>
                        <span className="font-bold text-sm text-[#022d5c]">{t.user_name || 'Pastor'}</span>
                        {t.user_email && (
                          <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                            {t.user_email}
                          </span>
                        )}
                        {t.page_url && (
                          <span className="text-xs text-gray-400">
                            Page: <code className="font-mono">{t.page_url}</code>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>
                          {t.created_at ? format(new Date(t.created_at), 'MMM d, yyyy h:mm a') : ''}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full font-semibold ${
                            t.status === 'resolved'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {t.status === 'resolved' ? '✓ Resolved' : 'Open'}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm text-gray-800 whitespace-pre-wrap bg-[#F8F5EE]/70 p-3 rounded-lg border border-gray-100 my-2.5">
                      {t.message}
                    </p>

                    <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                      {t.user_email && (
                        <a
                          href={`mailto:${t.user_email}?subject=${encodeURIComponent(
                            `Re: Your Shepherd's Desk ${isBug ? 'Bug Report' : isEnhancement ? 'Enhancement Request' : 'Question'}`
                          )}&body=${encodeURIComponent(
                            `Hi ${t.user_name || 'Pastor'},\n\nThank you for reaching out to The Shepherd's Desk support!\n\nRegarding your message:\n"${t.message}"\n\n`
                          )}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-gray-300 text-[#022d5c] hover:bg-gray-50"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          Reply via Email
                        </a>
                      )}

                      <Button
                        size="sm"
                        variant={t.status === 'resolved' ? 'outline' : 'default'}
                        onClick={() => handleToggleStatus(t)}
                        className={
                          t.status === 'resolved'
                            ? 'h-8 text-xs'
                            : 'h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1'
                        }
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {t.status === 'resolved' ? 'Reopen Ticket' : 'Mark Resolved'}
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(t.id)}
                        className="h-8 w-8 text-gray-400 hover:text-red-600"
                        title="Delete ticket"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
