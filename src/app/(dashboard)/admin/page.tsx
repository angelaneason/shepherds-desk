'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users, Lightbulb, BookOpen, UserPlus, Trash2, Key, Ban, CheckCircle, 
  Mail, Send, Sparkles, Heart, Clock, Gift, Crown, CalendarPlus
} from 'lucide-react'
import { format } from 'date-fns'
import BroadcastCard from '@/components/admin/BroadcastCard'
import ReferralTemplatesManager from '@/components/admin/ReferralTemplatesManager'

type UserData = {
  id: string
  email: string
  created_at: string
  full_name: string
  role: string
  church_name: string
  sermon_count: number
  idea_count: number
  care_task_count: number
  status: string
  stripe_customer_id?: string
  trial_ends_at?: string
  is_vip?: boolean
}

type AdminReferral = {
  id: string
  referrer_id: string
  referral_code: string
  referred_email: string | null
  status: 'pending' | 'signed_up' | 'subscribed' | 'not_interested'
  created_at: string
  referrer_name: string
  referrer_church: string
  referrer_email: string
  referred_user_name: string | null
  notes?: string | null
  signup_email?: string | null
}

export default function AdminPage() {
  const [users, setUsers] = useState<UserData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')

  // Pipeline / Referrals State
  const [referrals, setReferrals] = useState<AdminReferral[]>([])
  const [referralStats, setReferralStats] = useState({
    total: 0,
    pending: 0,
    signedUp: 0,
    subscribed: 0
  })
  const [loadingReferrals, setLoadingReferrals] = useState(false)

  // Follow-Up Modal (From Pastor's Wife)
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false)
  const [targetReferral, setTargetReferral] = useState<AdminReferral | null>(null)
  const [followUpNote, setFollowUpNote] = useState('')
  const [followUpEmail, setFollowUpEmail] = useState('')
  const [copiedSms, setCopiedSms] = useState(false)
  const [smsPreset, setSmsPreset] = useState<'standard' | 'vip' | 'blank'>('standard')
  const [smsText, setSmsText] = useState('')
  const [sendingFollowUp, setSendingFollowUp] = useState(false)
  const [followUpSuccess, setFollowUpSuccess] = useState<string | null>(null)
  const [followUpLinkType, setFollowUpLinkType] = useState<'app' | 'download' | 'gift'>('app')

  // VIP Invite Modal
  const [isVipOpen, setIsVipOpen] = useState(false)
  const [vipName, setVipName] = useState('')
  const [vipEmail, setVipEmail] = useState('')
  const [vipNote, setVipNote] = useState('')
  const [sendingVip, setSendingVip] = useState(false)
  const [vipSuccess, setVipSuccess] = useState<string | null>(null)

  const [currentAdminEmail, setCurrentAdminEmail] = useState('')
  // Pipeline filter: 'me' = invites I sent, 'all' = everyone, or a referrer's email/name key
  const [referrerFilter, setReferrerFilter] = useState<string>('me')
  const [needsFollowUpOnly, setNeedsFollowUpOnly] = useState(false)
  const isPastorTiny = currentAdminEmail.toLowerCase().includes('tinyneason')

  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/admin/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchReferrals = async () => {
    try {
      setLoadingReferrals(true)
      const res = await fetch('/api/admin/referrals')
      if (res.ok) {
        const data = await res.json()
        setReferrals(data.referrals || [])
        if (data.stats) setReferralStats(data.stats)
      }
    } catch (error) {
      console.error('Error fetching admin referrals:', error)
    } finally {
      setLoadingReferrals(false)
    }
  }

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) setCurrentAdminEmail(data.user.email)
    })
    fetchUsers()
    fetchReferrals()
  }, [])

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user? This cannot be undone.')) return
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setUsers(users.filter(u => u.id !== id))
      } else {
        alert('Failed to delete user')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('An error occurred')
    }
  }

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_role', userId, role: newRole })
      })
      if (res.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
      } else {
        alert('Failed to update user role')
      }
    } catch {
      alert('Error updating user role')
    }
  }

  const handleToggleVip = async (userId: string, currentlyVip?: boolean) => {
    const action = currentlyVip ? 'revoke_vip' : 'grant_vip'
    const confirmMsg = currentlyVip
      ? 'Revoke VIP Complimentary access for this user?'
      : 'Grant this pastor Lifetime VIP Complimentary Pro Access (no credit card or charges)?'
    if (!confirm(confirmMsg)) return

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, userId })
      })
      if (res.ok) {
        setUsers(users.map(u => u.id === userId ? {
          ...u,
          is_vip: !currentlyVip,
          stripe_customer_id: !currentlyVip ? 'cus_vip_complimentary' : undefined
        } : u))
      } else {
        alert('Failed to update VIP status')
      }
    } catch {
      alert('Error updating VIP status')
    }
  }

  const handleExtendTrial = async (userId: string, days = 30) => {
    if (!confirm(`Extend this pastor's trial by +${days} days?`)) return
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'extend_trial', userId, days })
      })
      if (res.ok) {
        const data = await res.json()
        setUsers(users.map(u => u.id === userId ? { ...u, trial_ends_at: data.trial_ends_at } : u))
        alert(`Trial successfully extended by +${days} days!`)
      } else {
        alert('Failed to extend trial')
      }
    } catch {
      alert('Error extending trial')
    }
  }

  const handleResetPassword = async (id: string, email: string) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_password', email })
      })
      if (res.ok) {
        const data = await res.json()
        alert(`Recovery link generated:\n${data.link}`)
      } else {
        alert('Failed to reset password')
      }
    } catch (error) {
      console.error('Error resetting password:', error)
      alert('An error occurred')
    }
  }

  const handleSuspend = async (id: string, currentStatus: string) => {
    const action = currentStatus === 'suspended' ? 'unsuspend' : 'suspend'
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, userId: id })
      })
      if (res.ok) {
        setUsers(users.map(u => u.id === id ? { ...u, status: action === 'suspend' ? 'suspended' : 'active' } : u))
      } else {
        alert(`Failed to ${action} user`)
      }
    } catch (error) {
      console.error('Error suspending user:', error)
      alert('An error occurred')
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'invite', email: inviteEmail, name: inviteName })
      })
      if (res.ok) {
        alert('Invitation sent successfully!')
        setIsInviteOpen(false)
        setInviteEmail('')
        setInviteName('')
        fetchUsers()
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to send invite')
      }
    } catch (error) {
      console.error('Error inviting user:', error)
      alert('An error occurred')
    }
  }

  const getFollowUpLink = (type: 'app' | 'download' | 'gift', code?: string) => {
    const c = code || targetReferral?.referral_code || ''
    if (type === 'download') return 'https://theshepherdsdesk.app/download'
    if (type === 'gift') return `https://theshepherdsdesk.app/gift/redeem?ref=${c}`
    return `https://theshepherdsdesk.app/login?ref=${c}`
  }

  const getFollowUpMessage = (ref: AdminReferral | null, type: 'app' | 'download' | 'gift') => {
    const link = getFollowUpLink(type, ref?.referral_code)
    if (isPastorTiny) {
      return `Hey Pastor, this is Bro. Tiny.\n\nSister Angie and I have developed an app called The Shepherd’s Desk to help pastors stay encouraged, organized, and supported in the work of ministry. We built it with pastors like you in mind because we know how much you carry for the church, the people, and the calling God has placed on your life.\n\nI’d love for you to take a look and see if it could be a blessing to you and your ministry: ${link}\n\nBlessings,\nBro. Tiny`
    }
    return `Hi Pastor! ${ref?.referrer_name || 'Pastor Tiny'} invited you to try The Shepherd's Desk. We'd love to give you VIP access to all our sermon prep & pastoral care tools: ${link}`
  }

  // Reminder for pastors who were gifted Lifetime VIP but haven't created their account yet
  const getVipGiftMessage = (ref: AdminReferral | null, type: 'app' | 'download' | 'gift') => {
    const link = getFollowUpLink(type, ref?.referral_code)
    const from = isPastorTiny ? 'Bro. Tiny' : 'Angie'
    return `Hi Pastor! It's ${from} from The Shepherd's Desk 🙏\n\nYou were GIFTED a Lifetime VIP Membership — full Pro access, free forever (a $179.88/year value). No credit card, no charges, ever.\n\nThere's just one step: I can't turn on your VIP status until you create your account. Sign up here (takes 1 minute):\n👉 ${link}\n\nThen reply with the email you used and I'll activate your VIP right away.\n\nHere's what's waiting for you, including brand-new features:\n🎙️ NEW Smart Assistant – just speak: "Remind me to call Sister Mary Thursday," "Add a new sermon titled Walking by Faith," or "Add Brother John to the prayer list" and it's done\n🔔 NEW Phone alerts for visits, follow-ups & sermon prep\n📖 Sermon builder, Pulpit Mode & study tools\n❤️ Prayer list, hospital visits & member care\n📅 Ministry calendar\n\nWorks on iPhone, Android, and your computer. God bless!\n— ${from}`
  }

  const buildSms = (preset: 'standard' | 'vip' | 'blank', ref: AdminReferral | null, type: 'app' | 'download' | 'gift') =>
    preset === 'vip' ? getVipGiftMessage(ref, type) : preset === 'blank' ? '' : getFollowUpMessage(ref, type)

  // Pull a phone number out of the invite label, e.g. "Contractor Barry ((214) 708-2802)"
  const extractPhone = (label?: string | null) => {
    if (!label) return ''
    const m = label.match(/\+?\d[\d\s().-]{8,}\d/)
    if (!m) return ''
    const digits = m[0].replace(/[^\d+]/g, '')
    return digits.replace(/\D/g, '').length >= 10 ? digits : ''
  }

  // Handle Sending Pastor's Wife Note
  const changeLinkType = (type: 'app' | 'download' | 'gift') => {
    setFollowUpLinkType(type)
    if (smsPreset !== 'blank') setSmsText(buildSms(smsPreset, targetReferral, type))
  }

  const changeSmsPreset = (preset: 'standard' | 'vip' | 'blank') => {
    setSmsPreset(preset)
    setSmsText(buildSms(preset, targetReferral, followUpLinkType))
  }

  // Adds a dated line to the referral's notes so we know who was texted, when, and with what
  const [loggedThisOpen, setLoggedThisOpen] = useState(false)
  const logTextFollowUp = async () => {
    if (!targetReferral || loggedThisOpen) return
    setLoggedThisOpen(true)
    const label = smsPreset === 'vip' ? 'VIP Gift Reminder' : smsPreset === 'blank' ? 'Custom text' : 'Standard text'
    const who = isPastorTiny ? 'Pastor Tiny' : 'Angie'
    const line = `📱 ${format(new Date(), 'MMM d, yyyy')}: ${label} texted by ${who}`
    const notes = [targetReferral.notes, line].filter(Boolean).join('\n')
    try {
      const res = await fetch('/api/admin/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_referral', referralId: targetReferral.id, notes })
      })
      if (res.ok) {
        setReferrals(prev => prev.map(r => r.id === targetReferral.id ? { ...r, notes } : r))
        setTargetReferral({ ...targetReferral, notes })
      }
    } catch {
      // logging is best-effort; never block sending
    }
  }
  const handleOpenFollowUp = (referral: AdminReferral) => {
    setTargetReferral(referral)
    setFollowUpNote('')
    setFollowUpEmail(referral.referred_email && referral.referred_email.includes('@') ? referral.referred_email : '')
    setFollowUpLinkType('app')
    setSmsPreset('standard')
    setSmsText(buildSms('standard', referral, 'app'))
    setLoggedThisOpen(false)
    setCopiedSms(false)
    setFollowUpSuccess(null)
    setFollowUpModalOpen(true)
  }

  const handleSendFollowUp = async () => {
    if (!targetReferral) return
    setSendingFollowUp(true)
    setFollowUpSuccess(null)
    try {
      const res = await fetch('/api/admin/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_followup',
          referralId: targetReferral.id,
          email: followUpEmail.trim() || undefined,
          name: targetReferral.referred_user_name || undefined,
          customNote: followUpNote.trim() || undefined,
          linkType: followUpLinkType
        })
      })
      const result = await res.json()
      if (res.ok && result.success) {
        setFollowUpSuccess(`✅ Founder follow-up note sent to ${followUpEmail.trim() || targetReferral.referred_email}!`)
        try {
          const who = isPastorTiny ? 'Pastor Tiny' : 'Angie'
          const line = `✉️ ${format(new Date(), 'MMM d, yyyy')}: Follow-up email sent by ${who}`
          const notes = [targetReferral.notes, line].filter(Boolean).join('\n')
          await fetch('/api/admin/referrals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'update_referral', referralId: targetReferral.id, notes })
          })
        } catch {}
        setTimeout(() => {
          setFollowUpModalOpen(false)
          fetchReferrals()
        }, 2000)
      } else {
        alert(result.error || 'Failed to send follow-up')
      }
    } catch (err) {
      console.error(err)
      alert('Error sending follow-up')
    } finally {
      setSendingFollowUp(false)
    }
  }

  // Handle VIP Invitation from Angie
  const handleSendVip = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!vipEmail.trim()) return
    setSendingVip(true)
    setVipSuccess(null)
    try {
      const res = await fetch('/api/admin/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_vip_invite',
          name: vipName.trim(),
          email: vipEmail.trim(),
          customNote: vipNote.trim()
        })
      })
      const result = await res.json()
      if (res.ok && result.success) {
        setVipSuccess(`✅ VIP Founder invite sent to ${vipEmail.trim()}!`)
        setTimeout(() => {
          setIsVipOpen(false)
          setVipName('')
          setVipEmail('')
          setVipNote('')
          setVipSuccess(null)
          fetchReferrals()
        }, 2000)
      } else {
        alert(result.error || 'Failed to send VIP invite')
      }
    } catch (err) {
      console.error(err)
      alert('Error sending VIP invite')
    } finally {
      setSendingVip(false)
    }
  }

  // Referral note / Not Interested editor
  const [noteTarget, setNoteTarget] = useState<AdminReferral | null>(null)
  const [noteText, setNoteText] = useState('')
  const [noteNotInterested, setNoteNotInterested] = useState(false)
  const [savingNote, setSavingNote] = useState(false)

  const handleOpenNote = (ref: AdminReferral) => {
    setNoteTarget(ref)
    setNoteText(ref.notes || '')
    setNoteNotInterested(ref.status === 'not_interested')
  }

  const handleSaveNote = async () => {
    if (!noteTarget) return
    setSavingNote(true)
    try {
      const payload: Record<string, any> = { action: 'update_referral', referralId: noteTarget.id, notes: noteText }
      // Only flip between pending <-> not_interested; never downgrade a signed-up pastor
      if (noteTarget.status === 'pending' || noteTarget.status === 'not_interested') {
        payload.status = noteNotInterested ? 'not_interested' : 'pending'
      }
      const res = await fetch('/api/admin/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const result = await res.json()
      if (res.ok && result.success) {
        setNoteTarget(null)
        fetchReferrals()
      } else {
        alert(result.error || 'Failed to save note')
      }
    } catch {
      alert('Error saving note')
    } finally {
      setSavingNote(false)
    }
  }

  const handleDeleteReferral = async (id: string) => {
    if (!confirm('Remove this referral record?')) return
    try {
      const res = await fetch('/api/admin/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_referral', referralId: id })
      })
      if (res.ok) {
        setReferrals(referrals.filter(r => r.id !== id))
      }
    } catch (err) {
      console.error(err)
    }
  }

  const totalUsers = users.length
  const totalSermons = users.reduce((acc, u) => acc + (u.sermon_count || 0), 0)
  const totalIdeas = users.reduce((acc, u) => acc + (u.idea_count || 0), 0)
  const activeThisWeek = users.filter(u => {
    if (!u.created_at) return false
    const d = new Date(u.created_at)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return d > weekAgo
  }).length

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#022d5c]">Administrative Center</h1>
          <p className="text-muted-foreground text-sm">
            Manage church leaders, user accounts, and track your pastor outreach pipeline.
          </p>
        </div>
      </div>

      <Tabs defaultValue="pipeline" className="w-full">
        <TabsList className="bg-gray-100 p-1 mb-6">
          <TabsTrigger value="pipeline" className="data-[state=active]:bg-white data-[state=active]:text-[#022d5c] font-semibold">
            <Heart className="w-4 h-4 mr-2 text-[#D0A348]" />
            Pastor Pipeline & Referrals ({referralStats.total})
          </TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-white data-[state=active]:text-[#022d5c] font-semibold">
            <Users className="w-4 h-4 mr-2 text-[#022d5c]" />
            Active Users Directory ({totalUsers})
          </TabsTrigger>
          <TabsTrigger value="messages" className="data-[state=active]:bg-white data-[state=active]:text-[#022d5c] font-semibold">
            <Send className="w-4 h-4 mr-2 text-[#022d5c]" />
            Messages &amp; Broadcast
          </TabsTrigger>
        </TabsList>

        {/* ----------------- TAB 1: PASTOR PIPELINE & REFERRALS ----------------- */}
        <TabsContent value="pipeline" className="space-y-6">
          {/* Pipeline Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="bg-white border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Pastors Invited</CardTitle>
                <Gift className="h-4 w-4 text-[#D0A348]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#022d5c]">{referralStats.total}</div>
                <p className="text-xs text-muted-foreground mt-1">Total referrals across platform</p>
              </CardContent>
            </Card>

            <Card className="bg-amber-50/60 border-amber-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-amber-800">Pending Activation</CardTitle>
                <Clock className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-900">{referralStats.pending}</div>
                <p className="text-xs text-amber-700 mt-1">Invited but not yet signed up</p>
              </CardContent>
            </Card>

            <Card className="bg-blue-50/60 border-blue-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-800">Signed Up</CardTitle>
                <CheckCircle className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-900">{referralStats.signedUp}</div>
                <p className="text-xs text-blue-700 mt-1">Created their Shepherd's account</p>
              </CardContent>
            </Card>

            <Card className="bg-green-50/60 border-green-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-800">Subscribed</CardTitle>
                <Sparkles className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-900">{referralStats.subscribed}</div>
                <p className="text-xs text-green-700 mt-1">Active paid subscriptions</p>
              </CardContent>
            </Card>
          </div>

          {/* Pipeline Management Card */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl text-[#022d5c]">Pastoral Outreach Funnel</CardTitle>
                <CardDescription>
                  Track all pastors invited by their peers, and send personal follow-up notes from {isPastorTiny ? 'Pastor Tiny' : "Angie (Founder & Pastor's Wife)"}.
                </CardDescription>
              </div>

              {/* VIP Invite Dialog */}
              <Dialog open={isVipOpen} onOpenChange={setIsVipOpen}>
                <DialogTrigger {...({ asChild: true } as any)}>
                  <Button className="bg-[#022d5c] hover:bg-[#022d5c]/90 text-white font-medium gap-2">
                    <Sparkles className="w-4 h-4 text-[#D0A348]" />
                    Send VIP Founder Invite
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle className="text-xl text-[#022d5c] flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-[#D0A348]" />
                      Invite Pastor as VIP Guest
                    </DialogTitle>
                    <CardDescription>
                      Sends a warm, personal invitation directly from {isPastorTiny ? 'Pastor Tiny' : "Angie (Founder, Tiny Tech & Pastor's Wife)"}.
                    </CardDescription>
                  </DialogHeader>
                  {vipSuccess ? (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm font-medium">
                      {vipSuccess}
                    </div>
                  ) : (
                    <form onSubmit={handleSendVip} className="space-y-4 pt-2">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Pastor's Name</label>
                        <Input
                          placeholder="Pastor David"
                          value={vipName}
                          onChange={e => setVipName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Email Address *</label>
                        <Input
                          type="email"
                          required
                          placeholder="pastordavid@church.com"
                          value={vipEmail}
                          onChange={e => setVipEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Personal Note from {isPastorTiny ? 'Pastor Tiny' : 'Angie'}</label>
                        <Textarea
                          rows={3}
                          placeholder={isPastorTiny ? "I would love to personally invite you to The Shepherd's Desk as my VIP fellow pastor and guest!" : "I would love to personally welcome you to The Shepherd's Desk as our VIP guest!"}
                          value={vipNote}
                          onChange={e => setVipNote(e.target.value)}
                        />
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsVipOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={sendingVip} className="bg-[#022d5c] text-white">
                          {sendingVip ? 'Sending VIP Invite...' : 'Send VIP Invitation'}
                        </Button>
                      </DialogFooter>
                    </form>
                  )}
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {loadingReferrals ? (
                <div className="py-12 text-center text-muted-foreground">Loading pastor pipeline...</div>
              ) : referrals.filter(r => r.referred_email).length === 0 ? (
                <div className="py-12 text-center text-gray-500 border border-dashed rounded-lg">
                  No pastor referrals recorded yet. When pastors share their invite link or you send VIP invitations, they will appear here.
                </div>
              ) : (
                <>
                {(() => {
                  const all = referrals.filter(r => r.referred_email)
                  const me = (currentAdminEmail || '').toLowerCase()
                  const groups = new Map<string, { label: string; count: number }>()
                  all.forEach(r => {
                    const key = (r.referrer_email || r.referrer_name || 'unknown').toLowerCase()
                    const g = groups.get(key)
                    if (g) g.count++
                    else groups.set(key, { label: r.referrer_name || r.referrer_email || 'Unknown', count: 1 })
                  })
                  const mineCount = me ? (groups.get(me)?.count || 0) : 0
                  const chip = (active: boolean) => `px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${active ? 'bg-[#022d5c] text-white border-[#022d5c]' : 'bg-white text-gray-700 border-gray-200 hover:border-[#022d5c]'}`
                  return (
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mr-1">Sent by:</span>
                      {me && (
                        <button className={chip(referrerFilter === 'me')} onClick={() => setReferrerFilter('me')}>
                          ⭐ Me ({mineCount})
                        </button>
                      )}
                      <button className={chip(referrerFilter === 'all')} onClick={() => setReferrerFilter('all')}>
                        Everyone ({all.length})
                      </button>
                      {[...groups.entries()]
                        .filter(([key]) => key !== me)
                        .sort((a, b) => b[1].count - a[1].count)
                        .map(([key, g]) => (
                          <button key={key} className={chip(referrerFilter === key)} onClick={() => setReferrerFilter(key)}>
                            {g.label} ({g.count})
                          </button>
                        ))}
                      <label className="ml-auto flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                        <input type="checkbox" checked={needsFollowUpOnly} onChange={e => setNeedsFollowUpOnly(e.target.checked)} className="accent-[#022d5c]" />
                        Only show pending (needs follow-up)
                      </label>
                    </div>
                  )
                })()}
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invited Pastor</TableHead>
                        <TableHead>Referred By</TableHead>
                        <TableHead>Referrer Email</TableHead>
                        <TableHead>Date Sent</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {referrals
                        .filter(r => r.referred_email)
                        .filter(r => {
                          const key = (r.referrer_email || r.referrer_name || 'unknown').toLowerCase()
                          if (referrerFilter === 'all') return true
                          if (referrerFilter === 'me') return key === (currentAdminEmail || '').toLowerCase()
                          return key === referrerFilter
                        })
                        .filter(r => !needsFollowUpOnly || r.status === 'pending')
                        .map((ref) => (
                        <TableRow key={ref.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-semibold text-gray-900">{ref.referred_email}</span>
                              {ref.referred_user_name && (
                                <span className="text-xs text-gray-500">{ref.referred_user_name}</span>
                              )}
                              {ref.signup_email && ref.status !== 'pending' && ref.status !== 'not_interested' && (
                                <span className="text-xs text-blue-700 mt-0.5">Signed up as: {ref.signup_email}</span>
                              )}
                              {ref.notes && (
                                <span className="text-xs text-gray-600 italic mt-1 max-w-[260px] whitespace-pre-wrap">📝 {ref.notes}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-semibold text-gray-900">{ref.referrer_name}</span>
                              {ref.referrer_church ? (
                                <span className="text-xs text-[#8B6A27] font-medium flex items-center gap-1 mt-0.5">
                                  <span>🏛️</span> {ref.referrer_church}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400 italic">No church set</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {ref.referrer_email ? (
                              <span className="text-xs font-mono text-gray-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                {ref.referrer_email}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-gray-600">
                            {ref.created_at ? format(new Date(ref.created_at), 'MMM d, yyyy') : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              ref.status === 'subscribed' ? 'bg-green-100 text-green-800' :
                              ref.status === 'signed_up' ? 'bg-blue-100 text-blue-800' :
                              ref.status === 'not_interested' ? 'bg-gray-200 text-gray-700' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {ref.status === 'subscribed' ? '🎉 Subscribed' :
                               ref.status === 'signed_up' ? '✅ Signed Up' :
                               ref.status === 'not_interested' ? '🚫 Not Interested' :
                               '⏳ Pending Activation'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs text-gray-600 hover:text-[#022d5c] mr-1"
                              onClick={() => handleOpenNote(ref)}
                              title="Add a note or mark Not Interested"
                            >
                              📝 Note
                            </Button>
                            {ref.status === 'pending' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-[#D0A348] text-[#022d5c] hover:bg-[#F8F5EE] text-xs font-semibold cursor-pointer"
                                onClick={() => handleOpenFollowUp(ref)}
                              >
                                <Heart className="w-3.5 h-3.5 mr-1 text-[#D0A348]" />
                                {isPastorTiny ? 'Send Pastor Follow-Up' : "Send Follow-Up Note"}
                              </Button>
                            ) : ref.status === 'not_interested' ? (
                              <span className="text-xs text-gray-500 font-medium">No follow-ups</span>
                            ) : (
                              <span className="text-xs text-green-700 font-medium">Activated</span>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteReferral(ref.id)}
                              className="text-gray-400 hover:text-red-600 ml-1"
                              title="Delete record"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {referrals
                    .filter(r => r.referred_email)
                    .filter(r => {
                      const key = (r.referrer_email || r.referrer_name || 'unknown').toLowerCase()
                      if (referrerFilter === 'all') return true
                      if (referrerFilter === 'me') return key === (currentAdminEmail || '').toLowerCase()
                      return key === referrerFilter
                    })
                    .filter(r => !needsFollowUpOnly || r.status === 'pending').length === 0 && (
                    <div className="py-10 text-center text-sm text-gray-500">
                      No invites match this filter. Try &ldquo;Everyone&rdquo;.
                    </div>
                  )}
                </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Referral Note Dialog */}
          <Dialog open={!!noteTarget} onOpenChange={(open) => { if (!open) setNoteTarget(null) }}>
            <DialogContent className="sm:max-w-[480px]">
              <DialogHeader>
                <DialogTitle className="text-xl text-[#022d5c]">📝 Referral Note</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <p className="text-sm text-gray-600">
                  <span className="font-semibold text-gray-900">{noteTarget?.referred_email}</span>
                  {noteTarget?.referrer_name ? <> — invited by {noteTarget.referrer_name}</> : null}
                </p>
                <Textarea
                  placeholder="e.g. Talked on the phone 10/3 — said he's really not interested right now."
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  className="min-h-[110px]"
                />
                {(noteTarget?.status === 'pending' || noteTarget?.status === 'not_interested') && (
                  <label className="flex items-start gap-2 text-sm cursor-pointer p-3 rounded-md border bg-gray-50">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4"
                      checked={noteNotInterested}
                      onChange={e => setNoteNotInterested(e.target.checked)}
                    />
                    <span>
                      <span className="font-semibold">🚫 Mark as Not Interested</span>
                      <span className="block text-xs text-gray-500">Stops follow-ups and reminders for this person.</span>
                    </span>
                  </label>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setNoteTarget(null)}>Cancel</Button>
                <Button onClick={handleSaveNote} disabled={savingNote} className="bg-[#022d5c] hover:bg-[#033a75] text-white">
                  {savingNote ? 'Saving...' : 'Save'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Follow-Up Modal */}
          <Dialog open={followUpModalOpen} onOpenChange={setFollowUpModalOpen}>
            <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl text-[#022d5c] flex items-center gap-2">
                  <Heart className="w-5 h-5 text-[#D0A348]" />
                  Send Personal Note from {isPastorTiny ? 'Pastor Tiny' : "Angie (Pastor's Wife)"}
                </DialogTitle>
                <CardDescription>
                  Reaches out to <strong>{targetReferral?.referred_email}</strong> with {isPastorTiny ? 'a personal message from fellow Pastor Tiny' : "your personal story as a pastor's wife"} and highlights the tools of The Shepherd's Desk.
                </CardDescription>
              </DialogHeader>

              {followUpSuccess ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm font-medium">
                  {followUpSuccess}
                </div>
              ) : (
                <div className="space-y-4 py-2">
                  {/* Link Destination Option */}
                  <div className="space-y-1.5 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#022d5c]">Link to include in message:</span>
                      <span className="text-[11px] text-gray-500 font-mono truncate max-w-[240px]">
                        {getFollowUpLink(followUpLinkType)}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => changeLinkType('app')}
                        className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border text-center transition-all cursor-pointer ${
                          followUpLinkType === 'app'
                            ? 'bg-[#022d5c] text-white border-[#022d5c] shadow-sm'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        📱 Try App Free
                      </button>
                      <button
                        type="button"
                        onClick={() => changeLinkType('download')}
                        className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border text-center transition-all cursor-pointer ${
                          followUpLinkType === 'download'
                            ? 'bg-[#022d5c] text-white border-[#022d5c] shadow-sm'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        📲 Download Stores
                      </button>
                      <button
                        type="button"
                        onClick={() => changeLinkType('gift')}
                        className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border text-center transition-all cursor-pointer ${
                          followUpLinkType === 'gift'
                            ? 'bg-[#022d5c] text-white border-[#022d5c] shadow-sm'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        🎁 Gift Redeem
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 p-3 bg-blue-50/80 border border-blue-200 rounded-xl">
                    <span className="text-xs font-bold text-blue-950 block">
                      📱 Text Message {targetReferral?.referred_email ? `(${targetReferral.referred_email})` : ''}:
                    </span>

                    {/* Message picker */}
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { value: 'standard', label: '💬 Standard' },
                        { value: 'vip', label: '🎁 VIP Gift Reminder' },
                        { value: 'blank', label: '✍️ Write My Own' },
                      ] as const).map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => changeSmsPreset(opt.value)}
                          className={`px-2 py-1.5 text-xs font-semibold rounded-lg border text-center transition-all cursor-pointer ${
                            smsPreset === opt.value
                              ? 'bg-[#022d5c] text-white border-[#022d5c] shadow-sm'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    <Textarea
                      value={smsText}
                      onChange={e => setSmsText(e.target.value)}
                      placeholder="Type your text message here..."
                      className="min-h-[140px] text-xs bg-white"
                    />

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!smsText.trim()}
                        className="h-8 text-xs bg-white border-blue-300 text-blue-800 hover:bg-blue-100 font-semibold cursor-pointer"
                        onClick={() => {
                          navigator.clipboard.writeText(smsText)
                          logTextFollowUp()
                          setCopiedSms(true)
                          setTimeout(() => setCopiedSms(false), 2500)
                        }}
                      >
                        {copiedSms ? '✓ Copied to Clipboard!' : '📋 Copy Text'}
                      </Button>
                      {extractPhone(targetReferral?.referred_email) && (
                        <a
                          href={`sms:${extractPhone(targetReferral?.referred_email)}?&body=${encodeURIComponent(smsText)}`}
                          onClick={() => logTextFollowUp()}
                          className={`inline-flex items-center h-8 px-3 rounded-md text-xs font-semibold bg-[#022d5c] text-white hover:bg-[#022d5c]/90 ${!smsText.trim() ? 'pointer-events-none opacity-50' : ''}`}
                        >
                          💬 Open in My Texts
                        </a>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500">&ldquo;Open in My Texts&rdquo; works when you&apos;re on your phone. On a computer, use Copy Text and paste it into your messages.</p>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-700">Or enter pastor's email to send official letter:</label>
                      <Input
                        type="email"
                        placeholder="pastor@church.com"
                        value={followUpEmail}
                        onChange={e => setFollowUpEmail(e.target.value)}
                        className="h-8 text-xs bg-white"
                      />
                    </div>
                  </div>

                  <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3 text-xs text-amber-900">
                    <strong>Preview of your letter:</strong><br />
                    {isPastorTiny ? (
                      <div className="mt-1 space-y-1">
                        <p><em>"Hey Pastor, this is Bro. Tiny.</em></p>
                        <p><em>Sister Angie and I have developed an app called The Shepherd’s Desk to help pastors stay encouraged, organized, and supported in the work of ministry. We built it with pastors like you in mind because we know how much you carry for the church, the people, and the calling God has placed on your life.</em></p>
                        <p><em>I’d love for you to take a look and see if it could be a blessing to you and your ministry: <span className="underline font-mono text-blue-800">{getFollowUpLink(followUpLinkType)}</span></em></p>
                        <p><em>Blessings,<br />Bro. Tiny"</em></p>
                      </div>
                    ) : (
                      <em>"As a pastor's wife, I have watched firsthand the heavy load my husband and fellow pastors carry every single day—the hospital waiting rooms, the crisis calls, and late Saturday night sermon prep. That's why I created The Shepherd's Desk..."</em>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Add a custom note (optional):</label>
                    <Textarea
                      rows={3}
                      placeholder="e.g., I'd love to hop on a quick call or give you an extended free pass if you'd like to try it!"
                      value={followUpNote}
                      onChange={e => setFollowUpNote(e.target.value)}
                    />
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setFollowUpModalOpen(false)}>Cancel</Button>
                    <Button 
                      onClick={handleSendFollowUp} 
                      disabled={sendingFollowUp}
                      className="bg-[#022d5c] text-white hover:bg-[#022d5c]/90 gap-2 cursor-pointer"
                    >
                      <Send className="w-4 h-4 text-[#D0A348]" />
                      {sendingFollowUp ? 'Sending Follow-up...' : (isPastorTiny ? 'Send Pastor Follow-Up' : "Send Follow-Up Note")}
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ----------------- TAB 2: ACTIVE USERS DIRECTORY ----------------- */}
        <TabsContent value="users" className="space-y-6">
          {/* Stats Overview */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-[#D0A348]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalUsers}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active This Week</CardTitle>
                <Users className="h-4 w-4 text-[#D0A348]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeThisWeek}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Sermons</CardTitle>
                <BookOpen className="h-4 w-4 text-[#D0A348]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalSermons}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Ideas</CardTitle>
                <Lightbulb className="h-4 w-4 text-[#D0A348]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalIdeas}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Users</CardTitle>
              <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                <DialogTrigger {...({ asChild: true } as any)}>
                  <Button className="bg-[#022d5c] text-white hover:bg-[#022d5c]/90">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Invite New Pastor
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite New Pastor</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleInvite} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Name</label>
                      <Input 
                        required 
                        placeholder="Pastor John"
                        value={inviteName}
                        onChange={(e) => setInviteName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Email</label>
                      <Input 
                        type="email" 
                        required 
                        placeholder="john@church.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                    </div>
                    <Button type="submit" className="w-full bg-[#D0A348] text-white hover:bg-[#D0A348]/90">
                      Send Invitation
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-8 text-center text-muted-foreground">Loading users...</div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Sign Up</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead className="text-right">Sermons</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            No users found
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span>{user.full_name || 'N/A'}</span>
                            {(user as any).phone && <span className="text-xs text-gray-500 font-normal">📞 {(user as any).phone}</span>}
                            {(user as any).invited_by && <span className="text-xs text-[#8B6A27] font-normal">Invited by: {(user as any).invited_by}</span>}
                          </div>
                        </TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <select
                                value={user.role}
                                onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                                className={`text-xs font-semibold px-2.5 py-1 rounded border transition-colors ${
                                  user.role === 'admin' 
                                    ? 'bg-purple-50 text-purple-900 border-purple-300 font-bold' 
                                    : 'bg-gray-50 text-gray-800 border-gray-200'
                                } cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#022d5c]`}
                              >
                                <option value="pastor">Pastor</option>
                                <option value="admin">Admin</option>
                              </select>
                            </TableCell>
                            <TableCell>
                              {user.created_at ? format(new Date(user.created_at), 'MMM d, yyyy') : 'N/A'}
                            </TableCell>
                            <TableCell>
                              {user.is_vip ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                  <Crown className="w-3 h-3 text-amber-700" /> VIP Comped
                                </span>
                              ) : user.stripe_customer_id ? (
                                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#022d5c] text-white">
                                  Pro
                                </span>
                              ) : (
                                <div className="flex flex-col gap-0.5">
                                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 w-fit">
                                    Free Trial
                                  </span>
                                  {user.trial_ends_at && (
                                    <span className="text-[10px] text-gray-500 font-medium">
                                      Ends {format(new Date(user.trial_ends_at), 'MMM d')}
                                    </span>
                                  )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right">{user.sermon_count}</TableCell>
                            <TableCell className="text-right capitalize">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                user.status === 'active' ? 'bg-green-100 text-green-800' : 
                                user.status === 'suspended' ? 'bg-red-100 text-red-800' : 
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {user.status}
                              </span>
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                              {/* Grant / Revoke VIP Complimentary */}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleToggleVip(user.id, user.is_vip)}
                                title={user.is_vip ? "Revoke VIP Complimentary Access" : "Grant Lifetime VIP Complimentary Pro Access (Free)"}
                                className={user.is_vip ? "text-amber-600 hover:text-amber-800 hover:bg-amber-50" : "text-gray-400 hover:text-amber-600 hover:bg-amber-50"}
                              >
                                <Crown className="h-4 w-4" />
                              </Button>

                              {/* Extend Trial */}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleExtendTrial(user.id, 30)}
                                title="Extend Trial (+30 Days)"
                                className="text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50"
                              >
                                <CalendarPlus className="h-4 w-4" />
                              </Button>

                              {/* Password Reset */}
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleResetPassword(user.id, user.email)}
                                title="Generate Password Reset Link"
                                className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <Key className="h-4 w-4" />
                              </Button>

                              {/* Suspend / Unsuspend */}
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleSuspend(user.id, user.status)}
                                title={user.status === 'suspended' ? "Unsuspend User" : "Suspend User"}
                                className="text-orange-500 hover:text-orange-700 hover:bg-orange-50"
                              >
                                {user.status === 'suspended' ? <CheckCircle className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                              </Button>

                              {/* Delete User */}
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleDeleteUser(user.id)}
                                title="Delete User"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ----------------- TAB 3: MESSAGES & BROADCAST ----------------- */}
        <TabsContent value="messages" className="space-y-6">
          <BroadcastCard />
          <ReferralTemplatesManager />
        </TabsContent>
      </Tabs>
    </div>
  )
}