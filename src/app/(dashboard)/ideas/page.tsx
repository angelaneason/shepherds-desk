'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { Idea } from '@/types/database'
import { formatDistanceToNow } from 'date-fns'
import { EyeOff, ArrowUpRight, Trash2, Lightbulb, Search, Loader2, Camera } from 'lucide-react'
import { VoiceDictation } from '@/components/voice/VoiceDictation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { PhotoCapture } from '@/components/capture/PhotoCapture'

const QUICK_TYPES = [
  { label: 'Sermon Idea', emoji: '💡', color: 'bg-[#D0A348] text-white', prefix: '[Sermon Idea]' },
  { label: 'Scripture', emoji: '📖', color: 'bg-blue-500 text-white', prefix: '[Scripture]' },
  { label: 'Quote', emoji: '💬', color: 'bg-purple-500 text-white', prefix: '[Quote]' },
  { label: 'Reminder', emoji: '📝', color: 'bg-green-500 text-white', prefix: '[Reminder]' },
  { label: 'Prayer', emoji: '🙏', color: 'bg-[#022d5c] text-white', prefix: '[Prayer]' },
]

export default function IdeasPage() {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [content, setContent] = useState('')
  const [search, setSearch] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [isCaptureOpen, setIsCaptureOpen] = useState(false)
  const [promoteIdea, setPromoteIdea] = useState<Idea | null>(null)
  const [promoteTitle, setPromoteTitle] = useState('New Sermon from Idea')
  const [promoteDate, setPromoteDate] = useState('')
  const [promoteLocation, setPromoteLocation] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const fetchIdeas = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let query = supabase
        .from('ideas')
        .select('*')
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false })

      if (!showArchived) {
        query = query.eq('archived', false)
      }

      const { data } = await query
      setIdeas(data || [])
    } catch (error) {
      console.error('Error fetching ideas:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIdeas()
  }, [showArchived])

  const handleSave = async (customContent?: string, sourceType: 'typed' | 'photo' = 'typed', ocrText?: string) => {
    const textToSave = customContent || content
    if (!textToSave.trim()) return

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('ideas')
        .insert({
          profile_id: user.id,
          content: textToSave.trim(),
          source_type: sourceType,
          ocr_text: ocrText,
          archived: false
        })
        .select()
        .single()

      if (error) throw error

      if (data) {
        setIdeas([data, ...ideas])
        if (!customContent) {
          setContent('')
        }
      }
    } catch (error) {
      console.error('Error saving idea:', error)
    } finally {
      setSaving(false)
    }
  }

  const handlePhotoCaptured = (text: string) => {
    const prefixedText = `[Photo] ${text}`
    handleSave(prefixedText, 'photo', text)
  }

  const handleArchive = async (id: string, isArchived: boolean) => {
    try {
      await supabase
        .from('ideas')
        .update({ archived: !isArchived })
        .eq('id', id)
      
      setIdeas(ideas.map(idea => idea.id === id ? { ...idea, archived: !isArchived } : idea))
    } catch (error) {
      console.error('Error archiving idea:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this idea?')) return

    try {
      await supabase
        .from('ideas')
        .delete()
        .eq('id', id)
      
      setIdeas(ideas.filter(idea => idea.id !== id))
    } catch (error) {
      console.error('Error deleting idea:', error)
    }
  }

  const handlePromote = (idea: Idea) => {
    setPromoteIdea(idea)
    setPromoteTitle('New Sermon from Idea')
    setPromoteDate('')
    setPromoteLocation('')
  }

  const executePromote = async () => {
    if (!promoteIdea) return
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Create new sermon
      const { data: sermon, error: sermonError } = await supabase
        .from('sermons')
        .insert({
          author_id: user.id,
          title: promoteTitle,
          content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: promoteIdea.content }] }] },
          status: 'draft'
        })
        .select()
        .single() as any

      if (sermonError) throw sermonError

      // Update idea
      await supabase
        .from('ideas')
        .update({ promoted_to_sermon: sermon.id, archived: true })
        .eq('id', promoteIdea.id)

      if (promoteDate) {
        await supabase.from('calendar_events').insert({
          profile_id: user.id,
          sermon_id: sermon.id,
          title: `Preach: ${promoteTitle}`,
          event_type: 'sermon_preach',
          start_time: new Date(promoteDate).toISOString(),
          end_time: new Date(new Date(promoteDate).getTime() + 60*60*1000).toISOString(),
          location: promoteLocation,
          all_day: false
        })
      }

      router.push(`/sermons/${sermon.id}`)
    } catch (error) {
      console.error('Error promoting idea:', error)
    } finally {
      setSaving(false)
      setPromoteIdea(null)
    }
  }

  const appendPrefix = (prefix: string) => {
    if (!content.includes(prefix)) {
      setContent(prev => prev ? `${prefix} ${prev}` : `${prefix} `)
    }
  }

  const getPrefixInfo = (text: string) => {
    if (text.startsWith('[Photo]')) {
      return { label: 'Photo Note', emoji: '📷', color: 'bg-[#D0A348] text-white', prefix: '[Photo]' }
    }
    for (const type of QUICK_TYPES) {
      if (text.startsWith(type.prefix)) {
        return type
      }
    }
    return null
  }

  const filteredIdeas = ideas.filter(idea => 
    idea.content.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <PhotoCapture 
        isOpen={isCaptureOpen} 
        onClose={() => setIsCaptureOpen(false)} 
        onTextCaptured={handlePhotoCaptured} 
      />
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Ideas Inbox</h1>
      </div>

      <Card className="p-4 shadow-sm border-[#D0A348]/20">
        <div className="flex gap-4">
          <Textarea 
            placeholder="What's on your heart? Jot it down..." 
            className="min-h-[120px] text-lg resize-none border-none focus-visible:ring-0 p-2 flex-1"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="pt-2">
            <VoiceDictation 
              onTranscript={(text) => setContent(prev => prev ? `${prev} ${text}` : text)} 
            />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-4 gap-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full text-xs bg-[#D0A348] text-white border-none hover:bg-[#D0A348]/90 hover:text-white"
              onClick={() => setIsCaptureOpen(true)}
            >
              <Camera className="w-3 h-3 mr-1" /> Snap Notes
            </Button>
            {QUICK_TYPES.map(type => (
              <Button 
                key={type.label} 
                variant="outline" 
                size="sm"
                className="rounded-full text-xs"
                onClick={() => appendPrefix(type.prefix)}
              >
                {type.emoji} {type.label}
              </Button>
            ))}
          </div>
          <Button 
            onClick={() => handleSave()} 
            disabled={!content.trim() || saving}
            className="bg-[#D0A348] hover:bg-[#D0A348]/90 text-white w-full sm:w-auto"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Save Idea'}
          </Button>
        </div>
      </Card>

      <div className="flex flex-col sm:flex-row justify-between gap-4 items-center">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input 
            placeholder="Search ideas..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button 
          variant="ghost" 
          onClick={() => setShowArchived(!showArchived)}
          className="text-gray-500"
        >
          {showArchived ? 'Hide Archived' : 'Show Archived'}
        </Button>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#022d5c]" />
          </div>
        ) : filteredIdeas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-lg border border-dashed border-gray-300">
            <Lightbulb className="h-12 w-12 text-[#D0A348] mb-4 opacity-50" />
            <p className="text-gray-500 mb-4 text-center max-w-sm">
              {search 
                ? "No ideas match your search." 
                : "Your inbox is clear! Ideas will appear here as you capture them throughout your week."}
            </p>
          </div>
        ) : (
          filteredIdeas.map(idea => {
            const typeInfo = getPrefixInfo(idea.content)
            const displayContent = typeInfo ? idea.content.replace(typeInfo.prefix, '').trim() : idea.content

            return (
              <Card key={idea.id} className={`p-5 transition-all ${idea.archived ? 'opacity-60 bg-gray-50' : 'bg-white'}`}>
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      {typeInfo && (
                        <Badge className={typeInfo.color} variant="secondary">
                          {typeInfo.label}
                        </Badge>
                      )}
                      <span className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(idea.created_at), { addSuffix: true })}
                      </span>
                      {idea.promoted_to_sermon && (
                        <Badge variant="outline" className="text-xs border-[#D0A348] text-[#D0A348]">
                          Promoted
                        </Badge>
                      )}
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{displayContent}</p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handlePromote(idea)}
                      title="Promote to Sermon"
                      className="text-[#022d5c] hover:text-[#022d5c] hover:bg-[#022d5c]/10"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleArchive(idea.id, idea.archived)}
                      title={idea.archived ? "Unarchive" : "Archive"}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <EyeOff className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(idea.id)}
                      title="Delete"
                      className="text-red-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })
        )}
      </div>

      <Dialog open={!!promoteIdea} onOpenChange={(open) => !open && setPromoteIdea(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Promote to Sermon</DialogTitle>
            <DialogDescription>
              Create a new sermon from this idea. Optionally schedule it on your calendar.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Sermon Title</Label>
              <Input 
                value={promoteTitle}
                onChange={(e) => setPromoteTitle(e.target.value)}
                placeholder="New Sermon from Idea"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Preach Date & Time (Optional)</Label>
              <Input 
                type="datetime-local"
                value={promoteDate}
                onChange={(e) => setPromoteDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Location (Optional)</Label>
              <Input 
                value={promoteLocation}
                onChange={(e) => setPromoteLocation(e.target.value)}
                placeholder="e.g. Main Sanctuary"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPromoteIdea(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={executePromote} disabled={saving} className="bg-[#D0A348] hover:bg-[#D0A348]/90 text-white">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Create Sermon
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
