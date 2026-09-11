'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Copy, Pencil, Trash, Megaphone, PartyPopper, Heart, HandHeart, Zap, 
  ChevronDown, ChevronUp, Plus, X, Sparkles, MessageSquare, Users, Send, 
  Check, CheckSquare, Square, Phone, Clock, AlertCircle, ExternalLink, RefreshCw 
} from 'lucide-react'
import { cn } from '@/lib/utils'
import AiTextComposerModal from '@/components/care/AiTextComposerModal'
import { VoiceDictation } from '@/components/voice/VoiceDictation'

type AnnouncementCategory = 'general' | 'event' | 'prayer' | 'volunteer' | 'celebration' | 'urgent'

interface Announcement {
  id: string
  profile_id: string
  title: string
  content: string
  category: AnnouncementCategory
  display_date: string
  expires_at: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface ChurchMember {
  id: string
  full_name: string
  phone: string | null
  status: 'active' | 'inactive' | 'visitor'
  notes?: string
}

const CATEGORY_COLORS: Record<AnnouncementCategory, string> = {
  general: 'bg-slate-100 text-slate-800',
  event: 'bg-blue-100 text-blue-800',
  prayer: 'bg-purple-100 text-purple-800',
  volunteer: 'bg-green-100 text-green-800',
  celebration: 'bg-[#D0A348]/20 text-[#8B6A27]',
  urgent: 'bg-red-100 text-red-800',
}

const CATEGORY_LABELS: Record<AnnouncementCategory, string> = {
  general: 'General',
  event: 'Event',
  prayer: 'Prayer',
  volunteer: 'Volunteer',
  celebration: 'Celebration',
  urgent: 'Urgent',
}

const TEMPLATES = [
  { id: 'general', label: 'General Announcement', icon: Megaphone, category: 'general' as const, content: 'Dear Church Family,\n\n[Your announcement here]\n\nBlessings,\n[Your Name]' },
  { id: 'celebration', label: 'Celebration', icon: PartyPopper, category: 'celebration' as const, content: '🎉 We are thrilled to announce...\n\n[Details of the celebration]\n\nJoin us in celebrating!' },
  { id: 'prayer', label: 'Prayer Request', icon: Heart, category: 'prayer' as const, content: '🙏 Prayer Request\n\n[Describe the prayer need]\n\nPlease keep [name/situation] in your prayers.' },
  { id: 'volunteer', label: 'Volunteer Call', icon: HandHeart, category: 'volunteer' as const, content: '🙋 Volunteers Needed!\n\n[Describe the opportunity]\n\nIf you\'re interested, please contact [name/details].' },
  { id: 'urgent', label: 'Urgent Notice', icon: Zap, category: 'urgent' as const, content: '⚡ Important Notice\n\n[Urgent message details]\n\nPlease respond/take action by [deadline].' }
]

const BROADCAST_PRESETS = [
  {
    id: 'service_reminder',
    label: '⛪ Sunday Service',
    prompt: "Reminder: Join us this Sunday for worship and God's Word! Service begins at 10:00 AM. We can't wait to worship with you!"
  },
  {
    id: 'weather_update',
    label: '⚡ Urgent Weather / Update',
    prompt: "Important Church Notice: Due to weather/facility conditions, our scheduled service has been adjusted. Please stay tuned for updates and stay safe! Blessings."
  },
  {
    id: 'midweek_blessing',
    label: '💛 Mid-Week Blessing',
    prompt: "Mid-week encouragement: \"The Lord is my strength and my shield; in him my heart trusts.\" (Ps 28:7). Praying blessings over your week!"
  },
  {
    id: 'prayer_chain',
    label: '🙏 Prayer Chain Alert',
    prompt: "Church Prayer Alert: Please join our church family in lifting up special prayer needs today. May the peace of God surround you."
  },
  {
    id: 'volunteer_call',
    label: '🙋 Volunteer Call',
    prompt: "Volunteers Needed: We are gathering volunteers for upcoming church ministry! If you are able to lend a hand, please reply or let us know."
  }
]

const getTodayDateString = () => new Date().toISOString().split('T')[0]
const getNextMonthDateString = () => {
  const d = new Date()
  d.setMonth(d.getMonth() + 1)
  return d.toISOString().split('T')[0]
}

export default function CommunicationPage() {
  const supabase = createClient()
  
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'announcements' | 'broadcast'>('announcements')
  
  // Announcements State
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [showInactive, setShowInactive] = useState(false)
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pastorProfile, setPastorProfile] = useState<{ full_name?: string, church_name?: string }>({})
  
