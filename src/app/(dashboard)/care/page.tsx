'use client'

import { useState, useEffect } from 'react'
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
  ChevronDown, ChevronUp, AlertCircle
} from 'lucide-react'
import { format, isPast, parseISO } from 'date-fns'

type Member = {
  id: string
  profile_id: string
  full_name: string
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  status: 'active' | 'inactive' | 'visitor'
  created_at: string
}

type CareTask = {
  id: string
  member_id: string
  profile_id: string
  task_type: 'visit' | 'hospital' | 'call' | 'ride' | 'deacon_request' | 'other'
  description: string | null
  status: 'pending' | 'in_progress' | 'completed'
  priority: 'low' | 'normal' | 'urgent'
  due_date: string | null
  completed_date: string | null
  notes: string | null
  created_at: string
  members?: Member
}

export default function CarePage() {
  const supabase = createClient()
  
  const [members, setMembers] = useState<Member[]>([])
  const [tasks, setTasks] = useState<CareTask[]>([])
  const [loading, setLoading] = useState(true)
  const [userProfileId, setUserProfileId] = useState<string | null>(null)
  
  // Follow-ups filters
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  
  // Members filter
  const [memberSearch, setMemberSearch] = useState('')
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null)
  
  // Dialogs state
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false)
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false)
  
  // Forms state
  const [newMember, setNewMember] = useState<Partial<Member>>({ status: 'active' })
  const [newTask, setNewTask] = useState<Partial<CareTask>>({ 
    status: 'pending', 
    priority: 'normal',
    task_type: 'call'
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUserProfileId(user.id)
    }

    const [membersRes, tasksRes] = await Promise.all([
      supabase.from('members').select('*').order('full_name'),
      supabase.from('care_tasks').select('*, members(*)').order('due_date', { ascending: true })
    ])

    if (membersRes.data) setMembers(membersRes.data)
    if (tasksRes.data) setTasks(tasksRes.data)
      
    setLoading(false)
  }

  const handleAddMember = async () => {
    if (!newMember.full_name || !userProfileId) return
    
    const { data, error } = await supabase
      .from('members')
      .insert([{ ...newMember, profile_id: userProfileId }])
      .select()
      
    if (data && !error) {
      setMembers([...members, data[0]].sort((a, b) => a.full_name.localeCompare(b.full_name)))
      setIsAddMemberOpen(false)
      setNewMember({ status: 'active' })
    }
  }

  const handleAddTask = async () => {
    if (!newTask.member_id || !userProfileId) return
    
    const { data, error } = await supabase
      .from('care_tasks')
      .insert([{ ...newTask, profile_id: userProfileId }])
      .select('*, members(*)')
      
    if (data && !error) {
      setTasks([...tasks, data[0]])
      setIsAddTaskOpen(false)
      setNewTask({ status: 'pending', priority: 'normal', task_type: 'call' })
    }
  }

  const markTaskComplete = async (id: string) => {
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('care_tasks')
      .update({ status: 'completed', completed_date: now })
      .eq('id', id)
      
    if (!error) {
      setTasks(tasks.map(t => t.id === id ? { ...t, status: 'completed', completed_date: now } : t))
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
      case 'urgent': return 'bg-red-500'
      case 'normal': return 'bg-[#D0A348]' // Gold
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

  const filteredMembers = members.filter(m => 
    m.full_name.toLowerCase().includes(memberSearch.toLowerCase())
  )

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
        <h1 className="text-2xl font-bold text-[#022d5c]">Pastoral Care</h1>
      </div>

      <Tabs defaultValue="follow-ups" className="w-full">
        <TabsList className="mb-4 bg-gray-100/80 p-1">
          <TabsTrigger value="follow-ups" className="data-[state=active]:bg-white data-[state=active]:text-[#022d5c]">Follow-Ups</TabsTrigger>
          <TabsTrigger value="members" className="data-[state=active]:bg-white data-[state=active]:text-[#022d5c]">Members</TabsTrigger>
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
                    <Label htmlFor="member">Member</Label>
                    <select
                      id="member"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={newTask.member_id || ''}
                      onChange={(e) => setNewTask({...newTask, member_id: e.target.value})}
                    >
                      <option value="" disabled>Select a member...</option>
                      {members.map(m => (
                        <option key={m.id} value={m.id}>{m.full_name}</option>
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
                    <Label htmlFor="notes">Notes</Label>
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
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                              {task.members?.full_name || 'Unknown Member'}
                              <div className={`w-2.5 h-2.5 rounded-full ${getPriorityColor(task.priority)}`} title={`Priority: ${task.priority}`} />
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
                        {task.status !== 'completed' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-green-600 border-green-200 hover:bg-green-50"
                            onClick={() => markTaskComplete(task.id)}
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
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search members..."
                className="pl-9"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
              />
            </div>
            
            <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
              <DialogTrigger>
                <Button className="bg-[#022d5c] text-white hover:bg-[#022d5c]/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Member
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add New Member</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={newMember.full_name || ''}
                      onChange={(e) => setNewMember({...newMember, full_name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={newMember.phone || ''}
                        onChange={(e) => setNewMember({...newMember, phone: e.target.value})}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="status">Status</Label>
                      <select
                        id="status"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={newMember.status}
                        onChange={(e) => setNewMember({...newMember, status: e.target.value as Member['status']})}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="visitor">Visitor</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newMember.email || ''}
                      onChange={(e) => setNewMember({...newMember, email: e.target.value})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={newMember.address || ''}
                      onChange={(e) => setNewMember({...newMember, address: e.target.value})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="member_notes">Notes</Label>
                    <Textarea
                      id="member_notes"
                      value={newMember.notes || ''}
                      onChange={(e) => setNewMember({...newMember, notes: e.target.value})}
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddMemberOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddMember} disabled={!newMember.full_name} className="bg-[#022d5c] text-white">Save Member</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {!loading && filteredMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-lg border border-dashed border-gray-300">
              <p className="text-gray-500 text-center">
                No members found. Add some to get started!
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
                        <h3 className="text-lg font-semibold text-gray-900">{member.full_name}</h3>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={
                            member.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' :
                            member.status === 'visitor' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            'bg-gray-50 text-gray-700 border-gray-200'
                          }>
                            {member.status}
                          </Badge>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2 text-sm text-gray-600">
                        {member.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <a href={`tel:${member.phone}`} className="hover:text-[#022d5c] hover:underline" onClick={(e) => e.stopPropagation()}>{member.phone}</a>
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
      </Tabs>
    </div>
  )
}
