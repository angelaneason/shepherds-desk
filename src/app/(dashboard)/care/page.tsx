'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Search, Plus, CheckCircle, Trash2, Hospital, Phone, 
  Home, Car, Church, HelpCircle, Mail, Clock, 
  ChevronDown, ChevronUp, AlertCircle, Calendar as CalendarIcon,
  Download, Smartphone, MessageSquare, Upload, Sparkles, Pencil
} from 'lucide-react'
import { downloadVCard, parseVCardText, parseCSVContacts } from '@/lib/vcard'
import { QRCodeSVG } from 'qrcode.react'
import { format, isPast, parseISO, addHours } from 'date-fns'
import AiTextComposerModal from '@/components/care/AiTextComposerModal'
import { VoiceDictation } from '@/components/voice/VoiceDictation'
import {
  type Person, type MemberFilter, type DeleteHistoryMode,
  visiblePeople, sortByName, canText, setArchived, setMemberStar, taskPersonName, skipExistingPeople,
} from '@/lib/people'
import {
  MemberStar, ArchivedTag, DoNotTextTag, UndoToast, type ToastState,
  PersonFormDialog, DeletePersonDialog,
} from '@/components/people/PersonDialogs'

// A person in the pastor's directory (⭐ = church member; no star = contact).
type Member = Person

type CareTask = {
  id: string
  member_id: string | null
  member_name_snapshot?: string | null
  profile_id: string
  task_type: 'visit' | 'hospital' | 'call' | 'ride' | 'deacon_request' | 'other'
  description: string | null
  status: 'pending' | 'in_progress' | 'completed'
  priority: 'low' | 'normal' | 'urgent'
  due_date: string | null
  completed_date: string | null
  notes: string | null
  calendar_event_id: string | null
  prayer_request_id: string | null
  created_at: string
  members?: Member | null
}

type PrayerRequest = {
  id: string
  profile_id: string
  member_id: string | null
  person_name: string
  request: string
  category: 'Health' | 'Family' | 'Financial' | 'Spiritual' | 'Other'
  priority: 'Urgent' | 'Normal'
  status: 'active' | 'answered'
  answered_date: string | null
  answered_note: string | null
  created_at: string
}

// Tabs can be opened directly via /care?tab=people|prayers|follow-ups (sidebar "People" link).
const TAB_FROM_URL: Record<string, string> = { people: 'members', prayers: 'prayers', 'follow-ups': 'follow-ups' }
const URL_FROM_TAB: Record<string, string> = { members: 'people', prayers: 'prayers', 'follow-ups': 'follow-ups' }

export default function CarePage() {
  return (
    <Suspense fallback={null}>
      <CarePageInner />
    </Suspense>
  )
}

function CarePageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState(TAB_FROM_URL[searchParams.get('tab') || ''] || 'follow-ups')
  useEffect(() => {
    const fromUrl = TAB_FROM_URL[searchParams.get('tab') || '']
    if (fromUrl) setActiveTab(fromUrl)
  }, [searchParams])
  const changeTab = (value: string) => {
    setActiveTab(value)
    router.replace(`/care?tab=${URL_FROM_TAB[value] || value}`, { scroll: false })
  }

  const supabase = createClient()
  
  const [members, setMembers] = useState<Member[]>([])
  const [tasks, setTasks] = useState<CareTask[]>([])
  const [prayers, setPrayers] = useState<PrayerRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [userProfileId, setUserProfileId] = useState<string | null>(null)
  
  // Follow-ups filters
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  
  // People filter
  const [memberSearch, setMemberSearch] = useState('')
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null)
  const [memberFilter, setMemberFilter] = useState<MemberFilter>('everyone')
  const [showArchived, setShowArchived] = useState(false)
  const [editingPerson, setEditingPerson] = useState<Member | null>(null)
  const [deletingPerson, setDeletingPerson] = useState<Member | null>(null)
  const [toast, setToast] = useState<ToastState>(null)
  // "Show archived" for the person pickers in the Follow-Up and Prayer forms
  const [taskPickerShowArchived, setTaskPickerShowArchived] = useState(false)
  const [prayerPickerShowArchived, setPrayerPickerShowArchived] = useState(false)

  // Prayer filters
  const [prayerFilter, setPrayerFilter] = useState<'active' | 'answered' | 'all'>('active')
  
  // Dialogs state
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false)
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false)
  const [isAddPrayerOpen, setIsAddPrayerOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [hasNativeContactPicker, setHasNativeContactPicker] = useState(false)
  const [isAnswerDialogOpen, setIsAnswerDialogOpen] = useState<{isOpen: boolean, prayerId: string | null}>({isOpen: false, prayerId: null})
  const [pastorProfile, setPastorProfile] = useState<{ full_name?: string, church_name?: string }>({})
  const [textComposer, setTextComposer] = useState<{
    isOpen: boolean
    recipientName: string
    recipientPhone?: string | null
    recipientMemberId?: string | null
    defaultCategory?: string
    defaultCustomPrompt?: string
  }>({
    isOpen: false,
    recipientName: '',
    recipientPhone: null,
    defaultCategory: 'encouragement',
    defaultCustomPrompt: ''
  })
  
  // Forms state
  const [newTask, setNewTask] = useState<Partial<CareTask>>({ 
    status: 'pending', 
    priority: 'normal',
    task_type: 'call'
  })
  const [newPrayer, setNewPrayer] = useState<Partial<PrayerRequest>>({
    category: 'Other',
    priority: 'Normal',
    status: 'active'
  })
  const [answerNote, setAnswerNote] = useState('')

  useEffect(() => {
    fetchData()
    if (typeof window !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window) {
      setHasNativeContactPicker(true)
    }
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUserProfileId(user.id)
      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name, church_name')
        .eq('id', user.id)
        .single()
      if (prof) setPastorProfile(prof)
    }

    const [membersRes, tasksRes, prayersRes] = await Promise.all([
      supabase.from('members').select('*').order('full_name'),
      supabase.from('care_tasks').select('*, members(*)').order('due_date', { ascending: true }),
      supabase.from('prayer_requests').select('*').order('created_at', { ascending: false })
    ])

    if (membersRes.data) setMembers(membersRes.data as any)
    if (tasksRes.data) setTasks(tasksRes.data as any)
    if (prayersRes.data) setPrayers(prayersRes.data as any)
      
    setLoading(false)
  }

  // ─── People actions ──────────────────────────────────────────────────────
  const replacePerson = (p: Member) =>
    setMembers(prev => sortByName(prev.some(m => m.id === p.id) ? prev.map(m => (m.id === p.id ? p : m)) : [...prev, p]))

  const handlePersonSaved = (p: Member, isNew: boolean) => {
    replacePerson(p)
    // keep embedded task person data fresh
    setTasks(prev => prev.map(t => (t.member_id === p.id ? { ...t, members: p } : t)))
    setToast({ message: isNew ? `${p.full_name} added` : `${p.full_name} updated` })
  }

  const handleToggleStar = async (p: Member) => {
    const next = !p.is_member
    replacePerson({ ...p, is_member: next }) // optimistic
    try {
      const saved = await setMemberStar(supabase, p.id, next)
      replacePerson(saved)
      if (!next) {
        setToast({
          message: `${p.full_name} is no longer marked as a member`,
          onUndo: () => { handleToggleStar({ ...saved }) },
        })
      }
    } catch (err) {
      console.error(err)
      replacePerson(p)
      setToast({ message: 'Could not update. Please try again.' })
    }
  }

  const handleArchiveToggle = async (p: Member) => {
    const archive = !p.archived_at
    try {
      const saved = await setArchived(supabase, p.id, archive)
      replacePerson(saved)
      setToast({
        message: archive ? `${p.full_name} archived` : `${p.full_name} restored`,
        onUndo: () => { handleArchiveToggle(saved) },
      })
    } catch (err) {
      console.error(err)
      setToast({ message: 'Could not update. Please try again.' })
    }
  }

  const handlePersonDeleted = async (personId: string, mode: DeleteHistoryMode) => {
    const name = members.find(m => m.id === personId)?.full_name || 'Person'
    setMembers(prev => prev.filter(m => m.id !== personId))
    if (expandedMemberId === personId) setExpandedMemberId(null)
    // Reload linked history so tasks/prayers reflect the snapshot or removal
    const [tasksRes, prayersRes] = await Promise.all([
      supabase.from('care_tasks').select('*, members(*)').order('due_date', { ascending: true }),
      supabase.from('prayer_requests').select('*').order('created_at', { ascending: false }),
    ])
    if (tasksRes.data) setTasks(tasksRes.data as any)
    if (prayersRes.data) setPrayers(prayersRes.data as any)
    setToast({ message: mode === 'delete_all' ? `${name} and their linked history were deleted` : `${name} deleted; history kept` })
  }

  const contactFileInputRef = useRef<HTMLInputElement>(null)
  const [importingContacts, setImportingContacts] = useState(false)

  const handleImportContactsFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userProfileId) return
    setImportingContacts(true)
    try {
      const text = await file.text()
      let parsed = []
      if (file.name.toLowerCase().endsWith('.vcf') || file.type.includes('vcard')) {
        parsed = parseVCardText(text)
      } else if (file.name.toLowerCase().endsWith('.csv') || file.type.includes('csv')) {
        parsed = parseCSVContacts(text)
      } else {
        parsed = parseVCardText(text)
        if (parsed.length === 0) parsed = parseCSVContacts(text)
      }

      if (parsed.length === 0) {
        alert('Could not find any contacts in this file. Please make sure it is a valid .vcf or .csv file.')
        return
      }

      const rows = parsed.map(c => ({
        profile_id: userProfileId,
        full_name: c.full_name,
        phone: c.phone || null,
        email: c.email || null,
        address: c.address || null,
        notes: c.notes || null,
        source: 'csv_import' as const
      }))

      const { fresh, skipped } = await skipExistingPeople(supabase, rows)
      if (fresh.length === 0) {
        alert(`Everyone in this file is already in People (${skipped} skipped). Nothing new to add.`)
        return
      }

      const { data, error } = await supabase.from('members').insert(fresh).select()
      if (error) throw error

      if (data) {
        setMembers(prev => [...prev, ...(data as any)].sort((a, b) => a.full_name.localeCompare(b.full_name)))
        alert(`Added ${data.length} new ${data.length === 1 ? 'person' : 'people'}.` + (skipped ? ` Skipped ${skipped} already in People.` : ''))
      }
    } catch (err: any) {
      console.error(err)
      alert(`Error importing contacts: ${err.message || 'Failed to parse file'}`)
    } finally {
      setImportingContacts(false)
      if (contactFileInputRef.current) contactFileInputRef.current.value = ''
    }
  }

  const handleNativeContactPicker = async () => {
    if (typeof window !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window) {
      try {
        const props = ['name', 'tel', 'email', 'address']
        const opts = { multiple: true }
        const picked = await (navigator as any).contacts.select(props, opts)
        if (picked && picked.length > 0 && userProfileId) {
          const rows = picked.map((c: any) => ({
            profile_id: userProfileId,
            full_name: Array.isArray(c.name) ? c.name[0] : (c.name || 'Unknown Contact'),
            phone: Array.isArray(c.tel) ? c.tel[0] : (c.tel || null),
            email: Array.isArray(c.email) ? c.email[0] : (c.email || null),
            address: Array.isArray(c.address) ? c.address[0] : (c.address || null),
            source: 'phone_import' as const
          }))
          const { fresh, skipped } = await skipExistingPeople(supabase, rows as { phone: string | null; email: string | null }[])
          if (fresh.length === 0) {
            alert('Everyone you picked is already in People.')
            return
          }
          const { data, error } = await supabase.from('members').insert(fresh).select()
          if (error) throw error
          if (data) {
            setMembers(prev => [...prev, ...(data as any)].sort((a, b) => a.full_name.localeCompare(b.full_name)))
            alert(`Added ${data.length} new ${data.length === 1 ? 'person' : 'people'}.` + (skipped ? ` Skipped ${skipped} already in People.` : ''))
          }
        }
      } catch (err) {
        console.error(err)
      }
    } else {
      contactFileInputRef.current?.click()
    }
  }

  const handleAddTask = async () => {
    if (!newTask.member_id || !userProfileId) return
    
    let calendarEventId = null;

    if (newTask.due_date) {
      const member = members.find(m => m.id === newTask.member_id);
      const title = `Care: ${newTask.task_type} with ${member?.full_name || 'Member'}`;
      
      const eventType = (newTask.task_type === 'visit' || newTask.task_type === 'hospital') ? 'visit' : 'meeting';
      
      const { data: eventData, error: eventError } = await supabase
        .from('calendar_events')
        .insert([{
          profile_id: userProfileId,
          title,
          event_type: eventType,
          description: newTask.description,
          start_time: new Date(newTask.due_date).toISOString(),
          end_time: addHours(new Date(newTask.due_date), 1).toISOString(),
          all_day: false
        }])
        .select()
        
      if (eventData && !eventError) {
        calendarEventId = (eventData as any)[0].id;
      }
    }

    const { data, error } = await supabase
      .from('care_tasks')
      .insert([{ ...newTask, profile_id: userProfileId, calendar_event_id: calendarEventId }])
      .select('*, members(*)')
      
    if (data && !error) {
      if (calendarEventId) {
         await supabase.from('calendar_events').update({ care_task_id: (data as any)[0].id }).eq('id', calendarEventId)
      }
      setTasks([...tasks, (data as any)[0]])
      setIsAddTaskOpen(false)
      setNewTask({ status: 'pending', priority: 'normal', task_type: 'call', prayer_request_id: null })
    }
  }

  const handleAddPrayer = async () => {
    if (!newPrayer.person_name || !newPrayer.request || !userProfileId) return

    const { data, error } = await supabase
      .from('prayer_requests')
      .insert([{
        ...newPrayer,
        category: (newPrayer.category || 'other').toLowerCase(),
        priority: (newPrayer.priority || 'normal').toLowerCase(),
        profile_id: userProfileId,
      } as any])
      .select()

    if (data && !error) {
      setPrayers([(data as any)[0], ...prayers])
      setIsAddPrayerOpen(false)
      setNewPrayer({ category: 'Other', priority: 'Normal', status: 'active' })
    }
  }

  const markTaskComplete = async (id: string, calendar_event_id: string | null) => {
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('care_tasks')
      .update({ status: 'completed', completed_date: now })
      .eq('id', id)
      
    if (!error) {
      setTasks(tasks.map(t => t.id === id ? { ...t, status: 'completed', completed_date: now } : t))
      
      if (calendar_event_id) {
        const { data: ev } = await supabase.from('calendar_events').select('title').eq('id', calendar_event_id).single()
        if (ev && ev.title) {
          await supabase.from('calendar_events').update({ title: `✅ ${ev.title}` }).eq('id', calendar_event_id)
        }
      }
    }
  }

  const markPrayerAnswered = async () => {
    if (!isAnswerDialogOpen.prayerId) return
    const id = isAnswerDialogOpen.prayerId
    const now = new Date().toISOString()

    const { error } = await supabase
      .from('prayer_requests')
      .update({ status: 'answered', answered_date: now, answered_note: answerNote })
      .eq('id', id)

    if (!error) {
      setPrayers(prayers.map(p => p.id === id ? { ...p, status: 'answered', answered_date: now, answered_note: answerNote } : p))
      setIsAnswerDialogOpen({isOpen: false, prayerId: null})
      setAnswerNote('')
    }
  }

  const deleteTask = async (id: string) => {
    const { error } = await supabase
      .from('care_tasks')
      .delete()
      .eq('id', id)
      
    if (!error) {
      setTasks(tasks.filter(t => t.id !== id))
    }
  }

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'hospital': return <Hospital className="w-4 h-4 mr-1" />
      case 'call': return <Phone className="w-4 h-4 mr-1" />
      case 'visit': return <Home className="w-4 h-4 mr-1" />
      case 'ride': return <Car className="w-4 h-4 mr-1" />
      case 'deacon_request': return <Church className="w-4 h-4 mr-1" />
      default: return <HelpCircle className="w-4 h-4 mr-1" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': 
      case 'Urgent': return 'bg-red-500'
      case 'normal': 
      case 'Normal': return 'bg-[#D0A348]' // Gold
      case 'low': return 'bg-gray-400'
      default: return 'bg-gray-400'
    }
  }

  // Sorting tasks: urgent first, then by due date
  const sortedTasks = [...tasks].sort((a, b) => {
    const pVal = { urgent: 0, normal: 1, low: 2 }
    const pA = pVal[a.priority as keyof typeof pVal] ?? 1
    const pB = pVal[b.priority as keyof typeof pVal] ?? 1
    if (pA !== pB) return pA - pB
    
    const dA = a.due_date ? new Date(a.due_date).getTime() : Infinity
    const dB = b.due_date ? new Date(b.due_date).getTime() : Infinity
    return dA - dB
  })

  const filteredTasks = sortedTasks.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    if (typeFilter !== 'all' && t.task_type !== typeFilter) return false
    return true
  })

  const matchesSearch = (m: Member) => m.full_name.toLowerCase().includes(memberSearch.toLowerCase())
  const filteredMembers = visiblePeople(members, { showArchived, filter: memberFilter }).filter(matchesSearch)
  // Archived people matching the search while they are hidden (for the "show" hint)
  const hiddenArchivedMatches = !showArchived && memberSearch.trim()
    ? visiblePeople(members, { showArchived: true, filter: memberFilter }).filter(m => m.archived_at && matchesSearch(m)).length
    : 0
  const memberCount = members.filter(m => m.is_member && !m.archived_at).length
  const peopleCount = members.filter(m => !m.archived_at).length
  const archivedCount = members.filter(m => m.archived_at).length

  // Pickers for new work exclude archived people unless "Show archived" is ticked
  const taskPickerPeople = visiblePeople(members, { showArchived: taskPickerShowArchived })
  const prayerPickerPeople = visiblePeople(members, { showArchived: prayerPickerShowArchived })

  const filteredPrayers = prayers.filter(p => {
    if (prayerFilter === 'all') return true;
    return p.status === prayerFilter;
  })

  const pendingTasks = tasks.filter(t => t.status !== 'completed').length
  const urgentTasks = tasks.filter(t => t.status !== 'completed' && t.priority === 'urgent').length
  const completedThisWeek = tasks.filter(t => {
    if (t.status !== 'completed' || !t.completed_date) return false
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    return new Date(t.completed_date) >= oneWeekAgo
  }).length

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-[#022d5c]">Ministry Care</h1>
      </div>

      <Tabs value={activeTab} onValueChange={changeTab} className="w-full">
        <TabsList className="mb-4 bg-gray-100/80 p-1 flex-wrap h-auto">
          <TabsTrigger value="follow-ups" className="data-[state=active]:bg-white data-[state=active]:text-[#022d5c]">Follow-Ups</TabsTrigger>
          <TabsTrigger value="members" className="data-[state=active]:bg-white data-[state=active]:text-[#022d5c]">People</TabsTrigger>
          <TabsTrigger value="prayers" className="data-[state=active]:bg-white data-[state=active]:text-[#022d5c]">Prayer List</TabsTrigger>
        </TabsList>
        
        <TabsContent value="follow-ups" className="space-y-6">
          {/* Stats Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-[#F8F5EE] border-[#D0A348]/30 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-white rounded-full"><Clock className="w-5 h-5 text-[#D0A348]" /></div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Pending Tasks</p>
                  <p className="text-2xl font-bold text-[#022d5c]">{pendingTasks}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-red-50 border-red-100 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-white rounded-full"><AlertCircle className="w-5 h-5 text-red-500" /></div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Urgent Tasks</p>
                  <p className="text-2xl font-bold text-red-700">{urgentTasks}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-green-50 border-green-100 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-white rounded-full"><CheckCircle className="w-5 h-5 text-green-500" /></div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Completed (7d)</p>
                  <p className="text-2xl font-bold text-green-700">{completedThisWeek}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              <select 
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
              
              <select 
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="visit">Visit</option>
                <option value="hospital">Hospital</option>
                <option value="call">Call</option>
                <option value="ride">Ride</option>
                <option value="deacon_request">Deacon Request</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
              <DialogTrigger>
                <Button className="bg-[#022d5c] text-white hover:bg-[#022d5c]/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Follow-Up
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add Follow-Up Task</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="member">Person</Label>
                      {archivedCount > 0 && (
                        <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={taskPickerShowArchived}
                            onChange={(e) => setTaskPickerShowArchived(e.target.checked)}
                          />
                          Show archived
                        </label>
                      )}
                    </div>
                    <select
                      id="member"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={newTask.member_id || ''}
                      onChange={(e) => setNewTask({...newTask, member_id: e.target.value})}
                    >
                      <option value="" disabled>Select a person...</option>
                      {taskPickerPeople.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.is_member ? '⭐ ' : ''}{m.full_name}{m.archived_at ? ' (archived)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="type">Task Type</Label>
                      <select
                        id="type"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={newTask.task_type}
                        onChange={(e) => setNewTask({...newTask, task_type: e.target.value as CareTask['task_type']})}
                      >
                        <option value="call">Call</option>
                        <option value="visit">Visit</option>
                        <option value="hospital">Hospital</option>
                        <option value="ride">Ride</option>
                        <option value="deacon_request">Deacon Request</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="priority">Priority</Label>
                      <select
                        id="priority"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={newTask.priority}
                        onChange={(e) => setNewTask({...newTask, priority: e.target.value as CareTask['priority']})}
                      >
                        <option value="low">Low</option>
                        <option value="normal">Normal</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="due_date">Due Date</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={newTask.due_date?.split('T')[0] || ''}
                      onChange={(e) => setNewTask({...newTask, due_date: e.target.value})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="desc">Description</Label>
                    <Input
                      id="desc"
                      value={newTask.description || ''}
                      onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                      placeholder="Brief description..."
                    />
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="notes">Notes</Label>
                      <VoiceDictation
                        onTranscript={(text) => setNewTask(prev => ({ ...prev, notes: prev.notes ? `${prev.notes} ${text}` : text }))}
                        size="sm"
                        showLabel
                        label="Dictate Notes"
                        labelActive="Listening..."
                        variant="gold"
                        placeholderPrompt="Dictate care task notes"
                      />
                    </div>
                    <Textarea
                      id="notes"
                      value={newTask.notes || ''}
                      onChange={(e) => setNewTask({...newTask, notes: e.target.value})}
                      placeholder="Additional details..."
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddTaskOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddTask} className="bg-[#022d5c] text-white">Save Task</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {!loading && filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-lg border border-dashed border-gray-300">
              <div className="p-4 bg-[#F8F5EE] rounded-full mb-4">
                <CheckCircle className="w-8 h-8 text-[#D0A348]" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">All caught up!</h3>
              <p className="text-gray-500 text-center">
                There are no care tasks matching your filters.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredTasks.map((task) => {
                const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'completed';
                
                return (
                  <Card key={task.id} className={`overflow-hidden ${task.status === 'completed' ? 'opacity-70 bg-gray-50' : 'bg-white'} border-l-4 ${task.priority === 'urgent' && task.status !== 'completed' ? 'border-l-red-500' : task.priority === 'normal' && task.status !== 'completed' ? 'border-l-[#D0A348]' : 'border-l-gray-300'}`}>
                    <div className="p-5 flex flex-col sm:flex-row gap-4 justify-between items-start">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-lg flex items-center gap-2 flex-wrap">
                              {task.members?.is_member && <MemberStar isMember />}
                              {taskPersonName(task) || (task.notes?.startsWith('Person:') ? task.notes.replace('Person: ', '') : task.description)}
                              <div className={`w-2.5 h-2.5 rounded-full ${getPriorityColor(task.priority)}`} title={`Priority: ${task.priority}`} />
                              {task.members?.archived_at && <ArchivedTag />}
                            </h3>
                            <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                              <Badge variant="outline" className="capitalize flex items-center bg-white">
                                {getTaskIcon(task.task_type)}
                                {task.task_type.replace('_', ' ')}
                              </Badge>
                              {task.due_date && (
                                <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
                                  <Clock className="w-3.5 h-3.5" />
                                  {isOverdue ? 'Overdue: ' : 'Due: '}
                                  {format(parseISO(task.due_date), 'MMM d, yyyy')}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <Badge className={
                            task.status === 'completed' ? 'bg-green-100 text-green-800 border-green-200' :
                            task.status === 'in_progress' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                            'bg-gray-100 text-gray-800 border-gray-200'
                          } variant="outline">
                            {task.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        
                        {task.description && (
                          <p className="text-gray-700">{task.description}</p>
                        )}
                        
                      </div>
                      
                      <div className="flex sm:flex-col gap-2 shrink-0">
                        {(() => {
                          const personName = task.members?.full_name || 
                            task.member_name_snapshot ||
                            (task.notes?.startsWith('Person:') ? task.notes.replace('Person: ', '').trim() : '') || 
                            task.description?.replace(/^(Call|Visit)\s+/i, '').trim() || 
                            'Church Member'

                          // A deleted person's snapshot must never be matched to someone else.
                          const matchedMember = task.members || (task.member_name_snapshot ? undefined : members.find(m => 
                            personName && m.full_name && (
                              m.full_name.toLowerCase() === personName.toLowerCase() ||
                              m.full_name.toLowerCase().includes(personName.toLowerCase()) ||
                              personName.toLowerCase().includes(m.full_name.toLowerCase())
                            )
                          ))

                          if (!task.members && task.member_name_snapshot) return null
                          if (matchedMember?.do_not_text) return <DoNotTextTag />

                          return (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-[#022d5c] border-[#D0A348]/60 bg-[#F8F5EE] hover:bg-[#D0A348]/25 flex items-center gap-1.5 font-semibold shadow-xs"
                              onClick={() => {
                                setTextComposer({
                                  isOpen: true,
                                  recipientName: matchedMember?.full_name || personName,
                                  recipientPhone: matchedMember?.phone || null,
                                  recipientMemberId: matchedMember?.id || null,
                                  defaultCategory: task.task_type === 'hospital' ? 'hospital' : 'prayer_followup',
                                  defaultCustomPrompt: task.description || task.notes || ''
                                })
                              }}
                              title="Write a personal pastoral text"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-[#D0A348]" />
                              Write Text
                            </Button>
                          )
                        })()}
                        {task.status !== 'completed' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-green-600 border-green-200 hover:bg-green-50"
                            onClick={() => markTaskComplete(task.id, task.calendar_event_id)}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Mark Done
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-gray-500 hover:text-red-600"
                          onClick={() => deleteTask(task.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="members" className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="relative flex-1 w-full max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search people..."
                className="pl-9 bg-white"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-start md:justify-end">
              <input
                type="file"
                ref={contactFileInputRef}
                className="hidden"
                accept=".vcf,.csv,text/vcard,text/csv"
                onChange={async (e) => {
                  setIsImportModalOpen(false)
                  await handleImportContactsFile(e)
                }}
              />
              
              <Button
                type="button"
                variant="outline"
                className="border-[#D0A348] text-[#022d5c] hover:bg-[#F8F5EE] text-xs sm:text-sm font-medium"
                onClick={() => setIsImportModalOpen(true)}
                disabled={importingContacts}
                title="Import contacts from your phone via .vcf, .csv or mobile picker"
              >
                <Smartphone className="w-4 h-4 mr-1.5 text-[#D0A348]" />
                {importingContacts ? 'Importing...' : 'Import Phone Contacts'}
              </Button>

              {/* Import Contacts Modal */}
              <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
                <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-[#022d5c] flex items-center gap-2">
                      <Smartphone className="w-5 h-5 text-[#D0A348]" />
                      Import Contacts into Church Directory
                    </DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4 py-2">
                    <p className="text-sm text-gray-600">
                      Easily bring your contacts into your directory—completely free, private, and with no Google API setup required.
                    </p>

                    {/* Recommended: continue in the mobile app (Phase 2 contact import) */}
                    <div className="p-4 bg-[#F8F5EE] border border-[#D0A348]/60 rounded-xl flex flex-col sm:flex-row items-center gap-4">
                      <div className="bg-white p-2 rounded-lg border border-gray-200 shrink-0">
                        <QRCodeSVG value="https://theshepherdsdesk.app/open/import-contacts" size={112} fgColor="#022d5c" />
                      </div>
                      <div className="space-y-1 text-center sm:text-left">
                        <span className="text-xs font-bold uppercase tracking-wider bg-[#022d5c] text-white px-2 py-0.5 rounded">Easiest</span>
                        <p className="text-sm font-bold text-gray-900">Continue on your phone</p>
                        <p className="text-xs text-gray-700">
                          Scan with your phone camera. The Shepherd&apos;s Desk app opens and you can pick people from your contacts. Only the ones you choose are saved.
                        </p>
                      </div>
                    </div>

                    {/* Method 2: Mobile Browser 1-Tap Picker (Only on Android Chrome) */}
                    {hasNativeContactPicker ? (
                      <div className="p-4 bg-amber-50 border border-[#D0A348]/40 rounded-xl space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider bg-[#D0A348] text-white px-2 py-0.5 rounded">Method 2 (1-Tap Mobile)</span>
                          <span className="text-sm font-bold text-gray-900">Direct Phone Picker</span>
                        </div>
                        <p className="text-xs text-gray-700">
                          Your mobile browser supports selecting contacts directly from your phone address book!
                        </p>
                        <Button
                          type="button"
                          onClick={() => {
                            setIsImportModalOpen(false)
                            handleNativeContactPicker()
                          }}
                          className="w-full bg-[#022d5c] text-white hover:bg-[#022d5c]/90 text-sm mt-1"
                        >
                          <Smartphone className="w-4 h-4 mr-2 text-[#D0A348]" />
                          Open Phone Contacts
                        </Button>
                      </div>
                    ) : (
                      <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-lg text-xs text-blue-900 flex items-start gap-2">
                        <Smartphone className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold">Looking for Method 2 (1-Tap Phone Picker)?</span>
                          <p className="mt-0.5 text-blue-800">
                            The 1-tap browser contact picker is a mobile-only feature available when you open <strong>theshepherdsdesk.app/care</strong> on an Android phone using Chrome. On desktop computers (or iPhones), please use the file upload below!
                          </p>
                        </div>
                      </div>
                    )}

                    {/* File Upload Box */}
                    <div 
                      onClick={() => contactFileInputRef.current?.click()}
                      className="p-5 bg-[#F8F5EE] border-2 border-dashed border-[#D0A348]/40 hover:border-[#D0A348] rounded-xl text-center cursor-pointer transition-colors group"
                    >
                      <Upload className="w-8 h-8 text-[#D0A348] mx-auto mb-2 group-hover:scale-110 transition-transform" />
                      <h4 className="font-semibold text-gray-900 text-sm">
                        Upload Contacts File (.vcf or .csv)
                      </h4>
                      <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                        Works with iPhone vCards, Android .vcf exports, Google Contacts, Breeze, Planning Center, and Excel spreadsheets.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-3 bg-white border-[#022d5c] text-[#022d5c] hover:bg-[#022d5c] hover:text-white text-xs font-semibold"
                        onClick={(e) => {
                          e.stopPropagation()
                          contactFileInputRef.current?.click()
                        }}
                      >
                        Choose .vcf or .csv File
                      </Button>
                    </div>

                    {/* Quick Step-by-Step Instructions */}
                    <div className="space-y-2 pt-1">
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-500">How to get your contacts file in 10 seconds:</p>
                      
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs space-y-1">
                        <span className="font-bold text-[#022d5c]">📱 iPhone:</span>
                        <p className="text-gray-600">Open <strong>Contacts</strong> app &rarr; tap <strong>Lists</strong> (top-left) &rarr; touch & hold <strong>All Contacts</strong> &rarr; tap <strong>Export</strong> &rarr; Save to Files or AirDrop/email to this computer.</p>
                      </div>

                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs space-y-1">
                        <span className="font-bold text-[#022d5c]">🤖 Android:</span>
                        <p className="text-gray-600">Open <strong>Contacts</strong> app &rarr; tap <strong>Fix & manage</strong> (or Settings) &rarr; tap <strong>Export to file</strong> (.vcf) &rarr; upload here.</p>
                      </div>

                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs space-y-1">
                        <span className="font-bold text-[#022d5c]">📊 Google Contacts / Church Software:</span>
                        <p className="text-gray-600">Go to contacts.google.com or your church database &rarr; click <strong>Export</strong> &rarr; select <strong>vCard</strong> or <strong>CSV</strong> &rarr; upload here.</p>
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsImportModalOpen(false)}>
                      Cancel
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button
                type="button"
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-50 text-xs sm:text-sm"
                onClick={() => downloadVCard(members, 'church-directory.vcf')}
                disabled={members.length === 0}
                title="Export all members to a universal .vcf file to import into your iPhone or Android contacts with 1 tap"
              >
                <Download className="w-4 h-4 mr-1.5 text-gray-500" />
                Export to Phone (.vcf)
              </Button>

              <Button
                className="bg-[#022d5c] text-white hover:bg-[#022d5c]/90 text-xs sm:text-sm"
                onClick={() => setIsAddMemberOpen(true)}
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Add Person
              </Button>
            </div>
          </div>

          {/* Everyone / ⭐ Members filter + Show archived */}
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Button
              size="sm"
              variant={memberFilter === 'everyone' ? 'default' : 'outline'}
              className={memberFilter === 'everyone' ? 'bg-[#022d5c] text-white' : ''}
              onClick={() => setMemberFilter('everyone')}
            >
              Everyone ({peopleCount})
            </Button>
            <Button
              size="sm"
              variant={memberFilter === 'members' ? 'default' : 'outline'}
              className={memberFilter === 'members' ? 'bg-[#022d5c] text-white' : ''}
              onClick={() => setMemberFilter('members')}
            >
              ⭐ Members ({memberCount})
            </Button>
            {archivedCount > 0 && (
              <label className="flex items-center gap-1.5 ml-1 text-gray-600 cursor-pointer">
                <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
                Show archived ({archivedCount})
              </label>
            )}
          </div>

          {hiddenArchivedMatches > 0 && (
            <button
              type="button"
              className="text-sm text-[#022d5c] underline underline-offset-2"
              onClick={() => setShowArchived(true)}
            >
              {hiddenArchivedMatches} archived {hiddenArchivedMatches === 1 ? 'person matches' : 'people match'} — show
            </button>
          )}

          {!loading && filteredMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-lg border border-dashed border-gray-300">
              <p className="text-gray-500 text-center">
                {members.length === 0
                  ? 'No people yet. Add someone to get started!'
                  : memberFilter === 'members'
                    ? 'No ⭐ members match. Tap the star on a person to mark them as a church member.'
                    : 'No people match your search.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredMembers.map(member => {
                const memberTasks = tasks.filter(t => t.member_id === member.id)
                const pendingCount = memberTasks.filter(t => t.status !== 'completed').length
                
                // Find latest follow up date
                const completedTasks = memberTasks.filter(t => t.status === 'completed' && t.completed_date)
                completedTasks.sort((a, b) => new Date(b.completed_date!).getTime() - new Date(a.completed_date!).getTime())
                const lastFollowUp = completedTasks.length > 0 ? completedTasks[0].completed_date : null
                
                const isExpanded = expandedMemberId === member.id

                return (
                  <Card key={member.id} className="overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
                    <div 
                      className="p-5 cursor-pointer" 
                      onClick={() => setExpandedMemberId(isExpanded ? null : member.id)}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                          <MemberStar isMember={member.is_member} onToggle={() => handleToggleStar(member)} />
                          <h3 className="text-lg font-semibold text-gray-900">{member.full_name}</h3>
                          {member.archived_at && <ArchivedTag />}
                          {member.do_not_text && <DoNotTextTag />}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setEditingPerson(member) }}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-[#022d5c]"
                            title="Edit, archive or delete"
                            aria-label={`Edit ${member.full_name}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2.5 text-sm text-gray-600">
                        {member.phone && (
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-gray-400" />
                              <a href={`tel:${member.phone}`} className="hover:text-[#022d5c] hover:underline font-medium" onClick={(e) => e.stopPropagation()}>{member.phone}</a>
                            </div>
                            <div className="flex items-center gap-2">
                              {canText(member) && (<>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setTextComposer({
                                    isOpen: true,
                                    recipientName: member.full_name,
                                    recipientPhone: member.phone,
                                    recipientMemberId: member.id,
                                    defaultCategory: 'encouragement',
                                    defaultCustomPrompt: member.notes || ''
                                  })
                                }}
                                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-[#022d5c] text-white hover:bg-[#022d5c]/90 font-medium transition-colors shadow-xs"
                                title="Write a personal text"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-[#D0A348]" />
                                Write Text
                              </button>
                              <a
                                href={`sms:${member.phone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-gray-200 text-gray-700 hover:bg-gray-100 font-medium transition-colors"
                                title="Open SMS app directly"
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-gray-500" />
                                SMS
                              </a>
                              </>)}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  downloadVCard([member], `${member.full_name.replace(/\s+/g, '_')}.vcf`)
                                }}
                                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded border border-gray-200 text-gray-700 hover:bg-gray-100 font-medium transition-colors"
                                title="Download .vcf to add to phone contacts"
                              >
                                <Smartphone className="w-3.5 h-3.5 text-gray-500" />
                                Add to Phone
                              </button>
                            </div>
                          </div>
                        )}
                        {member.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <a href={`mailto:${member.email}`} className="hover:text-[#022d5c] hover:underline" onClick={(e) => e.stopPropagation()}>{member.email}</a>
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>Last: {lastFollowUp ? format(parseISO(lastFollowUp), 'MMM d, yyyy') : 'Never'}</span>
                        </div>
                        {pendingCount > 0 && (
                          <Badge className="bg-[#D0A348] text-white border-transparent">
                            {pendingCount} Pending Task{pendingCount !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="px-5 pb-5 pt-2 bg-gray-50 border-t border-gray-100">
                        {member.address && (
                          <div className="mb-3 text-sm">
                            <span className="font-medium text-gray-700 block">Address:</span>
                            <span className="text-gray-600">{member.address}</span>
                          </div>
                        )}
                        {member.notes && (
                          <div className="mb-4 text-sm">
                            <span className="font-medium text-gray-700 block">Notes:</span>
                            <span className="text-gray-600">{member.notes}</span>
                          </div>
                        )}
                        
                        <div>
                          <span className="font-medium text-gray-700 text-sm block mb-2">Care History:</span>
                          {memberTasks.length === 0 ? (
                            <p className="text-sm text-gray-500 italic">No care tasks recorded.</p>
                          ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                              {memberTasks.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(task => (
                                <div key={task.id} className="text-sm p-2 bg-white rounded border border-gray-100 shadow-sm flex justify-between items-center">
                                  <div>
                                    <span className="font-medium capitalize flex items-center gap-1">
                                      {getTaskIcon(task.task_type)}
                                      {task.task_type.replace('_', ' ')}
                                    </span>
                                    <span className="text-gray-500 block text-xs mt-0.5">
                                      {task.due_date ? format(parseISO(task.due_date), 'MMM d, yyyy') : 'No date'}
                                    </span>
                                  </div>
                                  <Badge variant="outline" className="text-xs">
                                    {task.status}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="prayers" className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="flex gap-2">
              <Button 
                variant={prayerFilter === 'active' ? 'default' : 'outline'} 
                className={prayerFilter === 'active' ? 'bg-[#022d5c] text-white' : ''}
                onClick={() => setPrayerFilter('active')}
              >
                Active
              </Button>
              <Button 
                variant={prayerFilter === 'answered' ? 'default' : 'outline'}
                className={prayerFilter === 'answered' ? 'bg-[#022d5c] text-white' : ''}
                onClick={() => setPrayerFilter('answered')}
              >
                Answered
              </Button>
              <Button 
                variant={prayerFilter === 'all' ? 'default' : 'outline'}
                className={prayerFilter === 'all' ? 'bg-[#022d5c] text-white' : ''}
                onClick={() => setPrayerFilter('all')}
              >
                All
              </Button>
            </div>
            
            <Dialog open={isAddPrayerOpen} onOpenChange={setIsAddPrayerOpen}>
              <DialogTrigger>
                <Button className="bg-[#022d5c] text-white hover:bg-[#022d5c]/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Prayer
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add Prayer Request</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="prayer_member">Link to person (optional)</Label>
                      <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5"
                          checked={prayerPickerShowArchived}
                          onChange={(e) => setPrayerPickerShowArchived(e.target.checked)}
                        />
                        Show archived
                      </label>
                    </div>
                    <select
                      id="prayer_member"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={newPrayer.member_id || ''}
                      onChange={(e) => {
                        const picked = members.find(m => m.id === e.target.value)
                        setNewPrayer({
                          ...newPrayer,
                          member_id: picked ? picked.id : null,
                          person_name: picked ? picked.full_name : newPrayer.person_name,
                        })
                      }}
                    >
                      <option value="">— Not linked —</option>
                      {prayerPickerPeople.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.is_member ? '⭐ ' : ''}{m.full_name}{m.archived_at ? ' (archived)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="prayer_person">Person Name *</Label>
                    <Input
                      id="prayer_person"
                      value={newPrayer.person_name || ''}
                      onChange={(e) => setNewPrayer({...newPrayer, person_name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="prayer_request">Request *</Label>
                      <VoiceDictation
                        onTranscript={(text) => setNewPrayer(prev => ({ ...prev, request: prev.request ? `${prev.request} ${text}` : text }))}
                        size="sm"
                        showLabel
                        label="Dictate Prayer"
                        labelActive="Listening..."
                        variant="gold"
                        placeholderPrompt="Dictate prayer request"
                      />
                    </div>
                    <Textarea
                      id="prayer_request"
                      value={newPrayer.request || ''}
                      onChange={(e) => setNewPrayer({...newPrayer, request: e.target.value})}
                      rows={3}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="prayer_category">Category</Label>
                      <select
                        id="prayer_category"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={newPrayer.category}
                        onChange={(e) => setNewPrayer({...newPrayer, category: e.target.value as PrayerRequest['category']})}
                      >
                        <option value="Health">Health</option>
                        <option value="Family">Family</option>
                        <option value="Financial">Financial</option>
                        <option value="Spiritual">Spiritual</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="prayer_priority">Priority</Label>
                      <select
                        id="prayer_priority"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={newPrayer.priority}
                        onChange={(e) => setNewPrayer({...newPrayer, priority: e.target.value as PrayerRequest['priority']})}
                      >
                        <option value="Normal">Normal</option>
                        <option value="Urgent">Urgent</option>
                      </select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddPrayerOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddPrayer} disabled={!newPrayer.person_name || !newPrayer.request} className="bg-[#022d5c] text-white">Save Prayer</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {!loading && filteredPrayers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-lg border border-dashed border-gray-300">
              <p className="text-gray-500 text-center">
                No prayer requests found.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredPrayers.map((prayer) => (
                <Card key={prayer.id} className={`overflow-hidden ${prayer.status === 'answered' ? 'opacity-90 bg-[#F8F5EE]/50' : 'bg-white'} border-l-4 ${String(prayer.priority).toLowerCase() === 'urgent' && prayer.status !== 'answered' ? 'border-l-red-500' : 'border-l-[#D0A348]'}`}>
                  <div className="p-5 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-lg text-gray-900">{prayer.person_name}</h3>
                      <div className="flex gap-2">
                        {prayer.status === 'answered' && (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            🙏 Answered
                          </Badge>
                        )}
                        <Badge variant="outline" className="capitalize">{prayer.category}</Badge>
                      </div>
                    </div>
                    
                    <p className="text-gray-700 whitespace-pre-wrap">{prayer.request}</p>
                    
                    {prayer.status === 'answered' && prayer.answered_note && (
                      <div className="mt-2 p-3 bg-green-50 rounded-md border border-green-100 text-sm">
                        <span className="font-semibold text-green-800 block mb-1">Praise Report:</span>
                        <p className="text-green-700">{prayer.answered_note}</p>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center mt-2 pt-3 border-t border-gray-100 text-sm text-gray-500">
                      <span>Added {format(parseISO(prayer.created_at), 'MMM d, yyyy')}</span>
                      
                      {prayer.status === 'active' && (() => {
                        const matchingMember =
                          (prayer.member_id ? members.find(m => m.id === prayer.member_id) : undefined) ??
                          (!prayer.member_id
                            ? members.find(m =>
                                !m.archived_at && m.full_name && prayer.person_name &&
                                m.full_name.toLowerCase().trim() === prayer.person_name.toLowerCase().trim()
                              )
                            : undefined)
                        return (
                          <div className="flex gap-2 items-center">
                            {matchingMember?.do_not_text && <DoNotTextTag />}
                            {matchingMember && canText(matchingMember) && matchingMember.phone && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 text-[#022d5c] border-[#D0A348]/40 bg-[#F8F5EE] hover:bg-[#D0A348]/20 flex items-center gap-1.5 font-medium"
                                onClick={() => {
                                  setTextComposer({
                                    isOpen: true,
                                    recipientName: matchingMember.full_name,
                                    recipientPhone: matchingMember.phone,
                                    recipientMemberId: matchingMember.id,
                                    defaultCategory: 'prayer_followup',
                                    defaultCustomPrompt: `Praying for: ${prayer.request}`
                                  })
                                }}
                                title="Send encouraging text about this prayer request"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-[#D0A348]" />
                                Write Text
                              </Button>
                            )}
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8"
                              onClick={() => {
                                setNewTask({ ...newTask, description: `Follow up on prayer: ${prayer.request.substring(0, 50)}...`, prayer_request_id: prayer.id })
                                setIsAddTaskOpen(true)
                              }}
                            >
                              Add Follow-Up
                            </Button>
                            <Button 
                              size="sm" 
                              className="bg-green-600 hover:bg-green-700 text-white h-8"
                              onClick={() => setIsAnswerDialogOpen({isOpen: true, prayerId: prayer.id})}
                            >
                              Mark Answered
                            </Button>
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        {/* Answer Prayer Dialog */}
        <Dialog open={isAnswerDialogOpen.isOpen} onOpenChange={(open) => !open && setIsAnswerDialogOpen({isOpen: false, prayerId: null})}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Mark Prayer as Answered 🙏</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="answer_note">Praise Report / Note (Optional)</Label>
                <Textarea
                  id="answer_note"
                  value={answerNote}
                  onChange={(e) => setAnswerNote(e.target.value)}
                  placeholder="How was this prayer answered?..."
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAnswerDialogOpen({isOpen: false, prayerId: null})}>Cancel</Button>
              <Button onClick={markPrayerAnswered} className="bg-green-600 hover:bg-green-700 text-white">Save Praise Report</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Tabs>

      {/* AI Pastoral Text Assistant Modal */}
      <AiTextComposerModal
        isOpen={textComposer.isOpen}
        onClose={() => setTextComposer(prev => ({ ...prev, isOpen: false }))}
        recipientName={textComposer.recipientName}
        recipientPhone={textComposer.recipientPhone}
        recipientMemberId={textComposer.recipientMemberId}
        defaultCategory={textComposer.defaultCategory}
        defaultCustomPrompt={textComposer.defaultCustomPrompt}
        pastorName={pastorProfile.full_name || ''}
        churchName={pastorProfile.church_name || ''}
      />

      {/* People: add / edit / delete */}
      <PersonFormDialog
        open={isAddMemberOpen}
        onOpenChange={setIsAddMemberOpen}
        profileId={userProfileId}
        onSaved={handlePersonSaved}
      />
      <PersonFormDialog
        open={!!editingPerson}
        onOpenChange={(open) => { if (!open) setEditingPerson(null) }}
        person={editingPerson}
        profileId={userProfileId}
        onSaved={handlePersonSaved}
        onArchiveToggle={(p) => { setEditingPerson(null); handleArchiveToggle(p) }}
        onDeleteRequest={(p) => { setEditingPerson(null); setDeletingPerson(p) }}
      />
      <DeletePersonDialog
        person={deletingPerson}
        onClose={() => setDeletingPerson(null)}
        onArchiveInstead={(p) => { setDeletingPerson(null); handleArchiveToggle(p) }}
        onDeleted={handlePersonDeleted}
      />
      <UndoToast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}