  // AI Text Composer State (Single Member)
  const [textComposer, setTextComposer] = useState<{
    isOpen: boolean
    recipientName: string
    recipientPhone?: string | null
    defaultCategory?: string
    defaultCustomPrompt?: string
  }>({
    isOpen: false,
    recipientName: 'Church Family',
    recipientPhone: null,
    defaultCategory: 'announcement',
    defaultCustomPrompt: ''
  })
  
  const [formData, setFormData] = useState<{
    title: string
    content: string
    category: AnnouncementCategory
    display_date: string
    expires_at: string
    is_active: boolean
  }>({
    title: '',
    content: '',
    category: 'general',
    display_date: getTodayDateString(),
    expires_at: getNextMonthDateString(),
    is_active: true
  })

  // Group Texting State
  const [members, setMembers] = useState<ChurchMember[]>([])
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [audienceFilter, setAudienceFilter] = useState<'all' | 'active' | 'visitor'>('active')
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [broadcastPreset, setBroadcastPreset] = useState('service_reminder')
  const [isGeneratingAi, setIsGeneratingAi] = useState(false)
  const [copiedType, setCopiedType] = useState<'message' | 'numbers' | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const [announcesRes, profileRes, membersRes] = await Promise.all([
      supabase
        .from('announcements')
        .select('*')
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('profiles')
        .select('full_name, church_name')
        .eq('id', user.id)
        .single(),
      supabase
        .from('church_members')
        .select('id, full_name, phone, status, notes')
        .eq('profile_id', user.id)
        .order('full_name')
    ])

    if (profileRes.data) {
      setPastorProfile(profileRes.data)
    }

    if (!announcesRes.error) {
      setAnnouncements((announcesRes.data as any) || [])
    }

    if (!membersRes.error && membersRes.data) {
      const validMembers = (membersRes.data as any[] || []).filter(m => m.phone && m.phone.trim().length > 0)
      setMembers(validMembers)
      // Default to selecting all active members with phone numbers
      const activeIds = validMembers.filter(m => m.status === 'active').map(m => m.id)
      setSelectedMemberIds(activeIds.length > 0 ? activeIds : validMembers.map(m => m.id))
    }

