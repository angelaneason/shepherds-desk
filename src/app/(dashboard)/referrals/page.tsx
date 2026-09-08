'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Gift, Copy, Check, Mail, MessageCircle, Share2, Users, UserPlus, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Referral {
  id: string
  referral_code: string
  referred_email: string | null
  status: 'pending' | 'signed_up' | 'subscribed'
  created_at: string
}

export default function ReferralsPage() {
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [myCode, setMyCode] = useState<string | null>(null)

  // Log a Share / Send Invite form
  const [shareName, setShareName] = useState('')
  const [shareEmail, setShareEmail] = useState('')
  const [personalNote, setPersonalNote] = useState('')
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState<string | null>(null)
  const [logging, setLogging] = useState(false)

  useEffect(() => {
    fetchReferrals()
  }, [])

  const fetchReferrals = async () => {
    try {
      const response = await fetch('/api/referrals')
      if (response.ok) {
        const data = await response.json()
        if (Array.isArray(data)) {
          setReferrals(data)
          // Find the pastor's code from any referral record
          if (data.length > 0) {
            setMyCode(data[0].referral_code)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching referrals:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateReferral = async () => {
    setGenerating(true)
    try {
      const response = await fetch('/api/referrals', {
        method: 'POST'
      })
      if (response.ok) {
        const newReferral = await response.json()
        setMyCode(newReferral.referral_code)
        // Only add if it's not already in the list
        if (!referrals.find(r => r.id === newReferral.id)) {
          setReferrals([newReferral, ...referrals])
        }
      }
    } catch (error) {
      console.error('Error generating referral:', error)
    } finally {
      setGenerating(false)
    }
  }

  const logShare = async () => {
    if (!shareName.trim() && !shareEmail.trim()) return
    setLogging(true)
    setInviteSuccessMsg(null)
    try {
      const response = await fetch('/api/referrals/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: shareName.trim(), 
          email: shareEmail.trim(),
          personalNote: personalNote.trim()
        })
      })
      if (response.ok) {
        const result = await response.json()
        await fetchReferrals()
        if (result.emailSent) {
          setInviteSuccessMsg(`✅ Personal invitation email sent to ${shareEmail.trim()}!`)
        } else if (shareEmail.trim()) {
          setInviteSuccessMsg(`Share logged! Note: ${result.emailError || 'Email could not be delivered yet'}`)
        } else {
          setInviteSuccessMsg(`✅ In-person share logged for ${shareName.trim()}!`)
        }
        setShareName('')
        setShareEmail('')
        setPersonalNote('')
        setTimeout(() => setInviteSuccessMsg(null), 7000)
      }
    } catch (error) {
      console.error('Error logging share:', error)
    } finally {
      setLogging(false)
    }
  }

  const referralLink = myCode ? `${typeof window !== 'undefined' ? window.location.origin : ''}/login?ref=${myCode}` : ''
  const shareMessage = `I've been using Shepherd's Desk to organize my sermons, schedule, and pastoral care — and it's been a game-changer. Try it free: ${referralLink}`

  const copyToClipboard = async () => {
    if (!referralLink) return
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy', err)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'signed_up':
        return <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">✅ Signed Up</span>
      case 'subscribed':
        return <span className="px-2.5 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">🎉 Subscribed</span>
      default:
        return <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-xs rounded-full font-medium">⏳ Pending</span>
    }
  }

  // Filter: referrals that have been shared to someone (have a name or email)
  const trackedShares = referrals.filter(r => r.referred_email)
  // The "master" pending record (no email) is the pastor's reusable code
  const stats = {
    total: trackedShares.length,
    signedUp: trackedShares.filter(r => r.status === 'signed_up' || r.status === 'subscribed').length,
    subscribed: trackedShares.filter(r => r.status === 'subscribed').length
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-4 py-8">
        <div className="mx-auto w-16 h-16 bg-[#F8F5EE] rounded-full flex items-center justify-center mb-4">
          <Gift className="w-8 h-8 text-[#D0A348]" />
        </div>
        <h1 className="text-4xl font-bold text-[#022d5c]" style={{ fontFamily: 'var(--font-playfair)' }}>
          Share Shepherd's Desk
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Help another pastor streamline their ministry.
        </p>
      </div>

      {/* Invite Link Card */}
      <Card className="border-[#D0A348]/20 shadow-lg">
        <CardHeader>
          <CardTitle>Your Unique Invite Link</CardTitle>
          <CardDescription>Share this link with fellow pastors. They'll get a free trial.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!myCode ? (
            <div className="text-center py-4">
              <Button 
                onClick={generateReferral} 
                disabled={generating}
                className="bg-[#D0A348] hover:bg-[#D0A348]/90 text-white"
              >
                {generating ? 'Generating...' : 'Generate My Invite Link'}
              </Button>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <Input 
                  readOnly 
                  value={referralLink} 
                  className="bg-gray-50 border-gray-200 text-gray-800 font-medium"
                />
                <Button 
                  onClick={copyToClipboard}
                  variant={copied ? "default" : "outline"}
                  className={copied ? "bg-green-600 hover:bg-green-700 text-white" : "text-[#022d5c] border-[#022d5c]"}
                >
                  {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copied ? 'Copied!' : 'Copy Link'}
                </Button>
              </div>

              <div className="pt-4 border-t border-gray-100 flex flex-wrap gap-4 justify-center">
                <a href={`mailto:?subject=Try Shepherd's Desk&body=${encodeURIComponent(shareMessage)}`}>
                  <Button variant="outline" className="gap-2 text-[#022d5c]">
                    <Mail className="w-4 h-4" /> Email
                  </Button>
                </a>
                <a href={`sms:?&body=${encodeURIComponent(shareMessage)}`}>
                  <Button variant="outline" className="gap-2 text-[#022d5c]">
                    <MessageCircle className="w-4 h-4" /> Text
                  </Button>
                </a>
                <a href={`https://wa.me/?text=${encodeURIComponent(shareMessage)}`} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="gap-2 text-[#022d5c]">
                    <Share2 className="w-4 h-4" /> WhatsApp
                  </Button>
                </a>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Send an Official Invitation Email Card */}
      {myCode && (
        <Card className="border-[#D0A348]/40 shadow-sm bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-[#022d5c]">
              <Mail className="w-5 h-5 text-[#D0A348]" />
              Send an Invitation Email to a Fellow Pastor
            </CardTitle>
            <CardDescription>
              Enter their details to send a personalized invitation email with your referral link and ministry highlights.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {inviteSuccessMsg && (
              <div className="p-3 bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg font-medium">
                {inviteSuccessMsg}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                placeholder="Pastor's name (e.g. Pastor David)"
                value={shareName}
                onChange={e => setShareName(e.target.value)}
              />
              <Input
                placeholder="Pastor's email address *"
                type="email"
                value={shareEmail}
                onChange={e => setShareEmail(e.target.value)}
              />
            </div>
            <Input
              placeholder="Optional personal note (e.g. 'Thought of you when I started using this for Sunday prep!')"
              value={personalNote}
              onChange={e => setPersonalNote(e.target.value)}
            />
            <div className="flex justify-end pt-1">
              <Button
                onClick={logShare}
                disabled={logging || (!shareName.trim() && !shareEmail.trim())}
                className="bg-[#022d5c] hover:bg-[#011c3a] text-white gap-2 font-medium"
              >
                <Send className="w-4 h-4 text-[#D0A348]" />
                {logging ? 'Sending Invitation...' : (shareEmail.trim() ? 'Send Official Invitation Email' : 'Log Share')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 bg-blue-50 rounded-full">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Shared</p>
              <h3 className="text-2xl font-bold text-gray-900">{stats.total}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 bg-indigo-50 rounded-full">
              <Check className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Signed Up</p>
              <h3 className="text-2xl font-bold text-gray-900">{stats.signedUp}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 bg-green-50 rounded-full">
              <Gift className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Active Subscribers</p>
              <h3 className="text-2xl font-bold text-gray-900">{stats.subscribed}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referral History */}
      <Card>
        <CardHeader>
          <CardTitle>Referral History</CardTitle>
          <CardDescription>Track the pastors you've invited</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading your history...</div>
          ) : trackedShares.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-200">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No shares logged yet</h3>
              <p className="text-gray-500 max-w-sm mx-auto">
                After sharing your link, use "Log a Share" above to track who you've sent it to and whether they've signed up.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {trackedShares.map((referral) => (
                <div key={referral.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900">
                      {referral.referred_email || 'Unknown'}
                    </span>
                    <span className="text-sm text-gray-500">
                      Shared on {new Date(referral.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <div>
                    {getStatusBadge(referral.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gift Sponsorship Section */}
      <Card className="bg-[#FAF7F0] border-[#D0A348]/40 shadow-sm">
        <CardContent className="p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center sm:text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-[#022d5c] flex items-center justify-center sm:justify-start gap-1.5">
              <Gift className="w-4 h-4 text-[#D0A348]" /> Church or Family Sponsorship
            </span>
            <h3 className="text-lg font-bold text-[#022d5c]">
              Would your church, deacon board, or family like to gift your subscription?
            </h3>
            <p className="text-sm text-gray-600 max-w-xl leading-relaxed">
              Anyone can gift you a 6-month or 1-year prepaid subscription for Pastor Appreciation Month, Christmas, or your church anniversary—with no recurring fees for them.
            </p>
          </div>
          <a
            href="/gift"
            target="_blank"
            rel="noopener noreferrer"
            className="whitespace-nowrap inline-flex items-center gap-2 bg-[#022d5c] hover:bg-[#033b78] text-white font-bold px-6 py-3 rounded-xl text-sm border border-[#D0A348] shadow-sm transition"
          >
            <Gift className="w-4 h-4 text-[#D0A348]" /> Share Gift Page &rarr;
          </a>
        </CardContent>
      </Card>
    </div>
  )
}
