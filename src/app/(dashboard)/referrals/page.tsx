'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Gift, Copy, Check, Mail, MessageCircle, Share2, Users } from 'lucide-react'
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
  const supabase = createClient()

  useEffect(() => {
    fetchReferrals()
  }, [])

  const fetchReferrals = async () => {
    try {
      const response = await fetch('/api/referrals')
      if (response.ok) {
        const data = await response.json()
        setReferrals(data)
        if (data.length > 0) {
          setMyCode(data[0].referral_code)
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
        setReferrals([newReferral, ...referrals])
      }
    } catch (error) {
      console.error('Error generating referral:', error)
    } finally {
      setGenerating(false)
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
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">Signed Up</span>
      case 'subscribed':
        return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">Subscribed</span>
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full font-medium">Pending</span>
    }
  }

  const stats = {
    total: referrals.length,
    signedUp: referrals.filter(r => r.status === 'signed_up' || r.status === 'subscribed').length,
    subscribed: referrals.filter(r => r.status === 'subscribed').length
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
                <Button variant="outline" className="gap-2 text-[#022d5c]" >
                  <a href={`mailto:?subject=Try Shepherd's Desk&body=${encodeURIComponent(shareMessage)}`}>
                    <Mail className="w-4 h-4" /> Email
                  </a>
                </Button>
                <Button variant="outline" className="gap-2 text-[#022d5c]" >
                  <a href={`sms:?&body=${encodeURIComponent(shareMessage)}`}>
                    <MessageCircle className="w-4 h-4" /> Text
                  </a>
                </Button>
                <Button variant="outline" className="gap-2 text-[#022d5c]" >
                  <a href={`https://wa.me/?text=${encodeURIComponent(shareMessage)}`} target="_blank" rel="noopener noreferrer">
                    <Share2 className="w-4 h-4" /> WhatsApp
                  </a>
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

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

      <Card>
        <CardHeader>
          <CardTitle>Referral History</CardTitle>
          <CardDescription>Track the pastors you've invited</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading your history...</div>
          ) : referrals.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-200">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">You haven't shared yet</h3>
              <p className="text-gray-500 max-w-sm mx-auto">
                Every pastor you invite gets to try Shepherd's Desk free! Generate your link above to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {referrals.map((referral) => (
                <div key={referral.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-lg shadow-sm">
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900">
                      {referral.referred_email || 'Anonymous Visitor'}
                    </span>
                    <span className="text-sm text-gray-500">
                      Code: {referral.referral_code} • {new Date(referral.created_at).toLocaleDateString()}
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
    </div>
  )
}
