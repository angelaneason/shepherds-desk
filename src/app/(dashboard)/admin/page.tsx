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
  status: 'pending' | 'signed_up' | 'subscribed'
  created_at: string
  referrer_name: string
  referrer_church: string
  referrer_email: string
  referred_user_name: string | null
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
  const [sendingFollowUp, setSendingFollowUp] = useState(false)
  const [followUpSuccess, setFollowUpSuccess] = useState<string | null>(null)

  // VIP Invite Modal
  const [isVipOpen, setIsVipOpen] = useState(false)
  const [vipName, setVipName] = useState('')
  const [vipEmail, setVipEmail] = useState('')
  const [vipNote, setVipNote] = useState('')
  const [sendingVip, setSendingVip] = useState(false)
  const [vipSuccess, setVipSuccess] = useState<string | null>(null)

  const [currentAdminEmail, setCurrentAdminEmail] = useState('')
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

  // Handle Sending Pastor's Wife Note
  const handleOpenFollowUp = (referral: AdminReferral) => {
    setTargetReferral(referral)
    setFollowUpNote('')
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
          name: targetReferral.referred_user_name || undefined,
          customNote: followUpNote.trim() || undefined
        })
      })
      const result = await res.json()
      if (res.ok && result.success) {
        setFollowUpSuccess(`✅ Founder follow-up note sent to ${targetReferral.referred_email}!`)
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
                <DialogTrigger asChild>
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
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invited Pastor</TableHead>
                        <TableHead>Referred By</TableHead>
                        <TableHead>Date Sent</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {referrals.filter(r => r.referred_email).map((ref) => (
                        <TableRow key={ref.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-semibold text-gray-900">{ref.referred_email}</span>
                              {ref.referred_user_name && (
                                <span className="text-xs text-gray-500">{ref.referred_user_name}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-800">{ref.referrer_name}</span>
                              {ref.referrer_church && (
                                <span className="text-xs text-gray-500">{ref.referrer_church}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {ref.created_at ? format(new Date(ref.created_at), 'MMM d, yyyy') : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              ref.status === 'subscribed' ? 'bg-green-100 text-green-800' :
                              ref.status === 'signed_up' ? 'bg-blue-100 text-blue-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {ref.status === 'subscribed' ? '🎉 Subscribed' :
                               ref.status === 'signed_up' ? '✅ Signed Up' :
                               '⏳ Pending Activation'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            {ref.status === 'pending' && ref.referred_email?.includes('@') ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-[#D0A348] text-[#022d5c] hover:bg-[#F8F5EE] text-xs font-semibold"
                                onClick={() => handleOpenFollowUp(ref)}
                              >
                                <Heart className="w-3.5 h-3.5 mr-1 text-[#D0A348]" />
                                {isPastorTiny ? 'Send Pastor Follow-Up' : "Send Pastor's Wife Note"}
                              </Button>
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
                </div>
              )}
            </CardContent>
          </Card>

          {/* Follow-Up Modal */}
          <Dialog open={followUpModalOpen} onOpenChange={setFollowUpModalOpen}>
            <DialogContent className="sm:max-w-[550px]">
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
                  <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3 text-xs text-amber-900">
                    <strong>Preview of your letter:</strong><br />
                    {isPastorTiny ? (
                      <em>"As a pastor, I know firsthand the immense weight and responsibility we carry every single week. Between crisis visits, hospital calls, counseling, and sermon prep, finding dedicated time can feel impossible. That's why we built The Shepherd's Desk..."</em>
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
                      className="bg-[#022d5c] text-white hover:bg-[#022d5c]/90 gap-2"
                    >
                      <Send className="w-4 h-4 text-[#D0A348]" />
                      {sendingFollowUp ? 'Sending Follow-up...' : (isPastorTiny ? 'Send Pastor Follow-Up' : "Send Pastor's Wife Note")}
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
                <DialogTrigger asChild>
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
                            <TableCell className="font-medium">{user.full_name || 'N/A'}</TableCell>
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
      </Tabs>
    </div>
  )
}