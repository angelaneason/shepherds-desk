'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, Search, Languages, Lightbulb, BookMarked, Loader2, Send, FileText, PlusCircle, ChevronDown, Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface DraftSermon {
  id: string
  title: string
  status: string
}

const TOOLS = [
  { id: 'scripture_explorer', label: 'Scripture Explorer', icon: BookOpen, placeholder: 'Enter a passage (e.g. John 3:16-21, Romans 8:28-39)', color: 'text-blue-600 bg-blue-50' },
  { id: 'topic_research', label: 'Topic Research', icon: Search, placeholder: 'Enter a topic (e.g. grace, suffering, forgiveness, prayer)', color: 'text-purple-600 bg-purple-50' },
  { id: 'word_study', label: 'Word Study', icon: Languages, placeholder: 'Enter a word (e.g. agape, shalom, justification, covenant)', color: 'text-emerald-600 bg-emerald-50' },
  { id: 'Illustrations', label: 'Illustration Finder', icon: Lightbulb, placeholder: 'Enter a scripture or theme (e.g. "prodigal son" or "God\'s faithfulness")', color: 'text-amber-600 bg-amber-50' },
  { id: 'commentary_notes', label: 'Commentary Notes', icon: BookMarked, placeholder: 'Enter a passage (e.g. Ephesians 2:1-10, Genesis 22:1-19)', color: 'text-rose-600 bg-rose-50' },
]