    setLoading(false)
  }

  // Filtered members by audience tab
  const filteredMembers = useMemo(() => {
    if (audienceFilter === 'all') return members
    return members.filter(m => m.status === audienceFilter)
  }, [members, audienceFilter])

  const selectedMembers = useMemo(() => {
    return members.filter(m => selectedMemberIds.includes(m.id))
  }, [members, selectedMemberIds])

  const toggleSelectMember = (id: string) => {
    setSelectedMemberIds(prev => 
      prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]
    )
  }

  const selectAllFiltered = () => {
    const idsToAdd = filteredMembers.map(m => m.id)
    setSelectedMemberIds(prev => Array.from(new Set([...prev, ...idsToAdd])))
  }

  const deselectAllFiltered = () => {
    const idsToRemove = new Set(filteredMembers.map(m => m.id))
    setSelectedMemberIds(prev => prev.filter(id => !idsToRemove.has(id)))
  }

  // AI Broadcast Message Generator
  const handleGenerateAiBroadcast = async () => {
    setIsGeneratingAi(true)
    try {
      const preset = BROADCAST_PRESETS.find(p => p.id === broadcastPreset)
      const res = await fetch('/api/ai/compose-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientName: 'Church Family',
          category: broadcastPreset,
          customPrompt: preset ? preset.prompt : broadcastMessage,
          pastorName: pastorProfile.full_name || '',
          churchName: pastorProfile.church_name || ''
        })
      })
      const data = await res.json()
      if (data.text) {
        setBroadcastMessage(data.text)
      } else {
        throw new Error(data.error || 'Failed to generate')
      }
    } catch {
      const preset = BROADCAST_PRESETS.find(p => p.id === broadcastPreset)
      if (preset) {
        let msg = preset.prompt
        if (pastorProfile.church_name) msg = msg.replace('church', pastorProfile.church_name)
        if (pastorProfile.full_name) msg += ` - ${pastorProfile.full_name}`
        setBroadcastMessage(msg)
      }
    } finally {
      setIsGeneratingAi(false)
    }
  }

  // Send Group SMS via native client
  const handleSendGroupSms = () => {
    const cleanNumbers = selectedMembers
      .map(m => (m.phone || '').replace(/[^0-9+]/g, ''))
      .filter(Boolean)

    if (cleanNumbers.length === 0) {
      alert('Please select at least one recipient with a valid phone number.')
      return
    }

    if (!broadcastMessage.trim()) {
      alert('Please enter a message to broadcast.')
      return
    }

    const recipientsString = cleanNumbers.join(',')
    const encodedBody = encodeURIComponent(broadcastMessage.trim())

    const isApple = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent)
    const separator = isApple ? '&' : '?'
    const smsUrl = `sms:${recipientsString}${separator}body=${encodedBody}`

    window.open(smsUrl, '_blank')
  }

  const handleCopyBroadcastMessage = () => {
    if (!broadcastMessage.trim()) return
    navigator.clipboard.writeText(broadcastMessage.trim()).then(() => {
      setCopiedType('message')
      setTimeout(() => setCopiedType(null), 2500)
    })
  }

  const handleCopyPhoneNumbers = () => {
    const cleanNumbers = selectedMembers
      .map(m => (m.phone || '').trim())
      .filter(Boolean)

    if (cleanNumbers.length === 0) {
      alert('No phone numbers selected.')
      return
    }

    navigator.clipboard.writeText(cleanNumbers.join(', ')).then(() => {
      setCopiedType('numbers')
      setTimeout(() => setCopiedType(null), 2500)
    })
  }

  // Announcements CRUD
  const openModalForNew = (template?: typeof TEMPLATES[0]) => {
    setEditingId(null)
    setFormData({
      title: template ? template.label : '',
      content: template ? template.content : '',
      category: template ? template.category : 'general',
      display_date: getTodayDateString(),
      expires_at: getNextMonthDateString(),
      is_active: true
    })
    setIsModalOpen(true)
  }

  const openModalForEdit = (announcement: Announcement) => {
    setEditingId(announcement.id)
    setFormData({
      title: announcement.title,
      content: announcement.content,
      category: announcement.category,
      display_date: announcement.display_date,
      expires_at: announcement.expires_at,
      is_active: announcement.is_active
    })
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (editingId) {
      await supabase
        .from('announcements')
        .update({ ...formData, updated_at: new Date().toISOString() })
        .eq('id', editingId)
    } else {
      await supabase
        .from('announcements')
        .insert([{ ...formData, profile_id: user.id }])
    }

    setIsModalOpen(false)
    fetchData()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return
    await supabase.from('announcements').delete().eq('id', id)
    fetchData()
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    await supabase.from('announcements').update({ is_active: !currentStatus }).eq('id', id)
    fetchData()
  }

  const handleTextAnnouncement = (announcement: Announcement) => {
    setActiveTab('broadcast')
    setBroadcastMessage(`📢 ${announcement.title}\n\n${announcement.content}`)
  }

  const activeAnnouncements = announcements.filter(a => a.is_active)
  const inactiveAnnouncements = announcements.filter(a => !a.is_active)

  const charCount = broadcastMessage.length
  const smsSegments = Math.ceil(charCount / 160) || 1

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#022d5c]/10 pb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-playfair font-bold text-[#022d5c]">Communication</h1>
          <p className="text-sm sm:text-base text-[#022d5c]/70 mt-1">
            Create church announcements, compose group text broadcasts, and stay connected with your congregation.
          </p>
        </div>

        {activeTab === 'announcements' && (
          <Button 
            onClick={() => openModalForNew()}
            className="bg-[#022d5c] text-[#F8F5EE] hover:bg-[#022d5c]/90 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Announcement
          </Button>
        )}
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-[#022d5c]/10 pb-3">
        <button
          onClick={() => setActiveTab('announcements')}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer",
            activeTab === 'announcements' 
              ? "bg-[#022d5c] text-white shadow-sm" 
              : "bg-white text-[#022d5c]/70 hover:text-[#022d5c] hover:bg-white/80 border border-[#022d5c]/10"
          )}
        >
          <Megaphone className="w-4 h-4" />
          <span>Church Announcements</span>
          <span className={cn(
            "text-xs px-2 py-0.5 rounded-full ml-1 font-bold",
            activeTab === 'announcements' ? "bg-[#D0A348] text-white" : "bg-[#022d5c]/10 text-[#022d5c]"
          )}>
            {announcements.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('broadcast')}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer",
            activeTab === 'broadcast' 
              ? "bg-[#022d5c] text-white shadow-sm" 
              : "bg-white text-[#022d5c]/70 hover:text-[#022d5c] hover:bg-white/80 border border-[#022d5c]/10"
          )}
        >
          <MessageSquare className="w-4 h-4 text-[#D0A348]" />
          <span>Group Text Broadcast</span>
          <span className={cn(
            "text-xs px-2 py-0.5 rounded-full ml-1 font-bold",
            activeTab === 'broadcast' ? "bg-[#D0A348] text-white" : "bg-[#022d5c]/10 text-[#022d5c]"
          )}>
            {members.length} phones
          </span>
        </button>
      </div>

      {/* TAB 1: CHURCH ANNOUNCEMENTS */}
      {activeTab === 'announcements' && (
        <div className="space-y-6">
          {/* Templates */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#022d5c]/70">Quick Start Templates</h2>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
              {TEMPLATES.map(t => {
                const Icon = t.icon
                return (
                  <button
                    key={t.id}
                    onClick={() => openModalForNew(t)}
                    className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-[#022d5c]/10 shadow-xs hover:border-[#D0A348] hover:shadow-sm whitespace-nowrap transition-all text-sm text-[#022d5c] cursor-pointer"
                  >
                    <Icon className="w-4 h-4 text-[#D0A348]" />
                    {t.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Announcements Feed */}
          {loading ? (
            <div className="py-20 text-center text-[#022d5c]/50">Loading announcements...</div>
          ) : (
            <div className="space-y-8">
              {activeAnnouncements.length === 0 ? (
                <div className="text-center py-16 bg-white/50 border border-dashed border-[#022d5c]/20 rounded-xl p-8">
                  <Megaphone className="w-12 h-12 text-[#022d5c]/30 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-[#022d5c]">No active announcements</h3>
                  <p className="text-sm text-[#022d5c]/60 max-w-sm mx-auto mt-1 mb-4">
                    Use a template above or create your own custom church announcement.
                  </p>
                  <Button onClick={() => openModalForNew()} className="bg-[#022d5c] text-white hover:bg-[#022d5c]/90">
                    Create First Announcement
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeAnnouncements.map(announcement => (
                    <AnnouncementCard
                      key={announcement.id}
                      announcement={announcement}
                      onEdit={() => openModalForEdit(announcement)}
                      onDelete={() => handleDelete(announcement.id)}
                      onToggleActive={() => handleToggleActive(announcement.id, announcement.is_active)}
                      onCopy={() => {
                        navigator.clipboard.writeText(`${announcement.title}\n\n${announcement.content}`)
                        alert('Copied to clipboard!')
                      }}
                      onTextAnnouncement={() => handleTextAnnouncement(announcement)}
                    />
                  ))}
                </div>
              )}

              {/* Inactive Announcements Collapsible */}
              {inactiveAnnouncements.length > 0 && (
                <div className="pt-6 border-t border-[#022d5c]/10">
                  <button 
                    onClick={() => setShowInactive(!showInactive)}
                    className="flex items-center gap-2 text-sm font-semibold text-[#022d5c]/70 hover:text-[#022d5c] transition-colors mb-4 cursor-pointer"
                  >
                    {showInactive ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    Inactive / Expired Announcements ({inactiveAnnouncements.length})
                  </button>

                  {showInactive && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-75">
                      {inactiveAnnouncements.map(announcement => (
                        <AnnouncementCard
                          key={announcement.id}
                          announcement={announcement}
                          onEdit={() => openModalForEdit(announcement)}
                          onDelete={() => handleDelete(announcement.id)}
                          onToggleActive={() => handleToggleActive(announcement.id, announcement.is_active)}
                          onCopy={() => {
                            navigator.clipboard.writeText(`${announcement.title}\n\n${announcement.content}`)
                            alert('Copied to clipboard!')
                          }}
                          onTextAnnouncement={() => handleTextAnnouncement(announcement)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: GROUP TEXT BROADCAST */}
      {activeTab === 'broadcast' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Recipient Selector */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="border-[#022d5c]/10 shadow-sm bg-white">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold text-[#022d5c] flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#D0A348]" />
                    <span>Recipients</span>
                  </CardTitle>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-[#022d5c]/10 text-[#022d5c] rounded-full">
                    {selectedMemberIds.length} of {members.length} selected
                  </span>
                </div>
                <CardDescription className="text-xs text-gray-500">
                  Select church members to receive this text broadcast.
                </CardDescription>

                {/* Filter Tabs */}
                <div className="flex gap-1.5 pt-3 border-t border-gray-100">
                  {[
                    { id: 'active', label: 'Active' },
                    { id: 'all', label: 'All' },
                    { id: 'visitor', label: 'Visitors' },
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setAudienceFilter(f.id as any)}
                      className={cn(
                        "text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer",
                        audienceFilter === f.id
                          ? "bg-[#022d5c] text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      )}
                    >
                      {f.label}
                    </button>
                  ))}

                  <div className="ml-auto flex items-center gap-2">
                    <button 
                      onClick={selectAllFiltered}
                      className="text-xs text-[#D0A348] font-semibold hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-gray-300">|</span>
                    <button 
                      onClick={deselectAllFiltered}
                      className="text-xs text-gray-400 font-medium hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                {members.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 text-sm">
                    <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="font-medium text-gray-600">No members with phone numbers</p>
                    <p className="text-xs mt-1 text-gray-400">Add member phone numbers in Ministry Care to text them.</p>
                  </div>
                ) : (
                  <div className="max-h-[420px] overflow-y-auto space-y-1.5 pr-1 divide-y divide-gray-50">
                    {filteredMembers.map(member => {
                      const isSelected = selectedMemberIds.includes(member.id)
                      return (
                        <div
                          key={member.id}
                          onClick={() => toggleSelectMember(member.id)}
                          className={cn(
                            "flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors pt-2",
                            isSelected ? "bg-[#022d5c]/5" : "hover:bg-gray-50"
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-[#022d5c] shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-gray-300 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[#022d5c] truncate">{member.full_name}</p>
                              <p className="text-xs text-gray-500 flex items-center gap-1 font-mono">
                                <Phone className="w-3 h-3 text-gray-400" />
                                {member.phone}
                              </p>
                            </div>
                          </div>
                          <span className={cn(
                            "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0",
                            member.status === 'active' ? 'bg-green-100 text-green-800' :
                            member.status === 'visitor' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                          )}>
                            {member.status}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: AI Broadcast Composer */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="border-[#022d5c]/10 shadow-sm bg-white">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold text-[#022d5c] flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-[#D0A348]" />
                    <span>Broadcast Composer</span>
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateAiBroadcast}
                    disabled={isGeneratingAi}
                    className="h-8 text-xs border-[#D0A348] text-[#022d5c] hover:bg-[#D0A348]/10 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className={cn("w-3.5 h-3.5 text-[#D0A348]", isGeneratingAi && "animate-spin")} />
                    <span>{isGeneratingAi ? 'Generating...' : 'AI Compose'}</span>
                  </Button>
                </div>
                <CardDescription className="text-xs text-gray-500">
                  Choose a template preset or write a custom SMS broadcast message.
                </CardDescription>

                {/* Preset Pills */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {BROADCAST_PRESETS.map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => {
                        setBroadcastPreset(preset.id)
                        let msg = preset.prompt
                        if (pastorProfile.church_name) msg = msg.replace('church', pastorProfile.church_name)
                        if (pastorProfile.full_name) msg += ` - ${pastorProfile.full_name}`
                        setBroadcastMessage(msg)
                      }}
                      className={cn(
                        "text-xs px-3 py-1.5 rounded-full transition-all border cursor-pointer",
                        broadcastPreset === preset.id
                          ? "bg-[#D0A348]/20 border-[#D0A348] text-[#8B6A27] font-semibold"
                          : "bg-white border-gray-200 text-gray-600 hover:border-[#D0A348]/50"
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Text Message</Label>
                      <VoiceDictation
                        onTranscript={(text) => setBroadcastMessage(prev => prev ? `${prev} ${text}` : text)}
                        size="sm"
                        placeholderPrompt="Dictate text broadcast"
                      />
                    </div>
                    <span className={cn(
                      "text-xs font-mono font-medium",
                      charCount > 160 ? "text-amber-600 font-bold" : "text-gray-400"
                    )}>
                      {charCount} / 160 characters • {smsSegments} segment{smsSegments > 1 ? 's' : ''}
                    </span>
                  </div>
                  <textarea
                    rows={5}
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    placeholder="Type your church text broadcast here..."
                    className="w-full p-3 text-sm rounded-xl border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-[#022d5c] resize-none font-sans leading-relaxed text-[#1F2937]"
                  />
                </div>

                {/* Live Phone Preview Bubble */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-gray-400 block mb-2">Preview on Phone</span>
                  <div className="bg-blue-600 text-white p-3 rounded-2xl rounded-tr-xs text-sm max-w-sm shadow-xs leading-relaxed">
                    {broadcastMessage ? broadcastMessage : <span className="opacity-50 italic">Your message will appear here...</span>}
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handleSendGroupSms}
                    disabled={selectedMembers.length === 0 || !broadcastMessage.trim()}
                    className="flex-1 bg-[#022d5c] hover:bg-[#022d5c]/90 text-white h-11 rounded-xl flex items-center justify-center gap-2 font-semibold shadow-md shadow-[#022d5c]/10 cursor-pointer"
                  >
                    <Send className="w-4 h-4 text-[#D0A348]" />
                    <span>Open Group Text ({selectedMembers.length} Recipients)</span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleCopyBroadcastMessage}
                    disabled={!broadcastMessage.trim()}
                    className="border-gray-200 hover:bg-gray-50 text-gray-700 h-11 rounded-xl flex items-center gap-2 text-xs font-semibold cursor-pointer"
                  >
                    {copiedType === 'message' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedType === 'message' ? 'Message Copied!' : 'Copy Message'}</span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleCopyPhoneNumbers}
                    disabled={selectedMembers.length === 0}
                    className="border-gray-200 hover:bg-gray-50 text-gray-700 h-11 rounded-xl flex items-center gap-2 text-xs font-semibold cursor-pointer"
                  >
                    {copiedType === 'numbers' ? <Check className="w-4 h-4 text-green-600" /> : <Phone className="w-4 h-4" />}
                    <span>{copiedType === 'numbers' ? 'Numbers Copied!' : 'Copy Numbers'}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Announcement Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-[#022d5c]/10 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 border-b border-[#022d5c]/10 pb-3">
              <h3 className="text-lg font-bold text-[#022d5c]">
                {editingId ? 'Edit Announcement' : 'New Church Announcement'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <Label className="text-xs font-bold text-[#022d5c]">Title</Label>
                <Input
                  required
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Sunday Morning Fellowship Breakfast"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-[#022d5c]">Category</Label>
                <select
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value as AnnouncementCategory })}
                  className="w-full mt-1 border border-gray-300 rounded-md p-2 text-sm text-[#022d5c] focus:outline-hidden focus:ring-1 focus:ring-[#022d5c]"
                >
                  <option value="general">General</option>
                  <option value="event">Event</option>
                  <option value="prayer">Prayer</option>
                  <option value="volunteer">Volunteer</option>
                  <option value="celebration">Celebration</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs font-bold text-[#022d5c]">Content</Label>
                  <VoiceDictation
                    onTranscript={(text) => setFormData(prev => ({ ...prev, content: prev.content ? `${prev.content} ${text}` : text }))}
                    size="sm"
                    placeholderPrompt="Dictate announcement details"
                  />
                </div>
                <textarea
                  required
                  rows={6}
                  value={formData.content}
                  onChange={e => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Enter the full announcement details here..."
                  className="w-full mt-1 border border-gray-300 rounded-md p-2 text-sm text-[#022d5c] focus:outline-hidden focus:ring-1 focus:ring-[#022d5c]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-bold text-[#022d5c]">Display Date</Label>
                  <Input
                    type="date"
                    value={formData.display_date}
                    onChange={e => setFormData({ ...formData, display_date: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-[#022d5c]">Expires At</Label>
                  <Input
                    type="date"
                    value={formData.expires_at}
                    onChange={e => setFormData({ ...formData, expires_at: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-gray-300 text-[#022d5c] focus:ring-[#022d5c]"
                />
                <Label htmlFor="is_active" className="text-sm text-[#022d5c] cursor-pointer">
                  Mark as Active
                </Label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#022d5c]/10">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-[#022d5c] text-white hover:bg-[#022d5c]/90"
                >
                  {editingId ? 'Save Changes' : 'Publish Announcement'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Text Composer Modal (Single Recipient) */}
      <AiTextComposerModal
        isOpen={textComposer.isOpen}
        onClose={() => setTextComposer(prev => ({ ...prev, isOpen: false }))}
        recipientName={textComposer.recipientName}
        recipientPhone={textComposer.recipientPhone}
        defaultCategory={textComposer.defaultCategory}
        defaultCustomPrompt={textComposer.defaultCustomPrompt}
        pastorName={pastorProfile.full_name}
        churchName={pastorProfile.church_name}
      />
    </div>
  )
}

function AnnouncementCard({
  announcement,
  onEdit,
  onDelete,
  onToggleActive,
  onCopy,
  onTextAnnouncement
}: {
  announcement: Announcement
  onEdit: () => void
  onDelete: () => void
  onToggleActive: () => void
  onCopy: () => void
  onTextAnnouncement: () => void
}) {
  return (
    <Card className="border-[#022d5c]/10 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between bg-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className={cn('text-xs font-semibold px-2.5 py-0.5 rounded-full', CATEGORY_COLORS[announcement.category])}>
            {CATEGORY_LABELS[announcement.category]}
          </span>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2 text-[#022d5c] hover:bg-[#D0A348]/20 flex items-center gap-1 text-xs font-medium cursor-pointer" 
              onClick={onTextAnnouncement} 
              title="Send as Text Broadcast"
            >
              <Send className="h-3.5 w-3.5 text-[#D0A348]" />
              <span>Broadcast</span>
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-[#022d5c]/50 hover:text-[#022d5c] cursor-pointer" onClick={onCopy} title="Copy Content">
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-[#022d5c]/50 hover:text-[#022d5c] cursor-pointer" onClick={onEdit} title="Edit">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 cursor-pointer" onClick={onDelete} title="Delete">
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <CardTitle className="text-xl line-clamp-2 text-[#022d5c]">{announcement.title}</CardTitle>
        <CardDescription className="text-xs text-[#022d5c]/60 flex justify-between">
          <span>Displays: {new Date(announcement.display_date).toLocaleDateString()}</span>
          <span>Expires: {new Date(announcement.expires_at).toLocaleDateString()}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-between">
        <div className="text-sm text-[#022d5c]/80 line-clamp-3 mb-4 whitespace-pre-wrap">
          {announcement.content}
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-[#022d5c]/10">
          <span className="text-sm text-[#022d5c]/60">Status</span>
          <Button 
            variant="outline" 
            size="sm" 
            className={cn(
              "h-7 text-xs border-[#022d5c]/20 cursor-pointer", 
              announcement.is_active ? "text-green-600 bg-green-50" : "text-gray-500 bg-gray-50"
            )}
            onClick={onToggleActive}
          >
            {announcement.is_active ? 'Active' : 'Inactive'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
