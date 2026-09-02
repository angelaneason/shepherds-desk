'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Copy, Pencil, Trash, Megaphone, PartyPopper, Heart, HandHeart, Zap, ChevronDown, ChevronUp, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'

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

const getTodayDateString = () => {
  const d = new Date()
  return d.toISOString().split('T')[0]
}

const getNextMonthDateString = () => {
  const d = new Date()
  d.setMonth(d.getMonth() + 1)
  return d.toISOString().split('T')[0]
}

export default function AnnouncementsPage() {
  const supabase = createClient()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [showInactive, setShowInactive] = useState(false)
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
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

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  const fetchAnnouncements = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false }) as any

    if (error) {
      console.error('Error fetching announcements:', error)
    } else {
      setAnnouncements(data || [])
    }
    setLoading(false)
  }

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

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (editingId) {
      const { error } = await supabase
        .from('announcements')
        .update({
          title: formData.title,
          content: formData.content,
          category: formData.category,
          display_date: formData.display_date,
          expires_at: formData.expires_at,
          is_active: formData.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingId)
      
      if (error) {
        console.error('Error updating announcement:', error)
      }
    } else {
      const { error } = await supabase
        .from('announcements')
        .insert({
          profile_id: user.id,
          title: formData.title,
          content: formData.content,
          category: formData.category,
          display_date: formData.display_date,
          expires_at: formData.expires_at,
          is_active: formData.is_active
        })

      if (error) {
        console.error('Error creating announcement:', error)
      }
    }

    setIsModalOpen(false)
    fetchAnnouncements()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return

    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting announcement:', error)
    } else {
      fetchAnnouncements()
    }
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('announcements')
      .update({ is_active: !currentStatus })
      .eq('id', id)

    if (error) {
      console.error('Error toggling status:', error)
    } else {
      fetchAnnouncements()
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Copied to clipboard!')
    })
  }

  const activeAnnouncements = announcements.filter(a => a.is_active)
  const inactiveAnnouncements = announcements.filter(a => !a.is_active)

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-8 bg-[#F8F5EE] min-h-screen text-[#022d5c]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-playfair font-bold text-[#022d5c]">Announcements</h1>
          <p className="text-[#022d5c]/70 mt-1">Create and manage your church announcements.</p>
        </div>
        <Button onClick={() => openModalForNew()} className="bg-[#022d5c] text-[#F8F5EE] hover:bg-[#022d5c]/90">
          <Plus className="w-4 h-4 mr-2" />
          Create Custom
        </Button>
      </div>

      {/* Templates */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Quick Start Templates</h2>
        <div className="flex overflow-x-auto pb-4 gap-3 snap-x">
          {TEMPLATES.map((template) => {
            const Icon = template.icon
            return (
              <Button
                key={template.id}
                variant="outline"
                className="flex-shrink-0 flex items-center gap-2 border-[#D0A348] text-[#022d5c] hover:bg-[#D0A348]/10 snap-start"
                onClick={() => openModalForNew(template)}
              >
                <Icon className="w-4 h-4 text-[#D0A348]" />
                {template.label}
              </Button>
            )
          })}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#022d5c]/50">Loading announcements...</div>
      ) : (
        <div className="space-y-6">
          {activeAnnouncements.length === 0 ? (
            <Card className="border-dashed bg-transparent border-[#022d5c]/20">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Megaphone className="w-12 h-12 text-[#022d5c]/20 mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Active Announcements</h3>
                <p className="text-[#022d5c]/60 max-w-md">
                  You don't have any active announcements right now. Use one of the templates above or create a new one to get started.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeAnnouncements.map(announcement => (
                <AnnouncementCard 
                  key={announcement.id} 
                  announcement={announcement} 
                  onEdit={() => openModalForEdit(announcement)}
                  onDelete={() => handleDelete(announcement.id)}
                  onToggleActive={() => handleToggleActive(announcement.id, announcement.is_active)}
                  onCopy={() => copyToClipboard(`${announcement.title}\n\n${announcement.content}`)}
                />
              ))}
            </div>
          )}

          {inactiveAnnouncements.length > 0 && (
            <div className="pt-6 border-t border-[#022d5c]/10">
              <Button 
                variant="ghost" 
                className="flex items-center gap-2 text-[#022d5c]/70 hover:text-[#022d5c] hover:bg-transparent px-0"
                onClick={() => setShowInactive(!showInactive)}
              >
                {showInactive ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {showInactive ? 'Hide' : 'Show'} Inactive & Expired Announcements ({inactiveAnnouncements.length})
              </Button>
              
              {showInactive && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 opacity-70">
                  {inactiveAnnouncements.map(announcement => (
                    <AnnouncementCard 
                      key={announcement.id} 
                      announcement={announcement} 
                      onEdit={() => openModalForEdit(announcement)}
                      onDelete={() => handleDelete(announcement.id)}
                      onToggleActive={() => handleToggleActive(announcement.id, announcement.is_active)}
                      onCopy={() => copyToClipboard(`${announcement.title}\n\n${announcement.content}`)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Custom Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="bg-[#F8F5EE] rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col my-auto border border-[#022d5c]/10">
            <div className="flex justify-between items-center p-6 border-b border-[#022d5c]/10">
              <h2 className="text-2xl font-playfair font-bold text-[#022d5c]">
                {editingId ? 'Edit Announcement' : 'Create Announcement'}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)}>
                <X className="w-5 h-5 text-[#022d5c]" />
              </Button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-[#022d5c]">Title</Label>
                <Input 
                  id="title" 
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="bg-white border-[#022d5c]/20 focus-visible:ring-[#022d5c]"
                  placeholder="e.g. Sunday Service Time Change"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category" className="text-[#022d5c]">Category</Label>
                <select 
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value as AnnouncementCategory})}
                  className="flex h-10 w-full rounded-md border border-[#022d5c]/20 bg-white px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#022d5c] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="general">General</option>
                  <option value="event">Event</option>
                  <option value="prayer">Prayer Request</option>
                  <option value="volunteer">Volunteer Call</option>
                  <option value="celebration">Celebration</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content" className="text-[#022d5c]">Content</Label>
                <textarea 
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  className="flex min-h-[150px] w-full rounded-md border border-[#022d5c]/20 bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#022d5c] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Write your announcement content here..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="display_date" className="text-[#022d5c]">Display Date</Label>
                  <Input 
                    id="display_date" 
                    type="date"
                    value={formData.display_date}
                    onChange={(e) => setFormData({...formData, display_date: e.target.value})}
                    className="bg-white border-[#022d5c]/20 focus-visible:ring-[#022d5c]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expires_at" className="text-[#022d5c]">Expiry Date</Label>
                  <Input 
                    id="expires_at" 
                    type="date"
                    value={formData.expires_at}
                    onChange={(e) => setFormData({...formData, expires_at: e.target.value})}
                    className="bg-white border-[#022d5c]/20 focus-visible:ring-[#022d5c]"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  className="h-4 w-4 rounded border-[#022d5c]/20 text-[#022d5c] focus:ring-[#022d5c]"
                />
                <Label htmlFor="is_active" className="text-[#022d5c] cursor-pointer">
                  Active (visible to church members)
                </Label>
              </div>
            </div>

            <div className="p-6 border-t border-[#022d5c]/10 flex justify-end gap-3 bg-white/50">
              <Button variant="outline" onClick={() => setIsModalOpen(false)} className="border-[#022d5c]/20 text-[#022d5c]">
                Cancel
              </Button>
              <Button onClick={handleSave} className="bg-[#022d5c] text-[#F8F5EE] hover:bg-[#022d5c]/90">
                {editingId ? 'Update Announcement' : 'Save Announcement'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AnnouncementCard({ 
  announcement, 
  onEdit, 
  onDelete, 
  onToggleActive,
  onCopy 
}: { 
  announcement: Announcement
  onEdit: () => void
  onDelete: () => void
  onToggleActive: () => void
  onCopy: () => void
}) {
  return (
    <Card className="flex flex-col bg-white border-[#022d5c]/10 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start mb-2">
          <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold", CATEGORY_COLORS[announcement.category])}>
            {CATEGORY_LABELS[announcement.category]}
          </span>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-[#022d5c]/50 hover:text-[#022d5c]" onClick={onCopy} title="Copy Content">
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-[#022d5c]/50 hover:text-[#022d5c]" onClick={onEdit} title="Edit">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={onDelete} title="Delete">
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
              "h-7 text-xs border-[#022d5c]/20", 
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