export default function StudyTools() {
  const supabase = createClient()
  const router = useRouter()

  const [activeTool, setActiveTool] = useState(TOOLS[0].id)
  const [input, setInput] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [draftSermons, setDraftSermons] = useState<DraftSermon[]>([])
  const [showSermonDropdown, setShowSermonDropdown] = useState(false)
  const [sendingTo, setSendingTo] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState<string | null>(null) // 'sermon' | 'idea' | 'new'

  // Fetch draft sermons for "Add to Sermon" dropdown
  useEffect(() => {
    async function fetchDrafts() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('sermons')
        .select('id, title, status')
        .eq('author_id', user.id)
        .in('status', ['draft', 'review'])
        .order('updated_at', { ascending: false })
        .limit(20) as any
      if (data) setDraftSermons(data)
    }
    fetchDrafts()
  }, [])

  const currentTool = TOOLS.find(t => t.id === activeTool)!

  const handleGenerate = async () => {
    if (!input.trim()) return
    setLoading(true)
    setResult('')
    setSaved(null)

    try {
      const toolId = activeTool === 'Illustrations' ? 'illustration_finder' : activeTool
      const res = await fetch('/api/study/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: toolId, input: input.trim() })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate')
      setResult(data.text || '')
    } catch (err: any) {
      setResult(`Error: ${err.message}`)
    }
    setLoading(false)
  }

  const handleAddToSermon = async (sermonId: string) => {
    setSendingTo(sermonId)
    try {
      const { data: sermon } = await supabase
        .from('sermons')
        .select('content')
        .eq('id', sermonId)
        .single() as any

      // Build the note nodes to append
      const toolLabel = currentTool.label
      const noteNodes = [
        { type: 'horizontalRule' },
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: `📝 Study Notes: ${toolLabel}` }] },
        { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'italic' }], text: `Input: ${input}` }] },
      ]

      // Split result into paragraphs and add as nodes
      const paragraphs = result.split('\n').filter(line => line.trim())
      for (const para of paragraphs) {
        if (para.startsWith('## ')) {
          noteNodes.push({ type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: para.replace('## ', '') }] } as any)
        } else if (para.startsWith('### ')) {
          noteNodes.push({ type: 'heading', attrs: { level: 4 }, content: [{ type: 'text', text: para.replace('### ', '') }] } as any)
        } else {
          noteNodes.push({ type: 'paragraph', content: [{ type: 'text', text: para }] } as any)
        }
      }

      // Append to existing content
      let currentContent = sermon?.content || { type: 'doc', content: [] }
      if (typeof currentContent === 'string') {
        try { currentContent = JSON.parse(currentContent) } catch { currentContent = { type: 'doc', content: [] } }
      }
      if (!currentContent.content) currentContent.content = []
      currentContent.content.push(...noteNodes)

      const { error } = await supabase
        .from('sermons')
        .update({ content: currentContent, updated_at: new Date().toISOString() })
        .eq('id', sermonId) as any

      if (error) throw error
      setSaved('sermon')
      setShowSermonDropdown(false)
    } catch (err: any) {
      alert('Error adding to sermon: ' + err.message)
    }
    setSendingTo(null)
  }

  const handleNewSermon = async () => {
    setSendingTo('new')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      const toolLabel = currentTool.label
      const contentNodes: any[] = [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: `Study Notes: ${toolLabel}` }] },
        { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'italic' }], text: `Source: ${input}` }] },
        { type: 'horizontalRule' },
      ]

      const paragraphs = result.split('\n').filter(line => line.trim())
      for (const para of paragraphs) {
        if (para.startsWith('## ')) {
          contentNodes.push({ type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: para.replace('## ', '') }] })
        } else if (para.startsWith('### ')) {
          contentNodes.push({ type: 'heading', attrs: { level: 4 }, content: [{ type: 'text', text: para.replace('### ', '') }] })
        } else {
          contentNodes.push({ type: 'paragraph', content: [{ type: 'text', text: para }] })
        }
      }

      const { data: newSermon, error } = await supabase
        .from('sermons')
        .insert({
          author_id: user.id,
          title: `${toolLabel}: ${input.substring(0, 50)}`,
          status: 'draft',
          content: { type: 'doc', content: contentNodes },
          scripture_primary: activeTool === 'scripture_explorer' || activeTool === 'commentary_notes' ? input : null,
        } as any)
        .select('id')
        .single()

      if (error) throw error
      setSaved('new')
      // Navigate to the new sermon after a brief delay
      setTimeout(() => {
        router.push(`/sermons/${(newSermon as any).id}`)
      }, 1000)
    } catch (err: any) {
      alert('Error creating sermon: ' + err.message)
    }
    setSendingTo(null)
  }

  const handleSaveAsIdea = async () => {
    setSendingTo('idea')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      const toolLabel = currentTool.label
      const ideaContent = `[Study Notes — ${toolLabel}]\n${input}\n\n${result}`

      const { error } = await supabase
        .from('ideas')
        .insert({
          profile_id: user.id,
          content: ideaContent,
          is_archived: false,
        } as any)

      if (error) throw error
      setSaved('idea')
    } catch (err: any) {
      alert('Error saving idea: ' + err.message)
    }
    setSendingTo(null)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="shadow-sm rounded-xl border-gray-100">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-[#022d5c]">
          <BookOpen className="w-5 h-5" />
          Study Tools
        </CardTitle>
        <p className="text-sm text-gray-500 mt-1">AI-powered research tools for sermon preparation</p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Tool Tabs */}
        <div className="flex overflow-x-auto gap-2 pb-1 hide-scrollbar">
          {TOOLS.map(tool => {
            const Icon = tool.icon
            return (
              <button
                key={tool.id}
                onClick={() => { setActiveTool(tool.id); setResult(''); setSaved(null) }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all border",
                  activeTool === tool.id
                    ? "bg-[#022d5c] text-white border-[#022d5c] shadow-sm"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                )}
              >
                <Icon className="w-4 h-4" />
                {tool.label}
              </button>
            )
          })}
        </div>

        {/* Input */}
        <div className="flex gap-3">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={currentTool.placeholder}
            className="flex-1"
            onKeyDown={e => { if (e.key === 'Enter') handleGenerate() }}
          />
          <Button
            onClick={handleGenerate}
            disabled={loading || !input.trim()}
            className="bg-[#D0A348] hover:bg-[#b88c3a] text-white gap-2 shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {loading ? 'Studying...' : 'Study'}
          </Button>
        </div>

        {/* Results */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 text-[#022d5c]">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p className="text-sm font-medium">Researching...</p>
            <p className="text-xs text-gray-500 mt-1">This may take a moment</p>
          </div>
        )}

        {result && !loading && (
          <div className="space-y-4">
            {/* Result Content */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 prose prose-sm max-w-none max-h-[500px] overflow-y-auto">
              {result.split('\n').map((line, i) => {
                if (line.startsWith('## ')) return <h3 key={i} className="text-lg font-bold text-[#022d5c] mt-4 mb-2 first:mt-0">{line.replace('## ', '')}</h3>
                if (line.startsWith('### ')) return <h4 key={i} className="text-base font-semibold text-[#022d5c] mt-3 mb-1">{line.replace('### ', '')}</h4>
                if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-semibold text-gray-800">{line.replace(/\*\*/g, '')}</p>
                if (line.trim() === '') return <div key={i} className="h-2" />
                return <p key={i} className="text-gray-700 leading-relaxed">{line}</p>
              })}
            </div>

            {/* Send To Action Bar */}
            <div className="bg-[#F8F5EE] rounded-xl p-4 border border-[#e0dac8]">
              <p className="text-xs font-bold text-[#022d5c] mb-3 uppercase tracking-wider">Send these notes to...</p>
              <div className="flex flex-wrap gap-2">
                {/* Add to Sermon */}
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSermonDropdown(!showSermonDropdown)}
                    disabled={saved === 'sermon'}
                    className={cn("gap-2", saved === 'sermon' ? "bg-green-50 text-green-700 border-green-200" : "text-[#022d5c] border-[#022d5c]/20")}
                  >
                    {saved === 'sermon' ? <Check className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                    {saved === 'sermon' ? 'Added!' : 'Add to Sermon'}
                    {!saved && <ChevronDown className="w-3 h-3" />}
                  </Button>

                  {showSermonDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                      {draftSermons.length === 0 ? (
                        <div className="p-4 text-sm text-gray-500 text-center">No draft sermons found</div>
                      ) : (
                        draftSermons.map(sermon => (
                          <button
                            key={sermon.id}
                            onClick={() => handleAddToSermon(sermon.id)}
                            disabled={sendingTo === sermon.id}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{sermon.title}</p>
                              <p className="text-xs text-gray-500 capitalize">{sermon.status}</p>
                            </div>
                            {sendingTo === sermon.id && <Loader2 className="w-4 h-4 animate-spin text-gray-400 shrink-0" />}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* New Sermon */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNewSermon}
                  disabled={sendingTo === 'new' || saved === 'new'}
                  className={cn("gap-2", saved === 'new' ? "bg-green-50 text-green-700 border-green-200" : "text-[#022d5c] border-[#022d5c]/20")}
                >
                  {saved === 'new' ? <Check className="w-4 h-4" /> : sendingTo === 'new' ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                  {saved === 'new' ? 'Created! Redirecting...' : 'New Sermon'}
                </Button>

                {/* Save as Idea */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveAsIdea}
                  disabled={sendingTo === 'idea' || saved === 'idea'}
                  className={cn("gap-2", saved === 'idea' ? "bg-green-50 text-green-700 border-green-200" : "text-[#022d5c] border-[#022d5c]/20")}
                >
                  {saved === 'idea' ? <Check className="w-4 h-4" /> : sendingTo === 'idea' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4" />}
                  {saved === 'idea' ? 'Saved!' : 'Save as Idea'}
                </Button>

                {/* Copy */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="gap-2 text-gray-500 ml-auto"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
